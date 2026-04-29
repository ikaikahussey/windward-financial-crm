import { Router, Request, Response } from 'express';
import { db } from '../db';
import {
  contacts,
  leadScoreHistory,
  jobRuns,
  pipelineEntries,
  users,
} from '../db/schema';
import { and, desc, asc, eq, gte, lte, sql, ilike, or } from 'drizzle-orm';
import { autoBookedToday } from '../services/lead-scoring';

const router = Router();

const HOT_THRESHOLD = 70;

router.get('/scoring/summary', async (_req: Request, res: Response) => {
  try {
    const [agg] = await db
      .select({
        total: sql<number>`count(*)::int`,
        hot: sql<number>`count(*) FILTER (WHERE ${contacts.leadScore} >= ${HOT_THRESHOLD})::int`,
        averageScore: sql<number>`coalesce(round(avg(${contacts.leadScore})), 0)::int`,
      })
      .from(contacts);
    const autoBooked = await autoBookedToday();
    return res.json({
      total: agg?.total ?? 0,
      hot: agg?.hot ?? 0,
      averageScore: agg?.averageScore ?? 0,
      autoBookedToday: autoBooked,
    });
  } catch (err) {
    console.error('scoring/summary error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

const BUCKETS: Array<{ range: string; min: number; max: number }> = [
  { range: '0-9', min: 0, max: 9 },
  { range: '10-19', min: 10, max: 19 },
  { range: '20-29', min: 20, max: 29 },
  { range: '30-39', min: 30, max: 39 },
  { range: '40-49', min: 40, max: 49 },
  { range: '50-59', min: 50, max: 59 },
  { range: '60-69', min: 60, max: 69 },
  { range: '70-79', min: 70, max: 79 },
  { range: '80-89', min: 80, max: 89 },
  { range: '90-100', min: 90, max: 100 },
];

router.get('/scoring/distribution', async (_req: Request, res: Response) => {
  try {
    const buckets = await Promise.all(
      BUCKETS.map(async (b) => {
        const [row] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(contacts)
          .where(
            and(gte(contacts.leadScore, b.min), lte(contacts.leadScore, b.max)),
          );
        return { range: b.range, count: row?.count ?? 0 };
      }),
    );
    return res.json({ buckets });
  } catch (err) {
    console.error('scoring/distribution error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/scoring/list', async (req: Request, res: Response) => {
  try {
    const source = req.query.source as string | undefined;
    const employmentType = req.query.employmentType as string | undefined;
    const pipelineStage = req.query.pipelineStage as string | undefined;
    const minScore = req.query.minScore
      ? parseInt(req.query.minScore as string, 10)
      : undefined;
    const maxScore = req.query.maxScore
      ? parseInt(req.query.maxScore as string, 10)
      : undefined;
    const search = req.query.search as string | undefined;
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const limit = Math.min(
      200,
      Math.max(1, parseInt((req.query.limit as string) || '50', 10)),
    );
    const sort = (req.query.sort as string) || 'score';
    const order = (req.query.order as string) === 'asc' ? 'asc' : 'desc';

    const conditions = [];
    if (source) conditions.push(eq(contacts.leadSource, source as never));
    if (employmentType)
      conditions.push(eq(contacts.employmentType, employmentType as never));
    if (typeof minScore === 'number')
      conditions.push(gte(contacts.leadScore, minScore));
    if (typeof maxScore === 'number')
      conditions.push(lte(contacts.leadScore, maxScore));
    if (search) {
      const pat = `%${search}%`;
      conditions.push(
        or(
          ilike(contacts.firstName, pat),
          ilike(contacts.lastName, pat),
          ilike(contacts.email, pat),
        )!,
      );
    }

    // Latest pipeline_entries per contact via correlated subquery
    const latestStage = sql<string>`(
      SELECT pe.pipeline_stage::text FROM pipeline_entries pe
      WHERE pe.contact_id = ${contacts.id}
      ORDER BY pe.moved_at DESC LIMIT 1
    )`.as('latest_stage');

    const latestHistoryScored = sql<Date>`(
      SELECT lsh.scored_at FROM lead_score_history lsh
      WHERE lsh.contact_id = ${contacts.id}
      ORDER BY lsh.scored_at DESC LIMIT 1
    )`.as('latest_scored_at');

    const previousScore = sql<number>`(
      SELECT lsh.previous_score FROM lead_score_history lsh
      WHERE lsh.contact_id = ${contacts.id}
      ORDER BY lsh.scored_at DESC LIMIT 1
    )`.as('previous_score');

    let where = conditions.length ? and(...conditions) : undefined;
    if (pipelineStage) {
      where = where
        ? and(where, sql`${latestStage} = ${pipelineStage}`)
        : sql`${latestStage} = ${pipelineStage}`;
    }

    const sortMap: Record<string, ReturnType<typeof asc>> = {
      score: order === 'asc' ? asc(contacts.leadScore) : desc(contacts.leadScore),
      scoredAt:
        order === 'asc' ? asc(contacts.leadScoreUpdatedAt) : desc(contacts.leadScoreUpdatedAt),
      lastName:
        order === 'asc' ? asc(contacts.lastName) : desc(contacts.lastName),
    };
    const orderExpr = sortMap[sort] ?? desc(contacts.leadScore);

    const baseSelect = db
      .select({
        id: contacts.id,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        email: contacts.email,
        leadSource: contacts.leadSource,
        employmentType: contacts.employmentType,
        score: contacts.leadScore,
        scoredAt: contacts.leadScoreUpdatedAt,
        latestStage,
        latestHistoryScored,
        previousScore,
      })
      .from(contacts);

    const rows = await (where
      ? baseSelect.where(where).orderBy(orderExpr).limit(limit).offset((page - 1) * limit)
      : baseSelect.orderBy(orderExpr).limit(limit).offset((page - 1) * limit));

    return res.json({
      leads: rows.map((r) => ({
        id: r.id,
        firstName: r.firstName,
        lastName: r.lastName,
        email: r.email,
        leadSource: r.leadSource,
        employmentType: r.employmentType,
        pipelineStage: r.latestStage,
        score: r.score,
        previousScore: r.previousScore,
        scoredAt: r.scoredAt ?? r.latestHistoryScored ?? null,
        isHot: (r.score ?? 0) >= HOT_THRESHOLD,
      })),
      page,
      limit,
    });
  } catch (err) {
    console.error('scoring/list error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/scoring/runs', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(
      100,
      Math.max(1, parseInt((req.query.limit as string) || '30', 10)),
    );
    const runs = await db
      .select({
        id: jobRuns.id,
        startedAt: jobRuns.startedAt,
        finishedAt: jobRuns.finishedAt,
        status: jobRuns.status,
        itemsProcessed: jobRuns.itemsProcessed,
        itemsFailed: jobRuns.itemsFailed,
        triggeredBy: jobRuns.triggeredBy,
        triggeredByUser: users.name,
      })
      .from(jobRuns)
      .leftJoin(users, eq(users.id, jobRuns.triggeredByUserId))
      .where(eq(jobRuns.jobName, 'lead-scoring'))
      .orderBy(desc(jobRuns.startedAt))
      .limit(limit);

    // Compute per-run stats from lead_score_history
    const detailed = await Promise.all(
      runs.map(async (r) => {
        const [stats] = await db
          .select({
            scored: sql<number>`count(*)::int`,
            hotCount: sql<number>`count(*) FILTER (WHERE ${leadScoreHistory.score} >= ${HOT_THRESHOLD})::int`,
            avg: sql<number>`coalesce(round(avg(${leadScoreHistory.score})), 0)::int`,
          })
          .from(leadScoreHistory)
          .where(eq(leadScoreHistory.runId, r.id));
        const durationMs =
          r.finishedAt && r.startedAt
            ? new Date(r.finishedAt).getTime() - new Date(r.startedAt).getTime()
            : null;
        return {
          ...r,
          scored: stats?.scored ?? 0,
          hotCount: stats?.hotCount ?? 0,
          averageScore: stats?.avg ?? 0,
          durationMs,
        };
      }),
    );
    return res.json({ runs: detailed });
  } catch (err) {
    console.error('scoring/runs error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/scoring/contact/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'invalid id' });
    }
    const [contact] = await db
      .select({
        id: contacts.id,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        email: contacts.email,
        score: contacts.leadScore,
        scoredAt: contacts.leadScoreUpdatedAt,
      })
      .from(contacts)
      .where(eq(contacts.id, id))
      .limit(1);
    if (!contact) return res.status(404).json({ error: 'contact not found' });

    const history = await db
      .select()
      .from(leadScoreHistory)
      .where(eq(leadScoreHistory.contactId, id))
      .orderBy(desc(leadScoreHistory.scoredAt))
      .limit(20);

    // pipeline timeline for context
    const stages = await db
      .select()
      .from(pipelineEntries)
      .where(eq(pipelineEntries.contactId, id))
      .orderBy(desc(pipelineEntries.movedAt))
      .limit(10);

    return res.json({ contact, history, pipeline: stages });
  } catch (err) {
    console.error('scoring/contact error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
