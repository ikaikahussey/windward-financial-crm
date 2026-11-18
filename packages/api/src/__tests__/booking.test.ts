import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import express from 'express';
import session from 'express-session';
import request from 'supertest';
import { db } from '../db';
import {
  activities,
  appSettings,
  appointments,
  callLogs,
  contacts,
  emailQueue,
  emailTemplates,
  leadScoreHistory,
  pipelineEntries,
  policies,
  quoPhoneNumbers,
  smsMessages,
  tasks,
  users,
  webhookEvents,
} from '../db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { quoService } from '../services/quo';
import { busyFromIcs, clearFeedCache, validateFeedUrl } from '../services/calendar-feed';
import {
  DEFAULT_BOOKING_CONFIG,
  buildInvite,
  computeSlots,
  getAvailability,
  sendAppointmentReminders,
  sendBookingNudges,
  validateBookingConfig,
  zonedToUtc,
} from '../services/booking';
import { currentStage } from '../services/stage-events';
import { sendContactSms } from '../services/sms';
import { sendWelcomeText } from '../services/welcome-text';
import { requireAuth, requireAdmin } from '../middleware/auth';
import clientSelfServeRoutes from '../routes/client-self-serve';
import { bookingPageRouter, intakePageRouter } from '../routes/client-pages';
import bookingSettingsRoutes from '../routes/booking-settings';
import webhooksQuoRoutes from '../routes/webhooks-quo';
import appointmentsRoutes from '../routes/appointments';
import policiesRoutes from '../routes/policies';
import publicFormsRoutes from '../routes/public-forms';
import cors from 'cors';
import { corsDelegate } from '../middleware/cors-options';

const uniq = Math.floor(Math.random() * 1e6).toString().padStart(6, '0');
const FEED_URL = `https://calendar.example.test/feed-${uniq}.ics`;
const phoneFor = (n: number) => `(808) 55${(5 + (n % 4)).toString()}-${(1000 + ((Number(uniq) + n * 7) % 9000)).toString()}`;

let rep: typeof users.$inferSelect;
let templateId: number;
let preexistingLeadRepIds: number[] = [];
let savedSettings: (typeof appSettings.$inferSelect)[] = [];
const contactIds: number[] = [];
let sendSpy: import('vitest').MockInstance<typeof quoService.sendSMS>;
let feedText = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR\r\n';
let feedFails = false;
const realFetch = globalThis.fetch;

async function makeLead(n: number, opts: { stage?: string | null; phone?: string | null; createdAt?: Date } = {}) {
  const [c] = await db
    .insert(contacts)
    .values({
      firstName: 'Lani',
      lastName: `Book${n}`,
      email: `bk-${uniq}-${n}@example.com`,
      phone: opts.phone === undefined ? phoneFor(n) : opts.phone,
      assignedAgentId: rep.id,
      ...(opts.createdAt ? { createdAt: opts.createdAt } : {}),
    })
    .returning();
  contactIds.push(c.id);
  const stage = opts.stage === undefined ? 'New Lead' : opts.stage;
  if (stage) await db.insert(pipelineEntries).values({ contactId: c.id, pipelineStage: stage as any });
  return c;
}

function makeApp(role: string | null = 'admin') {
  const app = express();
  app.use(cors(corsDelegate));
  app.use(express.json());
  app.use(session({ secret: 'test', resave: false, saveUninitialized: false }));
  app.use((req, _res, next) => {
    if (role) {
      req.session.userId = rep.id;
      req.session.userRole = role;
    }
    next();
  });
  app.use('/api/public', publicFormsRoutes);
  app.use('/api/public', clientSelfServeRoutes);
  app.use('/b', bookingPageRouter);
  app.use('/i', intakePageRouter);
  app.use('/api/webhooks/quo', webhooksQuoRoutes);
  app.use('/api/appointments', requireAuth, appointmentsRoutes);
  app.use('/api/policies', requireAuth, policiesRoutes);
  app.use('/api/booking-settings', requireAuth, requireAdmin, bookingSettingsRoutes);
  return app;
}

const textsTo = (phone: string | null) =>
  sendSpy.mock.calls.filter((c) => c[1] === `+1${(phone ?? '').replace(/\D/g, '')}`).map((c) => c[2]);

