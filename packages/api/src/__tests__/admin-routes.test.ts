import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import session from 'express-session';
import request from 'supertest';
import { db } from '../db';
import { contacts, emailQueue, emailTemplates, leadScoreHistory } from '../db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth, requireAdmin } from '../middleware/auth';
import adminQuoRoutes from '../routes/admin-quo';
import adminLeadsRoutes from '../routes/admin-leads';
import adminJobsRoutes from '../routes/admin-jobs';

// Ad-hoc app builder so we can stamp `req.session` directly per request and
// avoid running login flows in tests.
function makeApp(sessionSetup?: (req: express.Request) => void) {
  const app = express();
  app.use(express.json());
  app.use(
    session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: false,
    }),
  );
  if (sessionSetup) {
    app.use((req, _res, next) => {
      sessionSetup(req);
      next();
    });
  }
  app.use('/api/admin/quo', requireAuth, requireAdmin, adminQuoRoutes);
  app.use('/api/admin/leads', requireAuth, requireAdmin, adminLeadsRoutes);
  app.use('/api/admin/jobs', requireAuth, requireAdmin, adminJobsRoutes);
  return app;
}

let cleanupContactIds: number[] = [];
let cleanupTemplateId: number | null = null;
let cleanupQueueId: number | null = null;

beforeAll(async () => {
  // Seed a contact + a template + a failed queue row for retry test
  const [c1] = await db
    .insert(contacts)
    .values({
      firstName: 'AdminTest',
      lastName: 'High',
      leadScore: 85,
      employmentType: 'DOE Teacher',
    })
    .returning({ id: contacts.id });
  const [c2] = await db
    .insert(contacts)
    .values({
      firstName: 'AdminTest',
      lastName: 'Low',
      leadScore: 20,
      employmentType: 'Other',
    })
    .returning({ id: contacts.id });
  cleanupContactIds = [c1.id, c2.id];

  const [tpl] = await db
    .insert(emailTemplates)
    .values({ name: 'AdminTest Template', subject: 's', body: 'b' })
    .returning({ id: emailTemplates.id });
  cleanupTemplateId = tpl.id;

  const [q] = await db
    .insert(emailQueue)
    .values({
      contactId: c1.id,
      templateId: tpl.id,
      scheduledFor: new Date(),
      status: 'Failed',
    })
    .returning({ id: emailQueue.id });
  cleanupQueueId = q.id;
});

afterAll(async () => {
  if (cleanupQueueId)
    await db.delete(emailQueue).where(eq(emailQueue.id, cleanupQueueId));
  if (cleanupTemplateId)
    await db.delete(emailTemplates).where(eq(emailTemplates.id, cleanupTemplateId));
  for (const id of cleanupContactIds) {
    await db.delete(leadScoreHistory).where(eq(leadScoreHistory.contactId, id));
    await db.delete(contacts).where(eq(contacts.id, id));
  }
});

describe('GET /api/admin/quo/health auth', () => {
  it('401 when unauthenticated', async () => {
    const app = makeApp();
    const res = await request(app).get('/api/admin/quo/health');
    expect(res.status).toBe(401);
  });

  it('403 when authenticated but not admin', async () => {
    const app = makeApp((req) => {
      req.session.userId = 999;
      req.session.userRole = 'agent';
    });
    const res = await request(app).get('/api/admin/quo/health');
    expect(res.status).toBe(403);
  });

  it('200 with expected shape for admin', async () => {
    const app = makeApp((req) => {
      req.session.userId = 1;
      req.session.userRole = 'admin';
    });
    const res = await request(app).get('/api/admin/quo/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('apiKeyConfigured');
    expect(res.body).toHaveProperty('registeredWebhooks');
    expect(res.body).toHaveProperty('counts.last24h');
  });
});

describe('GET /api/admin/leads/scoring/list filters by minScore/maxScore', () => {
  it('only returns contacts within the score range', async () => {
    const app = makeApp((req) => {
      req.session.userId = 1;
      req.session.userRole = 'admin';
    });
    const res = await request(app).get(
      '/api/admin/leads/scoring/list?minScore=70&maxScore=100&limit=200',
    );
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.leads)).toBe(true);
    for (const l of res.body.leads as Array<{ score: number | null }>) {
      expect(l.score).toBeGreaterThanOrEqual(70);
    }
    // High-score contact is in result; low-score is not.
    const ids = (res.body.leads as Array<{ id: number }>).map((l) => l.id);
    expect(ids).toContain(cleanupContactIds[0]);
    expect(ids).not.toContain(cleanupContactIds[1]);
  });
});

describe('POST /api/admin/jobs/email-queue/:id/retry', () => {
  it('flips a failed row back to Pending', async () => {
    const app = makeApp((req) => {
      req.session.userId = 1;
      req.session.userRole = 'admin';
    });
    const res = await request(app).post(
      `/api/admin/jobs/email-queue/${cleanupQueueId}/retry`,
    );
    expect(res.status).toBe(200);

    const [row] = await db
      .select({ status: emailQueue.status })
      .from(emailQueue)
      .where(eq(emailQueue.id, cleanupQueueId!));
    expect(row.status).toBe('Pending');
  });
});
