# Windward Financial CRM & Public Website

A full-stack application for **Windward Financial**, a Hawaiʻi-based insurance and retirement planning brokerage serving public employees (DOE teachers, state workers, city & county employees).

The system has **two frontends** sharing **one backend**:

- **Public Website** (`packages/public`) — Astro static site replacing the existing windward.financial Squarespace site. Pages, testimonials, and team bios live as Markdown in the repo (Astro Content Collections); upcoming events are queried from Postgres at build time. Every form submission still creates a lead in the CRM via the API.
- **Admin CRM** (`packages/web`) — Internal React + Vite tool for the 5-person team to manage contacts, pipeline, policies, communications, automation, and events.
- **API** (`packages/api`) — Node.js/Express backend serving the admin CRM and the public site's form submissions.

> **Content editing for non-developers — pending decision.** Until a CMS is wired up, content edits require a Markdown PR. Decap CMS is the likely default; this is intentionally deferred so the team can pick one tool once the new site is live.

---

## Quick Start

### Prerequisites

- **Node.js 20+**
- **PostgreSQL 14+** (local or Docker)
- **npm** (comes with Node.js)

### 1. Clone and install dependencies

```bash
cd packages/api && npm install
cd ../web && npm install
cd ../public && npm install
```

### 2. Set up the database

Create a PostgreSQL database and user:

```sql
CREATE USER windward WITH PASSWORD 'windward' CREATEDB;
CREATE DATABASE windward_crm OWNER windward;
```

Or if using Docker:

```bash
docker run -d --name windward-pg \
  -e POSTGRES_USER=windward \
  -e POSTGRES_PASSWORD=windward \
  -e POSTGRES_DB=windward_crm \
  -p 5432:5432 \
  postgres:16-alpine
```

### 3. Configure environment

Copy and edit the environment file:

```bash
cp .env.example packages/api/.env
```

The default `.env` works for local development with the database credentials above.

### 4. Run migrations and seed data

```bash
cd packages/api
npm run db:migrate    # Creates the 15 CRM tables (+ marketing module)
npm run db:seed       # Populates sample CRM data
```

The seed script creates:
- 7 admin/agent users
- 30 sample contacts across all pipeline stages and islands
- 2 events
- 6-email nurture drip sequence templates
- 8 sample policies, 10 tasks, 15 activity log entries

Pages, testimonials, and team bios are no longer in the database — they live as Markdown in `packages/public/src/content/`.

### 5. Start all services

Open three terminals:

```bash
# Terminal 1 — API (port 3001)
cd packages/api && npm run dev

# Terminal 2 — Public website (port 5174)
cd packages/public && npm run dev

# Terminal 3 — Admin CRM (port 5173)
cd packages/web && npm run dev
```

### 6. Open in browser

| Service | URL | Notes |
|---------|-----|-------|
| Public Website | http://localhost:5174 | No login required |
| Admin CRM | http://localhost:5173 | Requires login |
| API Health Check | http://localhost:3001/api/health | Returns `{"status":"ok"}` |

### Default login credentials

| User | Email | Password |
|------|-------|----------|
| Herb Hussey (Admin) | `herb@windwardfinancial.net` | `windward2024` |
| Kealaka'i Hussey (Agent) | `kealakai@windwardfinancial.net` | `windward2024` |
| Admin User | `admin@windwardfinancial.net` | `admin123` |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL 16 + Drizzle ORM |
| Public Frontend | Astro 5 (static), React 18 islands, TailwindCSS, Markdown content |
| Admin Frontend | React 18, Vite, TailwindCSS, shadcn/ui patterns |
| Auth | Session-based with bcrypt, connect-pg-simple |
| Phone/SMS | Quo (formerly OpenPhone) REST API |
| AI | Anthropic Claude API (lead scoring, recommendations, content) |
| Email | Nodemailer with SMTP |
| Drag & Drop | @dnd-kit (pipeline Kanban board) |

---

## Project Structure

