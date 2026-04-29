import { Router, Request, Response } from 'express';
import { db } from '../db';
import {
  callLogs,
  smsMessages,
  activities,
  contacts,
  webhookEvents,
} from '../db/schema';
import { eq, ilike } from 'drizzle-orm';

const router = Router();

// Helper: look up contact by phone number
async function findContactByPhone(phoneNumber: string) {
  if (!phoneNumber) return null;
  const digits = phoneNumber.replace(/\D/g, '');
  const last10 = digits.slice(-10);
  if (!last10) return null;
  const pattern = `%${last10}`;
  const [contact] = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(ilike(contacts.phone, pattern))
    .limit(1);
  return contact ?? null;
}

/**
 * Wrap a webhook handler so every request writes a `webhook_events` row.
 * The handler returns the matched contact id (or null); the wrapper handles
 * status, error, and processing-time bookkeeping.
 */
function instrumented(
  handler: (req: Request, res: Response) => Promise<{ matchedContactId: number | null; body?: unknown }>,
) {
  return async (req: Request, res: Response) => {
    const start = Date.now();
    const eventType =
      typeof req.body?.event === 'string' ? req.body.event : 'unknown';
    const [evt] = await db
      .insert(webhookEvents)
      .values({
        source: 'quo',
        eventType,
        payload: req.body ?? {},
        status: 'received',
      })
      .returning({ id: webhookEvents.id });

    try {
      const { matchedContactId, body } = await handler(req, res);
      await db
        .update(webhookEvents)
        .set({
          status: 'processed',
          matchedContactId,
          processingMs: Date.now() - start,
        })
        .where(eq(webhookEvents.id, evt.id));
      if (body !== undefined && !res.headersSent) {
        res.json(body);
      }
    } catch (err) {
      const errMsg =
        err instanceof Error ? err.stack ?? err.message : String(err);
      await db
        .update(webhookEvents)
        .set({
          status: 'error',
          error: errMsg,
          processingMs: Date.now() - start,
        })
        .where(eq(webhookEvents.id, evt.id));
      console.error(`Quo webhook error (${eventType}):`, err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };
}

// POST /calls
router.post(
  '/calls',
  instrumented(async (req) => {
    const { event, data } = req.body ?? {};
    if (!event || !data) {
      return { matchedContactId: null, body: { error: 'event and data are required' } };
    }

    if (event === 'call.completed') {
      const participantNumber = data.participantNumber || data.from || data.to;
      const contact = await findContactByPhone(participantNumber);
      const direction = data.direction || 'inbound';
      const activityType =
        direction === 'inbound' ? 'Call Inbound' : 'Call Outbound';

      const existing = data.callId
        ? await db
            .select()
            .from(callLogs)
            .where(eq(callLogs.quoCallId, data.callId))
            .limit(1)
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
        await db
          .insert(callLogs)
          .values({
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
          })
          .returning();

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
      return { matchedContactId: contact?.id ?? null, body: { received: true } };
    }

    if (event === 'call.recording.completed') {
      if (data.callId) {
        await db
          .update(callLogs)
          .set({ recordingUrl: data.recordingUrl })
          .where(eq(callLogs.quoCallId, data.callId));
      }
      return { matchedContactId: null, body: { received: true } };
    }

    return { matchedContactId: null, body: { received: true, unhandled: event } };
  }),
);

// POST /messages
router.post(
  '/messages',
  instrumented(async (req) => {
    const { event, data } = req.body ?? {};
    if (!event || !data) {
      return {
        matchedContactId: null,
        body: { error: 'event and data are required' },
      };
    }

    if (event === 'message.received') {
      const participantNumber = data.from || data.participantNumber;
      const contact = await findContactByPhone(participantNumber);

      const [message] = await db
        .insert(smsMessages)
        .values({
          quoMessageId: data.messageId || null,
          contactId: contact?.id ?? null,
          agentId: data.agentId ?? null,
          direction: 'inbound',
          body: data.body || data.content || '',
          status: 'received',
          quoPhoneNumberId: data.quoPhoneNumberId ?? null,
          participantNumber,
          sentAt: new Date(),
        })
        .returning();

      if (contact?.id) {
        await db.insert(activities).values({
          contactId: contact.id,
          userId: data.agentId ?? null,
          activityType: 'SMS Received',
          subject: 'SMS received',
          body: data.body || data.content || '',
        });
      }

      return {
        matchedContactId: contact?.id ?? null,
        body: { received: true, id: message.id },
      };
    }

    if (event === 'message.delivered') {
      if (data.messageId) {
        await db
          .update(smsMessages)
          .set({ status: 'delivered' })
          .where(eq(smsMessages.quoMessageId, data.messageId));
      }
      return { matchedContactId: null, body: { received: true } };
    }

    return {
      matchedContactId: null,
      body: { received: true, unhandled: event },
    };
  }),
);

// POST /call-summaries
router.post(
  '/call-summaries',
  instrumented(async (req) => {
    const { callId, summary } = req.body ?? {};
    if (!callId || !summary) {
      return {
        matchedContactId: null,
        body: { error: 'callId and summary are required' },
      };
    }
    await db
      .update(callLogs)
      .set({ aiSummary: summary })
      .where(eq(callLogs.quoCallId, callId));

    const [match] = await db
      .select({ contactId: callLogs.contactId })
      .from(callLogs)
      .where(eq(callLogs.quoCallId, callId))
      .limit(1);

    return {
      matchedContactId: match?.contactId ?? null,
      body: { received: true },
    };
  }),
);

// POST /call-transcripts
router.post(
  '/call-transcripts',
  instrumented(async (req) => {
    const { callId, transcription } = req.body ?? {};
    if (!callId || !transcription) {
      return {
        matchedContactId: null,
        body: { error: 'callId and transcription are required' },
      };
    }
    await db
      .update(callLogs)
      .set({ transcription })
      .where(eq(callLogs.quoCallId, callId));

    const [match] = await db
      .select({ contactId: callLogs.contactId })
      .from(callLogs)
      .where(eq(callLogs.quoCallId, callId))
      .limit(1);

    return {
      matchedContactId: match?.contactId ?? null,
      body: { received: true },
    };
  }),
);

export default router;
