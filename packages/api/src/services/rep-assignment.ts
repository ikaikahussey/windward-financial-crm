import { db } from '../db';
import { contacts, users } from '../db/schema';
import { eq, sql } from 'drizzle-orm';

export type Rep = typeof users.$inferSelect;

/**
 * Return the contact's rep, assigning one if the contact has none.
 *
 * Assignment is round-robin across users flagged `is_lead_rep`: the rep who
 * was assigned a lead longest ago (or never) goes next. Returns null when no
 * user is flagged as a lead rep.
 */
export async function assignRep(contactId: number): Promise<Rep | null> {
  const [contact] = await db
    .select({ assignedAgentId: contacts.assignedAgentId })
    .from(contacts)
    .where(eq(contacts.id, contactId))
    .limit(1);
  if (!contact) return null;

  if (contact.assignedAgentId) {
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.id, contact.assignedAgentId))
      .limit(1);
    if (existing) return existing;
  }

  return db.transaction(async (tx) => {
    // Row lock so two simultaneous registrations don't pick the same rep.
    const [next] = await tx
      .select()
      .from(users)
      .where(eq(users.isLeadRep, true))
      .orderBy(sql`${users.lastLeadAssignedAt} ASC NULLS FIRST`, users.id)
      .limit(1)
      .for('update');
    if (!next) return null;

    const now = new Date();
    await tx.update(users).set({ lastLeadAssignedAt: now }).where(eq(users.id, next.id));
    await tx
      .update(contacts)
      .set({ assignedAgentId: next.id, updatedAt: now })
      .where(eq(contacts.id, contactId));
    return { ...next, lastLeadAssignedAt: now };
  });
}