beforeAll(async () => {
  process.env.API_PUBLIC_URL = 'https://api.example.test';
  savedSettings = await db.select().from(appSettings).where(eq(appSettings.key, 'booking.config'));
  await db.delete(appSettings).where(eq(appSettings.key, 'booking.config'));

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.isLeadRep, true));
  preexistingLeadRepIds = existing.map((u) => u.id);
  if (preexistingLeadRepIds.length) {
    await db.update(users).set({ isLeadRep: false }).where(inArray(users.id, preexistingLeadRepIds));
  }

  [rep] = await db
    .insert(users)
    .values({
      name: 'Kai Booker',
      email: `booker-${uniq}@example.com`,
      passwordHash: 'x',
      role: 'admin',
      phone: '(808) 341-0000',
      isLeadRep: true,
      profileSlug: `kai-booker-${uniq}`,
      calendarFeedUrl: FEED_URL,
    })
    .returning();
  await db.insert(quoPhoneNumbers).values({ quoPhoneNumberId: `PNbk${uniq}`, phoneNumber: '+18085550177', assignedUserId: rep.id });
  [{ id: templateId }] = await db
    .insert(emailTemplates)
    .values({ name: `Test drip ${uniq}`, subject: 's', body: 'b' })
    .returning({ id: emailTemplates.id });

  globalThis.fetch = (async (input: any, init?: any) => {
    if (String(input).startsWith('https://calendar.example.test/')) {
      if (feedFails) return new Response('nope', { status: 403 });
      return new Response(feedText, { status: 200, headers: { 'Content-Type': 'text/calendar' } });
    }
    return realFetch(input, init);
  }) as typeof fetch;
});

afterAll(async () => {
  globalThis.fetch = realFetch;
  if (contactIds.length) {
    for (const table of [smsMessages, activities, tasks, emailQueue, pipelineEntries, appointments, leadScoreHistory, policies, callLogs] as const) {
      await db.delete(table).where(inArray((table as any).contactId, contactIds));
    }
    await db.delete(webhookEvents).where(inArray(webhookEvents.matchedContactId, contactIds));
    await db.delete(contacts).where(inArray(contacts.id, contactIds));
  }
  await db.delete(emailTemplates).where(eq(emailTemplates.id, templateId));
  await db.delete(quoPhoneNumbers).where(eq(quoPhoneNumbers.quoPhoneNumberId, `PNbk${uniq}`));
  await db.delete(appSettings).where(eq(appSettings.key, 'booking.config'));
  await db.delete(users).where(eq(users.id, rep.id));
  if (savedSettings.length) await db.insert(appSettings).values(savedSettings);
  if (preexistingLeadRepIds.length) {
    await db.update(users).set({ isLeadRep: true }).where(inArray(users.id, preexistingLeadRepIds));
  }
  delete process.env.API_PUBLIC_URL;
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(quoService, 'isConfigured').mockReturnValue(true);
  sendSpy = vi.spyOn(quoService, 'sendSMS').mockImplementation(async () => ({ id: `AC${Math.random().toString(36).slice(2)}` }) as any);
  feedText = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR\r\n';
  feedFails = false;
  clearFeedCache();
});

const icsEvent = (uid: string, lines: string[]) =>
  ['BEGIN:VEVENT', `UID:${uid}`, 'DTSTAMP:20260101T000000Z', ...lines, 'END:VEVENT'].join('\r\n');
const ics = (...events: string[]) => ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//test//EN', ...events, 'END:VCALENDAR', ''].join('\r\n');
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

