import { Router, Request, Response } from 'express';
import { db } from '../db';
import { callLogs, smsMessages, activities, contacts } from '../db/schema';
import { eq, or, ilike } from 'drizzle-orm';

const router = Router();

// Helper: look up contact by phone number
async function findContactByPhone(phoneNumber: string) {
  if (!phoneNumber) return null;

  // Normalize: strip non-digits, try matching with and without country code
  const digits = phoneNumber.replace(/\D/g, '');
  const last10 = digits.slice(-10);
  const pattern = `%${last10}`;

  const [contact] = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(ilike(contacts.phone, pattern))
    .limit(1);

  return contact ?? null;
}

// POST /calls — handle call webhooks
router.post('/calls', async (req: Request, res: Response) => {
  try {
    const { event, data } = req.body;

    if (!event || !data) {
      return res.status(400).json({ error: 'event and data are required' });
    }

    if (event === 'call.completed') {
      const participantNumber = data.participantNumber || data.from || data.to;
      const contact = await findContactByPhone(participantNumber);

      const direction = data.direction || 'inbound';
      const activityType = direction === 'inbound' ? 'Call Inbound' : 'Call Outbound';

      // Upsert call log
      const existing = data.callId
        ? await db.select().from(callLogs).where(eq(callLogs.quoCallId, data.callId)).limit(1)
        : [];

      if (existing.length > 0) {
        await db
          .update(callLogs)
          .set({
            status: data.status || 'completed',
            durationSeconds: data.durationSeconds ?? data.duration,
            completedAt: data.completedAt ? new Date(data.completedAt) : new Date(),
            contactId: contact?.id ?? existing[0].contactId,
          })
          .where(eq(callLogs.id, existing[0].id));
      } else {
        const [callLog] = await db.insert(callLogs).values({
          quoCallId: data.callId || null,
          contactId: contact?.id ?? null,
          agentId: data.agentId ?? null,
          direction,
          status: data.status || 'completed',
          durationSeconds: data.durationSeconds ?? data.duration,
          startedAt: data.startedAt ? new Date(data.startedAt) : null,
          completedAt: data.completedAt ? new Date(data.completedAt) : new Date(),
          quoPhoneNumberId: data.quoPhoneNumberId ?? null,
          participantNumber,
        }).returning();

        // Create activity if contact matched
        if (contact?.id) {
          await db.insert(activities).values({
            contactId: contact.id,
            userId: data.agentId ?? null,
            activityType,
            subject: `${direction === 'inbound' ? 'Inbound' : 'Outbound'} call${data.durationSeconds ? ` (${data.durationSeconds}s)` : ''}`,
            body: data.summary ?? null,
          });
        }
      }

      return res.json({ received: true });
    }

    if (event === 'call.recording.completed') {
      if (data.callId) {
        await db
          .update(callLogs)
          .set({ recordingUrl: data.recordingUrl })
          .where(eq(callLogs.quoCallId, data.callId));
      }
      return res.json({ received: true });
    }

    return res.json({ received: true, unhandled: event });
  } catch (error) {
    console.error('Call webhook error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /messages — handle message webhooks
router.post('/messages', async (req: Request, res: Response) => {
  try {
    const { event, data } = req.body;

    if (!event || !data) {
      return res.status(400).json({ error: 'event and data are required' });
    }

    if (event === 'message.received') {
      const participantNumber = data.from || data.participantNumber;
      const contact = await findContactByPhone(participantNumber);

      const [message] = await db.insert(smsMessages).values({
        quoMessageId: data.messageId || null,
        contactId: contact?.id ?? null,
        agentId: data.agentId ?? null,
        direction: 'inbound',
        body: data.body || data.content || '',
        status: 'received',
        quoPhoneNumberId: data.quoPhoneNumberId ?? null,
        participantNumber,
        sentAt: new Date(),
      }).returning();

      if (contact?.id) {
        await db.insert(activities).values({
          contactId: contact.id,
          userId: data.agentId ?? null,
          activityType: 'SMS Received',
          subject: 'SMS received',
          body: data.body || data.content || '',
        });
      }

      return res.json({ received: true, id: message.id });
    }

    if (event === 'message.delivered') {
      if (data.messageId) {
        await db
          .update(smsMessages)
          .set({ status: 'delivered' })
          .where(eq(smsMessages.quoMessageId, data.messageId));
      }
      return res.json({ received: true });
    }

    return res.json({ received: true, unhandled: event });
  } catch (error) {
    console.error('Message webhook error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /call-summaries — update AI summary on call log
router.post('/call-summaries', async (req: Request, res: Response) => {
  try {
    const { callId, summary } = req.body;

    if (!callId || !summary) {
      return res.status(400).json({ error: 'callId and summary are required' });
    }

    await db
      .update(callLogs)
      .set({ aiSummary: summary })
      .where(eq(callLogs.quoCallId, callId));

    return res.json({ received: true });
  } catch (error) {
    console.error('Call summary webhook error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /call-transcripts — update transcription on call log
router.post('/call-transcripts', async (req: Request, res: Response) => {
  try {
    const { callId, transcription } = req.body;

    if (!callId || !transcription) {
      return res.status(400).json({ error: 'callId and transcription are required' });
    }

    await db
      .update(callLogs)
      .set({ transcription })
      .where(eq(callLogs.quoCallId, callId));

    return res.json({ received: true });
  } catch (error) {
    console.error('Call transcript webhook error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
