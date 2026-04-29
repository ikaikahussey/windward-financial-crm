import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { db } from '../db';
import { users } from '../db/schema';
import { asc, eq } from 'drizzle-orm';

const router = Router();

const VALID_ROLES = ['admin', 'agent', 'viewer'] as const;
type Role = (typeof VALID_ROLES)[number];
const isRole = (v: unknown): v is Role =>
  typeof v === 'string' && (VALID_ROLES as readonly string[]).includes(v);

function shape(u: typeof users.$inferSelect) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    phone: u.phone,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

// GET / — list users
router.get('/', async (_req: Request, res: Response) => {
  try {
    const rows = await db.select().from(users).orderBy(asc(users.name));
    return res.json({ users: rows.map(shape) });
  } catch (error) {
    console.error('List users error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / — create user
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, email, role, phone, password } = req.body ?? {};
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email, and password are required' });
    }
    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'password must be at least 8 characters' });
    }
    const userRole = isRole(role) ? role : 'agent';

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'A user with that email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [u] = await db
      .insert(users)
      .values({ name, email, role: userRole, phone: phone ?? null, passwordHash })
      .returning();
    return res.status(201).json({ user: shape(u) });
  } catch (error) {
    console.error('Create user error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /:id — update user (password optional; only set when provided)
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'invalid id' });
    const { name, email, role, phone, password } = req.body ?? {};

    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (typeof name === 'string') update.name = name;
    if (typeof email === 'string') update.email = email;
    if (role !== undefined) {
      if (!isRole(role)) return res.status(400).json({ error: 'invalid role' });
      update.role = role;
    }
    if (phone !== undefined) update.phone = phone;
    if (password) {
      if (typeof password !== 'string' || password.length < 8) {
        return res.status(400).json({ error: 'password must be at least 8 characters' });
      }
      update.passwordHash = await bcrypt.hash(password, 10);
    }

    const [u] = await db
      .update(users)
      .set(update)
      .where(eq(users.id, id))
      .returning();
    if (!u) return res.status(404).json({ error: 'User not found' });
    return res.json({ user: shape(u) });
  } catch (error: unknown) {
    // Catch unique-email collision on update
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === '23505'
    ) {
      return res.status(409).json({ error: 'A user with that email already exists' });
    }
    console.error('Update user error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id — delete user (cannot delete self)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'invalid id' });
    if (req.session.userId === id) {
      return res.status(400).json({ error: 'You cannot delete yourself' });
    }
    const [u] = await db.delete(users).where(eq(users.id, id)).returning();
    if (!u) return res.status(404).json({ error: 'User not found' });
    return res.json({ deleted: true });
  } catch (error: unknown) {
    // FK constraint — user is referenced by tasks/contacts/etc.
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === '23503'
    ) {
      return res.status(409).json({
        error:
          'Cannot delete this user because they are still referenced by other records (contacts, tasks, etc.)',
      });
    }
    console.error('Delete user error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
