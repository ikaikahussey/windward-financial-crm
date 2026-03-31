import cron from 'node-cron';
import { db } from '../db';
import {
  contacts,
  policies,
  pipelineEntries,
  emailQueue,
  emailTemplates,
  activities,
  tasks,
} from '../db/schema';
import { eq, and, lte, like, sql, desc, isNull } from 'drizzle-orm';
import { processEmailQueue } from './email-sender';
import { quoService } from './quo';
import { scoreContact } from './lead-scoring';
import { generateBlogDraft, generateNewsletter } from './content-engine';

// HST = UTC-10, no daylight saving
// node-cron runs in system TZ by default; we specify timezone explicitly.
const TZ_HST = 'Pacific/Honolulu';

/**
 * Send renewal/expiry reminders for policies expiring within 30 days.
 */
async function sendRenewalReminders(): Promise<void> {
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
      and(
        eq(policies.status, 'Active'),
        lte(policies.expiryDate, thirtyDaysOut)
      )
    );

  for (const policy of expiringPolicies) {
    if (!policy.expiryDate || policy.expiryDate < today) continue;

    const templateId = await findTemplateByName('Renewal Reminder%');
    if (templateId) {
      // Check we haven't already queued this
      const existing = await db
        .select({ id: emailQueue.id })
        .from(emailQueue)
        .where(
          and(
            eq(emailQueue.contactId, policy.contactId),
            eq(emailQueue.templateId, templateId),
            eq(emailQueue.status, 'Pending')
          )
        )
        .limit(1);

      if (existing.length === 0) {
        await db.insert(emailQueue).values({
          contactId: policy.contactId,
          templateId,
          scheduledFor: new Date(),
          status: 'Pending',
        });

        console.log(
          `Queued renewal reminder for contact ${policy.contactId}, policy ${policy.policyNumber}`
        );
      }
    }
  }
}

/**
 * Send annual review reminders for policies issued ~365 days ago.
 */
async function sendAnnualReviewReminders(): Promise<void> {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const windowStart = new Date(oneYearAgo);
  windowStart.setDate(windowStart.getDate() - 3);
  const windowEnd = new Date(oneYearAgo);
  windowEnd.setDate(windowEnd.getDate() + 3);

  const policiesForReview = await db
    .select({
      contactId: policies.contactId,
      issueDate: policies.issueDate,
    })
    .from(policies)
    .where(
      and(
        eq(policies.status, 'Active'),
        lte(policies.issueDate, windowEnd)
      )
    );

  const templateId = await findTemplateByName('Annual Review%');

  for (const policy of policiesForReview) {
    if (!policy.issueDate || policy.issueDate < windowStart) continue;

    if (templateId) {
      await db.insert(emailQueue).values({
        contactId: policy.contactId,
        templateId,
        scheduledFor: new Date(),
        status: 'Pending',
      });
    }
  }
}

/**
 * Send birthday emails to contacts whose birthday is today.
 * Note: The schema doesn't have a birthday field, so this is a placeholder
 * that logs and can be extended when the field is added.
 */
async function sendBirthdayEmails(): Promise<void> {
  // Birthday field not in current schema — placeholder for when it's added
  console.log('Birthday email check: no birthday field in schema yet');
}

/**
 * Re-score all leads based on current profile data.
 */
async function rescoreAllLeads(): Promise<void> {
  const allContacts = await db.select().from(contacts);
  let updated = 0;

  for (const contact of allContacts) {
    const score = scoreContact(contact);

    // Log score as an activity if it significantly changed
    // For now, just log every re-score as a note
    await db.insert(activities).values({
      contactId: contact.id,
      activityType: 'Note',
      subject: `Lead score updated: ${score}/100`,
    });

    updated++;
  }

  console.log(`Re-scored ${updated} contacts`);
}

/**
 * Expire stale proposals: contacts that have been in "Proposal Sent" for
 * more than 14 days move to "Lost / Not Now".
 */
async function expireStaleProposals(): Promise<void> {
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  // Find the most recent pipeline entry for each contact in "Proposal Sent"
  const staleProposals = await db
    .select({
      contactId: pipelineEntries.contactId,
      movedAt: pipelineEntries.movedAt,
    })
    .from(pipelineEntries)
    .where(eq(pipelineEntries.pipelineStage, 'Proposal Sent'));

  // Group by contact, find the latest entry per contact
  const latestByContact = new Map<number, Date>();
  for (const entry of staleProposals) {
    const existing = latestByContact.get(entry.contactId);
    if (!existing || entry.movedAt > existing) {
      latestByContact.set(entry.contactId, entry.movedAt);
    }
  }

  for (const [contactId, movedAt] of latestByContact) {
    if (movedAt > fourteenDaysAgo) continue;

    // Verify they haven't moved past Proposal Sent already
    const [latestEntry] = await db
      .select({ pipelineStage: pipelineEntries.pipelineStage })
      .from(pipelineEntries)
      .where(eq(pipelineEntries.contactId, contactId))
      .orderBy(desc(pipelineEntries.movedAt))
      .limit(1);

    if (latestEntry?.pipelineStage !== 'Proposal Sent') continue;

    // Move to Lost / Not Now
    await db.insert(pipelineEntries).values({
      contactId,
      pipelineStage: 'Lost / Not Now',
    });

    await db.insert(activities).values({
      contactId,
      activityType: 'Stage Change',
      subject: 'Auto-expired: Proposal Sent > 14 days, moved to Lost / Not Now',
    });

    // Cancel pending emails
    await db
      .update(emailQueue)
      .set({ status: 'Cancelled' })
      .where(
        and(
          eq(emailQueue.contactId, contactId),
          eq(emailQueue.status, 'Pending')
        )
      );

    // Queue re-engagement emails
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

    console.log(`Expired stale proposal for contact ${contactId}`);
  }
}

