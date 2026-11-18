import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { db } from '../db';
import {
  activities,
  contacts,
  emailQueue,
  pipelineEntries,
  quoPhoneNumbers,
  smsMessages,
  tasks,
  users,
} from '../db/schema';
import { eq, inArray } from 'drizzle-orm';
import { quoService } from '../services/quo';
import { toE164, formatPhone } from '../services/phone';
import { assignRep } from '../services/rep-assignment';
import {
  DEFAULT_TEMPLATE,
  renderTemplate,
  saveWelcomeTextSettings,
  sendWelcomeText,
  smsSegments,
  unknownVariables,
} from '../services/welcome-text';
import session from 'express-session';
import { appSettings } from '../db/schema';
import { like } from 'drizzle-orm';
import { requireAuth, requireAdmin } from '../middleware/auth';
import welcomeTextRoutes from '../routes/welcome-text';
import repCardRoutes from '../routes/rep-card';
import publicFormsRoutes from '../routes/public-forms';

const uniq = Math.floor(Math.random() * 1e6).toString().padStart(6, '0');
const phoneFor = (n: number) => `(808) 555-${(1000 + ((Number(uniq) + n) % 9000)).toString()}`;

let repA: typeof users.$inferSelect;
let repB: typeof users.$inferSelect;
let preexistingLeadRepIds: number[] = [];
const contactIds: number[] = [];
let savedSettings: (typeof appSettings.$inferSelect)[] = [];
let sendSpy: import('vitest').MockInstance<typeof quoService.sendSMS>;

async function makeContact(n: number, phone: string | null = phoneFor(n)) {
  const [c] = await db
    .insert(contacts)
    .values({ firstName: 'Lani', lastName: `Test${n}`, email: `wt-${uniq}-${n}@example.com`, phone })
    .returning();
  contactIds.push(c.id);
  return c;
}

beforeAll(async () => {
  process.env.API_PUBLIC_URL = 'https://api.example.test';
  // Start from default settings; restore whatever the dev database had after.
  savedSettings = await db.select().from(appSettings).where(like(appSettings.key, 'welcome_text.%'));
  await db.delete(appSettings).where(like(appSettings.key, 'welcome_text.%'));

  // Isolate round-robin from whatever lead reps the dev database already has.
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.isLeadRep, true));
  preexistingLeadRepIds = existing.map((u) => u.id);
  if (preexistingLeadRepIds.length) {
    await db.update(users).set({ isLeadRep: false }).where(inArray(users.id, preexistingLeadRepIds));
  }

  [repA, repB] = await db
    .insert(users)
    .values([
      {
        name: "Kealaka'i Tester",
        email: `rep-a-${uniq}@example.com`,
        passwordHash: 'x',
        phone: '(808) 341-7589',
        profileSlug: 'kealakai-tester',
        isLeadRep: true,
      },
      { name: 'Herb Tester', email: `rep-b-${uniq}@example.com`, passwordHash: 'x', isLeadRep: true },
    ])
    .returning();

  await db.insert(quoPhoneNumbers).values([
    { quoPhoneNumberId: `PNmain${uniq}`, phoneNumber: '+18088941884', label: 'Main' },
    { quoPhoneNumberId: `PNrepA${uniq}`, phoneNumber: '+18085550101', assignedUserId: repA.id },
  ]);
});

afterAll(async () => {
  if (contactIds.length) {
    await db.delete(smsMessages).where(inArray(smsMessages.contactId, contactIds));
    await db.delete(activities).where(inArray(activities.contactId, contactIds));
    await db.delete(tasks).where(inArray(tasks.contactId, contactIds));
    await db.delete(emailQueue).where(inArray(emailQueue.contactId, contactIds));
    await db.delete(pipelineEntries).where(inArray(pipelineEntries.contactId, contactIds));
    await db.delete(contacts).where(inArray(contacts.id, contactIds));
  }
  await db.delete(quoPhoneNumbers).where(
    inArray(quoPhoneNumbers.quoPhoneNumberId, [`PNmain${uniq}`, `PNrepA${uniq}`]),
  );
  await db.delete(users).where(inArray(users.id, [repA.id, repB.id]));
  if (preexistingLeadRepIds.length) {
    await db.update(users).set({ isLeadRep: true }).where(inArray(users.id, preexistingLeadRepIds));
  }
  await db.delete(appSettings).where(like(appSettings.key, 'welcome_text.%'));
  if (savedSettings.length) await db.insert(appSettings).values(savedSettings);
  delete process.env.API_PUBLIC_URL;
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(quoService, 'isConfigured').mockReturnValue(true);
  sendSpy = vi
    .spyOn(quoService, 'sendSMS')
    .mockImplementation(async () => ({ id: `AC${Math.random().toString(36).slice(2)}` }) as any);
});

