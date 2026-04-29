import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../db';
import { contacts, leadScoreHistory } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { rescoreAllLeads } from '../services/lead-scoring';

let testContactIds: number[] = [];

beforeAll(async () => {
  const inserted = await db
    .insert(contacts)
    .values([
      {
        firstName: 'Score',
        lastName: 'A',
        employmentType: 'DOE Teacher',
        leadSource: 'Referral',
      },
      {
        firstName: 'Score',
        lastName: 'B',
        employmentType: 'Other',
        leadSource: 'Other',
      },
    ])
    .returning({ id: contacts.id });
  testContactIds = inserted.map((r) => r.id);
});

afterAll(async () => {
  for (const id of testContactIds) {
    await db.delete(leadScoreHistory).where(eq(leadScoreHistory.contactId, id));
    await db.delete(contacts).where(eq(contacts.id, id));
  }
});

describe('rescoreAllLeads', () => {
  it('produces one history row per contact and populates previous_score on the second run', async () => {
    await rescoreAllLeads(null);
    await rescoreAllLeads(null);

    for (const id of testContactIds) {
      const rows = await db
        .select()
        .from(leadScoreHistory)
        .where(eq(leadScoreHistory.contactId, id))
        .orderBy(desc(leadScoreHistory.scoredAt));
      // At least 2 rows from our two runs (others may exist from prior runs)
      expect(rows.length).toBeGreaterThanOrEqual(2);
      // The most recent row's previous_score should equal the score of the
      // row immediately before it.
      expect(rows[0].previousScore).toBe(rows[1].score);
    }
  });
});
