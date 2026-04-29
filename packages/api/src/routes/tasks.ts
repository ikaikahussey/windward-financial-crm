import { Router, Request, Response } from 'express';
import { db } from '../db';
import { tasks, activities, contacts, users, campaigns } from '../db/schema';
import { eq, and, gte, lte, isNull, isNotNull, desc, SQL } from 'drizzle-orm';

const router = Router();

// GET / — list tasks with filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      assigned_to,
      due_from,
      due_to,
      priority,
      task_type,
      completed,
      my,
      page = '1',
      limit = '25',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 25));
    const offset = (pageNum - 1) * limitNum;

    const conditions: SQL[] = [];

    if (my === 'true' && req.session.userId) {
      conditions.push(eq(tasks.assignedTo, req.session.userId));
    } else if (assigned_to) {
      conditions.push(eq(tasks.assignedTo, parseInt(assigned_to as string, 10)));
    }

    if (due_from) {
      conditions.push(gte(tasks.dueDate, new Date(due_from as string)));
    }
    if (due_to) {
      conditions.push(lte(tasks.dueDate, new Date(due_to as string)));
    }
    if (priority) {
      conditions.push(eq(tasks.priority, priority as any));
    }
    if (task_type) {
      conditions.push(eq(tasks.taskType, task_type as any));
    }
    if (completed === 'true') {
      conditions.push(isNotNull(tasks.completedAt));
    } else if (completed === 'false') {
      conditions.push(isNull(tasks.completedAt));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const query = db
      .select({
        id: tasks.id,
        contactId: tasks.contactId,
        campaignId: tasks.campaignId,
        assignedTo: tasks.assignedTo,
        createdBy: tasks.createdBy,
        title: tasks.title,
        description: tasks.description,
        dueDate: tasks.dueDate,
        completedAt: tasks.completedAt,
        priority: tasks.priority,
        taskType: tasks.taskType,
        createdAt: tasks.createdAt,
        contact: {
          id: contacts.id,
          firstName: contacts.firstName,
          lastName: contacts.lastName,
        },
        campaign: {
          id: campaigns.id,
          name: campaigns.name,
        },
        assignedToUser: {
          id: users.id,
          name: users.name,
        },
      })
      .from(tasks)
      .leftJoin(contacts, eq(contacts.id, tasks.contactId))
      .leftJoin(campaigns, eq(campaigns.id, tasks.campaignId))
      .leftJoin(users, eq(users.id, tasks.assignedTo));
    const rows = await (whereClause
      ? query.where(whereClause).orderBy(desc(tasks.dueDate)).limit(limitNum).offset(offset)
      : query.orderBy(desc(tasks.dueDate)).limit(limitNum).offset(offset));

    // Frontend reads `task.contact`, `task.campaign`, `task.assigned_to`,
    // and infers a status from `completedAt`. Shape the row to match.
    const shaped = rows.map((r) => ({
      id: r.id,
      contactId: r.contactId,
      campaignId: r.campaignId,
      assignedToId: r.assignedTo,
      createdById: r.createdBy,
      title: r.title,
      description: r.description,
      dueDate: r.dueDate,
      completedAt: r.completedAt,
      priority: r.priority,
      type: r.taskType,
      status: r.completedAt ? 'completed' : 'pending',
      createdAt: r.createdAt,
      contact: r.contact?.id ? r.contact : null,
      campaign: r.campaign?.id ? r.campaign : null,
      assignedTo: r.assignedToUser?.id ? r.assignedToUser : null,
    }));

    return res.json({ tasks: shaped });
  } catch (error) {
    console.error('List tasks error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id — single task
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    return res.json(task);
  } catch (error) {
    console.error('Get task error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / — create task
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      contactId,
      campaignId,
      assignedTo,
      assignedToId,
      title,
      description,
      dueDate,
      priority,
      taskType,
      type,
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'title is required' });
    }

    // Map the frontend's snake-case priority/type values to the DB's
    // title-case enum values. Unknown values pass through untouched.
    const PRIORITY_MAP: Record<string, string> = {
      low: 'Low',
      medium: 'Normal',
      normal: 'Normal',
      high: 'High',
      urgent: 'Urgent',
    };
    const TYPE_MAP: Record<string, string> = {
      follow_up: 'Follow Up',
      call: 'Call',
      email: 'Email',
      meeting: 'Meeting',
      review: 'Review',
      other: 'Other',
    };
    const rawPriority = (priority ?? '').toString();
    const rawType = (taskType ?? type ?? '').toString();
    const dbPriority = PRIORITY_MAP[rawPriority.toLowerCase()] ?? rawPriority ?? 'Normal';
    const dbType = TYPE_MAP[rawType.toLowerCase()] ?? rawType ?? 'Other';

    const [task] = await db
      .insert(tasks)
      .values({
        contactId: contactId ? parseInt(String(contactId), 10) : null,
        campaignId: campaignId ? parseInt(String(campaignId), 10) : null,
        assignedTo:
          (assignedTo ?? assignedToId)
            ? parseInt(String(assignedTo ?? assignedToId), 10)
            : req.session.userId!,
        createdBy: req.session.userId!,
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority: (dbPriority || 'Normal') as never,
        taskType: (dbType || 'Other') as never,
      })
      .returning();

    return res.status(201).json({ task });
  } catch (error) {
    console.error('Create task error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /:id — update task
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const body = req.body ?? {};
    const updateData: Record<string, unknown> = {};

    const ALLOWED = [
      'contactId',
      'campaignId',
      'assignedTo',
      'title',
      'description',
      'priority',
      'taskType',
    ];
    for (const k of ALLOWED) {
      if (k in body) updateData[k] = body[k];
    }

    if ('dueDate' in body) {
      updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    }

    // `status` is a frontend-friendly alias for completedAt on/off.
    if ('status' in body) {
      updateData.completedAt =
        body.status === 'completed' ? new Date() : null;
    }
    if ('completedAt' in body && body.completedAt !== undefined) {
      updateData.completedAt = body.completedAt
        ? new Date(body.completedAt)
        : null;
    }

    const [updated] = await db
      .update(tasks)
      .set(updateData)
      .where(eq(tasks.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Task not found' });
    }

    return res.json(updated);
  } catch (error) {
    console.error('Update task error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /:id/complete — mark task completed
router.patch('/:id/complete', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);

    const [task] = await db
      .update(tasks)
      .set({ completedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // If linked to a contact, create activity
    if (task.contactId) {
      await db.insert(activities).values({
        contactId: task.contactId,
        userId: req.session.userId,
        activityType: 'Task Completed',
        subject: `Task completed: ${task.title}`,
        body: task.description,
      });
    }

    return res.json(task);
  } catch (error) {
    console.error('Complete task error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id — delete task
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);

    const [deleted] = await db
      .delete(tasks)
      .where(eq(tasks.id, id))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: 'Task not found' });
    }

    return res.json({ message: 'Task deleted' });
  } catch (error) {
    console.error('Delete task error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