```
windward-crm/
├── docker-compose.yml           # Full-stack Docker deployment
├── nginx/default.conf           # Reverse proxy config
├── packages/
│   ├── api/                     # Express API backend
│   │   ├── src/
│   │   │   ├── index.ts         # Server entry point
│   │   │   ├── db/
│   │   │   │   ├── schema.ts    # Drizzle schema (15 CRM tables + marketing)
│   │   │   │   ├── migrate.ts   # Migration runner
│   │   │   │   ├── seed.ts      # Seed data script
│   │   │   │   └── migrations/  # SQL migration files
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts            # Login/logout/session
│   │   │   │   ├── contacts.ts        # Contact CRUD + pipeline
│   │   │   │   ├── tasks.ts           # Task management
│   │   │   │   ├── policies.ts        # Insurance policies
│   │   │   │   ├── templates.ts       # Email templates
│   │   │   │   ├── appointments.ts
│   │   │   │   ├── dashboard.ts       # Stats and activity feed
│   │   │   │   ├── reports.ts         # Funnel, lead sources, revenue
│   │   │   │   ├── events.ts          # Admin events CRUD (triggers rebuild)
│   │   │   │   ├── quo.ts             # Quo phone/SMS integration
│   │   │   │   ├── webhooks-quo.ts    # Quo webhook receivers
│   │   │   │   └── public-forms.ts    # Public site form posts + read-only events
│   │   │   ├── services/
│   │   │   │   ├── automation.ts        # Stage-change automations
│   │   │   │   ├── lead-capture.ts      # Lead creation from forms
│   │   │   │   ├── lead-scoring.ts      # AI lead scoring (0-100)
│   │   │   │   ├── email-sender.ts      # Email queue processor
│   │   │   │   ├── quo.ts               # Quo API wrapper
│   │   │   │   ├── ai-recommend.ts      # Claude product recommendations
│   │   │   │   ├── rebuild-trigger.ts   # POSTs REBUILD_WEBHOOK_URL
│   │   │   │   └── cron.ts              # Scheduled background jobs
│   │   │   └── middleware/
│   │   │       ├── auth.ts              # Session auth guards
│   │   │       └── errorHandler.ts
│   │   └── Dockerfile
│   ├── public/                  # Astro static public site
│   │   ├── astro.config.mjs
│   │   ├── src/
│   │   │   ├── content/                 # Markdown content collections
│   │   │   │   ├── config.ts            # Zod schemas for pages/testimonials/team
│   │   │   │   ├── pages/*.md           # Page metadata
│   │   │   │   ├── testimonials/*.md    # Client testimonials
│   │   │   │   └── team/*.md            # Team bios
│   │   │   ├── pages/
│   │   │   │   ├── index.astro          # Home (testimonials from MD)
│   │   │   │   ├── about.astro          # About + team grid (MD)
│   │   │   │   ├── expertise.astro
│   │   │   │   ├── quality-commitment.astro
│   │   │   │   ├── contact.astro
│   │   │   │   ├── schedule-an-appointment.astro
│   │   │   │   ├── calculator.astro     # Calculator React island
│   │   │   │   ├── enroll.astro
│   │   │   │   ├── national-life-transition.astro
│   │   │   │   ├── resources.astro
│   │   │   │   └── events/
│   │   │   │       ├── index.astro      # Postgres query at build time
│   │   │   │       └── [id].astro       # Dynamic route per event
│   │   │   ├── layouts/BaseLayout.astro
│   │   │   ├── components/Header.astro, Footer.astro
│   │   │   ├── components/islands/      # React islands (forms, calculator, etc.)
│   │   │   └── lib/events.ts            # Build-time DB query (read-only role)
│   │   └── Dockerfile                   # Multi-stage: node builder → nginx
│   └── web/                     # Admin CRM dashboard
│       ├── src/
│       │   ├── pages/
│       │   │   ├── Dashboard.tsx        # Stats + mini Kanban
│       │   │   ├── Contacts.tsx         # Searchable contact list
│       │   │   ├── ContactDetail.tsx    # Full contact view + timeline
│       │   │   ├── Pipeline.tsx         # Drag-and-drop Kanban
│       │   │   ├── Tasks.tsx            # Task management
│       │   │   ├── Templates.tsx        # Email template editor
│       │   │   ├── Sequences.tsx        # Drip sequence visualizer
│       │   │   ├── Appointments.tsx     # Calendar view
│       │   │   ├── Communications.tsx   # Calls + SMS inbox
│       │   │   ├── Events.tsx           # Events CRUD + registrations viewer
│       │   │   ├── Reports.tsx          # Funnel, sources, revenue
│       │   │   ├── Settings.tsx         # Users, SMTP, Quo config
│       │   │   └── marketing/           # Marketing module (campaigns, etc.)
│       │   └── components/
│       │       └── Sidebar.tsx
│       └── Dockerfile
```

---

## Public Website Pages

The public site at `packages/public` is an Astro static site replacing the existing Squarespace site. Page text, testimonials, and team bios are Markdown files in `packages/public/src/content/`. Upcoming events are queried from Postgres at build time. Page loads issue zero database queries for content reads.

