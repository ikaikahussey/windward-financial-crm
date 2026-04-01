import { Resend } from 'resend';
import { db } from '../db';
import { emailQueue, emailTemplates, contacts, users } from '../db/schema';
import { eq, lte, and } from 'drizzle-orm';

// Use Resend HTTP API (SMTP_PASS holds the Resend API key)
const resendApiKey = process.env.SMTP_PASS || process.env.RESEND_API_KEY || '';
const resend = resendApiKey ? new Resend(resendApiKey) : null;

const FROM_ADDRESS = process.env.EMAIL_FROM || 'info@windwardfinancial.com';
const FROM_NAME = process.env.EMAIL_FROM_NAME || 'Windward Financial Group';

/**
 * Replace merge tags in a string with actual values.
 */
function renderMergeTags(
  text: string,
  mergeData: Record<string, string>
): string {
  let result = text;
  for (const [tag, value] of Object.entries(mergeData)) {
    result = result.replace(new RegExp(`\\{\\{${tag}\\}\\}`, 'g'), value || '');
  }
  return result;
}

/**
 * Process all pending emails whose scheduledFor time has arrived.
 * Returns the number of emails sent.
 */
export async function processEmailQueue(): Promise<number> {
  const now = new Date();

  // Find all pending emails that are ready to send
  const pendingEmails = await db
    .select({
      queueId: emailQueue.id,
      contactId: emailQueue.contactId,
      templateId: emailQueue.templateId,
      scheduledFor: emailQueue.scheduledFor,
    })
    .from(emailQueue)
    .where(
      and(
        eq(emailQueue.status, 'Pending'),
        lte(emailQueue.scheduledFor, now)
      )
    );

  let sentCount = 0;

  for (const item of pendingEmails) {
    try {
      // Load the template
      const [template] = await db
        .select()
        .from(emailTemplates)
        .where(eq(emailTemplates.id, item.templateId))
        .limit(1);

      if (!template) {
        console.error(`Template ${item.templateId} not found for queue item ${item.queueId}`);
        await db
          .update(emailQueue)
          .set({ status: 'Failed' })
          .where(eq(emailQueue.id, item.queueId));
        continue;
      }

      // Load the contact
      const [contact] = await db
        .select()
        .from(contacts)
        .where(eq(contacts.id, item.contactId))
        .limit(1);

      if (!contact || !contact.email) {
        console.error(`Contact ${item.contactId} not found or has no email`);
        await db
          .update(emailQueue)
          .set({ status: 'Failed' })
          .where(eq(emailQueue.id, item.queueId));
        continue;
      }

      // Load the assigned agent (if any) for merge tags
      let agent: { name: string; phone: string | null } | null = null;
      if (contact.assignedAgentId) {
        const [agentRow] = await db
          .select({ name: users.name, phone: users.phone })
          .from(users)
          .where(eq(users.id, contact.assignedAgentId))
          .limit(1);
        agent = agentRow ?? null;
      }

      // Build merge data
      const mergeData: Record<string, string> = {
        first_name: contact.firstName,
        last_name: contact.lastName,
        agent_name: agent?.name || FROM_NAME,
        agent_phone: agent?.phone || process.env.COMPANY_PHONE || '',
        scheduling_link:
          process.env.SCHEDULING_LINK || 'https://windwardfinancial.com/schedule',
      };

      // Render subject and body
      const subject = renderMergeTags(template.subject, mergeData);
      const body = renderMergeTags(template.body, mergeData);

      // Send via Resend HTTP API
      if (!resend) {
        console.warn(`Resend not configured, skipping email "${subject}" to ${contact.email}`);
        continue;
      }

      const { error } = await resend.emails.send({
        from: `${FROM_NAME} <${FROM_ADDRESS}>`,
        to: [contact.email],
        subject,
        html: body,
      });

      if (error) {
        throw new Error(`Resend API error: ${error.message}`);
      }

      // Mark as sent
      await db
        .update(emailQueue)
        .set({ status: 'Sent', sentAt: new Date() })
        .where(eq(emailQueue.id, item.queueId));

      sentCount++;

      console.log(
        `Sent email "${subject}" to ${contact.email} (queue item ${item.queueId})`
      );
    } catch (err) {
      console.error(`Failed to send email for queue item ${item.queueId}:`, err);

      await db
        .update(emailQueue)
        .set({ status: 'Failed' })
        .where(eq(emailQueue.id, item.queueId));
    }
  }

  console.log(
    `Email queue processing complete: ${sentCount} sent, ${pendingEmails.length - sentCount} failed/skipped`
  );

  return sentCount;
}

/**
 * Queue a single email for a contact.
 */
export async function queueEmail(
  contactId: number,
  templateId: number,
  scheduledFor: Date
): Promise<void> {
  await db.insert(emailQueue).values({
    contactId,
    templateId,
    scheduledFor,
    status: 'Pending',
  });
}

/**
 * Cancel all pending emails for a contact (e.g., when they become a client).
 */
export async function cancelPendingEmails(contactId: number): Promise<number> {
  const result = await db
    .update(emailQueue)
    .set({ status: 'Cancelled' })
    .where(
      and(
        eq(emailQueue.contactId, contactId),
        eq(emailQueue.status, 'Pending')
      )
    )
    .returning();

  return result.length;
}
