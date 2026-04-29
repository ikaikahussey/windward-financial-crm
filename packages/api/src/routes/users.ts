import { Router, Request, Response } from 'express';
import { db } from '../db';
import { users } from '../db/schema';
import { asc } from 'drizzle-orm';

const router = Router();

// GET / — list users (for agent pickers, etc.)
router.get('/', async (_req: Request, res: Response) => {
  try {
    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        phone: users.phone,
      })
      .from(users)
      .orderBy(asc(users.name));
    return res.json({ users: rows });
  } catch (error) {
    console.error('List users error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
