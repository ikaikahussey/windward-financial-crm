import { Router, Request, Response } from 'express';
import { db } from '../db';
import { emailTemplates } from '../db/schema';
import { eq, isNotNull, asc, desc } from 'drizzle-orm';

const router = Router();

// GET /sequence — templates in a sequence (must be before /:id)
router.get('/sequence', async (req: Request, res: Response) => {
  try {
    const rows = await db
      .select()
      .from(emailTemplates)
      .where(isNotNull(emailTemplates.sequencePosition))
      .orderBy(asc(emailTemplates.sequencePosition));

    return res.json(rows);
  } catch (error) {
    console.error('Get sequence error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET / — list all templates
router.get('/', async (req: Request, res: Response) => {
  try {
    const rows = await db
      .select()
      .from(emailTemplates)
      .orderBy(desc(emailTemplates.createdAt));

    return res.json(rows);
  } catch (error) {
    console.error('List templates error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id — single template
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const [template] = await db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.id, id))
      .limit(1);

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    return res.json(template);
  } catch (error) {
    console.error('Get template error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / — create template
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, subject, body, sequencePosition, delayDays } = req.body;

    if (!name || !subject || !body) {
      return res.status(400).json({ error: 'name, subject, and body are required' });
    }

    const [template] = await db.insert(emailTemplates).values({
      name,
      subject,
      body,
      sequencePosition: sequencePosition ?? null,
      delayDays: delayDays ?? null,
    }).returning();

    return res.status(201).json(template);
  } catch (error) {
    console.error('Create template error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /:id — update template
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const updateData = { ...req.body, updatedAt: new Date() };
    delete updateData.id;
    delete updateData.createdAt;

    const [updated] = await db
      .update(emailTemplates)
      .set(updateData)
      .where(eq(emailTemplates.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Template not found' });
    }

    return res.json(updated);
  } catch (error) {
    console.error('Update template error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id — delete template
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);

    const [deleted] = await db
      .delete(emailTemplates)
      .where(eq(emailTemplates.id, id))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: 'Template not found' });
    }

    return res.json({ message: 'Template deleted' });
  } catch (error) {
    console.error('Delete template error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
