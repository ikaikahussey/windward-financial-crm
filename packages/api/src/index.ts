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
import staffCommentsRoutes from './routes/staff-comments';
import analyticsRoutes from './routes/analytics';

const app = express();
const PORT = parseInt(process.env.PORT || '3001');

// Trust Railway's reverse proxy (needed for secure cookies)
app.set('trust proxy', 1);

// CORS — PUBLIC_URL and ADMIN_URL may each be a comma-separated list of
// allowed origins (e.g. both the Railway-assigned URL and the custom domain).
const splitOrigins = (value: string | undefined): string[] =>
  (value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const allowedOrigins = [
  ...splitOrigins(process.env.PUBLIC_URL),
  ...splitOrigins(process.env.ADMIN_URL),
];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

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
app.use('/api/staff-comments', requireAuth, staffCommentsRoutes);
app.use('/api/analytics', requireAuth, analyticsRoutes);
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
