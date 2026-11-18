import { Router, Request, Response } from 'express';
import { db } from '../db';
import { users } from '../db/schema';
import { asc, eq } from 'drizzle-orm';
import {
  BOOKING_MESSAGE_VARIABLES,
  DEFAULT_BOOKING_CONFIG,
  formatWhen,
  getAvailability,
  getBookingConfig,
  saveBookingConfig,
  validateBookingConfig,
  type BookingConfig,
} from '../services/booking';
import { busyFromFeed, validateFeedUrl } from '../services/calendar-feed';
import { apiBaseUrl } from '../services/links';

/** Admin settings for self-serve booking. Mounted at /api/booking-settings (admin only). */
const router = Router();

async function buildState() {
  const config = await getBookingConfig();
  const all = await db.select().from(users).orderBy(asc(users.name));
  const warnings: string[] = [];
  if (!apiBaseUrl()) warnings.push('API_PUBLIC_URL is not set on the server, so booking links cannot be texted.');
  const reps = all.filter((u) => u.isLeadRep);
  if (reps.length === 0) warnings.push('No rep is selected on the Welcome Text page, so nobody can be booked.');
  for (const r of reps) {
    if (!r.calendarFeedUrl) warnings.push(`${r.name} has no calendar link. Only CRM bookings block their times.`);
  }
  return {
    config,
    defaults: DEFAULT_BOOKING_CONFIG,
    messageVariables: BOOKING_MESSAGE_VARIABLES,
    reps: all.map((u) => ({ id: u.id, name: u.name, isLeadRep: u.isLeadRep, calendarFeedUrl: u.calendarFeedUrl })),
    warnings,
  };
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    return res.json(await buildState());
  } catch (error) {
    console.error('Booking settings error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/', async (req: Request, res: Response) => {
  try {
    const current = await getBookingConfig();
    const body = (req.body ?? {}) as Partial<BookingConfig>;
    const next: BookingConfig = {
      ...current,
      ...body,
      messages: { ...current.messages, ...(body.messages ?? {}) },
    };
    const err = validateBookingConfig(next);
    if (err) return res.status(400).json({ error: err });
    await saveBookingConfig(next, req.session.userId ?? null);
    return res.json(await buildState());
  } catch (error) {
    console.error('Booking settings save error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /reps/:id — set or clear a rep's calendar link
router.patch('/reps/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const raw = req.body?.calendarFeedUrl;
    let url: string | null = null;
    if (raw) {
      const err = validateFeedUrl(String(raw));
      if (err) return res.status(400).json({ error: err });
      url = String(raw).trim().replace(/^webcal:/i, 'https:');
    }
    const [updated] = await db
      .update(users)
      .set({ calendarFeedUrl: url, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning({ id: users.id });
    if (!updated) return res.status(404).json({ error: 'User not found' });
    return res.json(await buildState());
  } catch (error) {
    console.error('Booking rep update error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /reps/:id/test — read the calendar now and report what booking would offer
router.post('/reps/:id/test', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const [rep] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!rep) return res.status(404).json({ error: 'User not found' });
    const config = await getBookingConfig();
    const now = new Date();
    const to = new Date(now.getTime() + config.horizonDays * 86_400_000);

    let busyCount: number | null = null;
    if (rep.calendarFeedUrl) {
      try {
        busyCount = (await busyFromFeed(rep.calendarFeedUrl, now, to, { ignoreAllDay: config.ignoreAllDay, fresh: true })).length;
      } catch (err) {
        return res.status(400).json({ error: `Could not read the calendar: ${err instanceof Error ? err.message : err}` });
      }
    }
    const { slots } = await getAvailability(rep, { fresh: true });
    return res.json({
      calendarConnected: Boolean(rep.calendarFeedUrl),
      busyBlocks: busyCount,
      openSlots: slots.length,
      nextOpen: slots.slice(0, 5).map((s) => formatWhen(s, config.timezone)),
    });
  } catch (error) {
    console.error('Booking test error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
