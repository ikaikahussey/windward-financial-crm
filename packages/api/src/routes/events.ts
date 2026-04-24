import { Router, Request, Response } from 'express';
import { db } from '../db';
import { events, eventRegistrations } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { triggerRebuild } from '../services/rebuild-trigger';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const rows = await db.select().from(events).orderBy(desc(events.eventDate));
    return res.json(rows);
  } catch (error) {
    console.error('List events error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const [row] = await db.select().from(events).where(eq(events.id, id)).limit(1);
    if (!row) return res.status(404).json({ error: 'Event not found' });
    return res.json(row);
  } catch (error) {
    console.error('Get event error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id/registrations', async (req: Request, res: Response) => {
  try {
    const eventId = parseInt(req.params.id as string, 10);
    const rows = await db
      .select()
      .from(eventRegistrations)
      .where(eq(eventRegistrations.eventId, eventId))
      .orderBy(desc(eventRegistrations.registeredAt));
    return res.json(rows);
  } catch (error) {
    console.error('List registrations error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      title, description, eventDate, endDate, location,
      zoomLink, registrationRequired, maxAttendees, isPublished,
    } = req.body;
    if (!title || !description || !eventDate) {
      return res.status(400).json({ error: 'title, description, and eventDate are required' });
    }
    const [row] = await db.insert(events).values({
      title, description,
      eventDate: new Date(eventDate),
      endDate: endDate ? new Date(endDate) : null,
      location, zoomLink,
      registrationRequired: registrationRequired ?? true,
      maxAttendees: maxAttendees ?? null,
      isPublished: isPublished ?? true,
    }).returning();

    await triggerRebuild(`event created: ${row.id}`);
    return res.status(201).json(row);
  } catch (error) {
    console.error('Create event error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const updateData = { ...req.body, updatedAt: new Date() };
    delete updateData.id;
    delete updateData.createdAt;
    if (updateData.eventDate) updateData.eventDate = new Date(updateData.eventDate);
    if (updateData.endDate) updateData.endDate = new Date(updateData.endDate);
    const [updated] = await db.update(events).set(updateData).where(eq(events.id, id)).returning();
    if (!updated) return res.status(404).json({ error: 'Event not found' });

    await triggerRebuild(`event updated: ${id}`);
    return res.json(updated);
  } catch (error) {
    console.error('Update event error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    await db.delete(eventRegistrations).where(eq(eventRegistrations.eventId, id));
    const [deleted] = await db.delete(events).where(eq(events.id, id)).returning();
    if (!deleted) return res.status(404).json({ error: 'Event not found' });

    await triggerRebuild(`event deleted: ${id}`);
    return res.json({ message: 'Event deleted' });
  } catch (error) {
    console.error('Delete event error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
