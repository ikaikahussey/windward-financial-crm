import { Router, Request, Response } from 'express';
import { db } from '../db';
import { tasks, activities, contacts } from '../db/schema';
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

    const query = db.select().from(tasks);
    const rows = await (whereClause
      ? query.where(whereClause).orderBy(desc(tasks.dueDate)).limit(limitNum).offset(offset)
      : query.orderBy(desc(tasks.dueDate)).limit(limitNum).offset(offset));

    return res.json(rows);
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
    const { contactId, assignedTo, title, description, dueDate, priority, taskType } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'title is required' });
    }

    const [task] = await db.insert(tasks).values({
      contactId: contactId || null,
      assignedTo: assignedTo || req.session.userId!,
      createdBy: req.session.userId!,
      title,
      description,
      dueDate: dueDate ? new Date(dueDate) : null,
      priority: priority || 'Normal',
      taskType: taskType || 'Other',
    }).returning();

    return res.status(201).json(task);
  } catch (error) {
    console.error('Create task error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /:id — update task
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const updateData = { ...req.body };
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.createdBy;

    if (updateData.dueDate) {
      updateData.dueDate = new Date(updateData.dueDate);
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