describe('calendar feed', () => {
  it('reads one-off and recurring busy times and skips free, cancelled and all-day events', () => {
    const text = ics(
      icsEvent('one', ['DTSTART:20270111T200000Z', 'DTEND:20270111T210000Z', 'SUMMARY:Dentist']),
      // Every Tuesday 10-11am Honolulu
      icsEvent('weekly', ['DTSTART;TZID=Pacific/Honolulu:20270105T100000', 'DTEND;TZID=Pacific/Honolulu:20270105T110000', 'RRULE:FREQ=WEEKLY;BYDAY=TU', 'SUMMARY:Staff']),
      icsEvent('free', ['DTSTART:20270112T230000Z', 'DTEND:20270113T000000Z', 'TRANSP:TRANSPARENT']),
      icsEvent('gone', ['DTSTART:20270113T200000Z', 'DTEND:20270113T210000Z', 'STATUS:CANCELLED']),
      icsEvent('allday', ['DTSTART;VALUE=DATE:20270114', 'DTEND;VALUE=DATE:20270115', 'SUMMARY:Birthday']),
    );
    const from = new Date('2027-01-11T00:00:00Z');
    const to = new Date('2027-01-18T00:00:00Z');
    const busy = busyFromIcs(text, from, to).map((b) => `${b.start.toISOString()}/${b.end.toISOString()}`);
    expect(busy).toEqual([
      '2027-01-11T20:00:00.000Z/2027-01-11T21:00:00.000Z',
      '2027-01-12T20:00:00.000Z/2027-01-12T21:00:00.000Z', // Tue 10am HST = 20:00Z
    ]);
    expect(busyFromIcs(text, from, to, { ignoreAllDay: false })).toHaveLength(3);
  });

  it('accepts only public https links', () => {
    expect(validateFeedUrl('https://calendar.proton.me/api/calendar/v1/url/abc/calendar.ics?CacheKey=x')).toBeNull();
    expect(validateFeedUrl('webcal://calendar.proton.me/x.ics')).toBeNull();
    expect(validateFeedUrl('http://calendar.proton.me/x.ics')).not.toBeNull();
    expect(validateFeedUrl('https://localhost/x.ics')).not.toBeNull();
    expect(validateFeedUrl('https://10.0.0.5/x.ics')).not.toBeNull();
    expect(validateFeedUrl('not a link')).not.toBeNull();
  });
});

describe('slot computation', () => {
  const cfg = DEFAULT_BOOKING_CONFIG;
  // Sunday 2027-01-10, 6pm Honolulu
  const now = zonedToUtc(2027, 1, 10, 18, 0, cfg.timezone);
  const at = (d: number, h: number, m = 0) => zonedToUtc(2027, 1, d, h, m, cfg.timezone);

  it('converts wall time to UTC, including a DST zone', () => {
    expect(zonedToUtc(2027, 1, 11, 9, 0, 'Pacific/Honolulu').toISOString()).toBe('2027-01-11T19:00:00.000Z');
    expect(zonedToUtc(2027, 7, 1, 9, 0, 'America/New_York').toISOString()).toBe('2027-07-01T13:00:00.000Z');
    expect(zonedToUtc(2027, 1, 11, 9, 0, 'America/New_York').toISOString()).toBe('2027-01-11T14:00:00.000Z');
  });

  it('offers working hours only, minus busy time and buffer', () => {
    const busy = [{ start: at(11, 10), end: at(11, 11) }];
    const slots = computeSlots(cfg, busy, now).map((s) => s.getTime());
    const has = (d: Date) => slots.includes(d.getTime());

    expect(has(at(11, 9))).toBe(true); // Mon 9:00-9:30, clear of the 15-min buffer
    expect(has(at(11, 9, 30))).toBe(false); // ends at 10:00, inside the buffer
    expect(has(at(11, 10))).toBe(false);
    expect(has(at(11, 11))).toBe(false); // starts at 11:00, inside the buffer
    expect(has(at(11, 11, 30))).toBe(true);
    expect(has(at(11, 16, 30))).toBe(true); // last slot ends at 5:00
    expect(has(at(11, 17))).toBe(false);
    expect(has(at(11, 8, 30))).toBe(false);
    expect(has(at(16, 9))).toBe(false); // Saturday
    expect(has(at(17, 9))).toBe(false); // Sunday
    expect(has(at(25, 9))).toBe(false); // beyond the 14-day window
  });

  it('enforces minimum notice', () => {
    const monday830 = at(11, 8, 30);
    const slots = computeSlots(cfg, [], monday830).map((s) => s.getTime());
    expect(slots).not.toContain(at(11, 9).getTime()); // 30 minutes away, needs 2 hours
    expect(slots).toContain(at(11, 10, 30).getTime());
  });

  it('validates settings', () => {
    expect(validateBookingConfig(cfg)).toBeNull();
    expect(validateBookingConfig({ ...cfg, days: [] })).toMatch(/day/);
    expect(validateBookingConfig({ ...cfg, startTime: '17:00', endTime: '09:00' })).toMatch(/after/);
    expect(validateBookingConfig({ ...cfg, timezone: 'Mars/Olympus' })).toMatch(/zone/);
    expect(validateBookingConfig({ ...cfg, messages: { ...cfg.messages, invite: 'Hi {{nope}}' } })).toMatch(/nope/);
  });

  it('builds a calendar invite the rep can add', () => {
    const text = buildInvite({
      appointmentId: 7,
      start: at(11, 9),
      end: at(11, 9, 30),
      summary: 'Consultation: Lani Test',
      description: 'Phone: (808) 555-1234\nBooked online',
      location: 'Phone call',
      attendees: [{ name: 'Kai Booker', email: 'kai@example.com' }],
    });
    expect(text).toContain('METHOD:REQUEST');
    expect(text).toContain('DTSTART:20270111T190000Z');
    expect(text).toContain('DTEND:20270111T193000Z');
    expect(text).toContain('ATTENDEE;CN=Kai Booker;RSVP=FALSE:mailto:kai@example.com');
    expect(text).toContain('DESCRIPTION:Phone: (808) 555-1234\\nBooked online');
  });
});

