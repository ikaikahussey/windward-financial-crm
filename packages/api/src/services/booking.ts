import { db } from '../db';
import { activities, appSettings, appointments, contacts, users } from '../db/schema';
import { and, eq, gt, gte, isNull, lt, lte, sql } from 'drizzle-orm';
import { assignRep, type Rep } from './rep-assignment';
import { busyFromFeed, type Interval } from './calendar-feed';
import { alertRep, contactLabel, sendContactSms } from './sms';
import { advanceStage, currentStage, BEFORE_CONSULTATION } from './stage-events';
import { bookingLink, intakeLink } from './links';
import { sendDirectEmail } from './email-sender';
import { formatPhone } from './phone';

/**
 * Self-serve consultation booking.
 *
 * Open times = the firm's working hours, minus the rep's busy times from
 * their calendar link, minus consultations already booked in the CRM.
 * Booking moves the contact to "Consultation Scheduled", confirms by text,
 * and emails the rep a calendar invite.
 */

// ── Settings ──

export interface BookingMessages {
  invite: string;
  confirmation: string;
  reminder24h: string;
  reminder1h: string;
  noShow: string;
}

export interface BookingConfig {
  timezone: string;
  /** 0 = Sunday … 6 = Saturday */
  days: number[];
  startTime: string; // "09:00"
  endTime: string; // "17:00"
  durationMinutes: number;
  slotStepMinutes: number;
  bufferMinutes: number;
  minNoticeHours: number;
  horizonDays: number;
  ignoreAllDay: boolean;
  location: string;
  /** Text a booking link to new leads who have not booked after this many minutes. 0 = off. */
  nudgeAfterMinutes: number;
  messages: BookingMessages;
}

export const DEFAULT_BOOKING_CONFIG: BookingConfig = {
  timezone: 'Pacific/Honolulu',
  days: [1, 2, 3, 4, 5],
  startTime: '09:00',
  endTime: '17:00',
  durationMinutes: 30,
  slotStepMinutes: 30,
  bufferMinutes: 15,
  minNoticeHours: 2,
  horizonDays: 14,
  ignoreAllDay: true,
  location: 'Phone call',
  nudgeAfterMinutes: 60,
  messages: {
    invite:
      'Aloha {{first_name}}, this is Windward Financial. Pick a time to talk with {{rep_first_name}}: {{booking_link}} Reply STOP to opt out.',
    confirmation:
      "You're booked with {{rep_name}} on {{when}}. {{rep_first_name}} will call you at this number. 2 minutes of questions so the call is useful: {{intake_link}} Change or cancel: {{booking_link}}",
    reminder24h:
      'Reminder: your call with {{rep_name}} of Windward Financial is {{when}}. Change or cancel: {{booking_link}}',
    reminder1h: 'Your call with {{rep_name}} starts at {{time}}. {{rep_first_name}} will call this number.',
    noShow: 'Sorry we missed you, {{first_name}}. Pick a new time with {{rep_first_name}}: {{booking_link}}',
  },
};

export const BOOKING_MESSAGE_VARIABLES = [
  'first_name',
  'rep_name',
  'rep_first_name',
  'rep_phone',
  'when',
  'time',
  'booking_link',
  'intake_link',
] as const;

const KEY = 'booking.config';
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function getBookingConfig(): Promise<BookingConfig> {
  const [row] = await db.select().from(appSettings).where(eq(appSettings.key, KEY)).limit(1);
  if (!row) return DEFAULT_BOOKING_CONFIG;
  try {
    const saved = JSON.parse(row.value) as Partial<BookingConfig>;
    return {
      ...DEFAULT_BOOKING_CONFIG,
      ...saved,
      messages: { ...DEFAULT_BOOKING_CONFIG.messages, ...(saved.messages ?? {}) },
    };
  } catch {
    return DEFAULT_BOOKING_CONFIG;
  }
}