describe('toE164', () => {
  it('normalizes US formats and rejects junk', () => {
    expect(toE164('(808) 555-1234')).toBe('+18085551234');
    expect(toE164('808.555.1234')).toBe('+18085551234');
    expect(toE164('1-808-555-1234')).toBe('+18085551234');
    expect(toE164('+1 808 555 1234')).toBe('+18085551234');
    expect(toE164('555-1234')).toBeNull();
    expect(toE164('000-000-0000')).toBeNull();
    expect(toE164('')).toBeNull();
    expect(toE164(null)).toBeNull();
    expect(formatPhone('+18085551234')).toBe('(808) 555-1234');
  });
});

describe('template', () => {
  const vars = {
    first_name: 'Lani',
    rep_name: "Kealaka'i Hussey",
    rep_first_name: "Kealaka'i",
    rep_title: 'Agent',
    rep_phone: '(808) 341-7589',
    rep_email: 'kealakai@windwardfinancial.net',
    rep_photo_link: 'https://api.example.test/r/kealakai-hussey',
    booking_link: 'https://api.example.test/b/tok',
    intake_link: 'https://api.example.test/i/tok',
  };

  it('default template names the rep, gives phone, email and photo link, and promises a call', () => {
    const body = renderTemplate(DEFAULT_TEMPLATE, vars);
    expect(body).toContain('Aloha Lani');
    expect(body).toContain("Your rep is Kealaka'i Hussey");
    expect(body).toContain("Kealaka'i will call you right away");
    expect(body).toContain('(808) 341-7589');
    expect(body).toContain('kealakai@windwardfinancial.net');
    expect(body).toContain('https://api.example.test/r/kealakai-hussey');
    expect(body).toContain('Reply STOP');
    expect(body).not.toContain('{{');
    expect(smsSegments(body)).toBeLessThanOrEqual(2);
  });

  it('renders a custom template and flags unknown variables', () => {
    expect(renderTemplate('Hi {{ first_name }} - {{rep_title}} {{rep_name}}', vars)).toBe(
      "Hi Lani - Agent Kealaka'i Hussey",
    );
    expect(unknownVariables('Hi {{first_name}} {{rep_nmae}} {{foo}}')).toEqual(['rep_nmae', 'foo']);
    expect(unknownVariables(DEFAULT_TEMPLATE)).toEqual([]);
  });
});

describe('assignRep', () => {
  it('round-robins across lead reps and keeps an existing assignment', async () => {
    await db.update(users).set({ lastLeadAssignedAt: null }).where(inArray(users.id, [repA.id, repB.id]));
    const [c1, c2, c3] = [await makeContact(1), await makeContact(2), await makeContact(3)];

    const r1 = await assignRep(c1.id);
    const r2 = await assignRep(c2.id);
    const r3 = await assignRep(c3.id);
    expect([r1?.id, r2?.id, r3?.id]).toEqual([repA.id, repB.id, repA.id]);

    // Already assigned: same rep, no rotation.
    expect((await assignRep(c2.id))?.id).toBe(repB.id);
    const [row] = await db.select().from(contacts).where(eq(contacts.id, c2.id));
    expect(row.assignedAgentId).toBe(repB.id);
  });
});

