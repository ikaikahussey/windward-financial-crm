import { Router, Request, Response } from 'express';
import { db } from '../db';
import { clientRoster } from '../db/schema';
import { eq, asc, sql } from 'drizzle-orm';

const router = Router();

// GET / — list all roster rows
router.get('/', async (_req: Request, res: Response) => {
  try {
    const rows = await db.select().from(clientRoster).orderBy(asc(clientRoster.name));
    return res.json(rows);
  } catch (error) {
    console.error('List client roster error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / — add a roster row
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, policyNumbers, notes, contactId } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'name is required' });
    }

    const [row] = await db.insert(clientRoster).values({
      name: String(name).trim(),
      policyNumbers: policyNumbers || null,
      notes: notes || null,
      contactId: contactId || null,
    }).returning();

    return res.status(201).json(row);
  } catch (error) {
    console.error('Create client roster row error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /import — pull in CRM contacts that have policies but aren't on the roster yet
router.post('/import', async (_req: Request, res: Response) => {
  try {
    const result = await db.execute(sql`
      INSERT INTO client_roster (name, policy_numbers, notes, contact_id)
      SELECT
        c.first_name || ' ' || c.last_name,
        string_agg(p.policy_number, ', ' ORDER BY p.id) FILTER (WHERE p.policy_number IS NOT NULL AND p.policy_number <> ''),
        NULL,
        c.id
      FROM contacts c
      JOIN policies p ON p.contact_id = c.id
      WHERE c.id NOT IN (SELECT contact_id FROM client_roster WHERE contact_id IS NOT NULL)
      GROUP BY c.id
      RETURNING id
    `);

    return res.json({ imported: result.length });
  } catch (error) {
    console.error('Import client roster error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /:id — update a roster row
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { name, policyNumbers, notes } = req.body;

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) {
      if (!String(name).trim()) {
        return res.status(400).json({ error: 'name cannot be empty' });
      }
      updateData.name = String(name).trim();
    }
    if (policyNumbers !== undefined) updateData.policyNumbers = policyNumbers || null;
    if (notes !== undefined) updateData.notes = notes || null;

    const [updated] = await db
      .update(clientRoster)
      .set(updateData)
      .where(eq(clientRoster.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Client not found' });
    }

    return res.json(updated);
  } catch (error) {
    console.error('Update client roster row error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id — remove a roster row
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);

    const [deleted] = await db
      .delete(clientRoster)
      .where(eq(clientRoster.id, id))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: 'Client not found' });
    }

    return res.json({ message: 'Client removed from roster' });
  } catch (error) {
    console.error('Delete client roster row error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