describe('client booking', () => {
  const app = () => makeApp(null);

  it('serves the booking and intake pages and rejects bad tokens', async () => {
    const page = await request(app()).get('/b/whatever-token-value-000000');
    expect(page.status).toBe(200);
    expect(page.headers['x-robots-tag']).toContain('noindex');
    expect(page.text).toContain('Pick a time');
    expect((await request(app()).get('/i/whatever-token-value-000000')).text).toContain('Before your call');
    expect((await request(app()).get('/api/public/booking/not-a-real-token-0000000000')).status).toBe(404);
    expect((await request(app()).get('/api/public/intake/short')).status).toBe(404);
  });

  it('books a time: appointment, stage, confirmation text, rep alert', async () => {
    const c = await makeLead(1);
    const load = await request(app()).get(`/api/public/booking/${c.publicToken}`);
    expect(load.status).toBe(200);
    expect(load.body.rep.name).toBe('Kai Booker');
    expect(load.body.existing).toBeNull();
    expect(load.body.slots.length).toBeGreaterThan(10);
    const start = load.body.slots[3];

    const res = await request(app()).post(`/api/public/booking/${c.publicToken}`).send({ start });
    expect(res.status).toBe(201);
    expect(res.body.repName).toBe('Kai Booker');

    const [appt] = await db.select().from(appointments).where(eq(appointments.contactId, c.id));
    expect(appt.agentId).toBe(rep.id);
    expect(appt.status).toBe('Scheduled');
    expect(appt.source).toBe('online');
    expect(appt.startTime.toISOString()).toBe(start);
    expect(appt.endTime.getTime() - appt.startTime.getTime()).toBe(30 * 60_000);
    expect(await currentStage(c.id)).toBe('Consultation Scheduled');

    const [confirmation] = textsTo(c.phone);
    expect(confirmation).toContain("You're booked with Kai Booker");
    expect(confirmation).toContain(`https://api.example.test/i/${c.publicToken}`);
    expect(confirmation).toContain(`https://api.example.test/b/${c.publicToken}`);
    expect(textsTo(rep.phone)[0]).toContain('Booked: Lani Book1');

    // Nobody else is offered that time or the buffer around it, and cannot take it.
    const other = await makeLead(2);
    const otherLoad = await request(app()).get(`/api/public/booking/${other.publicToken}`);
    expect(otherLoad.body.slots).not.toContain(start);
    const clash = await request(app()).post(`/api/public/booking/${other.publicToken}`).send({ start });
    expect(clash.status).toBe(409);
    expect(await db.select().from(appointments).where(eq(appointments.contactId, other.id))).toHaveLength(0);
    expect(await currentStage(other.id)).toBe('New Lead');
  });

  it('reschedules and cancels from the same link', async () => {
    const c = await makeLead(3);
    const first = await request(app()).get(`/api/public/booking/${c.publicToken}`);
    const [a, b] = [first.body.slots[6], first.body.slots[9]];
    await request(app()).post(`/api/public/booking/${c.publicToken}`).send({ start: a });

    const again = await request(app()).get(`/api/public/booking/${c.publicToken}`);
    expect(again.body.existing.start).toBe(a);
    expect(again.body.slots).toContain(a); // their own time stays available to them

    const moved = await request(app()).post(`/api/public/booking/${c.publicToken}`).send({ start: b });
    expect(moved.body.rescheduled).toBe(true);
    const rows = await db.select().from(appointments).where(eq(appointments.contactId, c.id));
    expect(rows.filter((r) => r.status === 'Scheduled').map((r) => r.startTime.toISOString())).toEqual([b]);
    expect(rows.filter((r) => r.status === 'Cancelled')).toHaveLength(1);

    const cancelled = await request(app()).delete(`/api/public/booking/${c.publicToken}`);
    expect(cancelled.status).toBe(200);
    expect((await request(app()).get(`/api/public/booking/${c.publicToken}`)).body.existing).toBeNull();
    expect((await request(app()).delete(`/api/public/booking/${c.publicToken}`)).status).toBe(404);
    expect(textsTo(rep.phone).some((t) => t.startsWith('Cancelled: Lani Book3'))).toBe(true);
  });

  it("blocks times that are busy on the rep's calendar, and survives a broken link", async () => {
    const open = (await getAvailability(rep)).slots;
    const target = open[open.length - 5];
    feedText = ics(icsEvent('busy', [`DTSTART:${stamp(target)}`, `DTEND:${stamp(new Date(target.getTime() + 60 * 60_000))}`, 'SUMMARY:Private']));
    clearFeedCache();
    const blocked = await getAvailability(rep);
    expect(blocked.calendarError).toBeNull();
    expect(blocked.slots.map((s) => s.getTime())).not.toContain(target.getTime());
    expect(blocked.slots.length).toBeLessThan(open.length);

    feedFails = true;
    clearFeedCache();
    const degraded = await getAvailability(rep);
    expect(degraded.calendarError).toContain('403');
    expect(degraded.slots.length).toBe(open.length);
  });

  it('accepts posts from the booking page itself and the public site, not from other sites', async () => {
    const c = await makeLead(5);
    const get = (origin: string, host = 'api.example.test') =>
      request(app()).get(`/api/public/booking/${c.publicToken}`).set('Host', host).set('Origin', origin);
    expect((await get('https://api.example.test')).status).toBe(200); // the page the API serves
    process.env.PUBLIC_URL = 'https://windward.financial, https://www.windward.financial/';
    expect((await get('https://www.windward.financial')).status).toBe(200);
    delete process.env.PUBLIC_URL;
    expect((await get('https://windward.financial')).status).toBe(500);
    expect((await get('https://evil.example')).status).toBe(500);
  });

  it('rejects a time that is not an open slot', async () => {
    const c = await makeLead(4);
    const res = await request(app()).post(`/api/public/booking/${c.publicToken}`).send({ start: '2020-01-01T00:00:00.000Z' });
    expect(res.status).toBe(409);
    expect((await request(app()).post(`/api/public/booking/${c.publicToken}`).send({})).status).toBe(400);
  });
});

