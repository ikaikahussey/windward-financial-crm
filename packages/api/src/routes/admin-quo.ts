import { Router, Request, Response } from 'express';
import { db } from '../db';
import { webhookEvents, jobRuns, contacts } from '../db/schema';
import { and, desc, eq, gte, isNull, isNotNull, sql, asc } from 'drizzle-orm';
import { quoService } from '../services/quo';
import { runJob } from '../services/job-runner';

const router = Router();

const EXPECTED_EVENTS = [
  'call.completed',
  'call.ringing',
  'message.received',
  'message.delivered',
];

interface WebhookCache {
  registered: Array<{ event: string; registered: boolean }>;
  fetchedAt: number;
}

let WEBHOOK_CACHE: WebhookCache | null = null;
const WEBHOOK_CACHE_TTL_MS = 60_000;

async function getRegisteredWebhooks(): Promise<WebhookCache['registered']> {
  if (WEBHOOK_CACHE && Date.now() - WEBHOOK_CACHE.fetchedAt < WEBHOOK_CACHE_TTL_MS) {
    return WEBHOOK_CACHE.registered;
  }
  let registeredEvents = new Set<string>();
  if (quoService.isConfigured()) {
    try {
      const hooks = await quoService.listWebhooks();
      for (const h of hooks) {
        for (const e of h.events ?? []) registeredEvents.add(e);
      }
    } catch {
      // Treat as none registered on failure rather than 500ing the dashboard.
      registeredEvents = new Set();
    }
  }
  const registered = EXPECTED_EVENTS.map((event) => ({
    event,
    registered: registeredEvents.has(event),
  }));
  WEBHOOK_CACHE = { registered, fetchedAt: Date.now() };
  return registered;
}

router.get('/health', async (_req: Request, res: Response) => {
  try {
    const apiKeyConfigured = quoService.isConfigured();

    const [lastSync] = await db
      .select({
        startedAt: jobRuns.startedAt,
        finishedAt: jobRuns.finishedAt,
        status: jobRuns.status,
      })
      .from(jobRuns)
      .where(eq(jobRuns.jobName, 'quo-sync'))
      .orderBy(desc(jobRuns.startedAt))
      .limit(1);

    const registeredWebhooks = await getRegisteredWebhooks();

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [counts] = await db
      .select({
        received: sql<number>`count(*)::int`,
        processed: sql<number>`count(*) FILTER (WHERE ${webhookEvents.status} = 'processed')::int`,
        error: sql<number>`count(*) FILTER (WHERE ${webhookEvents.status} = 'error')::int`,
        unmatched: sql<number>`count(*) FILTER (WHERE ${webhookEvents.status} = 'processed' AND ${webhookEvents.matchedContactId} IS NULL)::int`,
      })
      .from(webhookEvents)
      .where(gte(webhookEvents.receivedAt, since));

    return res.json({
      apiKeyConfigured,
      lastSyncAt: lastSync?.finishedAt ?? lastSync?.startedAt ?? null,
      lastSyncStatus: lastSync?.status ?? null,
      // Cron runs every 15 minutes; nextSyncAt is best-effort approximation.
      nextSyncAt: lastSync?.startedAt
        ? new Date(new Date(lastSync.startedAt).getTime() + 15 * 60_000)
        : null,
      registeredWebhooks,
      counts: {
        last24h: {
          received: counts?.received ?? 0,
          processed: counts?.processed ?? 0,
          error: counts?.error ?? 0,
          unmatched: counts?.unmatched ?? 0,
        },
      },
    });
  } catch (err) {
    console.error('quo health error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/webhook-events', async (req: Request, res: Response) => {
  try {
    const eventType = (req.query.eventType as string) || undefined;
    const matched = req.query.matched as string | undefined;
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10) || 1);
    const limit = Math.min(
      200,
      Math.max(1, parseInt((req.query.limit as string) || '50', 10) || 50),
    );
    const offset = (page - 1) * limit;

    const conditions = [];
    if (eventType) conditions.push(eq(webhookEvents.eventType, eventType));
    if (matched === 'true') conditions.push(isNotNull(webhookEvents.matchedContactId));
    if (matched === 'false') conditions.push(isNull(webhookEvents.matchedContactId));
    const where = conditions.length ? and(...conditions) : undefined;

    const baseSelect = db
      .select({
        id: webhookEvents.id,
        source: webhookEvents.source,
        eventType: webhookEvents.eventType,
        status: webhookEvents.status,
        error: webhookEvents.error,
        processingMs: webhookEvents.processingMs,
        receivedAt: webhookEvents.receivedAt,
        matchedContactId: webhookEvents.matchedContactId,
        payload: webhookEvents.payload,
        contactFirstName: contacts.firstName,
        contactLastName: contacts.lastName,
      })
      .from(webhookEvents)
      .leftJoin(contacts, eq(contacts.id, webhookEvents.matchedContactId));

    const rows = await (where
      ? baseSelect.where(where).orderBy(desc(webhookEvents.receivedAt)).limit(limit).offset(offset)
      : baseSelect.orderBy(desc(webhookEvents.receivedAt)).limit(limit).offset(offset));

    const events = rows.map((r) => ({
      id: r.id,
      source: r.source,
      eventType: r.eventType,
      status: r.status,
      error: r.error,
      processingMs: r.processingMs,
      receivedAt: r.receivedAt,
      payload: r.payload,
      matchedContact:
        r.matchedContactId && r.contactFirstName
          ? {
              id: r.matchedContactId,
              name: `${r.contactFirstName} ${r.contactLastName ?? ''}`.trim(),
            }
          : null,
    }));

    return res.json({ events, page, limit });
  } catch (err) {
    console.error('webhook-events error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/sync-history', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(
      100,
      Math.max(1, parseInt((req.query.limit as string) || '20', 10) || 20),
    );
    const rows = await db
      .select()
      .from(jobRuns)
      .where(eq(jobRuns.jobName, 'quo-sync'))
      .orderBy(desc(jobRuns.startedAt))
      .limit(limit);
    return res.json({ runs: rows });
  } catch (err) {
    console.error('sync-history error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/sync-now', async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId ?? null;
    // Don't await — long-running. Return the run id immediately so the UI can poll.
    const [pending] = await db
      .select({ id: jobRuns.id })
      .from(jobRuns)
      .where(eq(jobRuns.jobName, 'quo-sync'))
      .orderBy(desc(jobRuns.startedAt))
      .limit(1);

    // Kick off async; response returns the prior latest run id so the UI can
    // detect when a *newer* run appears.
    void runJob('quo-sync', 'manual', userId, async (ctx) => {
      await quoService.fullSync();
      ctx.incrementProcessed();
    }).catch((err) => {
      console.error('manual quo-sync failed:', err);
    });

    return res.json({ started: true, previousRunId: pending?.id ?? null });
  } catch (err) {
    console.error('sync-now error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Keep asc available so unused-import lint doesn't complain.
void asc;

export default router;