/** Returns an error message, or null when the config is valid. */
export function validateBookingConfig(c: BookingConfig): string | null {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: c.timezone });
  } catch {
    return 'Unknown time zone';
  }
  if (!Array.isArray(c.days) || c.days.length === 0 || c.days.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) {
    return 'Choose at least one day';
  }
  if (!HHMM.test(c.startTime) || !HHMM.test(c.endTime)) return 'Times must be HH:MM';
  if (c.startTime >= c.endTime) return 'End time must be after start time';
  const int = (v: number, min: number, max: number) => Number.isInteger(v) && v >= min && v <= max;
  if (!int(c.durationMinutes, 10, 240)) return 'Length must be 10 to 240 minutes';
  if (!int(c.slotStepMinutes, 5, 240)) return 'Slot spacing must be 5 to 240 minutes';
  if (!int(c.bufferMinutes, 0, 120)) return 'Buffer must be 0 to 120 minutes';
  if (!int(c.minNoticeHours, 0, 168)) return 'Minimum notice must be 0 to 168 hours';
  if (!int(c.horizonDays, 1, 60)) return 'Booking window must be 1 to 60 days';
  if (!int(c.nudgeAfterMinutes, 0, 10080)) return 'Nudge delay must be 0 to 10080 minutes';
  for (const [name, text] of Object.entries(c.messages)) {
    if (typeof text !== 'string' || !text.trim()) return `Message "${name}" is empty`;
    if (text.length > 600) return `Message "${name}" is over 600 characters`;
    const unknown = [...text.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)]
      .map((m) => m[1])
      .filter((v) => !(BOOKING_MESSAGE_VARIABLES as readonly string[]).includes(v));
    if (unknown.length) return `Message "${name}" has unknown variable {{${unknown[0]}}}`;
  }
  return null;
}

export async function saveBookingConfig(config: BookingConfig, userId: number | null): Promise<void> {
  const value = JSON.stringify(config);
  await db
    .insert(appSettings)
    .values({ key: KEY, value, updatedBy: userId })
    .onConflictDoUpdate({ target: appSettings.key, set: { value, updatedBy: userId, updatedAt: new Date() } });
}

// ── Time zone helpers ──

function wallParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    weekday: 'short',
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour: Number(get('hour')),
    minute: Number(get('minute')),
    weekday: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday')),
  };
}

/** The instant at which the wall clock in `timeZone` reads the given date and time. */
export function zonedToUtc(year: number, month: number, day: number, hour: number, minute: number, timeZone: string): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const w = wallParts(new Date(guess), timeZone);
  const offset = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute) - guess;
  return new Date(guess - offset);
}

export function formatWhen(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  })
    .format(date)
    .replace(/[\u202f\u00a0]/g, ' ');
}

export function formatTime(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })
    .format(date)
    .replace(/[\u202f\u00a0]/g, ' ');
}

// ── Availability ──

const overlaps = (a: Interval, b: Interval) => a.start < b.end && b.start < a.end;

/** Pure slot computation. `busy` must already include CRM appointments. */
export function computeSlots(config: BookingConfig, busy: Interval[], now: Date): Date[] {
  const [sh, sm] = config.startTime.split(':').map(Number);
  const [eh, em] = config.endTime.split(':').map(Number);
  const earliest = new Date(now.getTime() + config.minNoticeHours * 3_600_000);
  const buffer = config.bufferMinutes * 60_000;
  const padded = busy.map((b) => ({ start: new Date(b.start.getTime() - buffer), end: new Date(b.end.getTime() + buffer) }));
  const slots: Date[] = [];

  const today = wallParts(now, config.timezone);
  for (let d = 0; d <= config.horizonDays; d++) {
    // Noon UTC of the wall date avoids date rollover while stepping days.
    const probe = new Date(Date.UTC(today.year, today.month - 1, today.day + d, 12));
    const y = probe.getUTCFullYear();
    const m = probe.getUTCMonth() + 1;
    const day = probe.getUTCDate();
    if (!config.days.includes(probe.getUTCDay())) continue;

    for (let t = sh * 60 + sm; t + config.durationMinutes <= eh * 60 + em; t += config.slotStepMinutes) {
      const start = zonedToUtc(y, m, day, Math.floor(t / 60), t % 60, config.timezone);
      const slot = { start, end: new Date(start.getTime() + config.durationMinutes * 60_000) };
      if (start < earliest) continue;
      if (padded.some((b) => overlaps(slot, b))) continue;
      slots.push(start);
    }
  }
  return slots;
}