describe('reminders and nudges', () => {
  it('texts 24-hour and 1-hour reminders once each', async () => {
    const now = new Date();
    const soon = await makeLead(10);
    const tomorrow = await makeLead(11);
    const justBooked = await makeLead(12);
    const mk = (contactId: number, startInMin: number, createdAgoH: number) =>
      db.insert(appointments).values({
        contactId,
        agentId: rep.id,
        startTime: new Date(now.getTime() + startInMin * 60_000),
        endTime: new Date(now.getTime() + (startInMin + 30) * 60_000),
        status: 'Scheduled',
        createdAt: new Date(now.getTime() - createdAgoH * 3_600_000),
        reminder24hSentAt: startInMin < 120 ? now : null,
      });
    await mk(soon.id, 40, 72);
    await mk(tomorrow.id, 20 * 60, 72);
    await mk(justBooked.id, 20 * 60, 0);

    await sendAppointmentReminders(now);
    expect(textsTo(soon.phone)).toHaveLength(1);
    expect(textsTo(soon.phone)[0]).toContain('starts at');
    expect(textsTo(tomorrow.phone)).toHaveLength(1);
    expect(textsTo(tomorrow.phone)[0]).toContain('Reminder: your call with Kai Booker');
    expect(textsTo(justBooked.phone)).toHaveLength(0); // confirmation was minutes ago

    sendSpy.mockClear();
    await sendAppointmentReminders(now);
    expect(sendSpy).not.toHaveBeenCalled();
  });

  it('texts a booking link once to new leads who have not booked', async () => {
    const tz = DEFAULT_BOOKING_CONFIG.timezone;
    const today = new Date();
    const noon = zonedToUtc(today.getUTCFullYear(), today.getUTCMonth() + 1, today.getUTCDate(), 12, 0, tz);
    const twoHoursBefore = new Date(noon.getTime() - 2 * 3_600_000);

    const waiting = await makeLead(20, { createdAt: twoHoursBefore });
    const fresh = await makeLead(21, { createdAt: new Date(noon.getTime() - 10 * 60_000) });
    const contacted = await makeLead(22, { createdAt: twoHoursBefore, stage: 'Contacted' });
    const optedOut = await makeLead(23, { createdAt: twoHoursBefore });
    await db.update(contacts).set({ smsOptOut: true }).where(eq(contacts.id, optedOut.id));

    await sendBookingNudges(noon);
    expect(textsTo(waiting.phone)).toHaveLength(1);
    expect(textsTo(waiting.phone)[0]).toContain(`https://api.example.test/b/${waiting.publicToken}`);
    expect(textsTo(fresh.phone)).toHaveLength(0);
    expect(textsTo(contacted.phone)).toHaveLength(0);
    expect(textsTo(optedOut.phone)).toHaveLength(0);

    sendSpy.mockClear();
    await sendBookingNudges(noon);
    expect(textsTo(waiting.phone)).toHaveLength(0);

    // Never at night.
    const late = await makeLead(24, { createdAt: twoHoursBefore });
    await sendBookingNudges(new Date(noon.getTime() + 10 * 3_600_000)); // 10pm
    expect(textsTo(late.phone)).toHaveLength(0);
  });
});

