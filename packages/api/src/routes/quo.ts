import { Router, Request, Response } from 'express';
import { db } from '../db';
import { callLogs, smsMessages, quoPhoneNumbers, activities, contacts } from '../db/schema';
import { eq, and, gte, lte, isNull, isNotNull, desc, SQL } from 'drizzle-orm';
import { requireAdmin } from '../middleware/auth';
import { quoService } from '../services/quo';

const router = Router();

// All routes require admin
router.use(requireAdmin);

// POST /sms — send SMS via QuoService
router.post('/sms', async (req: Request, res: Response) => {
  try {
    const { contactId, fromPhoneNumberId, content } = req.body;

    if (!contactId || !fromPhoneNumberId || !content) {
      return res.status(400).json({ error: 'contactId, fromPhoneNumberId, and content are required' });
    }

    // Get contact phone number
    const [contact] = await db
      .select()
      .from(contacts)
      .where(eq(contacts.id, contactId))
      .limit(1);

    if (!contact || !contact.phone) {
      return res.status(400).json({ error: 'Contact not found or has no phone number' });
    }

    // Send via QuoService
    const result = await quoService.sendSMS(fromPhoneNumberId, contact.phone, content);

    // Create sms_messages record
    const [message] = await db.insert(smsMessages).values({
      quoMessageId: result?.id ?? null,
      contactId,
      agentId: req.session.userId,
      direction: 'outbound',
      body: content,
      status: 'sent',
      quoPhoneNumberId: fromPhoneNumberId,
      participantNumber: contact.phone,
      sentAt: new Date(),
    }).returning();

    // Create activity
    await db.insert(activities).values({
      contactId,
      userId: req.session.userId,
      activityType: 'SMS Sent',
      subject: 'SMS sent',
      body: content,
    });

    return res.status(201).json(message);
  } catch (error) {
    console.error('Send SMS error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /calls — list call logs with filters
router.get('/calls', async (req: Request, res: Response) => {
  try {
    const {
      agent_id, direction, date_from, date_to,
      hasRecording, hasTranscription,
      page = '1', limit = '25',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 25));
    const offset = (pageNum - 1) * limitNum;

    const conditions: SQL[] = [];

    if (agent_id) {
      conditions.push(eq(callLogs.agentId, parseInt(agent_id as string, 10)));
    }
    if (direction) {
      conditions.push(eq(callLogs.direction, direction as any));
    }
    if (date_from) {
      conditions.push(gte(callLogs.startedAt, new Date(date_from as string)));
    }
    if (date_to) {
      conditions.push(lte(callLogs.startedAt, new Date(date_to as string)));
    }
    if (hasRecording === 'true') {
      conditions.push(isNotNull(callLogs.recordingUrl));
    }
    if (hasTranscription === 'true') {
      conditions.push(isNotNull(callLogs.transcription));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const query = db.select().from(callLogs);

    const rows = await (whereClause
      ? query.where(whereClause).orderBy(desc(callLogs.createdAt)).limit(limitNum).offset(offset)
      : query.orderBy(desc(callLogs.createdAt)).limit(limitNum).offset(offset));

    return res.json(rows);
  } catch (error) {
    console.error('List calls error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /calls/:id — single call log
router.get('/calls/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const [call] = await db.select().from(callLogs).where(eq(callLogs.id, id)).limit(1);

    if (!call) {
      return res.status(404).json({ error: 'Call log not found' });
    }

    return res.json(call);
  } catch (error) {
    console.error('Get call error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /messages — list SMS messages with filters
router.get('/messages', async (req: Request, res: Response) => {
  try {
    const { contact_id, direction, page = '1', limit = '25' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 25));
    const offset = (pageNum - 1) * limitNum;

    const conditions: SQL[] = [];

    if (contact_id) {
      conditions.push(eq(smsMessages.contactId, parseInt(contact_id as string, 10)));
    }
    if (direction) {
      conditions.push(eq(smsMessages.direction, direction as any));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const query = db.select().from(smsMessages);

    const rows = await (whereClause
      ? query.where(whereClause).orderBy(desc(smsMessages.createdAt)).limit(limitNum).offset(offset)
      : query.orderBy(desc(smsMessages.createdAt)).limit(limitNum).offset(offset));

    return res.json(rows);
  } catch (error) {
    console.error('List messages error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /phone-numbers — list Quo phone numbers
router.get('/phone-numbers', async (_req: Request, res: Response) => {
  try {
    const rows = await db.select().from(quoPhoneNumbers);
    return res.json(rows);
  } catch (error) {
    console.error('List phone numbers error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /sync — trigger full sync
router.post('/sync', async (_req: Request, res: Response) => {
  try {
    await quoService.fullSync();
    return res.json({ message: 'Sync completed' });
  } catch (error) {
    console.error('Sync error:', error);
    return res.status(500).json({ error: 'Sync failed' });
  }
});

// POST /webhooks/register — register webhooks
router.post('/webhooks/register', async (_req: Request, res: Response) => {
  try {
    const baseUrl = process.env.API_BASE_URL || _req.protocol + '://' + _req.get('host');
    await quoService.registerWebhooks(baseUrl);
    return res.json({ message: 'Webhooks registered' });
  } catch (error) {
    console.error('Register webhooks error:', error);
    return res.status(500).json({ error: 'Failed to register webhooks' });
  }
});

// GET /unmatched — calls/messages with null contact_id
router.get('/unmatched', async (_req: Request, res: Response) => {
  try {
    const unmatchedCalls = await db
      .select()
      .from(callLogs)
      .where(isNull(callLogs.contactId))
      .orderBy(desc(callLogs.createdAt));

    const unmatchedMessages = await db
      .select()
      .from(smsMessages)
      .where(isNull(smsMessages.contactId))
      .orderBy(desc(smsMessages.createdAt));

    return res.json({ calls: unmatchedCalls, messages: unmatchedMessages });
  } catch (error) {
    console.error('Get unmatched error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /unmatched/:type/:id/link — link call/message to a contact
router.post('/unmatched/:type/:id/link', async (req: Request, res: Response) => {
  try {
    const { type, id: recordId } = req.params;
    const { contactId } = req.body;

    if (!contactId) {
      return res.status(400).json({ error: 'contactId is required' });
    }

    const idNum = parseInt(recordId as string, 10);

    if (type === 'call') {
      const [updated] = await db
        .update(callLogs)
        .set({ contactId })
        .where(eq(callLogs.id, idNum))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: 'Call log not found' });
      }
      return res.json(updated);
    } else if (type === 'message') {
      const [updated] = await db
        .update(smsMessages)
        .set({ contactId })
        .where(eq(smsMessages.id, idNum))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: 'SMS message not found' });
      }
      return res.json(updated);
    } else {
      return res.status(400).json({ error: 'type must be "call" or "message"' });
    }
  } catch (error) {
    console.error('Link unmatched error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
