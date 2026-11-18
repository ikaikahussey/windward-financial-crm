import { db } from '../db';
import { activities, contacts, tasks } from '../db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { cancelPendingEmails } from './email-sender';
import { advanceStage, currentStage } from './stage-events';
import { alertRep, contactLabel } from './sms';

/**
 * What happens when a contact texts us.
 *
 * - STOP / START keywords set or clear the opt-out flag.
 * - Any other reply means a person is engaged: the nurture drip stops, the
 *   lead counts as contacted, and the rep is told to answer.
 */

const STOP_WORDS = new Set(['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT', 'OPTOUT', 'OPT OUT']);
const START_WORDS = new Set(['START', 'UNSTOP', 'SUBSCRIBE', 'OPTIN', 'OPT IN']);
const REPLY_TASK_PREFIX = 'Reply to text from ';

export type InboundResult = 'opted-out' | 'opted-in' | 'reply';

export async function handleInboundSms(contactId: number, body: string): Promise<InboundResult> {
  const [contact] = await db.select().from(contacts).where(eq(contacts.id, contactId)).limit(1);
  if (!contact) return 'reply';
  const keyword = body.trim().toUpperCase().replace(/[.!]+$/, '');

  if (STOP_WORDS.has(keyword)) {
    await db
      .update(contacts)
      .set({ smsOptOut: true, smsOptOutAt: new Date(), updatedAt: new Date() })
      .where(eq(contacts.id, contactId));
    await db.insert(activities).values({
      contactId,
      activityType: 'Note',
      subject: 'Opted out of texts (replied STOP)',
      body: 'Automated texts to this contact are off. Calls and email are unaffected.',
    });
    return 'opted-out';
  }

  if (START_WORDS.has(keyword)) {
    await db
      .update(contacts)
      .set({ smsOptOut: false, smsOptOutAt: null, updatedAt: new Date() })
      .where(eq(contacts.id, contactId));
    await db.insert(activities).values({ contactId, activityType: 'Note', subject: 'Opted back in to texts (replied START)' });
    return 'opted-in';
  }

  const stage = await currentStage(contactId);
  // Only the new-lead nurture drip stops; client emails (reviews, renewals) continue.
  if (stage === null || stage === 'New Lead' || stage === 'Contacted') {
    await cancelPendingEmails(contactId);
  }
  await db.update(contacts).set({ lastContactedAt: new Date() }).where(eq(contacts.id, contactId));
  await advanceStage(contactId, 'Contacted', ['New Lead']);

  const repId = contact.assignedAgentId;
  if (repId) {
    const title = `${REPLY_TASK_PREFIX}${contact.firstName} ${contact.lastName}`;
    const [open] = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(and(eq(tasks.contactId, contactId), eq(tasks.title, title), isNull(tasks.completedAt)))
      .limit(1);
    if (!open) {
      await db.insert(tasks).values({
        contactId,
        assignedTo: repId,
        createdBy: repId,
        title,
        description: `They wrote: "${body.slice(0, 500)}"`,
        dueDate: new Date(),
        priority: 'High',
        taskType: 'Follow Up',
      });
    }
    await alertRep(repId, `Text from ${contactLabel(contact)}: "${body.slice(0, 120)}"`);
  }
  return 'reply';
}
