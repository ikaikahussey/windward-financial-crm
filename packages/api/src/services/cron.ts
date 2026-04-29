import cron from 'node-cron';
import { db } from '../db';
import {
  contacts,
  policies,
  pipelineEntries,
  emailQueue,
  emailTemplates,
  activities,
} from '../db/schema';
import { eq, and, lte, like, desc } from 'drizzle-orm';
import { processEmailQueue } from './email-sender';
import { quoService } from './quo';
import { rescoreAllLeads } from './lead-scoring';
import { processCampaignQueue } from './campaign-engine';
import { runJob, type JobContext } from './job-runner';

// HST = UTC-10, no daylight saving
const TZ_HST = 'Pacific/Honolulu';

/**
 * Send renewal/expiry reminders for policies expiring within 30 days.
 */
async function sendRenewalReminders(ctx: JobContext): Promise<void> {
  const thirtyDaysOut = new Date();
  thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiringPolicies = await db
    .select({
      policyId: policies.id,
      contactId: policies.contactId,
      productType: policies.productType,
      expiryDate: policies.expiryDate,
      policyNumber: policies.policyNumber,
    })
    .from(policies)
    .where(
      and(eq(policies.status, 'Active'), lte(policies.expiryDate, thirtyDaysOut)),
    );

  for (const policy of expiringPolicies) {
    if (!policy.expiryDate || policy.expiryDate < today) continue;

    try {
      const templateId = await findTemplateByName('Renewal Reminder%');
      if (!templateId) continue;

      const existing = await db
        .select({ id: emailQueue.id })
        .from(emailQueue)
        .where(
          and(
            eq(emailQueue.contactId, policy.contactId),
            eq(emailQueue.templateId, templateId),
            eq(emailQueue.status, 'Pending'),
          ),
        )
        .limit(1);

      if (existing.length === 0) {
        await db.insert(emailQueue).values({
          contactId: policy.contactId,
          templateId,
          scheduledFor: new Date(),
          status: 'Pending',
        });
        ctx.incrementProcessed();
      }
    } catch (err) {
      ctx.incrementFailed();
      ctx.appendLog(
        `renewal reminder failed for policy ${policy.policyId}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
}

/**
 * Send annual review reminders for policies issued ~365 days ago.
 */
async function sendAnnualReviewReminders(ctx: JobContext): Promise<void> {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const windowStart = new Date(oneYearAgo);
  windowStart.setDate(windowStart.getDate() - 3);
  const windowEnd = new Date(oneYearAgo);
  windowEnd.setDate(windowEnd.getDate() + 3);

  const policiesForReview = await db
    .select({ contactId: policies.contactId, issueDate: policies.issueDate })
    .from(policies)
    .where(and(eq(policies.status, 'Active'), lte(policies.issueDate, windowEnd)));

  const templateId = await findTemplateByName('Annual Review%');
  if (!templateId) return;

  for (const policy of policiesForReview) {
    if (!policy.issueDate || policy.issueDate < windowStart) continue;
    try {
      await db.insert(emailQueue).values({
        contactId: policy.contactId,
        templateId,
        scheduledFor: new Date(),
        status: 'Pending',
      });
      ctx.incrementProcessed();
    } catch {
      ctx.incrementFailed();
    }
  }
}

/**
 * Expire stale proposals: contacts in "Proposal Sent" > 14 days move to
 * "Lost / Not Now" and are queued for re-engagement.
 */
async function expireStaleProposals(ctx: JobContext): Promise<void> {
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const staleProposals = await db
    .select({
      contactId: pipelineEntries.contactId,
      movedAt: pipelineEntries.movedAt,
    })
    .from(pipelineEntries)
    .where(eq(pipelineEntries.pipelineStage, 'Proposal Sent'));

  const latestByContact = new Map<number, Date>();
  for (const entry of staleProposals) {
    const existing = latestByContact.get(entry.contactId);
    if (!existing || entry.movedAt > existing) {
      latestByContact.set(entry.contactId, entry.movedAt);
    }
  }

  for (const [contactId, movedAt] of latestByContact) {
    if (movedAt > fourteenDaysAgo) continue;

    try {
      const [latestEntry] = await db
        .select({ pipelineStage: pipelineEntries.pipelineStage })
        .from(pipelineEntries)
        .where(eq(pipelineEntries.contactId, contactId))
        .orderBy(desc(pipelineEntries.movedAt))
        .limit(1);

      if (latestEntry?.pipelineStage !== 'Proposal Sent') continue;

      await db.insert(pipelineEntries).values({
        contactId,
        pipelineStage: 'Lost / Not Now',
      });
      await db.insert(activities).values({
        contactId,
        activityType: 'Stage Change',
        subject: 'Auto-expired: Proposal Sent > 14 days, moved to Lost / Not Now',
      });
      await db
        .update(emailQueue)
        .set({ status: 'Cancelled' })
        .where(
          and(
            eq(emailQueue.contactId, contactId),
            eq(emailQueue.status, 'Pending'),
          ),
        );

      const reEngagement90 = await findTemplateByName('Re-engagement 90%');
      if (reEngagement90) {
        const scheduledFor = new Date();
        scheduledFor.setDate(scheduledFor.getDate() + 90);
        await db.insert(emailQueue).values({
          contactId,
          templateId: reEngagement90,
          scheduledFor,
          status: 'Pending',
        });
      }

      ctx.incrementProcessed();
    } catch (err) {
      ctx.incrementFailed();
      ctx.appendLog(
        `expire failed for contact ${contactId}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
}

/**
 * Generate a monthly performance report (currently console-only).
 */
async function generatePerformanceReport(ctx: JobContext): Promise<void> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const newContacts = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(lte(contacts.createdAt, new Date()));

  const issuedPolicies = await db
    .select({ id: policies.id })
    .from(policies)
    .where(and(eq(policies.status, 'Active'), lte(policies.issueDate, new Date())));

  const emailsSent = await db
    .select({ id: emailQueue.id })
    .from(emailQueue)
    .where(and(eq(emailQueue.status, 'Sent'), lte(emailQueue.sentAt, new Date())));

  ctx.appendLog(
    `contacts=${newContacts.length} active_policies=${issuedPolicies.length} emails_sent_total=${emailsSent.length}`,
  );
  ctx.incrementProcessed();
}

async function findTemplateByName(namePattern: string): Promise<number | null> {
  const [template] = await db
    .select({ id: emailTemplates.id })
    .from(emailTemplates)
    .where(like(emailTemplates.name, namePattern))
    .limit(1);
  return template?.id ?? null;
}

/**
 * Wrap a cron callback in runJob() and swallow errors so a failed run
 * doesn't take down the cron scheduler.
 */
function scheduledJob(jobName: string, fn: (ctx: JobContext) => Promise<unknown>) {
  return async () => {
    try {
      await runJob(jobName, 'cron', null, fn);
    } catch (err) {
      console.error(`Cron [${jobName}]:`, err);
    }
  };
}

export function startCronJobs(): void {
  console.log('Registering cron jobs...');

  // Every 5 min: process email queue
  cron.schedule(
    '*/5 * * * *',
    scheduledJob('email-queue', async (ctx) => {
      const result = await processEmailQueue();
      // processEmailQueue currently doesn't return counts; treat each invocation
      // as a single processed unit when no counts are surfaced.
      ctx.incrementProcessed(typeof result === 'number' ? result : 1);
    }),
  );

  // Every 5 min: process campaign queue
  cron.schedule(
    '*/5 * * * *',
    scheduledJob('campaign-queue', async (ctx) => {
      const result = await processCampaignQueue();
      ctx.incrementProcessed(typeof result === 'number' ? result : 1);
    }),
  );

  // Every 15 min: Quo (OpenPhone) full sync
  cron.schedule(
    '*/15 * * * *',
    scheduledJob('quo-sync', async (ctx) => {
      await quoService.fullSync();
      ctx.incrementProcessed();
    }),
  );

  // Daily 8am HST: renewal + annual review reminders
  cron.schedule(
    '0 8 * * *',
    scheduledJob('daily-reminders', async (ctx) => {
      await sendRenewalReminders(ctx);
      await sendAnnualReviewReminders(ctx);
    }),
    { timezone: TZ_HST },
  );

  // Daily 9am HST: re-score all leads
  cron.schedule(
    '0 9 * * *',
    scheduledJob('lead-scoring', async (ctx) => {
      const result = await rescoreAllLeads(ctx.runId, ctx);
      ctx.appendLog(
        `scored=${result.scored} hot=${result.hotCount} avg=${result.averageScore} auto-booked=${result.autoBooked}`,
      );
    }),
    { timezone: TZ_HST },
  );

  // Daily midnight HST: expire stale proposals
  cron.schedule(
    '0 0 * * *',
    scheduledJob('expire-proposals', expireStaleProposals),
    { timezone: TZ_HST },
  );

  // Monthly 1st 6am HST: performance report
  cron.schedule(
    '0 6 1 * *',
    scheduledJob('performance-report', generatePerformanceReport),
    { timezone: TZ_HST },
  );

  console.log('All cron jobs registered successfully');
}
