import { Router, Request, Response } from 'express';
import { db } from '../db';
import { contacts } from '../db/schema';
import { eq } from 'drizzle-orm';
import { assignRep } from '../services/rep-assignment';
import {
  BookingError,
  bookAppointment,
  cancelAppointment,
  formatWhen,
  getAvailability,
  getBookingConfig,
  upcomingAppointment,
} from '../services/booking';
import { INTAKE_OPTIONS, saveIntake } from '../services/intake';
import { intakeLink } from '../services/links';
import { formatPhone } from '../services/phone';

/**
 * JSON API behind the client's own booking and intake pages.
 * Mounted at /api/public. The token in the path identifies the contact; it is
 * long, random, and the only credential, so responses carry only what that
 * client already knows plus their rep's public details.
 */
const router = Router();

async function contactByToken(token: string) {
  if (!token || token.length < 20) return null;
  const [c] = await db.select().from(contacts).where(eq(contacts.publicToken, token)).limit(1);
  return c ?? null;
}

// GET /booking/:token — rep, open times, and any existing booking
router.get('/booking/:token', async (req: Request, res: Response) => {
  try {
    const contact = await contactByToken(req.params.token as string);
    if (!contact) return res.status(404).json({ error: 'This link is not valid.' });
    const rep = await assignRep(contact.id);
    if (!rep) return res.status(503).json({ error: 'Online booking is not available right now. Please call us.' });

    const config = await getBookingConfig();
    const { slots } = await getAvailability(rep, { exceptContactId: contact.id });
    const existing = await upcomingAppointment(contact.id);

    return res.json({
      firstName: contact.firstName,
      timezone: config.timezone,
      durationMinutes: config.durationMinutes,
      location: config.location,
      rep: {
        name: rep.name,
        title: rep.title,
        phone: formatPhone(rep.phone),
        photoUrl: rep.photoData && rep.profileSlug ? `/api/public/r/${rep.profileSlug}/photo` : null,
      },
      existing: existing ? { start: existing.startTime.toISOString(), when: formatWhen(existing.startTime, config.timezone) } : null,
      slots: slots.map((s) => s.toISOString()),
      intakeUrl: contact.intakeCompletedAt ? null : intakeLink(contact.publicToken) || `/i/${contact.publicToken}`,
    });
  } catch (error) {
    console.error('Booking load error:', error);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// POST /booking/:token — book or reschedule
router.post('/booking/:token', async (req: Request, res: Response) => {
  try {
    const contact = await contactByToken(req.params.token as string);
    if (!contact) return res.status(404).json({ error: 'This link is not valid.' });
    const start = new Date(req.body?.start);
    if (Number.isNaN(start.getTime())) return res.status(400).json({ error: 'Pick a time.' });

    const result = await bookAppointment(contact.id, start);
    return res.status(201).json({
      booked: true,
      rescheduled: result.rescheduled,
      start: result.appointment.startTime.toISOString(),
      when: result.when,
      repName: result.rep.name,
    });
  } catch (error) {
    if (error instanceof BookingError) return res.status(error.status).json({ error: error.message });
    console.error('Booking error:', error);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// DELETE /booking/:token — cancel the upcoming consultation
router.delete('/booking/:token', async (req: Request, res: Response) => {
  try {
    const contact = await contactByToken(req.params.token as string);
    if (!contact) return res.status(404).json({ error: 'This link is not valid.' });
    return res.json(await cancelAppointment(contact.id));
  } catch (error) {
    if (error instanceof BookingError) return res.status(error.status).json({ error: error.message });
    console.error('Cancel error:', error);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// GET /intake/:token — form options and what we already have
router.get('/intake/:token', async (req: Request, res: Response) => {
  try {
    const contact = await contactByToken(req.params.token as string);
    if (!contact) return res.status(404).json({ error: 'This link is not valid.' });
    return res.json({
      firstName: contact.firstName,
      completed: Boolean(contact.intakeCompletedAt),
      options: INTAKE_OPTIONS,
      // Only non-financial fields are echoed back.
      answers: {
        employmentType: contact.employmentType,
        employerSchool: contact.employerSchool,
        yearsOfService: contact.yearsOfService,
        ersPlanType: contact.ersPlanType,
        lifeInsuranceStatus: contact.lifeInsuranceStatus,
      },
    });
  } catch (error) {
    console.error('Intake load error:', error);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// POST /intake/:token — save answers
router.post('/intake/:token', async (req: Request, res: Response) => {
  try {
    const contact = await contactByToken(req.params.token as string);
    if (!contact) return res.status(404).json({ error: 'This link is not valid.' });
    await saveIntake(contact.id, req.body ?? {});
    return res.status(201).json({ saved: true });
  } catch (error) {
    console.error('Intake save error:', error);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

export default router;