describe('inbound texts and calls', () => {
  const app = () => makeApp(null);
  const inbound = (from: string, body: string) =>
    request(app())
      .post('/api/webhooks/quo/messages')
      .send({ event: 'message.received', data: { from, body, messageId: `MSG${Math.random()}` } });

  it('a reply stops the drip, marks the lead contacted, and tells the rep', async () => {
    const c = await makeLead(30);
    await db.insert(emailQueue).values({ contactId: c.id, templateId, scheduledFor: new Date(Date.now() + 86_400_000) });
    const e164 = `+1${c.phone!.replace(/\D/g, '')}`;

    expect((await inbound(e164, 'Yes, what times do you have?')).status).toBe(200);

    expect(await currentStage(c.id)).toBe('Contacted');
    const [queued] = await db.select().from(emailQueue).where(eq(emailQueue.contactId, c.id));
    expect(queued.status).toBe('Cancelled');
    const open = await db.select().from(tasks).where(eq(tasks.contactId, c.id));
    expect(open).toHaveLength(1);
    expect(open[0].title).toBe('Reply to text from Lani Book30');
    expect(open[0].assignedTo).toBe(rep.id);
    expect(textsTo(rep.phone)[0]).toContain('Text from Lani Book30');

    await inbound(e164, 'Hello?');
    expect(await db.select().from(tasks).where(eq(tasks.contactId, c.id))).toHaveLength(1);
  });

  it('STOP turns automated texts off and START turns them back on', async () => {
    const c = await makeLead(31);
    const e164 = `+1${c.phone!.replace(/\D/g, '')}`;
    await inbound(e164, ' stop ');
    let [row] = await db.select().from(contacts).where(eq(contacts.id, c.id));
    expect(row.smsOptOut).toBe(true);
    expect(await currentStage(c.id)).toBe('New Lead');
    expect(await db.select().from(tasks).where(eq(tasks.contactId, c.id))).toHaveLength(0);

    sendSpy.mockClear();
    expect(await sendContactSms(c.id, 'hi', 'Test')).toEqual({ sent: false, reason: 'opted out' });
    expect(await sendWelcomeText(c.id)).toEqual({ sent: false, reason: 'opted out' });
    expect(sendSpy).not.toHaveBeenCalled();

    await inbound(e164, 'START');
    [row] = await db.select().from(contacts).where(eq(contacts.id, c.id));
    expect(row.smsOptOut).toBe(false);
    expect((await sendContactSms(c.id, 'hi', 'Test')).sent).toBe(true);
  });

  it('a real call marks a new lead contacted; a missed one does not', async () => {
    const call = (participantNumber: string, durationSeconds: number) =>
      request(app())
        .post('/api/webhooks/quo/calls')
        .send({ event: 'call.completed', data: { callId: `CALL${Math.random()}`, participantNumber, direction: 'outbound', durationSeconds } });
    const short = await makeLead(32);
    const real = await makeLead(33);
    await call(`+1${short.phone!.replace(/\D/g, '')}`, 8);
    await call(`+1${real.phone!.replace(/\D/g, '')}`, 240);
    expect(await currentStage(short.id)).toBe('New Lead');
    expect(await currentStage(real.id)).toBe('Contacted');
  });
});

