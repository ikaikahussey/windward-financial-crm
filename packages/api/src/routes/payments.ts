import { Router, Request, Response } from 'express';
import { db } from '../db';
import { payments } from '../db/schema';
import { eq, desc } from 'drizzle-orm';

const router = Router();

// GET / — list payments (newest first)
router.get('/', async (_req: Request, res: Response) => {
  try {
    const rows = await db
      .select()
      .from(payments)
      .orderBy(desc(payments.paymentDate), desc(payments.id));

    return res.json(rows);
  } catch (error) {
    console.error('List payments error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / — record a payment
router.post('/', async (req: Request, res: Response) => {
  try {
    const { payeeName, paymentDate, amount, account, notes } = req.body;

    if (!payeeName || !String(payeeName).trim()) {
      return res.status(400).json({ error: 'payeeName is required' });
    }
    const parsedAmount = parseFloat(amount);
    if (amount === undefined || amount === null || amount === '' || Number.isNaN(parsedAmount)) {
      return res.status(400).json({ error: 'amount must be a number' });
    }
    if (!paymentDate) {
      return res.status(400).json({ error: 'paymentDate is required' });
    }

    const [row] = await db.insert(payments).values({
      payeeName: String(payeeName).trim(),
      paymentDate: new Date(paymentDate),
      amount: parsedAmount.toFixed(2),
      account: account || 'Checking',
      notes: notes || null,
    }).returning();

    return res.status(201).json(row);
  } catch (error) {
    console.error('Create payment error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /:id — update a payment
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { payeeName, paymentDate, amount, account, notes } = req.body;

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (payeeName !== undefined) {
      if (!String(payeeName).trim()) {
        return res.status(400).json({ error: 'payeeName cannot be empty' });
      }
      updateData.payeeName = String(payeeName).trim();
    }
    if (paymentDate !== undefined) {
      if (!paymentDate) {
        return res.status(400).json({ error: 'paymentDate cannot be empty' });
      }
      updateData.paymentDate = new Date(paymentDate);
    }
    if (amount !== undefined) {
      const parsedAmount = parseFloat(amount);
      if (Number.isNaN(parsedAmount)) {
        return res.status(400).json({ error: 'amount must be a number' });
      }
      updateData.amount = parsedAmount.toFixed(2);
    }
    if (account !== undefined) updateData.account = account || 'Checking';
    if (notes !== undefined) updateData.notes = notes || null;

    const [updated] = await db
      .update(payments)
      .set(updateData)
      .where(eq(payments.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    return res.json(updated);
  } catch (error) {
    console.error('Update payment error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id — remove a payment
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);

    const [deleted] = await db
      .delete(payments)
      .where(eq(payments.id, id))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    return res.json({ message: 'Payment deleted' });
  } catch (error) {
    console.error('Delete payment error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