async function crmBusy(repId: number, from: Date, to: Date, exceptContactId?: number): Promise<Interval[]> {
  const rows = await db
    .select({ start: appointments.startTime, end: appointments.endTime, contactId: appointments.contactId })
    .from(appointments)
    .where(
      and(
        eq(appointments.agentId, repId),
        eq(appointments.status, 'Scheduled'),
        gt(appointments.endTime, from),
        lt(appointments.startTime, to),
      ),
    );
  // A contact rescheduling may reuse the time they already hold.
  return rows.filter((r) => r.contactId !== exceptContactId).map((r) => ({ start: r.start, end: r.end }));
}

export interface Availability {
  slots: Date[];
  /** Set when the rep's calendar link could not be read; CRM bookings were still honored. */
  calendarError: string | null;
}

export async function getAvailability(
  rep: Pick<Rep, 'id' | 'calendarFeedUrl'>,
  opts: { now?: Date; exceptContactId?: number; fresh?: boolean } = {},
): Promise<Availability> {
  const config = await getBookingConfig();
  const now = opts.now ?? new Date();
  const to = new Date(now.getTime() + (config.horizonDays + 2) * 86_400_000);
  const busy = await crmBusy(rep.id, now, to, opts.exceptContactId);
  let calendarError: string | null = null;

  if (rep.calendarFeedUrl) {
    try {
      busy.push(...(await busyFromFeed(rep.calendarFeedUrl, now, to, { ignoreAllDay: config.ignoreAllDay, fresh: opts.fresh })));
    } catch (err) {
      calendarError = err instanceof Error ? err.message : String(err);
      console.error(`Calendar feed error for user ${rep.id}:`, calendarError);
    }
  }
  return { slots: computeSlots(config, busy, now), calendarError };
}

// ── Messages ──

function render(template: string, vars: Record<string, string>): string {
  return template
    .replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, k: string) => vars[k] ?? '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

type ContactRow = typeof contacts.$inferSelect;

function messageVars(contact: ContactRow, rep: Rep | null, config: BookingConfig, start?: Date) {
  return {
    first_name: contact.firstName,
    rep_name: rep?.name ?? 'your rep',
    rep_first_name: rep?.name.trim().split(/\s+/)[0] ?? 'your rep',
    rep_phone: formatPhone(rep?.phone),
    when: start ? formatWhen(start, config.timezone) : '',
    time: start ? formatTime(start, config.timezone) : '',
    booking_link: bookingLink(contact.publicToken),
    intake_link: contact.intakeCompletedAt ? '' : intakeLink(contact.publicToken),
  };
}

async function loadContact(contactId: number) {
  const [c] = await db.select().from(contacts).where(eq(contacts.id, contactId)).limit(1);
  return c ?? null;
}

async function loadRep(id: number | null) {
  if (!id) return null;
  const [r] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return r ?? null;
}

/** Text the contact their booking link. Sent at most once unless `force`. */
export async function sendBookingInvite(
  contactId: number,
  opts: { force?: boolean; kind?: 'invite' | 'noShow' } = {},
): Promise<{ sent: boolean; reason?: string }> {
  const contact = await loadContact(contactId);
  if (!contact) return { sent: false, reason: 'contact not found' };
  if (contact.bookingInviteSentAt && !opts.force) return { sent: false, reason: 'already invited' };
  if (!bookingLink(contact.publicToken)) return { sent: false, reason: 'API_PUBLIC_URL is not set' };
  const rep = (await assignRep(contactId)) ?? null;
  if (!rep) return { sent: false, reason: 'no lead rep configured' };

  const config = await getBookingConfig();
  const kind = opts.kind ?? 'invite';
  const body = render(config.messages[kind], messageVars(contact, rep, config));
  const result = await sendContactSms(contactId, body, kind === 'noShow' ? 'Rebooking link sent' : 'Booking link sent');
  if (result.sent) {
    await db.update(contacts).set({ bookingInviteSentAt: new Date() }).where(eq(contacts.id, contactId));
    return { sent: true };
  }
  return { sent: false, reason: result.reason };
}