describe('sendWelcomeText', () => {
  it("texts the lead from the rep's line, logs it, and alerts the rep", async () => {
    const c = await makeContact(10);
    await db.update(contacts).set({ assignedAgentId: repA.id }).where(eq(contacts.id, c.id));

    const result = await sendWelcomeText(c.id);
    expect(result.sent).toBe(true);

    const [from, to, body] = sendSpy.mock.calls[0];
    expect(from).toBe(`PNrepA${uniq}`);
    expect(to).toBe(toE164(c.phone));
    expect(body).toContain("Your rep is Kealaka'i Tester");
    expect(body).toContain('(808) 341-7589');
    expect(body).toContain(repA.email);
    expect(body).toContain('https://api.example.test/r/kealakai-tester');
    expect(body).toContain('will call you right away');

    // Rep alert goes to the rep's cell.
    expect(sendSpy.mock.calls[1][1]).toBe('+18083417589');
    expect(sendSpy.mock.calls[1][2]).toContain('New registration: Lani Test10');

    const sms = await db.select().from(smsMessages).where(eq(smsMessages.contactId, c.id));
    expect(sms).toHaveLength(1);
    expect(sms[0].direction).toBe('outbound');
    expect(sms[0].agentId).toBe(repA.id);

    const acts = await db.select().from(activities).where(eq(activities.contactId, c.id));
    expect(acts.some((a) => a.activityType === 'SMS Sent' && a.subject?.startsWith('Welcome text sent'))).toBe(true);
  });

  it('falls back to the default line when the rep has none', async () => {
    const c = await makeContact(11);
    await db.update(contacts).set({ assignedAgentId: repB.id }).where(eq(contacts.id, c.id));
    process.env.QUO_DEFAULT_FROM_NUMBER_ID = `PNmain${uniq}`;
    const result = await sendWelcomeText(c.id);
    delete process.env.QUO_DEFAULT_FROM_NUMBER_ID;
    expect(result.sent).toBe(true);
    expect(sendSpy.mock.calls[0][0]).toBe(`PNmain${uniq}`);
    // Rep B has no cell on file: no rep alert.
    expect(sendSpy).toHaveBeenCalledTimes(1);
  });

  it('does not call Quo when the number is invalid', async () => {
    const c = await makeContact(12, '555-1212');
    const result = await sendWelcomeText(c.id);
    expect(result).toEqual({ sent: false, reason: 'no valid mobile number' });
    expect(sendSpy).not.toHaveBeenCalled();
  });

  it('logs a note instead of throwing when Quo fails', async () => {
    const c = await makeContact(13);
    sendSpy.mockRejectedValueOnce(new Error('Quo API error 402'));
    const result = await sendWelcomeText(c.id);
    expect(result.sent).toBe(false);
    const acts = await db.select().from(activities).where(eq(activities.contactId, c.id));
    expect(acts.some((a) => a.subject === 'Welcome text failed')).toBe(true);
    expect(await db.select().from(smsMessages).where(eq(smsMessages.contactId, c.id))).toHaveLength(0);
  });

  it('respects WELCOME_SMS_ENABLED=false', async () => {
    const c = await makeContact(14);
    process.env.WELCOME_SMS_ENABLED = 'false';
    const result = await sendWelcomeText(c.id);
    delete process.env.WELCOME_SMS_ENABLED;
    expect(result.sent).toBe(false);
    expect(sendSpy).not.toHaveBeenCalled();
  });
});

