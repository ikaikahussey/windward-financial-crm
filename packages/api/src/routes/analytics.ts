import { Router, Request, Response } from 'express';
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db';
import { pageViews, users } from '../db/schema';

const router = Router();

const trackSchema = z.object({
  pagePath: z.string().min(1).max(255),
  pageLabel: z.string().max(255).optional().nullable(),
  sessionId: z.string().max(64).optional().nullable(),
  referrer: z.string().max(2_000).optional().nullable(),
  durationMs: z.number().int().min(0).max(60 * 60 * 1000 * 24).optional().nullable(),
});

// Track a page view (any authenticated user)
router.post('/track', async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId;
    const parsed = trackSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'invalid input' });
    }

    await db.insert(pageViews).values({
      userId: userId ?? null,
      pagePath: parsed.data.pagePath,
      pageLabel: parsed.data.pageLabel ?? null,
      sessionId: parsed.data.sessionId ?? null,
      referrer: parsed.data.referrer ?? null,
      durationMs: parsed.data.durationMs ?? null,
    });

    return res.status(202).json({ tracked: true });
  } catch (err) {
    console.error('analytics/track error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

function sinceDate(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Top-level summary: views, unique users, top pages, top users, daily trend
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const days = Math.min(180, Math.max(1, parseInt((req.query.days as string) || '30', 10)));
    const since = sinceDate(days);

    const [totals] = await db
      .select({
        totalViews: sql<number>`count(*)::int`,
        uniqueUsers: sql<number>`count(DISTINCT ${pageViews.userId})::int`,
        uniqueSessions: sql<number>`count(DISTINCT ${pageViews.sessionId})::int`,
        avgDurationMs: sql<number>`COALESCE(avg(${pageViews.durationMs}), 0)::int`,
      })
      .from(pageViews)
      .where(gte(pageViews.viewedAt, since));

    const topPages = await db
      .select({
        pagePath: pageViews.pagePath,
        pageLabel: sql<string | null>`max(${pageViews.pageLabel})`,
        views: sql<number>`count(*)::int`,
        uniqueUsers: sql<number>`count(DISTINCT ${pageViews.userId})::int`,
        avgDurationMs: sql<number>`COALESCE(avg(${pageViews.durationMs}), 0)::int`,
      })
      .from(pageViews)
      .where(gte(pageViews.viewedAt, since))
      .groupBy(pageViews.pagePath)
      .orderBy(sql`count(*) DESC`)
      .limit(25);

    const topUsers = await db
      .select({
        userId: pageViews.userId,
        userName: users.name,
        userEmail: users.email,
        views: sql<number>`count(*)::int`,
        distinctPages: sql<number>`count(DISTINCT ${pageViews.pagePath})::int`,
        lastSeen: sql<string>`max(${pageViews.viewedAt})`,
      })
      .from(pageViews)
      .leftJoin(users, eq(users.id, pageViews.userId))
      .where(gte(pageViews.viewedAt, since))
      .groupBy(pageViews.userId, users.name, users.email)
      .orderBy(sql`count(*) DESC`)
      .limit(25);

    const dailyTrend = await db
      .select({
        day: sql<string>`to_char(${pageViews.viewedAt}, 'YYYY-MM-DD')`,
        views: sql<number>`count(*)::int`,
        uniqueUsers: sql<number>`count(DISTINCT ${pageViews.userId})::int`,
      })
      .from(pageViews)
      .where(gte(pageViews.viewedAt, since))
      .groupBy(sql`to_char(${pageViews.viewedAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(${pageViews.viewedAt}, 'YYYY-MM-DD')`);

    return res.json({
      days,
      since: since.toISOString(),
      totals: totals ?? {
        totalViews: 0,
        uniqueUsers: 0,
        uniqueSessions: 0,
        avgDurationMs: 0,
      },
      topPages,
      topUsers,
      dailyTrend,
    });
  } catch (err) {
    console.error('analytics/summary error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Recent activity feed (latest views)
router.get('/recent', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(200, Math.max(1, parseInt((req.query.limit as string) || '50', 10)));

    const rows = await db
      .select({
        id: pageViews.id,
        pagePath: pageViews.pagePath,
        pageLabel: pageViews.pageLabel,
        durationMs: pageViews.durationMs,
        viewedAt: pageViews.viewedAt,
        userId: pageViews.userId,
        userName: users.name,
      })
      .from(pageViews)
      .leftJoin(users, eq(users.id, pageViews.userId))
      .orderBy(desc(pageViews.viewedAt))
      .limit(limit);

    return res.json({ events: rows });
  } catch (err) {
    console.error('analytics/recent error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Hourly activity heatmap (day-of-week × hour-of-day)
router.get('/heatmap', async (req: Request, res: Response) => {
  try {
    const days = Math.min(180, Math.max(1, parseInt((req.query.days as string) || '30', 10)));
    const since = sinceDate(days);

    const rows = await db
      .select({
        dayOfWeek: sql<number>`EXTRACT(DOW FROM ${pageViews.viewedAt})::int`,
        hourOfDay: sql<number>`EXTRACT(HOUR FROM ${pageViews.viewedAt})::int`,
        views: sql<number>`count(*)::int`,
      })
      .from(pageViews)
      .where(gte(pageViews.viewedAt, since))
      .groupBy(
        sql`EXTRACT(DOW FROM ${pageViews.viewedAt})`,
        sql`EXTRACT(HOUR FROM ${pageViews.viewedAt})`,
      );

    return res.json({ days, since: since.toISOString(), cells: rows });
  } catch (err) {
    console.error('analytics/heatmap error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Suppress unused-import warnings if env strips them
void and;

export default router;
