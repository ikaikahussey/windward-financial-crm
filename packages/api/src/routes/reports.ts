import { Router, Request, Response } from 'express';
import { db } from '../db';
import { contacts, pipelineEntries, activities, policies } from '../db/schema';
import { sql, gte, lte, and, eq, SQL } from 'drizzle-orm';

const router = Router();

// GET /funnel — count of contacts at each pipeline stage
router.get('/funnel', async (_req: Request, res: Response) => {
  try {
    const rows = await db.execute(sql`
      SELECT pe.pipeline_stage AS stage, COUNT(DISTINCT pe.contact_id)::int AS count
      FROM pipeline_entries pe
      WHERE pe.id = (
        SELECT MAX(pe2.id) FROM pipeline_entries pe2
        WHERE pe2.contact_id = pe.contact_id
      )
      GROUP BY pe.pipeline_stage
      ORDER BY CASE pe.pipeline_stage
        WHEN 'New Lead' THEN 1
        WHEN 'Contacted' THEN 2
        WHEN 'Consultation Scheduled' THEN 3
        WHEN 'Consultation Completed' THEN 4
        WHEN 'Proposal Sent' THEN 5
        WHEN 'Application Submitted' THEN 6
        WHEN 'Policy Issued' THEN 7
        WHEN 'Active Client' THEN 8
        WHEN 'Lost / Not Now' THEN 9
      END
    `);

    return res.json(rows);
  } catch (error) {
    console.error('Funnel report error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /lead-sources — count of contacts grouped by lead_source
router.get('/lead-sources', async (_req: Request, res: Response) => {
  try {
    const rows = await db
      .select({
        leadSource: contacts.leadSource,
        count: sql<number>`count(*)::int`,
      })
      .from(contacts)
      .groupBy(contacts.leadSource)
      .orderBy(sql`count(*) DESC`);

    return res.json(rows);
  } catch (error) {
    console.error('Lead sources report error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /agent-activity — activities grouped by user_id and activity_type with counts
router.get('/agent-activity', async (req: Request, res: Response) => {
  try {
    const { date_from, date_to } = req.query;

    const conditions: SQL[] = [];
    if (date_from) {
      conditions.push(gte(activities.createdAt, new Date(date_from as string)));
    }
    if (date_to) {
      conditions.push(lte(activities.createdAt, new Date(date_to as string)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const query = db
      .select({
        userId: activities.userId,
        activityType: activities.activityType,
        count: sql<number>`count(*)::int`,
      })
      .from(activities);

    const rows = await (whereClause
      ? query.where(whereClause).groupBy(activities.userId, activities.activityType)
      : query.groupBy(activities.userId, activities.activityType));

    return res.json(rows);
  } catch (error) {
    console.error('Agent activity report error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /revenue — sum of annual_premium grouped by pipeline stage
router.get('/revenue', async (_req: Request, res: Response) => {
  try {
    const rows = await db.execute(sql`
      SELECT
        pe.pipeline_stage AS stage,
        COALESCE(SUM(p.annual_premium), 0)::numeric AS total_premium,
        COUNT(DISTINCT p.id)::int AS policy_count
      FROM policies p
      INNER JOIN contacts c ON c.id = p.contact_id
      INNER JOIN pipeline_entries pe ON pe.contact_id = c.id
        AND pe.id = (
          SELECT MAX(pe2.id) FROM pipeline_entries pe2
          WHERE pe2.contact_id = c.id
        )
      GROUP BY pe.pipeline_stage
      ORDER BY total_premium DESC
    `);

    return res.json(rows);
  } catch (error) {
    console.error('Revenue report error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
