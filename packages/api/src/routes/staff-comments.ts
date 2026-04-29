import { Router, Request, Response } from 'express';
import { and, desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db';
import { staffComments, staffCommentReplies, users } from '../db/schema';

const router = Router();

const createSchema = z.object({
  pagePath: z.string().min(1).max(255),
  pageLabel: z.string().max(255).optional().nullable(),
  type: z.enum(['bug', 'improvement', 'question', 'praise']).default('improvement'),
  priority: z.enum(['low', 'normal', 'high']).default('normal'),
  title: z.string().min(1).max(500),
  body: z.string().max(10_000).optional().nullable(),
  userAgent: z.string().max(500).optional().nullable(),
  viewportWidth: z.number().int().min(0).max(20_000).optional().nullable(),
  viewportHeight: z.number().int().min(0).max(20_000).optional().nullable(),
});

const updateSchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'wont_fix']).optional(),
  priority: z.enum(['low', 'normal', 'high']).optional(),
  type: z.enum(['bug', 'improvement', 'question', 'praise']).optional(),
  title: z.string().min(1).max(500).optional(),
  body: z.string().max(10_000).optional().nullable(),
});

// List comments with optional filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const type = req.query.type as string | undefined;
    const pagePath = req.query.pagePath as string | undefined;
    const limit = Math.min(200, Math.max(1, parseInt((req.query.limit as string) || '100', 10)));

    const conditions = [] as ReturnType<typeof eq>[];
    if (status) conditions.push(eq(staffComments.status, status as never));
    if (type) conditions.push(eq(staffComments.type, type as never));
    if (pagePath) conditions.push(eq(staffComments.pagePath, pagePath));

    const whereClause = conditions.length ? and(...conditions) : undefined;

    const baseSelect = db
      .select({
        id: staffComments.id,
        pagePath: staffComments.pagePath,
        pageLabel: staffComments.pageLabel,
        type: staffComments.type,
        status: staffComments.status,
        priority: staffComments.priority,
        title: staffComments.title,
        body: staffComments.body,
        createdAt: staffComments.createdAt,
        updatedAt: staffComments.updatedAt,
        resolvedAt: staffComments.resolvedAt,
        createdById: staffComments.createdById,
        createdByName: users.name,
        replyCount: sql<number>`(
          SELECT count(*)::int FROM ${staffCommentReplies}
          WHERE ${staffCommentReplies.commentId} = ${staffComments.id}
        )`,
      })
      .from(staffComments)
      .leftJoin(users, eq(users.id, staffComments.createdById));

    const rows = await (whereClause
      ? baseSelect.where(whereClause).orderBy(desc(staffComments.createdAt)).limit(limit)
      : baseSelect.orderBy(desc(staffComments.createdAt)).limit(limit));

    return res.json({ comments: rows });
  } catch (err) {
    console.error('staff-comments list error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Summary counts (open + by-type + by-page)
router.get('/summary', async (_req: Request, res: Response) => {
  try {
    const [statusCounts, typeCounts, byPage] = await Promise.all([
      db
        .select({
          status: staffComments.status,
          count: sql<number>`count(*)::int`,
        })
        .from(staffComments)
        .groupBy(staffComments.status),
      db
        .select({
          type: staffComments.type,
          count: sql<number>`count(*)::int`,
        })
        .from(staffComments)
        .groupBy(staffComments.type),
      db
        .select({
          pagePath: staffComments.pagePath,
          pageLabel: staffComments.pageLabel,
          openCount: sql<number>`count(*) FILTER (WHERE ${staffComments.status} IN ('open', 'in_progress'))::int`,
          totalCount: sql<number>`count(*)::int`,
        })
        .from(staffComments)
        .groupBy(staffComments.pagePath, staffComments.pageLabel)
        .orderBy(sql`count(*) DESC`)
        .limit(20),
    ]);

    return res.json({
      byStatus: statusCounts,
      byType: typeCounts,
      byPage,
    });
  } catch (err) {
    console.error('staff-comments summary error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Single comment with replies
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'invalid id' });

    const [comment] = await db
      .select({
        id: staffComments.id,
        pagePath: staffComments.pagePath,
        pageLabel: staffComments.pageLabel,
        type: staffComments.type,
        status: staffComments.status,
        priority: staffComments.priority,
        title: staffComments.title,
        body: staffComments.body,
        userAgent: staffComments.userAgent,
        viewportWidth: staffComments.viewportWidth,
        viewportHeight: staffComments.viewportHeight,
        createdAt: staffComments.createdAt,
        updatedAt: staffComments.updatedAt,
        resolvedAt: staffComments.resolvedAt,
        createdById: staffComments.createdById,
        createdByName: users.name,
      })
      .from(staffComments)
      .leftJoin(users, eq(users.id, staffComments.createdById))
      .where(eq(staffComments.id, id));

    if (!comment) return res.status(404).json({ error: 'not found' });

    const replies = await db
      .select({
        id: staffCommentReplies.id,
        commentId: staffCommentReplies.commentId,
        body: staffCommentReplies.body,
        createdAt: staffCommentReplies.createdAt,
        createdById: staffCommentReplies.createdById,
        createdByName: users.name,
      })
      .from(staffCommentReplies)
      .leftJoin(users, eq(users.id, staffCommentReplies.createdById))
      .where(eq(staffCommentReplies.commentId, id))
      .orderBy(staffCommentReplies.createdAt);

    return res.json({ comment, replies });
  } catch (err) {
    console.error('staff-comments get error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Create
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ error: 'auth required' });

    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'invalid input', details: parsed.error.flatten() });
    }

    const [created] = await db
      .insert(staffComments)
      .values({
        ...parsed.data,
        createdById: userId,
      })
      .returning();

    return res.status(201).json({ comment: created });
  } catch (err) {
    console.error('staff-comments create error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Update
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ error: 'auth required' });

    const id = parseInt(req.params.id as string, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'invalid id' });

    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'invalid input', details: parsed.error.flatten() });
    }

    const updates: Record<string, unknown> = { ...parsed.data, updatedAt: new Date() };
    if (parsed.data.status === 'resolved' || parsed.data.status === 'wont_fix') {
      updates.resolvedAt = new Date();
      updates.resolvedById = userId;
    } else if (parsed.data.status === 'open' || parsed.data.status === 'in_progress') {
      updates.resolvedAt = null;
      updates.resolvedById = null;
    }

    const [updated] = await db
      .update(staffComments)
      .set(updates)
      .where(eq(staffComments.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: 'not found' });
    return res.json({ comment: updated });
  } catch (err) {
    console.error('staff-comments update error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete (admin only — but simple gate: allow author or admin)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ error: 'auth required' });
    const id = parseInt(req.params.id as string, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'invalid id' });

    const [existing] = await db.select().from(staffComments).where(eq(staffComments.id, id));
    if (!existing) return res.status(404).json({ error: 'not found' });

    const isAdmin = req.session.userRole === 'admin';
    if (!isAdmin && existing.createdById !== userId) {
      return res.status(403).json({ error: 'forbidden' });
    }

    await db.delete(staffComments).where(eq(staffComments.id, id));
    return res.status(204).send();
  } catch (err) {
    console.error('staff-comments delete error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Reply
router.post('/:id/replies', async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ error: 'auth required' });
    const id = parseInt(req.params.id as string, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'invalid id' });

    const body = z
      .object({ body: z.string().min(1).max(10_000) })
      .safeParse(req.body);
    if (!body.success) {
      return res.status(400).json({ error: 'invalid input' });
    }

    const [exists] = await db.select({ id: staffComments.id }).from(staffComments).where(eq(staffComments.id, id));
    if (!exists) return res.status(404).json({ error: 'not found' });

    const [reply] = await db
      .insert(staffCommentReplies)
      .values({ commentId: id, body: body.data.body, createdById: userId })
      .returning();

    await db.update(staffComments).set({ updatedAt: new Date() }).where(eq(staffComments.id, id));

    return res.status(201).json({ reply });
  } catch (err) {
    console.error('staff-comments reply error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
