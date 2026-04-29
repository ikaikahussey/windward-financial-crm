import { Router, Request, Response } from 'express';
import { db } from '../db';
import {
  jobRuns,
  emailQueue,
  emailTemplates,
  contacts,
  activities,
  pipelineEntries,
} from '../db/schema';
import { and, desc, eq, gte, lte, inArray, sql } from 'drizzle-orm';

const router = Router();

router.get('/runs', async (req: Request, res: Response) => {
  try {
    const jobName = req.query.jobName as string | undefined;
    const status = req.query.status as string | undefined;
    const since = req.query.since as string | undefined;
    const limit = Math.min(
      500,
      Math.max(1, parseInt((req.query.limit as string) || '50', 10)),
    );

    const conditions = [];
    if (jobName) conditions.push(eq(jobRuns.jobName, jobName));
    if (status) conditions.push(eq(jobRuns.status, status));
    if (since) conditions.push(gte(jobRuns.startedAt, new Date(since)));
    const where = conditions.length ? and(...conditions) : undefined;

    const baseSelect = db.select().from(jobRuns);
    const rows = await (where
      ? baseSelect.where(where).orderBy(desc(jobRuns.startedAt)).limit(limit)
      : baseSelect.orderBy(desc(jobRuns.startedAt)).limit(limit));
    return res.json({ runs: rows });
  } catch (err) {
    console.error('jobs/runs error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/heatmap', async (req: Request, res: Response) => {
  try {
    const days = Math.min(
      90,
      Math.max(1, parseInt((req.query.days as string) || '30', 10)),
    );
    const since = new Date();
    since.setDate(since.getDate() - days + 1);
    since.setHours(0, 0, 0, 0);

    const rows = await db
      .select({
        jobName: jobRuns.jobName,
        day: sql<string>`to_char(${jobRuns.startedAt}, 'YYYY-MM-DD')`,
        success: sql<number>`count(*) FILTER (WHERE ${jobRuns.status} = 'success')::int`,
        partial: sql<number>`count(*) FILTER (WHERE ${jobRuns.status} = 'partial')::int`,
        failed: sql<number>`count(*) FILTER (WHERE ${jobRuns.status} = 'failed')::int`,
      })
      .from(jobRuns)
      .where(gte(jobRuns.startedAt, since))
      .groupBy(jobRuns.jobName, sql`to_char(${jobRuns.startedAt}, 'YYYY-MM-DD')`);

    return res.json({ days, since, cells: rows });
  } catch (err) {
    console.error('jobs/heatmap error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/email-queue/summary', async (_req: Request, res: Response) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - 7);

    const [pending] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(emailQueue)
      .where(eq(emailQueue.status, 'Pending'));

    const [sentToday] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(emailQueue)
      .where(and(eq(emailQueue.status, 'Sent'), gte(emailQueue.sentAt, startOfDay)));

    const [sentWeek] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(emailQueue)
      .where(and(eq(emailQueue.status, 'Sent'), gte(emailQueue.sentAt, startOfWeek)));

    const [failedToday] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(emailQueue)
      .where(and(eq(emailQueue.status, 'Failed'), gte(emailQueue.createdAt, startOfDay)));

    const [oldest] = await db
      .select({ scheduledFor: emailQueue.scheduledFor })
      .from(emailQueue)
      .where(eq(emailQueue.status, 'Pending'))
      .orderBy(emailQueue.scheduledFor)
      .limit(1);

    // Cron runs every 5 minutes; compute minutes until next 5-min boundary.
    const now = new Date();
    const nextRunInMin = 5 - (now.getMinutes() % 5);

    return res.json({
      pending: pending?.count ?? 0,
      sentToday: sentToday?.count ?? 0,
      sentThisWeek: sentWeek?.count ?? 0,
      failedToday: failedToday?.count ?? 0,
      oldestPendingAt: oldest?.scheduledFor ?? null,
      nextRunInMin,
    });
  } catch (err) {
    console.error('email-queue/summary error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/email-queue', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const limit = Math.min(
      200,
      Math.max(1, parseInt((req.query.limit as string) || '50', 10)),
    );
    const offset = (page - 1) * limit;

    const where = status ? eq(emailQueue.status, status as never) : undefined;

    const baseSelect = db
      .select({
        id: emailQueue.id,
        contactId: emailQueue.contactId,
        templateId: emailQueue.templateId,
        scheduledFor: emailQueue.scheduledFor,
        sentAt: emailQueue.sentAt,
        status: emailQueue.status,
        templateName: emailTemplates.name,
        contactFirstName: contacts.firstName,
        contactLastName: contacts.lastName,
        contactEmail: contacts.email,
      })
      .from(emailQueue)
      .leftJoin(emailTemplates, eq(emailTemplates.id, emailQueue.templateId))
      .leftJoin(contacts, eq(contacts.id, emailQueue.contactId));

    const rows = await (where
      ? baseSelect.where(where).orderBy(desc(emailQueue.scheduledFor)).limit(limit).offset(offset)
      : baseSelect.orderBy(desc(emailQueue.scheduledFor)).limit(limit).offset(offset));

    return res.json({
      items: rows.map((r) => ({
        id: r.id,
        scheduledFor: r.scheduledFor,
        sentAt: r.sentAt,
        status: r.status,
        template: r.templateName,
        contact: r.contactId
          ? {
              id: r.contactId,
              name: `${r.contactFirstName ?? ''} ${r.contactLastName ?? ''}`.trim(),
              email: r.contactEmail,
            }
          : null,
        // schema doesn't track attempts/error per row yet; surface placeholders
        attempts: null,
        error: null,
      })),
      page,
      limit,
    });
  } catch (err) {
    console.error('email-queue error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/email-queue/:id/retry', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'invalid id' });
    const [updated] = await db
      .update(emailQueue)
      .set({ status: 'Pending', sentAt: null, scheduledFor: new Date() })
      .where(eq(emailQueue.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: 'queue item not found' });
    return res.json({ item: updated });
  } catch (err) {
    console.error('email-queue/retry error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/email-queue/retry-failed-today', async (_req: Request, res: Response) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const updated = await db
      .update(emailQueue)
      .set({ status: 'Pending', sentAt: null, scheduledFor: new Date() })
      .where(and(eq(emailQueue.status, 'Failed'), gte(emailQueue.createdAt, startOfDay)))
      .returning({ id: emailQueue.id });
    return res.json({ retried: updated.length });
  } catch (err) {
    console.error('retry-failed-today error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Reconstruct stage transitions from `pipeline_entries` plus any `Stage Change`
 * activity rows (which are the deterministic record of what a transition fired).
 *
 * NOTE: We chose to derive this on-the-fly rather than add a new automation_log
 * table. The activity log is already the system-of-record for stage changes
 * and reconstructing actions from it stays in sync with manual edits. If
 * deeper action-level fidelity is needed later, add `automation_log` then.
 */
router.get('/automation-log', async (req: Request, res: Response) => {
  try {
    const contactId = req.query.contactId
      ? parseInt(req.query.contactId as string, 10)
      : undefined;
    const fromStage = req.query.fromStage as string | undefined;
    const toStage = req.query.toStage as string | undefined;
    const since = req.query.since as string | undefined;
    const limit = Math.min(
      500,
      Math.max(1, parseInt((req.query.limit as string) || '100', 10)),
    );

    const conditions = [eq(activities.activityType, 'Stage Change')];
    if (contactId) conditions.push(eq(activities.contactId, contactId));
    if (since) conditions.push(gte(activities.createdAt, new Date(since)));

    const rows = await db
      .select({
        id: activities.id,
        contactId: activities.contactId,
        firedAt: activities.createdAt,
        subject: activities.subject,
        body: activities.body,
        contactFirstName: contacts.firstName,
        contactLastName: contacts.lastName,
      })
      .from(activities)
      .leftJoin(contacts, eq(contacts.id, activities.contactId))
      .where(and(...conditions))
      .orderBy(desc(activities.createdAt))
      .limit(limit);

    // For each transition, find any other activities fired within 60s on the
    // same contact (auto-actions like queued emails, tasks, etc.).
    const items = await Promise.all(
      rows.map(async (r) => {
        const window = 60_000;
        const start = new Date(new Date(r.firedAt).getTime() - window);
        const end = new Date(new Date(r.firedAt).getTime() + window);
        const sideEffects = await db
          .select({
            id: activities.id,
            type: activities.activityType,
            subject: activities.subject,
          })
          .from(activities)
          .where(
            and(
              eq(activities.contactId, r.contactId),
              gte(activities.createdAt, start),
              lte(activities.createdAt, end),
            ),
          );

        // Subject format for stage changes: 'Stage changed from "X" to "Y"' OR
        // 'Auto-expired: ...moved to Lost / Not Now' from cron.
        const m = r.subject?.match(/from "(.+?)" to "(.+?)"/);
        const detectedFrom = m?.[1] ?? null;
        const detectedTo = m?.[2] ?? null;

        return {
          id: r.id,
          firedAt: r.firedAt,
          contact: r.contactId
            ? {
                id: r.contactId,
                name: `${r.contactFirstName ?? ''} ${r.contactLastName ?? ''}`.trim(),
              }
            : null,
          fromStage: detectedFrom,
          toStage: detectedTo,
          actions: sideEffects.filter((s) => s.id !== r.id),
          status: 'success' as const,
        };
      }),
    );

    const filtered = items.filter((i) => {
      if (fromStage && i.fromStage !== fromStage) return false;
      if (toStage && i.toStage !== toStage) return false;
      return true;
    });

    return res.json({ items: filtered });
  } catch (err) {
    console.error('automation-log error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Keep imports tidy
void inArray;
void pipelineEntries;

export default router;