describe('intake', () => {
  it('saves answers, ignores invalid values, and re-scores the lead', async () => {
    const c = await makeLead(40);
    const app = makeApp(null);
    const form = await request(app).get(`/api/public/intake/${c.publicToken}`);
    expect(form.body.options.employmentType).toContain('DOE Teacher');
    expect(form.body.completed).toBe(false);

    const res = await request(app)
      .post(`/api/public/intake/${c.publicToken}`)
      .send({
        employmentType: 'DOE Teacher',
        employerSchool: 'Farrington High',
        yearsOfService: '14',
        ersPlanType: 'Hybrid',
        lifeInsuranceStatus: 'Definitely Not A Value',
        annualSalary: '$72,000',
        goals: ['Understand my pension', 'Injected <script>'],
        notes: 'Spouse also works for DOE',
      });
    expect(res.status).toBe(201);

    const [row] = await db.select().from(contacts).where(eq(contacts.id, c.id));
    expect(row.employmentType).toBe('DOE Teacher');
    expect(row.employerSchool).toBe('Farrington High');
    expect(row.yearsOfService).toBe(14);
    expect(row.ersPlanType).toBe('Hybrid');
    expect(row.lifeInsuranceStatus).toBeNull();
    expect(Number(row.annualSalary)).toBe(72000);
    expect(row.goals).toBe('Understand my pension\nSpouse also works for DOE');
    expect(row.intakeCompletedAt).not.toBeNull();
    expect(row.leadScore).toBeGreaterThan(0);
    expect(await db.select().from(leadScoreHistory).where(eq(leadScoreHistory.contactId, c.id))).toHaveLength(1);
    expect((await request(app).get(`/api/public/intake/${c.publicToken}`)).body.completed).toBe(true);
  });
});

