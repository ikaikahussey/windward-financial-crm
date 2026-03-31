import { Router, Request, Response } from 'express';
import { db } from '../db';
import { appointments } from '../db/schema';
import { eq, and, gte, lte, desc, SQL } from 'drizzle-orm';

const router = Router();

// GET / — list appointments with filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const { agent_id, status, date_from, date_to } = req.query;

    const conditions: SQL[] = [];

    if (agent_id) {
      conditions.push(eq(appointments.agentId, parseInt(agent_id as string, 10)));
    }
    if (status) {
      conditions.push(eq(appointments.status, status as any));
    }
    if (date_from) {
      conditions.push(gte(appointments.startTime, new Date(date_from as string)));
    }
    if (date_to) {
      conditions.push(lte(appointments.startTime, new Date(date_to as string)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const query = db.select().from(appointments);

    const rows = await (whereClause
      ? query.where(whereClause).orderBy(desc(appointments.startTime))
      : query.orderBy(desc(appointments.startTime)));

    return res.json(rows);
  } catch (error) {
    console.error('List appointments error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id — single appointment
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const [appointment] = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, id))
      .limit(1);

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    return res.json(appointment);
  } catch (error) {
    console.error('Get appointment error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / — create appointment
router.post('/', async (req: Request, res: Response) => {
  try {
    const { contactId, agentId, startTime, endTime, location, status, notes } = req.body;

    if (!contactId || !startTime || !endTime) {
      return res.status(400).json({ error: 'contactId, startTime, and endTime are required' });
    }

    const [appointment] = await db.insert(appointments).values({
      contactId,
      agentId: agentId || req.session.userId!,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      location,
      status: status || 'Scheduled',
      notes,
    }).returning();

    return res.status(201).json(appointment);
  } catch (error) {
    console.error('Create appointment error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /:id — update appointment
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const updateData = { ...req.body };
    delete updateData.id;
    delete updateData.createdAt;

    if (updateData.startTime) updateData.startTime = new Date(updateData.startTime);
    if (updateData.endTime) updateData.endTime = new Date(updateData.endTime);

    const [updated] = await db
      .update(appointments)
      .set(updateData)
      .where(eq(appointments.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    return res.json(updated);
  } catch (error) {
    console.error('Update appointment error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id — delete appointment
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);

    const [deleted] = await db
      .delete(appointments)
      .where(eq(appointments.id, id))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    return res.json({ message: 'Appointment deleted' });
  } catch (error) {
    console.error('Delete appointment error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
