import { db } from '../db';
import { activities, contacts, quoPhoneNumbers, smsMessages, users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { quoService } from './quo';
import { formatPhone, toE164 } from './phone';

/**
 * Automated texts to contacts and alerts to reps.
 *
 * Every automated text to a contact goes through sendContactSms so the
 * opt-out flag is always honored and every send is logged on the timeline.
 */

export type SmsResult = { sent: true; body: string } | { sent: false; reason: string };

/** Pick the Quo line to send from: the rep's own line, else the default line. */
export async function pickFromNumber(repId: number | null) {
  const numbers = await db.select().from(quoPhoneNumbers).orderBy(quoPhoneNumbers.id);
  if (numbers.length === 0) return null;
  const defaultId = process.env.QUO_DEFAULT_FROM_NUMBER_ID;
  return (
    numbers.find((n) => repId !== null && n.assignedUserId === repId) ??
    numbers.find((n) => defaultId && n.quoPhoneNumberId === defaultId) ??
    numbers[0]
  );
}

export async function sendContactSms(
  contactId: number,
  body: string,
  label: string,
): Promise<SmsResult> {
  const [contact] = await db.select().from(contacts).where(eq(contacts.id, contactId)).limit(1);
  if (!contact) return { sent: false, reason: 'contact not found' };
  if (contact.smsOptOut) return { sent: false, reason: 'opted out' };
  const to = toE164(contact.phone);
  if (!to) return { sent: false, reason: 'no valid mobile number' };
  if (!quoService.isConfigured()) return { sent: false, reason: 'quo not configured' };
  const from = await pickFromNumber(contact.assignedAgentId);
  if (!from) return { sent: false, reason: 'no quo phone number' };

  try {
    const result = await quoService.sendSMS(from.quoPhoneNumberId, to, body);
    await db.insert(smsMessages).values({
      quoMessageId: result?.id ?? null,
      contactId,
      agentId: contact.assignedAgentId,
      direction: 'outbound',
      body,
      status: 'sent',
      quoPhoneNumberId: from.quoPhoneNumberId,
      participantNumber: to,
      sentAt: new Date(),
    });
    await db.insert(activities).values({
      contactId,
      userId: contact.assignedAgentId,
      activityType: 'SMS Sent',
      subject: label,
      body,
    });
    return { sent: true, body };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.error(`${label} failed for contact ${contactId}:`, err);
    await db.insert(activities).values({
      contactId,
      activityType: 'Note',
      subject: `${label} failed`,
      body: reason,
    });
    return { sent: false, reason };
  }
}

/** Text a rep's own phone. Best-effort; never throws. */
export async function alertRep(repId: number | null | undefined, body: string): Promise<boolean> {
  if (!repId || !quoService.isConfigured()) return false;
  try {
    const [rep] = await db.select().from(users).where(eq(users.id, repId)).limit(1);
    const cell = toE164(rep?.phone);
    const from = await pickFromNumber(repId);
    // A line cannot text itself.
    if (!cell || !from || cell === toE164(from.phoneNumber)) return false;
    await quoService.sendSMS(from.quoPhoneNumberId, cell, body);
    return true;
  } catch (err) {
    console.error(`Rep alert failed for user ${repId}:`, err);
    return false;
  }
}

export const contactLabel = (c: { firstName: string; lastName: string; phone: string | null }) =>
  `${c.firstName} ${c.lastName}${c.phone ? `, ${formatPhone(c.phone)}` : ''}`;
