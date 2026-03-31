import { Router, Request, Response } from 'express';
import { db } from '../db';
import {
  sitePages, testimonials, teamMembers, events,
  eventRegistrations, blogPosts, newsletterSubscribers,
} from '../db/schema';
import { eq, desc, ilike, or } from 'drizzle-orm';
import { requireAdmin } from '../middleware/auth';

const router = Router();

// All CMS routes require admin
router.use(requireAdmin);

// ── Pages ──

router.get('/pages', async (_req: Request, res: Response) => {
  try {
    const rows = await db.select().from(sitePages).orderBy(sitePages.sortOrder);
    return res.json(rows);
  } catch (error) {
    console.error('List pages error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/pages/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const [page] = await db.select().from(sitePages).where(eq(sitePages.id, id)).limit(1);
    if (!page) return res.status(404).json({ error: 'Page not found' });
    return res.json(page);
  } catch (error) {
    console.error('Get page error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/pages', async (req: Request, res: Response) => {
  try {
    const { slug, title, metaDescription, heroImageUrl, content, isPublished, sortOrder } = req.body;
    if (!slug || !title) {
      return res.status(400).json({ error: 'slug and title are required' });
    }
    const [page] = await db.insert(sitePages).values({
      slug, title, metaDescription, heroImageUrl, content,
      isPublished: isPublished ?? true,
      sortOrder: sortOrder ?? 0,
    }).returning();
    return res.status(201).json(page);
  } catch (error) {
    console.error('Create page error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/pages/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const updateData = { ...req.body, updatedAt: new Date() };
    delete updateData.id;
    delete updateData.createdAt;
    const [updated] = await db.update(sitePages).set(updateData).where(eq(sitePages.id, id)).returning();
    if (!updated) return res.status(404).json({ error: 'Page not found' });
    return res.json(updated);
  } catch (error) {
    console.error('Update page error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/pages/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const [deleted] = await db.delete(sitePages).where(eq(sitePages.id, id)).returning();
    if (!deleted) return res.status(404).json({ error: 'Page not found' });
    return res.json({ message: 'Page deleted' });
  } catch (error) {
    console.error('Delete page error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Testimonials ──

router.get('/testimonials', async (_req: Request, res: Response) => {
  try {
    const rows = await db.select().from(testimonials).orderBy(testimonials.sortOrder);
    return res.json(rows);
  } catch (error) {
    console.error('List testimonials error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/testimonials/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const [row] = await db.select().from(testimonials).where(eq(testimonials.id, id)).limit(1);
    if (!row) return res.status(404).json({ error: 'Testimonial not found' });
    return res.json(row);
  } catch (error) {
    console.error('Get testimonial error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/testimonials', async (req: Request, res: Response) => {
  try {
    const { clientName, clientTitle, body, isFeatured, sortOrder, isPublished } = req.body;
    if (!clientName || !body) {
      return res.status(400).json({ error: 'clientName and body are required' });
    }
    const [row] = await db.insert(testimonials).values({
      clientName, clientTitle, body,
      isFeatured: isFeatured ?? false,
      sortOrder: sortOrder ?? 0,
      isPublished: isPublished ?? true,
    }).returning();
    return res.status(201).json(row);
  } catch (error) {
    console.error('Create testimonial error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/testimonials/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const updateData = { ...req.body };
    delete updateData.id;
    delete updateData.createdAt;
    const [updated] = await db.update(testimonials).set(updateData).where(eq(testimonials.id, id)).returning();
    if (!updated) return res.status(404).json({ error: 'Testimonial not found' });
    return res.json(updated);
  } catch (error) {
    console.error('Update testimonial error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/testimonials/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const [deleted] = await db.delete(testimonials).where(eq(testimonials.id, id)).returning();
    if (!deleted) return res.status(404).json({ error: 'Testimonial not found' });
    return res.json({ message: 'Testimonial deleted' });
  } catch (error) {
    console.error('Delete testimonial error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Team Members ──

router.get('/team', async (_req: Request, res: Response) => {
  try {
    const rows = await db.select().from(teamMembers).orderBy(teamMembers.sortOrder);
    return res.json(rows);
  } catch (error) {
    console.error('List team error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/team/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const [row] = await db.select().from(teamMembers).where(eq(teamMembers.id, id)).limit(1);
    if (!row) return res.status(404).json({ error: 'Team member not found' });
    return res.json(row);
  } catch (error) {
    console.error('Get team member error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/team', async (req: Request, res: Response) => {
  try {
    const { name, role, email, phone, photoUrl, bio, sortOrder, isPublished } = req.body;
    if (!name || !role) {
      return res.status(400).json({ error: 'name and role are required' });
    }
    const [row] = await db.insert(teamMembers).values({
      name, role, email, phone, photoUrl, bio,
      sortOrder: sortOrder ?? 0,
      isPublished: isPublished ?? true,
    }).returning();
    return res.status(201).json(row);
  } catch (error) {
    console.error('Create team member error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/team/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const updateData = { ...req.body };
    delete updateData.id;
    delete updateData.createdAt;
    const [updated] = await db.update(teamMembers).set(updateData).where(eq(teamMembers.id, id)).returning();
    if (!updated) return res.status(404).json({ error: 'Team member not found' });
    return res.json(updated);
  } catch (error) {
    console.error('Update team member error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/team/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const [deleted] = await db.delete(teamMembers).where(eq(teamMembers.id, id)).returning();
    if (!deleted) return res.status(404).json({ error: 'Team member not found' });
    return res.json({ message: 'Team member deleted' });
  } catch (error) {
    console.error('Delete team member error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Events ──

router.get('/events', async (_req: Request, res: Response) => {
  try {
    const rows = await db.select().from(events).orderBy(desc(events.eventDate));
    return res.json(rows);
  } catch (error) {
    console.error('List events error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/events/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const [row] = await db.select().from(events).where(eq(events.id, id)).limit(1);
    if (!row) return res.status(404).json({ error: 'Event not found' });
    return res.json(row);
  } catch (error) {
    console.error('Get event error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/events/:id/registrations', async (req: Request, res: Response) => {
  try {
    const eventId = parseInt(req.params.id as string, 10);
    const rows = await db
      .select()
      .from(eventRegistrations)
      .where(eq(eventRegistrations.eventId, eventId))
      .orderBy(desc(eventRegistrations.registeredAt));
    return res.json(rows);
  } catch (error) {
    console.error('List registrations error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/events', async (req: Request, res: Response) => {
  try {
    const {
      title, description, eventDate, endDate, location,
      zoomLink, registrationRequired, maxAttendees, isPublished,
    } = req.body;
    if (!title || !description || !eventDate) {
      return res.status(400).json({ error: 'title, description, and eventDate are required' });
    }
    const [row] = await db.insert(events).values({
      title, description,
      eventDate: new Date(eventDate),
      endDate: endDate ? new Date(endDate) : null,
      location, zoomLink,
      registrationRequired: registrationRequired ?? true,
      maxAttendees: maxAttendees ?? null,
      isPublished: isPublished ?? true,
    }).returning();
    return res.status(201).json(row);
  } catch (error) {
    console.error('Create event error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/events/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const updateData = { ...req.body, updatedAt: new Date() };
    delete updateData.id;
    delete updateData.createdAt;
    if (updateData.eventDate) updateData.eventDate = new Date(updateData.eventDate);
    if (updateData.endDate) updateData.endDate = new Date(updateData.endDate);
    const [updated] = await db.update(events).set(updateData).where(eq(events.id, id)).returning();
    if (!updated) return res.status(404).json({ error: 'Event not found' });
    return res.json(updated);
  } catch (error) {
    console.error('Update event error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/events/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const [deleted] = await db.delete(events).where(eq(events.id, id)).returning();
    if (!deleted) return res.status(404).json({ error: 'Event not found' });
    return res.json({ message: 'Event deleted' });
  } catch (error) {
    console.error('Delete event error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Blog Posts ──

router.get('/blog', async (_req: Request, res: Response) => {
  try {
    const rows = await db.select().from(blogPosts).orderBy(desc(blogPosts.createdAt));
    return res.json(rows);
  } catch (error) {
    console.error('List blog posts error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/blog/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const [row] = await db.select().from(blogPosts).where(eq(blogPosts.id, id)).limit(1);
    if (!row) return res.status(404).json({ error: 'Blog post not found' });
    return res.json(row);
  } catch (error) {
    console.error('Get blog post error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/blog', async (req: Request, res: Response) => {
  try {
    const {
      slug, title, excerpt, body, authorId,
      featuredImageUrl, metaDescription, tags, isPublished, publishedAt,
    } = req.body;
    if (!slug || !title || !body) {
      return res.status(400).json({ error: 'slug, title, and body are required' });
    }
    const [row] = await db.insert(blogPosts).values({
      slug, title, excerpt, body,
      authorId: authorId ?? req.session.userId,
      featuredImageUrl, metaDescription,
      tags: tags ?? null,
      isPublished: isPublished ?? false,
      publishedAt: publishedAt ? new Date(publishedAt) : null,
    }).returning();
    return res.status(201).json(row);
  } catch (error) {
    console.error('Create blog post error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/blog/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const updateData = { ...req.body, updatedAt: new Date() };
    delete updateData.id;
    delete updateData.createdAt;
    if (updateData.publishedAt) updateData.publishedAt = new Date(updateData.publishedAt);
    const [updated] = await db.update(blogPosts).set(updateData).where(eq(blogPosts.id, id)).returning();
    if (!updated) return res.status(404).json({ error: 'Blog post not found' });
    return res.json(updated);
  } catch (error) {
    console.error('Update blog post error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/blog/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const [deleted] = await db.delete(blogPosts).where(eq(blogPosts.id, id)).returning();
    if (!deleted) return res.status(404).json({ error: 'Blog post not found' });
    return res.json({ message: 'Blog post deleted' });
  } catch (error) {
    console.error('Delete blog post error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Newsletter Subscribers ──

router.get('/subscribers', async (_req: Request, res: Response) => {
  try {
    const rows = await db.select().from(newsletterSubscribers).orderBy(desc(newsletterSubscribers.subscribedAt));
    return res.json(rows);
  } catch (error) {
    console.error('List subscribers error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/subscribers/search', async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'q query parameter is required' });

    const searchStr = `%${q}%`;
    const rows = await db
      .select()
      .from(newsletterSubscribers)
      .where(
        or(
          ilike(newsletterSubscribers.email, searchStr),
          ilike(newsletterSubscribers.firstName, searchStr)
        )
      )
      .orderBy(desc(newsletterSubscribers.subscribedAt));

    return res.json(rows);
  } catch (error) {
    console.error('Search subscribers error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/subscribers/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);

    const [updated] = await db
      .update(newsletterSubscribers)
      .set({ unsubscribedAt: new Date() })
      .where(eq(newsletterSubscribers.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: 'Subscriber not found' });
    return res.json({ message: 'Subscriber unsubscribed' });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