/**
 * Generate a monthly performance report as an activity note.
 */
async function generatePerformanceReport(): Promise<void> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Count new contacts in the last 30 days
  const newContacts = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(lte(contacts.createdAt, new Date()));

  // Count policies issued in the last 30 days
  const issuedPolicies = await db
    .select({ id: policies.id })
    .from(policies)
    .where(
      and(
        eq(policies.status, 'Active'),
        lte(policies.issueDate, new Date())
      )
    );

  // Count emails sent
  const emailsSent = await db
    .select({ id: emailQueue.id })
    .from(emailQueue)
    .where(
      and(
        eq(emailQueue.status, 'Sent'),
        lte(emailQueue.sentAt, new Date())
      )
    );

  const report = `Monthly Performance Report (${thirtyDaysAgo.toLocaleDateString()} - ${new Date().toLocaleDateString()})

- Total contacts in system: ${newContacts.length}
- Total active policies: ${issuedPolicies.length}
- Total emails sent (all time): ${emailsSent.length}

Report generated automatically.`;

  // Log as a system activity (no specific contact)
  console.log(report);
}

/**
 * Helper: find an email template by name pattern.
 */
async function findTemplateByName(namePattern: string): Promise<number | null> {
  const [template] = await db
    .select({ id: emailTemplates.id })
    .from(emailTemplates)
    .where(like(emailTemplates.name, namePattern))
    .limit(1);

  return template?.id ?? null;
}

/**
 * Register and start all cron jobs.
 */
export function startCronJobs(): void {
  console.log('Registering cron jobs...');

  // Every 5 minutes: process email queue
  cron.schedule('*/5 * * * *', async () => {
    try {
      await processEmailQueue();
    } catch (err) {
      console.error('Cron [email-queue]:', err);
    }
  });

  // Every 15 minutes: Quo (OpenPhone) full sync
  cron.schedule('*/15 * * * *', async () => {
    try {
      await quoService.fullSync();
    } catch (err) {
      console.error('Cron [quo-sync]:', err);
    }
  });

  // Daily 8:00 AM HST: renewal reminders, annual review reminders, birthday emails
  cron.schedule(
    '0 8 * * *',
    async () => {
      try {
        await sendRenewalReminders();
        await sendAnnualReviewReminders();
        await sendBirthdayEmails();
      } catch (err) {
        console.error('Cron [daily-reminders]:', err);
      }
    },
    { timezone: TZ_HST }
  );

  // Daily 9:00 AM HST: re-score all leads
  cron.schedule(
    '0 9 * * *',
    async () => {
      try {
        await rescoreAllLeads();
      } catch (err) {
        console.error('Cron [rescore-leads]:', err);
      }
    },
    { timezone: TZ_HST }
  );

  // Weekly Monday 7:00 AM HST: generate blog draft
  cron.schedule(
    '0 7 * * 1',
    async () => {
      try {
        await generateBlogDraft();
      } catch (err) {
        console.error('Cron [blog-draft]:', err);
      }
    },
    { timezone: TZ_HST }
  );

  // Biweekly Friday 10:00 AM HST: generate newsletter (runs on even-numbered weeks)
  cron.schedule(
    '0 10 * * 5',
    async () => {
      try {
        const weekNumber = Math.ceil(
          (new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) /
            (7 * 24 * 60 * 60 * 1000)
        );
        if (weekNumber % 2 === 0) {
          await generateNewsletter();
        }
      } catch (err) {
        console.error('Cron [newsletter]:', err);
      }
    },
    { timezone: TZ_HST }
  );

  // Daily midnight HST: expire stale proposals
  cron.schedule(
    '0 0 * * *',
    async () => {
      try {
        await expireStaleProposals();
      } catch (err) {
        console.error('Cron [expire-proposals]:', err);
      }
    },
    { timezone: TZ_HST }
  );

  // Monthly 1st at 6:00 AM HST: generate performance report
  cron.schedule(
    '0 6 1 * *',
    async () => {
      try {
        await generatePerformanceReport();
      } catch (err) {
        console.error('Cron [performance-report]:', err);
      }
    },
    { timezone: TZ_HST }
  );

  console.log('All cron jobs registered successfully');
}
