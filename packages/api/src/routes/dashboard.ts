import { Router, Request, Response } from 'express';
import { db } from '../db';
import { contacts, pipelineEntries, tasks, appointments, activities, users } from '../db/schema';
import { eq, sql, gte, lte, and, isNull, desc } from 'drizzle-orm';

const router = Router();

// GET /stats — dashboard statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    // Total contacts
    const [{ count: totalContacts }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(contacts);

    // Contacts per pipeline stage (using latest entry per contact)
    const contactsPerStage = await db.execute(sql`
      SELECT pe.pipeline_stage AS stage, COUNT(*)::int AS count
      FROM pipeline_entries pe
      WHERE pe.id = (
        SELECT MAX(pe2.id) FROM pipeline_entries pe2
        WHERE pe2.contact_id = pe.contact_id
      )
      GROUP BY pe.pipeline_stage
      ORDER BY pe.pipeline_stage
    `);

    // Tasks due today
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    const [{ count: tasksDueToday }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(tasks)
      .where(
        and(
          gte(tasks.dueDate, startOfDay),
          lte(tasks.dueDate, endOfDay),
          isNull(tasks.completedAt)
        )
      );

    // Overdue tasks
    const [{ count: overdueTasks }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(tasks)
      .where(
        and(
          lte(tasks.dueDate, startOfDay),
          isNull(tasks.completedAt)
        )
      );

    // Appointments this week
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const [{ count: appointmentsThisWeek }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(appointments)
      .where(
        and(
          gte(appointments.startTime, startOfWeek),
          lte(appointments.startTime, endOfWeek)
        )
      );

    return res.json({
      totalContacts,
      contactsPerStage,
      tasksDueToday,
      overdueTasks,
      appointmentsThisWeek,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /recent-activity — last 20 activities with user and contact names
router.get('/recent-activity', async (req: Request, res: Response) => {
  try {
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
        contactFirstName: contacts.firstName,
        contactLastName: contacts.lastName,
      })
      .from(activities)
      .leftJoin(users, eq(activities.userId, users.id))
      .leftJoin(contacts, eq(activities.contactId, contacts.id))
      .orderBy(desc(activities.createdAt))
      .limit(20);

    return res.json(rows);
  } catch (error) {
    console.error('Recent activity error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
