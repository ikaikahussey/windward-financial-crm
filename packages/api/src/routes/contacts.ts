import { Router, Request, Response } from 'express';
import { db } from '../db';
import { contacts, pipelineEntries, activities, users, policies, tasks, appointments } from '../db/schema';
import { eq, desc, asc, and, or, ilike, sql, SQL } from 'drizzle-orm';
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
      sort = 'created_at',
      order = 'desc',
    } = req.query;

    const SORT_COLUMNS: Record<string, any> = {
      created_at: contacts.createdAt,
      last_name: contacts.lastName,
      first_name: contacts.firstName,
      email: contacts.email,
      last_contacted_at: contacts.lastContactedAt,
      pipeline_stage: latestPipelineEntry.pipelineStage,
    };
    const sortCol = SORT_COLUMNS[sort as string] ?? contacts.createdAt;
    const sortDir = (order as string) === 'asc' ? 'asc' : 'desc';

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

    // Build query with latest pipeline stage and assigned agent
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
        assignedAgent: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(contacts)
      .leftJoin(latestPipelineEntry, eq(contacts.id, latestPipelineEntry.contactId))
      .leftJoin(users, eq(contacts.assignedAgentId, users.id));

    if (pipeline_stage) {
      conditions.push(eq(latestPipelineEntry.pipelineStage, pipeline_stage as any));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const orderExpr = sortDir === 'asc' ? asc(sortCol) : desc(sortCol);
    const rows = await (whereClause
      ? query.where(whereClause).orderBy(orderExpr).limit(limitNum).offset(offset)
      : query.orderBy(orderExpr).limit(limitNum).offset(offset));

    // Count total
    const countQuery = db
      .select({ count: sql<number>`count(*)::int` })
      .from(contacts)
      .leftJoin(latestPipelineEntry, eq(contacts.id, latestPipelineEntry.contactId));

    const [{ count: total }] = await (whereClause
      ? countQuery.where(whereClause)
      : countQuery);

    return res.json({
      contacts: rows,
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

    // Optional assigned agent
    let assignedAgent: { id: number; name: string; email: string } | null = null;
    if (contact.assignedAgentId) {
      const [u] = await db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(eq(users.id, contact.assignedAgentId))
        .limit(1);
      assignedAgent = u ?? null;
    }

    return res.json({
      contact: {
        ...contact,
        pipelineStage: currentStage?.pipelineStage ?? null,
        stageMovedAt: currentStage?.movedAt ?? null,
        assignedAgent,
      },
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

    return res.status(201).json({ contact: newContact });
  } catch (error) {
    console.error('Create contact error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /:id — update contact
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const ALLOWED = [
      'firstName', 'lastName', 'email', 'phone', 'address', 'city', 'island', 'zip',
      'employmentType', 'employerSchool', 'yearsOfService', 'annualSalary',
      'ersPlanType', 'current403bBalance', 'lifeInsuranceStatus',
      'leadSource', 'referralSource', 'assignedAgentId', 'notes',
      'lastContactedAt',
    ];
    const updateData: Record<string, any> = { updatedAt: new Date() };
    for (const k of ALLOWED) {
      if (k in req.body) updateData[k] = req.body[k];
    }
    if (typeof updateData.lastContactedAt === 'string') {
      updateData.lastContactedAt = new Date(updateData.lastContactedAt);
    }

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
        type: activities.activityType,
        title: activities.subject,
        description: activities.body,
        createdAt: activities.createdAt,
        userName: users.name,
      })
      .from(activities)
      .leftJoin(users, eq(activities.userId, users.id))
      .where(eq(activities.contactId, contactId))
      .orderBy(desc(activities.createdAt));

    const shaped = rows.map((r) => ({
      id: r.id,
      contactId: r.contactId,
      userId: r.userId,
      type: r.type,
      title: r.title,
      description: r.description,
      createdAt: r.createdAt,
      user: r.userName ? { name: r.userName } : null,
    }));

    return res.json({ activities: shaped });
  } catch (error) {
    console.error('Get activities error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /:id/activities — create activity (Note)
router.post('/:id/activities', async (req: Request, res: Response) => {
  try {
    const contactId = parseInt(req.params.id as string, 10);
    const { subject, body, title, description, type, activityType } = req.body;

    // Map frontend activity type strings ('note', 'call', etc.) to DB enum values.
    const TYPE_MAP: Record<string, string> = {
      note: 'Note',
      call: 'Call',
      email: 'Email Sent',
      sms: 'SMS Sent',
      meeting: 'Meeting',
      stage_change: 'Stage Change',
    };
    const rawType = (activityType || type || 'note').toString();
    const dbType = TYPE_MAP[rawType.toLowerCase()] || rawType;

    const [activity] = await db.insert(activities).values({
      contactId,
      userId: req.session.userId,
      activityType: dbType as any,
      subject: title ?? subject ?? null,
      body: description ?? body ?? null,
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

// GET /:id/policies — policies for a contact
router.get('/:id/policies', async (req: Request, res: Response) => {
  try {
    const contactId = parseInt(req.params.id as string, 10);
    const rows = await db
      .select()
      .from(policies)
      .where(eq(policies.contactId, contactId))
      .orderBy(desc(policies.createdAt));
    return res.json({ policies: rows });
  } catch (error) {
    console.error('Get policies error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id/tasks — tasks for a contact
router.get('/:id/tasks', async (req: Request, res: Response) => {
  try {
    const contactId = parseInt(req.params.id as string, 10);
    const rows = await db
      .select()
      .from(tasks)
      .where(eq(tasks.contactId, contactId))
      .orderBy(desc(tasks.createdAt));
    return res.json({ tasks: rows });
  } catch (error) {
    console.error('Get contact tasks error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id/appointments — appointments for a contact
router.get('/:id/appointments', async (req: Request, res: Response) => {
  try {
    const contactId = parseInt(req.params.id as string, 10);
    const rows = await db
      .select()
      .from(appointments)
      .where(eq(appointments.contactId, contactId))
      .orderBy(desc(appointments.startTime));
    return res.json({ appointments: rows });
  } catch (error) {
    console.error('Get contact appointments error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
