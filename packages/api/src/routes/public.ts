import { Router, Request, Response } from 'express';
import { db } from '../db';
import {
  sitePages, testimonials, teamMembers, events,
  eventRegistrations, blogPosts, newsletterSubscribers,
  appointments,
} from '../db/schema';
import { eq, and, gte, desc, asc, sql } from 'drizzle-orm';
import { createOrUpdateLead } from '../services/lead-capture';

const router = Router();

// GET /pages — list published pages
router.get('/pages', async (_req: Request, res: Response) => {
  try {
    const rows = await db
      .select({
        id: sitePages.id,
        slug: sitePages.slug,
        title: sitePages.title,
        sortOrder: sitePages.sortOrder,
      })
      .from(sitePages)
      .where(eq(sitePages.isPublished, true))
      .orderBy(asc(sitePages.sortOrder));

    return res.json(rows);
  } catch (error) {
    console.error('List public pages error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /pages/:slug — get page by slug
router.get('/pages/:slug', async (req: Request, res: Response) => {
  try {
    const [page] = await db
      .select()
      .from(sitePages)
      .where(and(eq(sitePages.slug, req.params.slug as string), eq(sitePages.isPublished, true)))
      .limit(1);

    if (!page) return res.status(404).json({ error: 'Page not found' });
    return res.json(page);
  } catch (error) {
    console.error('Get public page error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /testimonials — published testimonials
router.get('/testimonials', async (_req: Request, res: Response) => {
  try {
    const rows = await db
      .select()
      .from(testimonials)
      .where(eq(testimonials.isPublished, true))
      .orderBy(asc(testimonials.sortOrder));

    return res.json(rows);
  } catch (error) {
    console.error('List public testimonials error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /team — published team members
router.get('/team', async (_req: Request, res: Response) => {
  try {
    const rows = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.isPublished, true))
      .orderBy(asc(teamMembers.sortOrder));

    return res.json(rows);
  } catch (error) {
    console.error('List public team error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /events — upcoming published events
router.get('/events', async (_req: Request, res: Response) => {
  try {
    const rows = await db
      .select()
      .from(events)
      .where(
        and(
          eq(events.isPublished, true),
          gte(events.eventDate, new Date())
        )
      )
      .orderBy(asc(events.eventDate));

    return res.json(rows);
  } catch (error) {
    console.error('List public events error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /events/:id — single published event
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

    // Verify event exists and is published
    const [event] = await db
      .select()
      .from(events)
      .where(and(eq(events.id, eventId), eq(events.isPublished, true)))
      .limit(1);

    if (!event) return res.status(404).json({ error: 'Event not found' });

    // Check max attendees
    if (event.maxAttendees) {
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(eventRegistrations)
        .where(eq(eventRegistrations.eventId, eventId));

      if (count >= event.maxAttendees) {
        return res.status(400).json({ error: 'Event is full' });
      }
    }

    // Create or update lead
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

    // Create registration
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

// GET /blog — published blog posts (paginated, filter by tag)
router.get('/blog', async (req: Request, res: Response) => {
  try {
    const { tag, page = '1', limit = '10' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 10));
    const offset = (pageNum - 1) * limitNum;

    const conditions = [eq(blogPosts.isPublished, true)];

    if (tag) {
      conditions.push(sql`${tag} = ANY(${blogPosts.tags})`);
    }

    const rows = await db
      .select({
        id: blogPosts.id,
        slug: blogPosts.slug,
        title: blogPosts.title,
        excerpt: blogPosts.excerpt,
        featuredImageUrl: blogPosts.featuredImageUrl,
        tags: blogPosts.tags,
        publishedAt: blogPosts.publishedAt,
        authorId: blogPosts.authorId,
      })
      .from(blogPosts)
      .where(and(...conditions))
      .orderBy(desc(blogPosts.publishedAt))
      .limit(limitNum)
      .offset(offset);

    const [{ count: total }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(blogPosts)
      .where(and(...conditions));

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
    console.error('List public blog error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /blog/:slug — published blog post by slug
router.get('/blog/:slug', async (req: Request, res: Response) => {
  try {
    const [post] = await db
      .select()
      .from(blogPosts)
      .where(and(eq(blogPosts.slug, req.params.slug as string), eq(blogPosts.isPublished, true)))
      .limit(1);

    if (!post) return res.status(404).json({ error: 'Blog post not found' });
    return res.json(post);
  } catch (error) {
    console.error('Get public blog post error:', error);
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

    if (!email) {
      return res.status(400).json({ error: 'email is required' });
    }

    // Check if already subscribed
    const [existing] = await db
      .select()
      .from(newsletterSubscribers)
      .where(eq(newsletterSubscribers.email, email))
      .limit(1);

    if (existing) {
      if (existing.unsubscribedAt) {
        // Re-subscribe
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
      ersPlanType, current403bBalance, calculatorResults,
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

    // Create appointment if dates provided
    if (preferredDate) {
      const timeMap: Record<string, string> = {
        morning: '09:00:00',
        afternoon: '13:00:00',
        evening: '17:00:00',
      };
      const timeStr = timeMap[(preferredTime || '').toLowerCase()] || preferredTime || '09:00:00';
      const startTime = new Date(`${preferredDate}T${timeStr}`);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour

      await db.insert(appointments).values({
        contactId: lead.contactId,
        agentId: 1, // default agent; admin can reassign
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
      ersPlanType, current403bBalance, lifeInsuranceStatus,
      notes,
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