describe('registration form -> welcome text', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/public', publicFormsRoutes);
  const email = `wt-form-${uniq}@example.com`;
  const payload = {
    firstName: 'Noelani',
    lastName: 'Form',
    email,
    phone: phoneFor(20),
    employmentType: 'DOE Teacher',
  };

  it('texts a new registrant once, assigns the rep, and creates an urgent call task', async () => {
    const res = await request(app).post('/api/public/enroll').send(payload);
    expect(res.status).toBe(201);
    const contactId = res.body.contactId as number;
    contactIds.push(contactId);

    await vi.waitFor(async () => {
      const sms = await db.select().from(smsMessages).where(eq(smsMessages.contactId, contactId));
      expect(sms).toHaveLength(1);
    });

    const [contact] = await db.select().from(contacts).where(eq(contacts.id, contactId));
    expect([repA.id, repB.id]).toContain(contact.assignedAgentId);

    const [task] = await db.select().from(tasks).where(eq(tasks.contactId, contactId));
    expect(task.assignedTo).toBe(contact.assignedAgentId);
    expect(task.priority).toBe('Urgent');
    expect(task.taskType).toBe('Call');

    const leadText = sendSpy.mock.calls.find((call) => call[1] === toE164(payload.phone));
    expect(leadText?.[2]).toContain('Aloha Noelani');

    // Same person registers again: no second welcome text.
    sendSpy.mockClear();
    const again = await request(app).post('/api/public/enroll').send(payload);
    expect(again.status).toBe(201);
    await new Promise((r) => setTimeout(r, 300));
    expect(sendSpy).not.toHaveBeenCalled();
    expect(await db.select().from(smsMessages).where(eq(smsMessages.contactId, contactId))).toHaveLength(1);
  });

  it('accepts the live site form values (unknown employment type, string numbers)', async () => {
    const res = await request(app)
      .post('/api/public/enroll')
      .send({
        firstName: 'Kai',
        lastName: 'Charter',
        email: `WT-Charter-${uniq}@Example.com`,
        phone: phoneFor(30),
        employmentType: 'Charter School',
        yearsOfService: '12',
        annualSalary: '$68,500',
      });
    expect(res.status).toBe(201);
    contactIds.push(res.body.contactId);
    const [c] = await db.select().from(contacts).where(eq(contacts.id, res.body.contactId));
    expect(c.employmentType).toBe('Other');
    expect(c.yearsOfService).toBe(12);
    expect(Number(c.annualSalary)).toBe(68500);
    expect(c.email).toBe(`wt-charter-${uniq}@example.com`);
    expect(c.notes).toContain('Employment type (as entered): Charter School');
    await vi.waitFor(async () => {
      expect(
        await db.select().from(smsMessages).where(eq(smsMessages.contactId, res.body.contactId)),
      ).toHaveLength(1);
    });
  });

  it('accepts a registration with no phone and sends nothing', async () => {
    const res = await request(app)
      .post('/api/public/contact')
      .send({ firstName: 'No', lastName: 'Phone', email: `wt-nophone-${uniq}@example.com` });
    expect(res.status).toBe(201);
    contactIds.push(res.body.contactId);
    await new Promise((r) => setTimeout(r, 300));
    expect(sendSpy).not.toHaveBeenCalled();
  });
});