10 page types (12 total routes — `events/[id].astro` generates one route per upcoming event):

| Route | Page | Source |
|-------|------|--------|
| `/` | Home | `content/pages/home.md` + testimonials collection |
| `/about` | About | `content/pages/about.md` + team collection |
| `/expertise` | Expertise | `content/pages/expertise.md` |
| `/quality-commitment` | Quality Commitment | `content/pages/quality-commitment.md` |
| `/contact` | Contact | Static + React form island |
| `/schedule-an-appointment` | Schedule | Static + React form island |
| `/events` | Events | Postgres query at build time |
| `/events/:id` | Event Detail | Postgres query at build time + React registration form |
| `/calculator` | Calculator | React calculator island |
| `/enroll` | Enroll | Static + React form island |
| `/national-life-transition` | NLG Transition | `content/pages/national-life-transition.md` |
| `/resources` | Resources | `content/pages/resources.md` |

**Every form submission on the public site automatically:**
1. Creates or updates a contact in the CRM
2. Sets the pipeline stage to "New Lead"
3. Sets the appropriate lead source
4. Fires automation rules (welcome email, agent task)

---

## Admin CRM Pages

The admin CRM at `packages/web` is the internal tool for managing the business.

| Route | Page | Description |
|-------|------|-------------|
| `/` | Dashboard | Pipeline stats, Kanban overview, recent activity, tasks due today |
| `/contacts` | Contacts | Searchable, filterable contact table with bulk actions |
| `/contacts/:id` | Contact Detail | Full profile, activity timeline, policies, tasks, quick actions |
| `/pipeline` | Pipeline | Full-screen drag-and-drop Kanban board (9 stages) |
| `/tasks` | Tasks | My Tasks / All Tasks with priority, type, and due date filters |
| `/templates` | Templates | Email template editor with merge tags and preview |
| `/sequences` | Sequences | Visual drip sequence builder with delay configuration |
| `/appointments` | Appointments | Calendar and list view of scheduled consultations |
| `/communications` | Communications | Unified inbox: calls and SMS messages from Quo |
| `/events` | Events | List, create, edit, delete events; view registrations per event. Triggers public-site rebuild on save. |
| `/reports` | Reports | Pipeline funnel, lead sources, agent activity, revenue |
| `/settings` | Settings | User management, SMTP, Quo API integration |
| `/marketing/*` | Marketing | District outreach, drip campaigns, webinars, ads (separate module) |

### Pipeline Stages

Contacts move through 9 stages, each triggering automated actions:

```
New Lead → Contacted → Consultation Scheduled → Consultation Completed
→ Proposal Sent → Application Submitted → Policy Issued → Active Client
                                                            ↘ Lost / Not Now
```

---

## Database Schema

15 core CRM tables managed by Drizzle ORM (the marketing module adds its own additional tables; Postgres-side count is higher).

**CRM Core (7):**
- `users` — Agents and admins (3 roles: admin, agent, viewer)
- `contacts` — Leads and clients with employment, financial, and insurance data
- `pipeline_entries` — Pipeline stage history (each contact has one active entry)
- `policies` — Insurance and annuity products sold to contacts
- `tasks` — Assigned action items with priority and due dates
- `activities` — Timeline log of all interactions per contact
- `appointments` — Scheduled consultations

**Email (2):**
- `email_templates` — Reusable templates with merge tags (`{{first_name}}`, etc.)
- `email_queue` — Scheduled outbound emails processed every 5 minutes

**Phone/SMS / Quo (3):**
- `quo_phone_numbers` — Cached workspace phone numbers
- `call_logs` — Inbound/outbound calls with recordings and transcriptions
- `sms_messages` — Text message history

**Events (3):**
- `events` — Webinars and seminars
- `event_registrations` — Event attendee registrations
- `newsletter_subscribers` — Email list with source tracking

> **Removed in this refactor:** `blog_posts`, `site_pages`, `testimonials`,
> `team_members` (see `migrations/0003_drop_cms_and_blog.sql`). Pages,
> testimonials, and team bios now live as Markdown in
> `packages/public/src/content/`.

---

## API Endpoints

### Public API (no authentication)

These endpoints accept form submissions from the static public site, plus the events read endpoints (also used by Astro at build time):

```
GET    /api/public/events             # List upcoming events
GET    /api/public/events/:id         # Get event detail
POST   /api/public/events/:id/register # Register for event → creates lead
POST   /api/public/contact            # Contact form → creates lead
POST   /api/public/subscribe          # Newsletter signup
POST   /api/public/calculator-lead    # Calculator submission → creates lead
POST   /api/public/schedule           # Appointment request → creates lead
POST   /api/public/enroll             # Enrollment form → creates lead
```