// ── Calendar invite ──

const icsDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const icsText = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

export function buildInvite(opts: {
  appointmentId: number;
  start: Date;
  end: Date;
  summary: string;
  description: string;
  location: string;
  attendees: { name: string; email: string }[];
  cancelled?: boolean;
  sequence?: number;
}): string {
  const organizer = process.env.EMAIL_FROM || 'info@windwardfinancial.com';
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Windward Financial//CRM//EN',
    `METHOD:${opts.cancelled ? 'CANCEL' : 'REQUEST'}`,
    'BEGIN:VEVENT',
    `UID:appointment-${opts.appointmentId}@windwardfinancial`,
    `SEQUENCE:${opts.sequence ?? 0}`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(opts.start)}`,
    `DTEND:${icsDate(opts.end)}`,
    `SUMMARY:${icsText(opts.summary)}`,
    `DESCRIPTION:${icsText(opts.description)}`,
    `LOCATION:${icsText(opts.location)}`,
    `STATUS:${opts.cancelled ? 'CANCELLED' : 'CONFIRMED'}`,
    `ORGANIZER;CN=Windward Financial:mailto:${organizer}`,
    ...opts.attendees.map((a) => `ATTENDEE;CN=${icsText(a.name)};RSVP=FALSE:mailto:${a.email}`),
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

async function emailInvite(
  appt: typeof appointments.$inferSelect,
  contact: ContactRow,
  rep: Rep,
  config: BookingConfig,
  cancelled = false,
) {
  const when = formatWhen(appt.startTime, config.timezone);
  const ics = buildInvite({
    appointmentId: appt.id,
    start: appt.startTime,
    end: appt.endTime,
    summary: `Consultation: ${contact.firstName} ${contact.lastName}`,
    description: [
      `Client: ${contact.firstName} ${contact.lastName}`,
      contact.phone ? `Phone: ${formatPhone(contact.phone)}` : null,
      contact.email ? `Email: ${contact.email}` : null,
      contact.employerSchool ? `Employer: ${contact.employerSchool}` : null,
      'Booked online through the Windward Financial CRM.',
    ]
      .filter(Boolean)
      .join('\n'),
    location: config.location,
    attendees: [{ name: rep.name, email: rep.email }],
    cancelled,
    sequence: cancelled ? 1 : 0,
  });
  const attachment = [{ filename: 'consultation.ics', content: ics, contentType: `text/calendar; method=${cancelled ? 'CANCEL' : 'REQUEST'}` }];

  await sendDirectEmail({
    to: rep.email,
    subject: `${cancelled ? 'Cancelled' : 'Booked'}: ${contact.firstName} ${contact.lastName}, ${when}`,
    html: `<p>${cancelled ? 'Cancelled' : 'New'} consultation with <strong>${esc(contact.firstName)} ${esc(contact.lastName)}</strong> on ${esc(when)}.</p>
<p>${contact.phone ? `Phone: ${esc(formatPhone(contact.phone))}<br>` : ''}${contact.email ? `Email: ${esc(contact.email)}` : ''}</p>
<p>Open the attached invite to ${cancelled ? 'remove it from' : 'add it to'} your calendar.</p>`,
    attachments: attachment,
  });

  if (!cancelled && contact.email) {
    await sendDirectEmail({
      to: contact.email,
      subject: `Your call with ${rep.name} of Windward Financial, ${when}`,
      html: `<p>Aloha ${esc(contact.firstName)},</p>
