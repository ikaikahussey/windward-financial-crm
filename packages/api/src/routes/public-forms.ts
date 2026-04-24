import { Router, Request, Response } from 'express';
import { db } from '../db';
import {
  events,
  eventRegistrations,
  newsletterSubscribers,
  appointments,
} from '../db/schema';
import { eq, and, gte, asc, sql } from 'drizzle-orm';
import { createOrUpdateLead } from '../services/lead-capture';

const router = Router();

// GET /events — upcoming published events (public read for live Admin CRM previews
// and for the admin registration workflow). The public website itself reads events
// at build time from `packages/public/src/lib/events.ts`, so this endpoint is
// primarily used by the admin and by the event registration form.
router.get('/events', async (_req: Request, res: Response) => {
  try {
    const rows = await db
      .select()
      .from(events)
      .where(and(eq(events.isPublished, true), gte(events.eventDate, new Date())))
      .orderBy(asc(events.eventDate));
    return res.json(rows);
  } catch (error) {
    console.error('List public events error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/events/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const [event] = await db
      .select()
      .from(events)
      .where(and(eq(events.id, id), eq(events.isPublished, true)))
      .limit(1);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    return res.json(event);
  } catch (error) {
    console.error('Get public event error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /events/:id/register — register for event + create CRM lead
router.post('/events/:id/register', async (req: Request, res: Response) => {
  try {
    const eventId = parseInt(req.params.id as string, 10);
    const { firstName, lastName, email, phone, employmentType, employerSchool } = req.body;

    if (!firstName || !lastName || !email) {
      return res.status(400).json({ error: 'firstName, lastName, and email are required' });
    }

    const [event] = await db
      .select()
      .from(events)
      .where(and(eq(events.id, eventId), eq(events.isPublished, true)))
      .limit(1);

    if (!event) return res.status(404).json({ error: 'Event not found' });

    if (event.maxAttendees) {
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(eventRegistrations)
        .where(eq(eventRegistrations.eventId, eventId));

      if (count >= event.maxAttendees) {
        return res.status(400).json({ error: 'Event is full' });
      }
    }

    const lead = await createOrUpdateLead({
      firstName,
      lastName,
      email,
      phone,
      employmentType,
      employerSchool,
      leadSource: 'Webinar',
      notes: `Registered for event: ${event.title}`,
    });

    const [registration] = await db.insert(eventRegistrations).values({
      eventId,
      contactId: lead.contactId,
      firstName,
      lastName,
      email,
      phone,
      employmentType,
      employerSchool,
    }).returning();

    return res.status(201).json(registration);
  } catch (error) {
    console.error('Event registration error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /contact — contact form lead
router.post('/contact', async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, phone, message, employmentType, employerSchool } = req.body;

    if (!firstName || !lastName || !email) {
      return res.status(400).json({ error: 'firstName, lastName, and email are required' });
    }

    const lead = await createOrUpdateLead({
      firstName,
      lastName,
      email,
      phone,
      employmentType,
      employerSchool,
      leadSource: 'Website',
      notes: message ? `Contact form message: ${message}` : 'Submitted contact form',
    });

    return res.status(201).json({ message: 'Thank you for contacting us!', contactId: lead.contactId });
  } catch (error) {
    console.error('Contact form error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /subscribe — newsletter signup
router.post('/subscribe', async (req: Request, res: Response) => {
  try {
    const { email, firstName } = req.body;
    if (!email) return res.status(400).json({ error: 'email is required' });

    const [existing] = await db
      .select()
      .from(newsletterSubscribers)
      .where(eq(newsletterSubscribers.email, email))
      .limit(1);

    if (existing) {
      if (existing.unsubscribedAt) {
        await db
          .update(newsletterSubscribers)
          .set({ unsubscribedAt: null, firstName: firstName || existing.firstName })
          .where(eq(newsletterSubscribers.id, existing.id));
        return res.json({ message: 'Re-subscribed successfully!' });
      }
      return res.json({ message: 'Already subscribed!' });
    }

    await db.insert(newsletterSubscribers).values({
      email,
      firstName: firstName || null,
      source: 'website',
    });

    return res.status(201).json({ message: 'Subscribed successfully!' });
  } catch (error) {
    console.error('Subscribe error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /calculator-lead — create lead from calculator
router.post('/calculator-lead', async (req: Request, res: Response) => {
  try {
    const {
      firstName, lastName, email, phone,
      employmentType, employerSchool, yearsOfService, annualSalary,
      ersPlanType, calculatorResults,
    } = req.body;

    if (!firstName || !lastName || !email) {
      return res.status(400).json({ error: 'firstName, lastName, and email are required' });
    }

    const notesLines = ['Calculator lead submission'];
    if (calculatorResults) {
      notesLines.push(`Calculator data: ${JSON.stringify(calculatorResults)}`);
    }

    const lead = await createOrUpdateLead({
      firstName,
      lastName,
      email,
      phone,
      employmentType,
      employerSchool,
      yearsOfService,
      annualSalary,
      ersPlanType,
      leadSource: 'Calculator',
      notes: notesLines.join('\n'),
    });

    return res.status(201).json({ message: 'Thank you! We will be in touch.', contactId: lead.contactId });
  } catch (error) {
    console.error('Calculator lead error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /schedule — create lead + appointment request
router.post('/schedule', async (req: Request, res: Response) => {
  try {
    const {
      firstName, lastName, email, phone,
      employmentType, employerSchool, employer,
      preferredDate, preferredTime, consultationType, message, notes,
    } = req.body;

    if (!firstName || !lastName || !email) {
      return res.status(400).json({ error: 'firstName, lastName, and email are required' });
    }

    const scheduleNotes = [
      'Appointment request from website',
      consultationType ? `Consultation type: ${consultationType}` : null,
      preferredDate ? `Preferred date: ${preferredDate}` : null,
      preferredTime ? `Preferred time: ${preferredTime}` : null,
      (message || notes) ? `Notes: ${message || notes}` : null,
    ].filter(Boolean).join('\n');

    const lead = await createOrUpdateLead({
      firstName,
      lastName,
      email,
      phone,
      employmentType,
      employerSchool: employerSchool || employer,
      leadSource: 'Website',
      notes: scheduleNotes,
    });

    if (preferredDate) {
      const timeMap: Record<string, string> = {
        morning: '09:00:00',
        afternoon: '13:00:00',
        evening: '17:00:00',
      };
      const timeStr = timeMap[(preferredTime || '').toLowerCase()] || preferredTime || '09:00:00';
      const startTime = new Date(`${preferredDate}T${timeStr}`);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

      await db.insert(appointments).values({
        contactId: lead.contactId,
        agentId: 1,
        startTime,
        endTime,
        status: 'Scheduled',
        notes: `Requested via website. ${notes || ''}`.trim(),
      });
    }

    return res.status(201).json({ message: 'Appointment request received!', contactId: lead.contactId });
  } catch (error) {
    console.error('Schedule error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /enroll — enrollment form submission
router.post('/enroll', async (req: Request, res: Response) => {
  try {
    const {
      firstName, lastName, email, phone,
      employmentType, employerSchool, yearsOfService, annualSalary,
      ersPlanType, lifeInsuranceStatus, notes,
    } = req.body;

    if (!firstName || !lastName || !email) {
      return res.status(400).json({ error: 'firstName, lastName, and email are required' });
    }

    const lead = await createOrUpdateLead({
      firstName,
      lastName,
      email,
      phone,
      employmentType,
      employerSchool,
      yearsOfService,
      annualSalary,
      ersPlanType,
      lifeInsuranceStatus,
      leadSource: 'Enrollment',
      notes: notes ? `Enrollment form: ${notes}` : 'Enrollment form submission',
    });

    return res.status(201).json({ message: 'Enrollment received! We will contact you shortly.', contactId: lead.contactId });
  } catch (error) {
    console.error('Enroll error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
