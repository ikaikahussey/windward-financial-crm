import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import cors from 'cors';
import connectPgSimple from 'connect-pg-simple';
import { errorHandler } from './middleware/errorHandler';
import { requireAuth, requireAdmin } from './middleware/auth';
import { startCronJobs } from './services/cron';

import authRoutes from './routes/auth';
import contactsRoutes from './routes/contacts';
import usersRoutes from './routes/users';
import adminQuoRoutes from './routes/admin-quo';
import adminLeadsRoutes from './routes/admin-leads';
import adminJobsRoutes from './routes/admin-jobs';
import tasksRoutes from './routes/tasks';
import policiesRoutes from './routes/policies';
import templatesRoutes from './routes/templates';
import appointmentsRoutes from './routes/appointments';
import dashboardRoutes from './routes/dashboard';
import reportsRoutes from './routes/reports';
import quoRoutes from './routes/quo';
import webhooksQuoRoutes from './routes/webhooks-quo';
import eventsRoutes from './routes/events';
import publicFormsRoutes from './routes/public-forms';
import marketingRoutes from './routes/marketing';
import marketingPublicRoutes from './routes/marketing-public';
import clientRosterRoutes from './routes/client-roster';
import referralsRoutes from './routes/referrals';
import paymentsRoutes from './routes/payments';
import tpaRoutes from './routes/tpa';
import welcomeTextRoutes from './routes/welcome-text';
import repCardRoutes from './routes/rep-card';
import { corsDelegate } from './middleware/cors-options';
import clientSelfServeRoutes from './routes/client-self-serve';
import { bookingPageRouter, intakePageRouter } from './routes/client-pages';
import bookingSettingsRoutes from './routes/booking-settings';

const app = express();
const PORT = parseInt(process.env.PORT || '3001');

// Trust Railway's reverse proxy (needed for secure cookies)
app.set('trust proxy', 1);

// CORS — see middleware/cors-options.ts
app.use(cors(corsDelegate));

app.use(express.json({ limit: '10mb' }));

// Sessions
const PgSession = connectPgSimple(session);
app.use(session({
  store: new PgSession({
    conString: process.env.DATABASE_URL,
    tableName: 'session',
    createTableIfMissing: true,
  }),
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  },
}));

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Public routes (no auth)
app.use('/api/public', publicFormsRoutes);
app.use('/api/public', marketingPublicRoutes);
app.use('/api/webhooks/quo', webhooksQuoRoutes);
app.use('/r', repCardRoutes); // public rep photo cards linked from the welcome text
app.use('/api/public/r', repCardRoutes); // same card under /api for same-origin proxies
app.use('/api/public', clientSelfServeRoutes); // booking + intake JSON, keyed by contact token
app.use('/b', bookingPageRouter); // client booking page
app.use('/i', intakePageRouter); // client intake form

// Auth routes
app.use('/api/auth', authRoutes);

// Admin routes (auth required)
app.use('/api/contacts', requireAuth, contactsRoutes);
app.use('/api/users', requireAuth, usersRoutes);
app.use('/api/tasks', requireAuth, tasksRoutes);
app.use('/api/policies', requireAuth, policiesRoutes);
app.use('/api/templates', requireAuth, templatesRoutes);
app.use('/api/appointments', requireAuth, appointmentsRoutes);
app.use('/api/dashboard', requireAuth, dashboardRoutes);
app.use('/api/reports', requireAuth, reportsRoutes);
app.use('/api/quo', requireAuth, quoRoutes);
app.use('/api/events', requireAuth, eventsRoutes);
app.use('/api/marketing', requireAuth, marketingRoutes);
app.use('/api/client-roster', requireAuth, clientRosterRoutes);
app.use('/api/referrals', requireAuth, referralsRoutes);
app.use('/api/payments', requireAuth, requireAdmin, paymentsRoutes);
app.use('/api/tpa', requireAuth, tpaRoutes);
app.use('/api/welcome-text', requireAuth, requireAdmin, welcomeTextRoutes);
app.use('/api/booking-settings', requireAuth, requireAdmin, bookingSettingsRoutes);
app.use('/api/admin/quo', requireAuth, requireAdmin, adminQuoRoutes);
app.use('/api/admin/leads', requireAuth, requireAdmin, adminLeadsRoutes);
app.use('/api/admin/jobs', requireAuth, requireAdmin, adminJobsRoutes);

// Error handler
app.use(errorHandler);

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Windward Financial API running on port ${PORT}`);
  startCronJobs();
});

export default app;