### Admin API (session authentication required)

```
POST   /api/auth/login                # Email/password login
POST   /api/auth/logout               # End session
GET    /api/auth/me                   # Current user info

# Contacts
GET    /api/contacts                  # List (search, filter, paginate)
POST   /api/contacts                  # Create contact
GET    /api/contacts/:id              # Get contact with pipeline stage
PATCH  /api/contacts/:id              # Update contact
DELETE /api/contacts/:id              # Delete contact
PATCH  /api/contacts/:id/stage        # Change pipeline stage (triggers automation)
GET    /api/contacts/:id/activities   # Activity timeline
POST   /api/contacts/:id/activities   # Add note/activity

# Tasks, Policies, Templates, Appointments — full CRUD
GET|POST          /api/tasks, /api/policies, /api/templates, /api/appointments
GET|PATCH|DELETE  /api/tasks/:id, /api/policies/:id, /api/templates/:id, /api/appointments/:id
PATCH             /api/tasks/:id/complete

# Events (admin) — CRUD + registrations; mutations fire REBUILD_WEBHOOK_URL
GET    /api/events
POST   /api/events
GET    /api/events/:id
PATCH  /api/events/:id
DELETE /api/events/:id
GET    /api/events/:id/registrations

# Dashboard & Reports
GET    /api/dashboard/stats           # Summary statistics
GET    /api/dashboard/recent-activity # Last 20 activities
GET    /api/reports/funnel            # Pipeline conversion funnel
GET    /api/reports/lead-sources      # Leads by source
GET    /api/reports/agent-activity    # Agent performance metrics
GET    /api/reports/revenue           # Revenue by pipeline stage

# Quo (Phone/SMS)
POST   /api/quo/sms                   # Send SMS via Quo
GET    /api/quo/calls                 # Call log history
GET    /api/quo/messages              # SMS history
GET    /api/quo/phone-numbers         # Workspace phone numbers
POST   /api/quo/sync                  # Trigger manual sync

# Webhooks (no auth — called by Quo servers)
POST   /api/webhooks/quo/calls
POST   /api/webhooks/quo/messages
POST   /api/webhooks/quo/call-summaries
POST   /api/webhooks/quo/call-transcripts
```

---

## Automation Engine

The system automates the majority of the sales pipeline. Only two steps require human intervention: the licensed agent consultation and the application signing.

### Stage-Change Automations

When a contact's pipeline stage changes, the automation engine (`services/automation.ts`) fires:

| Stage | Automated Actions |
|-------|-------------------|
| **→ New Lead** | Enroll in 6-email nurture drip sequence, send welcome SMS, score lead |
| **→ Consultation Scheduled** | Send confirmation email + SMS, schedule reminders, create prep task |
| **→ Consultation Completed** | Generate AI product recommendation, create review task |
| **→ Proposal Sent** | Queue follow-ups at 3, 5, and 10 days; auto-expire to Lost after 14 days |
| **→ Application Submitted** | Send confirmation email |
| **→ Policy Issued** | Send congrats, queue 90-day check-in, annual review, referral request |
| **→ Lost / Not Now** | Queue re-engagement emails at 90 and 180 days |

### Background Cron Jobs

| Schedule | Job |
|----------|-----|
| Every 5 min | Process email queue |
| Every 5 min | Process marketing campaign queue |
| Every 15 min | Sync Quo calls and messages |
| Daily 8am HST | Renewal reminders, annual reviews, birthday emails |
| Daily 9am HST | Re-score all leads, auto-book hot leads |
| Daily midnight HST | Expire stale proposals (>14 days → Lost) |
| Monthly 1st 6am HST | Generate performance report |

### AI Lead Scoring

Every lead is scored 0–100 based on:
- Employment type (DOE Teachers score highest)
- Years of service
- Life insurance status (None = high opportunity)
- Lead source quality (Calculator, Referral = high intent)
- Data completeness (salary, 403b balance provided)

Hot leads (≥70) are fast-tracked to auto-schedule consultations.

### AI Product Recommendations

After a consultation is marked complete, Claude generates a draft recommendation covering:
- Recommended products (from 7 available types)
- Rationale for each recommendation
- Estimated monthly cost
- Projected retirement income impact

The agent reviews and adjusts before sending the proposal.

---

## Quo (OpenPhone) Integration

