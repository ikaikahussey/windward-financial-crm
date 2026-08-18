import { Router, Request, Response } from 'express';
import { db } from '../db';
import { referrals, users } from '../db/schema';
import { eq, desc, getTableColumns } from 'drizzle-orm';

const router = Router();

const SOURCES = ['DOE', 'CHAMP'];

// GET / — list referrals with servicing agent name
router.get('/', async (_req: Request, res: Response) => {
  try {
    const rows = await db
      .select({
        ...getTableColumns(referrals),
        servicingAgentName: users.name,
      })
      .from(referrals)
      .leftJoin(users, eq(referrals.servicingAgentId, users.id))
      .orderBy(desc(referrals.referralDate), desc(referrals.id));

    return res.json(rows);
  } catch (error) {
    console.error('List referrals error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / — add a referral
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, phone, email, source, referralDate, servicingAgentId, notes } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'name is required' });
    }
    if (!source || !SOURCES.includes(source)) {
      return res.status(400).json({ error: 'source must be DOE or CHAMP' });
    }

    const [row] = await db.insert(referrals).values({
      name: String(name).trim(),
      phone: phone || null,
      email: email || null,
      source,
      referralDate: referralDate ? new Date(referralDate) : new Date(),
      servicingAgentId: servicingAgentId || null,
      notes: notes || null,
    }).returning();

    return res.status(201).json(row);
  } catch (error) {
    console.error('Create referral error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /:id — update a referral
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { name, phone, email, source, referralDate, servicingAgentId, notes } = req.body;

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) {
      if (!String(name).trim()) {
        return res.status(400).json({ error: 'name cannot be empty' });
      }
      updateData.name = String(name).trim();
    }
    if (phone !== undefined) updateData.phone = phone || null;
    if (email !== undefined) updateData.email = email || null;
    if (source !== undefined) {
      if (!SOURCES.includes(source)) {
        return res.status(400).json({ error: 'source must be DOE or CHAMP' });
      }
      updateData.source = source;
    }
    if (referralDate !== undefined) {
      updateData.referralDate = referralDate ? new Date(referralDate) : null;
    }
    if (servicingAgentId !== undefined) updateData.servicingAgentId = servicingAgentId || null;
    if (notes !== undefined) updateData.notes = notes || null;

    const [updated] = await db
      .update(referrals)
      .set(updateData)
      .where(eq(referrals.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Referral not found' });
    }

    return res.json(updated);
  } catch (error) {
    console.error('Update referral error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id — remove a referral
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);

    const [deleted] = await db
      .delete(referrals)
      .where(eq(referrals.id, id))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: 'Referral not found' });
    }

    return res.json({ message: 'Referral deleted' });
  } catch (error) {
    console.error('Delete referral error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