describe('welcome text settings (admin)', () => {
  function makeApp(role: string | null) {
    const app = express();
    app.use(express.json({ limit: '10mb' }));
    app.use(session({ secret: 'test', resave: false, saveUninitialized: false }));
    app.use((req, _res, next) => {
      if (role) {
        req.session.userId = repA.id;
        req.session.userRole = role;
      }
      next();
    });
    app.use('/api/welcome-text', requireAuth, requireAdmin, welcomeTextRoutes);
    app.use('/r', repCardRoutes);
    return app;
  }
  const admin = () => makeApp('admin');
  // 1x1 PNG
  const png =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

  it('is admin-only', async () => {
    expect((await request(makeApp(null)).get('/api/welcome-text')).status).toBe(401);
    expect((await request(makeApp('agent')).get('/api/welcome-text')).status).toBe(403);
  });

  it('returns settings, variables, reps and a preview', async () => {
    const res = await request(admin()).get('/api/welcome-text');
    expect(res.status).toBe(200);
    expect(res.body.enabled).toBe(true);
    expect(res.body.template).toBe(DEFAULT_TEMPLATE);
    expect(res.body.variables.map((v: { name: string }) => v.name)).toContain('rep_photo_link');
    const a = res.body.reps.find((r: { id: number }) => r.id === repA.id);
    expect(a.isLeadRep).toBe(true);
    expect(a.warnings).toContain('No photo uploaded');
    expect(res.body.preview.body).toContain('Aloha Lani');
  });

  it('saves an edited template and uses it for the next registrant', async () => {
    const bad = await request(admin()).put('/api/welcome-text').send({ template: 'Hi {{nope}}' });
    expect(bad.status).toBe(400);
    expect(bad.body.error).toContain('{{nope}}');

    const template = 'Aloha {{first_name}}. {{rep_name}} ({{rep_phone}}, {{rep_email}}) will call you now. {{rep_photo_link}}';
    const ok = await request(admin()).put('/api/welcome-text').send({ template });
    expect(ok.status).toBe(200);
    expect(ok.body.template).toBe(template);

    const c = await makeContact(40);
    await db.update(contacts).set({ assignedAgentId: repA.id }).where(eq(contacts.id, c.id));
    const result = await sendWelcomeText(c.id);
    expect(result.sent && result.body).toBe(
      `Aloha Lani. Kealaka'i Tester ((808) 341-7589, ${repA.email}) will call you now. https://api.example.test/r/kealakai-tester`,
    );
    await saveWelcomeTextSettings({ template: DEFAULT_TEMPLATE }, null);
  });

  it('turning it off stops texts; turning it on resumes', async () => {
    await request(admin()).put('/api/welcome-text').send({ enabled: false });
    const c = await makeContact(41);
    expect(await sendWelcomeText(c.id)).toEqual({ sent: false, reason: 'disabled' });
    expect(sendSpy).not.toHaveBeenCalled();
    await request(admin()).put('/api/welcome-text').send({ enabled: true });
    expect((await sendWelcomeText(c.id)).sent).toBe(true);
  });

  it('changes who the reps are, and assignment follows', async () => {
    // Remove rep A from rotation: only rep B gets new leads.
    let res = await request(admin()).patch(`/api/welcome-text/reps/${repA.id}`).send({ isLeadRep: false });
    expect(res.status).toBe(200);
    const [c1, c2] = [await makeContact(42), await makeContact(43)];
    expect((await assignRep(c1.id))?.id).toBe(repB.id);
    expect((await assignRep(c2.id))?.id).toBe(repB.id);

    // Rep B had no slug: one is derived from the name when they are a rep.
    res = await request(admin())
      .patch(`/api/welcome-text/reps/${repB.id}`)
      .send({ phone: '808-555-0199', title: 'Principal Agent' });
    const b = res.body.reps.find((r: { id: number }) => r.id === repB.id);
    expect(b.phone).toBe('808-555-0199');
    expect(b.title).toBe('Principal Agent');
    expect(b.profileSlug).toBe('herb-tester');

    expect(
      (await request(admin()).patch(`/api/welcome-text/reps/${repB.id}`).send({ phone: '12345' })).status,
    ).toBe(400);

    res = await request(admin()).patch(`/api/welcome-text/reps/${repA.id}`).send({ isLeadRep: true });
    expect(res.body.reps.find((r: { id: number }) => r.id === repA.id).isLeadRep).toBe(true);
  });

  it('uploads a rep photo and serves it on the public card', async () => {
    const tooBig = 'data:image/png;base64,' + Buffer.alloc(700 * 1024).toString('base64');
    expect(
      (await request(admin()).patch(`/api/welcome-text/reps/${repA.id}`).send({ photo: tooBig })).status,
    ).toBe(400);
    expect(
      (await request(admin()).patch(`/api/welcome-text/reps/${repA.id}`).send({ photo: 'data:text/html;base64,AAAA' }))
        .status,
    ).toBe(400);

    const res = await request(admin()).patch(`/api/welcome-text/reps/${repA.id}`).send({ photo: png });
    expect(res.status).toBe(200);
    const a = res.body.reps.find((r: { id: number }) => r.id === repA.id);
    expect(a.hasPhoto).toBe(true);
    expect(a.warnings).not.toContain('No photo uploaded');

    const photo = await request(admin()).get('/r/kealakai-tester/photo');
    expect(photo.status).toBe(200);
    expect(photo.headers['content-type']).toBe('image/png');

    const card = await request(admin()).get('/r/kealakai-tester');
    expect(card.status).toBe(200);
    expect(card.text).toContain('Kealaka&#39;i Tester');
    expect(card.text).toContain('property="og:image"');
    expect(card.text).toContain('tel:+18083417589');
    expect(card.text).toContain(`mailto:${repA.email}`);

    expect((await request(admin()).get('/r/nobody-here')).status).toBe(404);

    // Removing the photo
    const removed = await request(admin()).patch(`/api/welcome-text/reps/${repA.id}`).send({ photo: null });
    expect(removed.body.reps.find((r: { id: number }) => r.id === repA.id).hasPhoto).toBe(false);
  });

  it('sends a test text as a chosen rep', async () => {
    const res = await request(admin()).post('/api/welcome-text/test').send({ to: '(808) 555-0142', repId: repA.id });
    expect(res.status).toBe(200);
    expect(sendSpy).toHaveBeenCalledWith(`PNrepA${uniq}`, '+18085550142', expect.stringContaining("Kealaka'i Tester"));
    expect((await request(admin()).post('/api/welcome-text/test').send({ to: 'x', repId: repA.id })).status).toBe(400);
  });
});