The CRM integrates with [Quo](https://www.openphone.com/) for business phone and SMS:

- **Inbound call/SMS logging** — Webhook receivers auto-create activity entries on matching contacts
- **Outbound SMS** — Send texts from within the CRM contact detail page
- **Call recordings and transcriptions** — Synced and displayed on the contact timeline
- **AI call summaries** — Auto-generated summaries from Quo's AI
- **Phone number management** — Map Quo numbers to CRM agents

### Setup

1. Get your Quo API key from the Quo dashboard
2. Add it to `QUO_API_KEY` in your `.env`
3. In the Admin CRM → Settings → Quo Integration: click "Test Connection" then "Register Webhooks"
4. Assign Quo phone numbers to agents in the mapping table

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `SESSION_SECRET` | Secret for session cookies | Yes |
| `PORT` | API server port (default: 3001) | No |
| `SMTP_HOST` | SMTP server for outbound email | For email |
| `SMTP_PORT` | SMTP port (default: 587) | For email |
| `SMTP_USER` | SMTP username | For email |
| `SMTP_PASS` | SMTP password | For email |
| `SMTP_FROM` | From address for emails | For email |
| `SCHEDULING_LINK` | URL for scheduling page | No |
| `QUO_API_KEY` | Quo (OpenPhone) API key | For phone/SMS |
| `QUO_WEBHOOK_BASE_URL` | Public URL for Quo webhooks | For phone/SMS |
| `ANTHROPIC_API_KEY` | Claude API key | For AI features |
| `PUBLIC_URL` | Public site URL (CORS) | Yes |
| `ADMIN_URL` | Admin CRM URL (CORS) | Yes |
| `REBUILD_WEBHOOK_URL` | Webhook the API hits after admin events change, to rebuild the static public site | No (no-op when unset) |
| `BUILD_DATABASE_URL` | Read-only Postgres role used by the Astro build to query upcoming events | No (build returns empty event list when unset) |
| `PUBLIC_API_URL` | Base URL the Astro public site posts forms to (build-time arg) | Yes for non-localhost deploys |
| `PUBLIC_SITE_URL` | Canonical URL for sitemap generation | No |
| `PUBLIC_NLG_LOGIN_URL` | National Life Group customer login URL | No |

---

## Docker Deployment

For production deployment on a VPS:

```bash
docker compose up -d
```

This starts 5 services:
- **postgres** — PostgreSQL 16 with persistent volume
- **api** — Express server (runs migrations on startup)
- **web** — Admin CRM (nginx serving built React app)
- **public** — Public website (nginx serving Astro static `dist/`)
- **nginx** — Reverse proxy routing:
  - Port 80 (windward.financial) → public site
  - Port 8080 (admin.windward.financial) → admin CRM
  - `/api/*` → backend API (both domains)

### Railway Deployment

The app is also designed for Railway:
- **API** → Web service (Node.js, port from `$PORT`)
- **Public** → Static site (Astro build output, `packages/public/dist`)
- **Admin** → Static site (Vite build output, `packages/web/dist`)
- **PostgreSQL** → Railway managed Postgres

Set `PUBLIC_API_URL` on the public service and `VITE_API_URL` on the admin service to point to the API service URL. Set `BUILD_DATABASE_URL` on the public service to a read-only Postgres role so the build can render upcoming events.

---

## Design System

### Brand Colors

| Name | Hex | Usage |
|------|-----|-------|
| Primary Green | `#2D6A4F` | Buttons, links, headers |
| Dark Green | `#1B4332` | Navigation, footer |
| Light Green | `#D8F3DC` | Backgrounds, badges |
| Sand | `#FAF3E8` | Page backgrounds |
| Ocean Blue | `#2B6777` | Accents (public site) |
| Coral | `#D4725E` | Urgent/overdue items (admin) |

### Typography

- **Headings:** DM Serif Display (serif) — warm, professional
- **Body:** IBM Plex Sans (sans-serif) — clean, modern

---

## Key Scripts

```bash
# API
cd packages/api
npm run dev              # Start dev server with hot reload
npm run db:migrate       # Run database migrations
npm run db:seed          # Seed sample data
npm run db:generate      # Generate new migration from schema changes
npm run build            # Compile TypeScript

# Public Website
cd packages/public
npm run dev              # Astro dev server (port 5174)
npm run build            # Astro static build to dist/
npm run preview          # Preview the built site

# Admin CRM
cd packages/web
npm run dev              # Vite dev server (port 5173)
npm run build            # Production build to dist/
```

---

## License

Private — Windward Financial internal use only.
