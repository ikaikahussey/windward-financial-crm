import { Router, Request, Response } from 'express';
import { db } from '../db';
import { policies, activities } from '../db/schema';
import { eq, desc } from 'drizzle-orm';

const router = Router();

// GET / — list policies (optionally by contact_id)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { contact_id } = req.query;

    const query = db.select().from(policies);

    const rows = contact_id
      ? await query
          .where(eq(policies.contactId, parseInt(contact_id as string, 10)))
          .orderBy(desc(policies.createdAt))
      : await query.orderBy(desc(policies.createdAt));

    return res.json(rows);
  } catch (error) {
    console.error('List policies error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id — single policy
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const [policy] = await db.select().from(policies).where(eq(policies.id, id)).limit(1);

    if (!policy) {
      return res.status(404).json({ error: 'Policy not found' });
    }

    return res.json(policy);
  } catch (error) {
    console.error('Get policy error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / — create policy + activity on contact
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      contactId, productType, carrier, policyNumber,
      annualPremium, status, issueDate, expiryDate, notes,
    } = req.body;

    if (!contactId || !productType) {
      return res.status(400).json({ error: 'contactId and productType are required' });
    }

    const [policy] = await db.insert(policies).values({
      contactId,
      productType,
      carrier,
      policyNumber,
      annualPremium,
      status: status || 'Applied',
      issueDate: issueDate ? new Date(issueDate) : null,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      notes,
    }).returning();

    // Create activity on the contact
    await db.insert(activities).values({
      contactId,
      userId: req.session.userId,
      activityType: 'Policy Added',
      subject: `Policy added: ${productType}`,
      body: `${productType}${carrier ? ` with ${carrier}` : ''}${policyNumber ? ` (${policyNumber})` : ''}`,
    });

    return res.status(201).json(policy);
  } catch (error) {
    console.error('Create policy error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /:id — update policy
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const updateData = { ...req.body };
    delete updateData.id;
    delete updateData.createdAt;

    if (updateData.issueDate) updateData.issueDate = new Date(updateData.issueDate);
    if (updateData.expiryDate) updateData.expiryDate = new Date(updateData.expiryDate);

    const [updated] = await db
      .update(policies)
      .set(updateData)
      .where(eq(policies.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Policy not found' });
    }

    return res.json(updated);
  } catch (error) {
    console.error('Update policy error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id — delete policy
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);

    const [deleted] = await db
      .delete(policies)
      .where(eq(policies.id, id))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: 'Policy not found' });
    }

    return res.json({ message: 'Policy deleted' });
  } catch (error) {
    console.error('Delete policy error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
