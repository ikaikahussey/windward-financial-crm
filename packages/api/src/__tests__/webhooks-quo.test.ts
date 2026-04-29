import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import { db } from '../db';
import { webhookEvents, contacts, activities, smsMessages } from '../db/schema';
import { desc, eq } from 'drizzle-orm';
import webhooksQuoRoutes from '../routes/webhooks-quo';

let app: express.Express;
let testContactId: number;
let testPhone: string;

beforeAll(async () => {
  app = express();
  app.use(express.json());
  app.use('/api/webhooks/quo', webhooksQuoRoutes);

  // Insert a contact with a unique phone number for matching.
  testPhone = '+18085550' + Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  const [c] = await db
    .insert(contacts)
    .values({ firstName: 'Webhook', lastName: 'Test', phone: testPhone })
    .returning({ id: contacts.id });
  testContactId = c.id;
});

afterAll(async () => {
  await db.delete(activities).where(eq(activities.contactId, testContactId));
  await db.delete(smsMessages).where(eq(smsMessages.contactId, testContactId));
  await db
    .delete(webhookEvents)
    .where(eq(webhookEvents.matchedContactId, testContactId));
  await db.delete(contacts).where(eq(contacts.id, testContactId));
});

describe('Quo message webhook', () => {
  it('records a processed webhook_event with matched_contact_id when phone matches', async () => {
    const res = await request(app)
      .post('/api/webhooks/quo/messages')
      .send({
        event: 'message.received',
        data: { from: testPhone, body: 'hi' },
      });
    expect(res.status).toBe(200);

    const [evt] = await db
      .select()
      .from(webhookEvents)
      .where(eq(webhookEvents.eventType, 'message.received'))
      .orderBy(desc(webhookEvents.receivedAt))
      .limit(1);
    expect(evt.status).toBe('processed');
    expect(evt.matchedContactId).toBe(testContactId);
  });

  it('records processed with null matched_contact_id when phone does not match', async () => {
    const res = await request(app)
      .post('/api/webhooks/quo/messages')
      .send({
        event: 'message.received',
        data: { from: '+19999999999', body: 'no match' },
      });
    expect(res.status).toBe(200);

    const [evt] = await db
      .select()
      .from(webhookEvents)
      .where(eq(webhookEvents.eventType, 'message.received'))
      .orderBy(desc(webhookEvents.receivedAt))
      .limit(1);
    expect(evt.status).toBe('processed');
    expect(evt.matchedContactId).toBeNull();
  });
});