<p>You are booked with <strong>${esc(rep.name)}</strong> on <strong>${esc(when)}</strong>. ${esc(rep.name.split(/\s+/)[0])} will call you${contact.phone ? ` at ${esc(formatPhone(contact.phone))}` : ''}.</p>
${bookingLink(contact.publicToken) ? `<p>Need to change it? <a href="${esc(bookingLink(contact.publicToken))}">Reschedule or cancel</a>.</p>` : ''}
<p>Windward Financial</p>`,
      attachments: attachment,
    });
  }
}

// ── Booking ──

export class BookingError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export async function upcomingAppointment(contactId: number, now = new Date()) {
  const [row] = await db
    .select()
    .from(appointments)
    .where(and(eq(appointments.contactId, contactId), eq(appointments.status, 'Scheduled'), gt(appointments.endTime, now)))
    .orderBy(appointments.startTime)
    .limit(1);
  return row ?? null;
}

/**
 * Book (or move) the contact's consultation to `start`, which must be one of
 * the currently open slots for their rep.
 */
export async function bookAppointment(contactId: number, start: Date, source = 'online') {
  const contact = await loadContact(contactId);
  if (!contact) throw new BookingError('Not found', 404);
  const rep = await assignRep(contactId);
  if (!rep) throw new BookingError('Online booking is not available right now. Please call us.', 503);

  const config = await getBookingConfig();
  const { slots } = await getAvailability(rep, { exceptContactId: contactId });
  if (!slots.some((s) => s.getTime() === start.getTime())) {
    throw new BookingError('That time was just taken. Please pick another.', 409);
  }
  const end = new Date(start.getTime() + config.durationMinutes * 60_000);

  const result = await db.transaction(async (tx) => {
    // Serialize bookings per rep so two people cannot take the same slot.
    await tx.execute(sql`select pg_advisory_xact_lock(${rep.id})`);
    const buffer = config.bufferMinutes * 60_000;
    const clash = await tx
      .select({ id: appointments.id, contactId: appointments.contactId })
      .from(appointments)
      .where(
        and(
          eq(appointments.agentId, rep.id),
          eq(appointments.status, 'Scheduled'),
          gt(appointments.endTime, new Date(start.getTime() - buffer)),
          lt(appointments.startTime, new Date(end.getTime() + buffer)),
        ),
      );
    if (clash.some((c) => c.contactId !== contactId)) {
      throw new BookingError('That time was just taken. Please pick another.', 409);
    }

    // One upcoming consultation per contact: booking again is a reschedule.
    const previous = await tx
      .update(appointments)
      .set({ status: 'Cancelled', notes: sql`coalesce(${appointments.notes} || E'\n', '') || 'Rescheduled online.'` })
      .where(and(eq(appointments.contactId, contactId), eq(appointments.status, 'Scheduled'), gt(appointments.endTime, new Date())))
      .returning();

    const [created] = await tx
      .insert(appointments)
      .values({
        contactId,
        agentId: rep.id,
        startTime: start,
        endTime: end,
        location: config.location,
        status: 'Scheduled',
        source,
        notes: 'Booked online.',
      })
      .returning();
    return { created, rescheduled: previous.length > 0 };
  });

  const when = formatWhen(start, config.timezone);
  await db.insert(activities).values({
    contactId,
    userId: rep.id,
    activityType: 'Meeting',
    subject: `Consultation ${result.rescheduled ? 'rescheduled' : 'booked'} online for ${when}`,
  });

  await advanceStage(contactId, 'Consultation Scheduled', BEFORE_CONSULTATION);

  const fresh = (await loadContact(contactId))!;
  await sendContactSms(
    contactId,
    render(config.messages.confirmation, messageVars(fresh, rep, config, start)),
    'Booking confirmation sent',
  );
  await alertRep(rep.id, `${result.rescheduled ? 'Rescheduled' : 'Booked'}: ${contactLabel(contact)} on ${when}.`);
  await emailInvite(result.created, fresh, rep, config);

  return { appointment: result.created, rescheduled: result.rescheduled, rep, when };
}

export async function cancelAppointment(contactId: number) {
  const appt = await upcomingAppointment(contactId);
  if (!appt) throw new BookingError('No upcoming consultation to cancel.', 404);
  const contact = (await loadContact(contactId))!;
  const config = await getBookingConfig();

  await db
    .update(appointments)
    .set({ status: 'Cancelled', notes: sql`coalesce(${appointments.notes} || E'\n', '') || 'Cancelled online by client.'` })
    .where(eq(appointments.id, appt.id));

  const when = formatWhen(appt.startTime, config.timezone);
  await db.insert(activities).values({
    contactId,
    userId: appt.agentId,
    activityType: 'Meeting',
    subject: `Consultation for ${when} cancelled online by client`,
  });
  await alertRep(appt.agentId, `Cancelled: ${contactLabel(contact)}, was ${when}.`);
  const rep = await loadRep(appt.agentId);
  if (rep) await emailInvite(appt, contact, rep, config, true);
  return { cancelled: true, when };
}

// ── Scheduled work ──

/** True between 8am and 8pm in the firm's time zone. */
export function withinTextingHours(now: Date, timeZone: string): boolean {
  const { hour } = wallParts(now, timeZone);
  return hour >= 8 && hour < 20;
}

/** Text 24-hour and 1-hour reminders for upcoming consultations. */
export async function sendAppointmentReminders(now = new Date()): Promise<number> {
  const config = await getBookingConfig();
  let sent = 0;

  const windows = [
    { column: appointments.reminder24hSentAt, field: 'reminder24hSentAt' as const, from: 2 * 3_600_000, to: 24 * 3_600_000, message: config.messages.reminder24h, label: 'Reminder sent (24 hours)' },
    { column: appointments.reminder1hSentAt, field: 'reminder1hSentAt' as const, from: 0, to: 3_600_000, message: config.messages.reminder1h, label: 'Reminder sent (1 hour)' },
  ];

  for (const w of windows) {
    const due = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.status, 'Scheduled'),
          isNull(w.column),
          gt(appointments.startTime, new Date(now.getTime() + w.from)),
          lte(appointments.startTime, new Date(now.getTime() + w.to)),
        ),
      );
    for (const appt of due) {
      // Mark first so a failure cannot cause repeat texts every five minutes.
      await db.update(appointments).set({ [w.field]: now }).where(eq(appointments.id, appt.id));
      // Booked less than a day out: the confirmation already served as the 24-hour notice.
      if (w.field === 'reminder24hSentAt' && appt.createdAt > new Date(appt.startTime.getTime() - 26 * 3_600_000)) continue;
      const contact = await loadContact(appt.contactId);
      if (!contact) continue;
      const rep = await loadRep(appt.agentId);
      const result = await sendContactSms(appt.contactId, render(w.message, messageVars(contact, rep, config, appt.startTime)), w.label);
      if (result.sent) sent++;
    }
  }
  return sent;
}

/**
 * Text a booking link to new leads who registered a while ago and have
 * neither booked nor been reached. Each lead gets it once.
 */
export async function sendBookingNudges(now = new Date()): Promise<number> {
  const config = await getBookingConfig();
  if (!config.nudgeAfterMinutes || !withinTextingHours(now, config.timezone)) return 0;

  const candidates = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(
      and(
        isNull(contacts.bookingInviteSentAt),
        eq(contacts.smsOptOut, false),
        lte(contacts.createdAt, new Date(now.getTime() - config.nudgeAfterMinutes * 60_000)),
        gte(contacts.createdAt, new Date(now.getTime() - 7 * 86_400_000)),
      ),
    );

  let sent = 0;
  for (const c of candidates) {
    if ((await currentStage(c.id)) !== 'New Lead') continue;
    if (await upcomingAppointment(c.id, now)) continue;
    const result = await sendBookingInvite(c.id);
    if (result.sent) sent++;
    // Not sendable (no phone, opted out, no rep): stamp it so it is not retried every run.
    else if (['opted out', 'no valid mobile number', 'contact not found'].includes(result.reason ?? '')) {
      await db.update(contacts).set({ bookingInviteSentAt: now }).where(eq(contacts.id, c.id));
    }
  }
  return sent;
}