describe('staff actions move the pipeline', () => {
  it('appointment outcome: completed advances the stage, no-show texts a rebooking link', async () => {
    const app = makeApp('agent');
    const done = await makeLead(50);
    const start = new Date(Date.now() + 86_400_000);
    const created = await request(app)
      .post('/api/appointments')
      .send({ contactId: done.id, agentId: rep.id, startTime: start, endTime: new Date(start.getTime() + 1_800_000) });
    expect(created.status).toBe(201);
    expect(await currentStage(done.id)).toBe('Consultation Scheduled');

    await request(app).patch(`/api/appointments/${created.body.id}`).send({ status: 'Completed' });
    expect(await currentStage(done.id)).toBe('Consultation Completed');

    const missed = await makeLead(51);
    const second = await request(app)
      .post('/api/appointments')
      .send({ contactId: missed.id, agentId: rep.id, startTime: start, endTime: new Date(start.getTime() + 1_800_000) });
    sendSpy.mockClear();
    await request(app).patch(`/api/appointments/${second.body.id}`).send({ status: 'No Show' });
    expect(textsTo(missed.phone)[0]).toContain('Sorry we missed you, Lani');
    expect(textsTo(missed.phone)[0]).toContain(`/b/${missed.publicToken}`);
  });

  it('policy records: applied then issued', async () => {
    const app = makeApp('agent');
    const c = await makeLead(52, { stage: 'Proposal Sent' });
    const created = await request(app).post('/api/policies').send({ contactId: c.id, productType: 'Term Life' });
    expect(created.status).toBe(201);
    expect(await currentStage(c.id)).toBe('Application Submitted');
    await request(app).patch(`/api/policies/${created.body.id}`).send({ status: 'Issued' });
    expect(await currentStage(c.id)).toBe('Policy Issued');
    // Later edits never move a client backwards.
    await request(app).patch(`/api/policies/${created.body.id}`).send({ status: 'Applied' });
    expect(await currentStage(c.id)).toBe('Policy Issued');
  });

  it('the website appointment form sends a booking link instead of booking blind', async () => {
    const email = `bk-form-${uniq}@example.com`;
    const phone = phoneFor(60);
    const res = await request(makeApp(null))
      .post('/api/public/schedule')
      .send({ firstName: 'Noe', lastName: 'Sched', email, phone, preferredDate: '2030-01-01', preferredTime: 'morning' });
    expect(res.status).toBe(201);
    contactIds.push(res.body.contactId);
    expect(res.body.bookingUrl).toMatch(/^https:\/\/api\.example\.test\/b\/.{20,}$/);
    expect(await db.select().from(appointments).where(eq(appointments.contactId, res.body.contactId))).toHaveLength(0);
    await vi.waitFor(() => expect(textsTo(phone).some((t) => t.includes('Pick a time'))).toBe(true));
    const [row] = await db.select().from(contacts).where(eq(contacts.id, res.body.contactId));
    expect(row.notes).toContain('Preferred date: 2030-01-01');
  });
});

describe('booking settings (admin)', () => {
  it('is admin-only and validates input', async () => {
    expect((await request(makeApp('agent')).get('/api/booking-settings')).status).toBe(403);
    const app = makeApp('admin');
    const get = await request(app).get('/api/booking-settings');
    expect(get.body.config.durationMinutes).toBe(30);
    expect(get.body.reps.find((r: { id: number }) => r.id === rep.id).calendarFeedUrl).toBe(FEED_URL);

    expect((await request(app).put('/api/booking-settings').send({ days: [] })).status).toBe(400);
    const saved = await request(app).put('/api/booking-settings').send({ durationMinutes: 45, messages: { noShow: 'Missed you {{first_name}}: {{booking_link}}' } });
    expect(saved.status).toBe(200);
    expect(saved.body.config.durationMinutes).toBe(45);
    expect(saved.body.config.messages.noShow).toContain('Missed you');
    expect(saved.body.config.messages.invite).toBe(DEFAULT_BOOKING_CONFIG.messages.invite);
    await request(app).put('/api/booking-settings').send({ durationMinutes: 30, messages: DEFAULT_BOOKING_CONFIG.messages });
  });

  it("sets and tests a rep's calendar link", async () => {
    const app = makeApp('admin');
    expect((await request(app).patch(`/api/booking-settings/reps/${rep.id}`).send({ calendarFeedUrl: 'http://insecure.example/x.ics' })).status).toBe(400);
    const ok = await request(app).patch(`/api/booking-settings/reps/${rep.id}`).send({ calendarFeedUrl: FEED_URL.replace('https:', 'webcal:') });
    expect(ok.body.reps.find((r: { id: number }) => r.id === rep.id).calendarFeedUrl).toBe(FEED_URL);

    const test = await request(app).post(`/api/booking-settings/reps/${rep.id}/test`);
    expect(test.status).toBe(200);
    expect(test.body.calendarConnected).toBe(true);
    expect(test.body.busyBlocks).toBe(0);
    expect(test.body.openSlots).toBeGreaterThan(0);
    expect(test.body.nextOpen).toHaveLength(5);

    feedFails = true;
    const bad = await request(app).post(`/api/booking-settings/reps/${rep.id}/test`);
    expect(bad.status).toBe(400);
    expect(bad.body.error).toContain('Could not read the calendar');
  });
});
