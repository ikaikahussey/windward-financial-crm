import { db } from '../db';
import { contacts, pipelineEntries, users } from '../db/schema';
import { asc, desc, eq } from 'drizzle-orm';
import { processStageChange } from './automation';

/**
 * Event-driven pipeline stages: things that happen (a booking, a call, a
 * reply, a policy) move the contact, so nobody has to drag cards by hand.
 */

export type Stage =
  | 'New Lead'
  | 'Contacted'
  | 'Consultation Scheduled'
  | 'Consultation Completed'
  | 'Proposal Sent'
  | 'Application Submitted'
  | 'Policy Issued'
  | 'Active Client'
  | 'Lost / Not Now';

export async function currentStage(contactId: number): Promise<Stage | null> {
  const [row] = await db
    .select({ stage: pipelineEntries.pipelineStage })
    .from(pipelineEntries)
    .where(eq(pipelineEntries.contactId, contactId))
    .orderBy(desc(pipelineEntries.movedAt), desc(pipelineEntries.id))
    .limit(1);
  return (row?.stage as Stage) ?? null;
}

/** Who a system-triggered change is attributed to: the contact's rep, else the first admin. */
async function actorFor(contactId: number): Promise<number | null> {
  const [c] = await db
    .select({ rep: contacts.assignedAgentId })
    .from(contacts)
    .where(eq(contacts.id, contactId))
    .limit(1);
  if (c?.rep) return c.rep;
  const [admin] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, 'admin'))
    .orderBy(asc(users.id))
    .limit(1);
  if (admin) return admin.id;
  const [any] = await db.select({ id: users.id }).from(users).orderBy(asc(users.id)).limit(1);
  return any?.id ?? null;
}

/**
 * Move a contact to `to` if its current stage is one of `from`. Fires the
 * same automations as a manual move. Returns true if the contact moved.
 */
export async function advanceStage(
  contactId: number,
  to: Stage,
  from: (Stage | null)[],
): Promise<boolean> {
  const current = await currentStage(contactId);
  if (current === to || !from.includes(current)) return false;
  const actor = await actorFor(contactId);
  if (!actor) return false;
  await processStageChange(contactId, current, to, actor);
  await db.update(contacts).set({ updatedAt: new Date() }).where(eq(contacts.id, contactId));
  return true;
}

export const BEFORE_CONSULTATION: (Stage | null)[] = [null, 'New Lead', 'Contacted', 'Lost / Not Now'];
export const BEFORE_APPLICATION: (Stage | null)[] = [
  ...BEFORE_CONSULTATION,
  'Consultation Scheduled',
  'Consultation Completed',
  'Proposal Sent',
];
