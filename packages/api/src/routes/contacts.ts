import { Router, Request, Response } from 'express';
import { db } from '../db';
import { contacts, pipelineEntries, activities, users } from '../db/schema';
import { eq, desc, and, or, ilike, sql, SQL } from 'drizzle-orm';
import { processStageChange } from '../services/automation';

const router = Router();

// Subquery to get the latest pipeline entry per contact
const latestPipelineEntry = db
  .select({
    contactId: pipelineEntries.contactId,
    pipelineStage: pipelineEntries.pipelineStage,
    movedAt: pipelineEntries.movedAt,
  })
  .from(pipelineEntries)
  .where(
    sql`${pipelineEntries.id} = (
      SELECT MAX(pe2.id) FROM pipeline_entries pe2
      WHERE pe2.contact_id = ${pipelineEntries.contactId}
    )`
  )
  .as('latest_pipeline');

// GET / — list contacts with filters and pagination
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      pipeline_stage,
      employment_type,
      island,
      assigned_agent_id,
      lead_source,
      search,
      page = '1',
      limit = '25',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 25));
    const offset = (pageNum - 1) * limitNum;

    const conditions: SQL[] = [];

    if (employment_type) {
      conditions.push(eq(contacts.employmentType, employment_type as any));
    }
    if (island) {
      conditions.push(eq(contacts.island, island as any));
    }
    if (assigned_agent_id) {
      conditions.push(eq(contacts.assignedAgentId, parseInt(assigned_agent_id as string, 10)));
    }
    if (lead_source) {
      conditions.push(eq(contacts.leadSource, lead_source as any));
    }
    if (search) {
      const searchStr = `%${search}%`;
      conditions.push(
        or(
          ilike(contacts.firstName, searchStr),
          ilike(contacts.lastName, searchStr),
          ilike(contacts.email, searchStr),
          ilike(contacts.phone, searchStr)
        )!
      );
    }

    // Build query with latest pipeline stage
    let query = db
      .select({
        id: contacts.id,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        email: contacts.email,
        phone: contacts.phone,
        island: contacts.island,
        employmentType: contacts.employmentType,
        employerSchool: contacts.employerSchool,
        leadSource: contacts.leadSource,
        assignedAgentId: contacts.assignedAgentId,
        createdAt: contacts.createdAt,
        lastContactedAt: contacts.lastContactedAt,
        pipelineStage: latestPipelineEntry.pipelineStage,
        stageMovedAt: latestPipelineEntry.movedAt,
      })
      .from(contacts)
      .leftJoin(latestPipelineEntry, eq(contacts.id, latestPipelineEntry.contactId));

    if (pipeline_stage) {
      conditions.push(eq(latestPipelineEntry.pipelineStage, pipeline_stage as any));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await (whereClause
      ? query.where(whereClause).orderBy(desc(contacts.createdAt)).limit(limitNum).offset(offset)
      : query.orderBy(desc(contacts.createdAt)).limit(limitNum).offset(offset));

    // Count total
    const countQuery = db
      .select({ count: sql<number>`count(*)::int` })
      .from(contacts)
      .leftJoin(latestPipelineEntry, eq(contacts.id, latestPipelineEntry.contactId));

    const [{ count: total }] = await (whereClause
      ? countQuery.where(whereClause)
      : countQuery);

    return res.json({
      data: rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('List contacts error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id — single contact with pipeline stage
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);

    const [contact] = await db
      .select()
      .from(contacts)
      .where(eq(contacts.id, id))
      .limit(1);

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Get current pipeline stage
    const [currentStage] = await db
      .select()
      .from(pipelineEntries)
      .where(eq(pipelineEntries.contactId, id))
      .orderBy(desc(pipelineEntries.movedAt))
      .limit(1);

    return res.json({
      ...contact,
      pipelineStage: currentStage?.pipelineStage ?? null,
      stageMovedAt: currentStage?.movedAt ?? null,
    });
  } catch (error) {
    console.error('Get contact error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / — create contact + initial pipeline entry
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      firstName, lastName, email, phone, address, city, island, zip,
      employmentType, employerSchool, yearsOfService, annualSalary,
      ersPlanType, current403bBalance, lifeInsuranceStatus,
      leadSource, referralSource, assignedAgentId, notes,
    } = req.body;

    if (!firstName || !lastName) {
      return res.status(400).json({ error: 'firstName and lastName are required' });
    }

    const [newContact] = await db.insert(contacts).values({
      firstName,
      lastName,
      email,
      phone,
      address,
      city,
      island,
      zip,
      employmentType,
      employerSchool,
      yearsOfService,
      annualSalary,
      ersPlanType,
      current403bBalance,
      lifeInsuranceStatus,
      leadSource,
      referralSource,
      assignedAgentId,
      notes,
    }).returning();

    // Create initial pipeline entry
    await db.insert(pipelineEntries).values({
      contactId: newContact.id,
      pipelineStage: 'New Lead',
      movedBy: req.session.userId,
    });

    return res.status(201).json(newContact);
  } catch (error) {
    console.error('Create contact error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /:id — update contact
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const updateData = { ...req.body, updatedAt: new Date() };
    delete updateData.id;
    delete updateData.createdAt;

    const [updated] = await db
      .update(contacts)
      .set(updateData)
      .where(eq(contacts.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    return res.json(updated);
  } catch (error) {
    console.error('Update contact error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id — delete contact
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);

    const [deleted] = await db
      .delete(contacts)
      .where(eq(contacts.id, id))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    return res.json({ message: 'Contact deleted' });
  } catch (error) {
    console.error('Delete contact error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id/activities — activities for a contact
router.get('/:id/activities', async (req: Request, res: Response) => {
  try {
    const contactId = parseInt(req.params.id as string, 10);

    const rows = await db
      .select({
        id: activities.id,
        contactId: activities.contactId,
        userId: activities.userId,
        activityType: activities.activityType,
        subject: activities.subject,
        body: activities.body,
        createdAt: activities.createdAt,
        userName: users.name,
      })
      .from(activities)
      .leftJoin(users, eq(activities.userId, users.id))
      .where(eq(activities.contactId, contactId))
      .orderBy(desc(activities.createdAt));

    return res.json(rows);
  } catch (error) {
    console.error('Get activities error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /:id/activities — create activity (Note)
router.post('/:id/activities', async (req: Request, res: Response) => {
  try {
    const contactId = parseInt(req.params.id as string, 10);
    const { subject, body } = req.body;

    const [activity] = await db.insert(activities).values({
      contactId,
      userId: req.session.userId,
      activityType: 'Note',
      subject,
      body,
    }).returning();

    // Update lastContactedAt
    await db
      .update(contacts)
      .set({ lastContactedAt: new Date(), updatedAt: new Date() })
      .where(eq(contacts.id, contactId));

    return res.status(201).json(activity);
  } catch (error) {
    console.error('Create activity error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /:id/stage — change pipeline stage
router.patch('/:id/stage', async (req: Request, res: Response) => {
  try {
    const contactId = parseInt(req.params.id as string, 10);
    const { pipelineStage } = req.body;

    if (!pipelineStage) {
      return res.status(400).json({ error: 'pipelineStage is required' });
    }

    // Get current stage for the automation engine
    const [currentStageEntry] = await db
      .select({ pipelineStage: pipelineEntries.pipelineStage })
      .from(pipelineEntries)
      .where(eq(pipelineEntries.contactId, contactId))
      .orderBy(desc(pipelineEntries.movedAt))
      .limit(1);

    const oldStage = currentStageEntry?.pipelineStage ?? null;

    // Process stage change — creates pipeline entry, logs activity, and fires automations
    await processStageChange(contactId, oldStage, pipelineStage, req.session.userId!);

    // Update contact's updatedAt
    await db
      .update(contacts)
      .set({ updatedAt: new Date() })
      .where(eq(contacts.id, contactId));

    // Return the latest pipeline entry
    const [entry] = await db
      .select()
      .from(pipelineEntries)
      .where(eq(pipelineEntries.contactId, contactId))
      .orderBy(desc(pipelineEntries.movedAt))
      .limit(1);

    return res.json(entry);
  } catch (error) {
    console.error('Change stage error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
