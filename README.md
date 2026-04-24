# Windward Financial CRM & Public Website

A full-stack application for **Windward Financial**, a Hawaiʻi-based insurance and retirement planning brokerage serving public employees (DOE teachers, state workers, city & county employees).

The system has **two frontends** sharing **one backend**:

- **Public Website** (`packages/public`) — Astro static site replacing the existing windward.financial Squarespace site. 10 static pages (12 routes including dynamic `/events/[id]`). Every form submission still creates a lead in the CRM via the API; otherwise page loads do zero runtime API calls.
- **Admin CRM** (`packages/web`) — React + Vite internal tool for the team to manage contacts, pipeline, policies, communications, automation, and events.
- **API** (`packages/api`) — Node.js/Express backend serving the forms and the admin CRM. Writes trigger an optional rebuild webhook so the static public site picks up changes.

### Content architecture

- **Operational data** (contacts, policies, tasks, events, registrations, newsletter subscribers, call/SMS logs, marketing campaigns) lives in **Postgres** — 15 core tables plus the marketing module.
- **Structural content** (pages, testimonials, team members) lives in **Markdown** with frontmatter under `packages/public/src/content/`, validated by Astro Content Collections + Zod. Editing currently happens by pull request.
- **Pending decision:** a non-developer editing tool (most likely [Decap CMS](https://decapcms.org)) has been deferred and is not yet wired up. For now, content edits go through a code change.

### Recent refactor

See [`CHANGELOG.md`](./CHANGELOG.md) for the complete list of what was removed (blog, CMS tables and routes), migrated (public site → Astro, pages/testimonials/team → Markdown), and added (admin Events page, rebuild webhook).

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
npm run db:migrate    # Creates all 19 tables
npm run db:seed       # Populates sample CRM data + CMS content
```

The seed script creates:
- 3 admin/agent users
- 30 sample contacts across all pipeline stages and islands
- 5 team members, 3 testimonials, 2 events, 3 blog posts
- 9 CMS pages with full content for the public website
- 6-email nurture drip sequence templates
- 8 sample policies, 10 tasks, 15 activity log entries

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
| Public Frontend | React 18, Vite, TailwindCSS |
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
│   │   │   │   ├── schema.ts    # Drizzle schema (19 tables)
│   │   │   │   ├── migrate.ts   # Migration runner
│   │   │   │   ├── seed.ts      # Seed data script
│   │   │   │   └── migrations/  # SQL migration files
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts      # Login/logout/session
│   │   │   │   ├── contacts.ts  # Contact CRUD + pipeline
│   │   │   │   ├── tasks.ts     # Task management
│   │   │   │   ├── policies.ts  # Insurance policies
│   │   │   │   ├── templates.ts # Email templates
│   │   │   │   ├── appointments.ts
│   │   │   │   ├── dashboard.ts # Stats and activity feed
│   │   │   │   ├── reports.ts   # Funnel, lead sources, revenue
│   │   │   │   ├── quo.ts       # Quo phone/SMS integration
│   │   │   │   ├── webhooks-quo.ts # Quo webhook receivers
│   │   │   │   ├── cms.ts       # CMS content management
│   │   │   │   └── public.ts    # Public website API (no auth)
│   │   │   ├── services/
│   │   │   │   ├── automation.ts     # Stage-change automations
│   │   │   │   ├── lead-capture.ts   # Lead creation from forms
│   │   │   │   ├── lead-scoring.ts   # AI lead scoring (0-100)
│   │   │   │   ├── email-sender.ts   # Email queue processor
│   │   │   │   ├── quo.ts            # Quo API wrapper
│   │   │   │   ├── ai-recommend.ts   # Claude product recommendations
│   │   │   │   ├── content-engine.ts # Auto blog/newsletter generation
│   │   │   │   └── cron.ts           # Scheduled background jobs
│   │   │   └── middleware/
│   │   │       ├── auth.ts           # Session auth guards
│   │   │       └── errorHandler.ts
│   │   └── Dockerfile
│   ├── public/                  # Public marketing website
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   │   ├── Home.tsx, About.tsx, Expertise.tsx
│   │   │   │   ├── QualityCommitment.tsx, Contact.tsx
│   │   │   │   ├── Schedule.tsx, Events.tsx, EventDetail.tsx
│   │   │   │   ├── Calculator.tsx, Enroll.tsx
│   │   │   │   ├── NationalLifeTransition.tsx
│   │   │   │   ├── Blog.tsx, BlogPost.tsx, Resources.tsx
│   │   │   │   └── (14 pages total)
│   │   │   └── components/layout/
│   │   │       ├── Header.tsx, Footer.tsx, Layout.tsx
│   │   └── Dockerfile
│   └── web/                     # Admin CRM dashboard
│       ├── src/
│       │   ├── pages/
│       │   │   ├── Dashboard.tsx      # Stats + mini Kanban
│       │   │   ├── Contacts.tsx       # Searchable contact list
│       │   │   ├── ContactDetail.tsx  # Full contact view + timeline
│       │   │   ├── Pipeline.tsx       # Drag-and-drop Kanban
│       │   │   ├── Tasks.tsx          # Task management
│       │   │   ├── Templates.tsx      # Email template editor
│       │   │   ├── Sequences.tsx      # Drip sequence visualizer
│       │   │   ├── Appointments.tsx   # Calendar view
│       │   │   ├── Communications.tsx # Calls + SMS inbox
│       │   │   ├── Reports.tsx        # Funnel, sources, revenue
│       │   │   ├── Settings.tsx       # Users, SMTP, Quo config
│       │   │   └── cms/              # CMS management (6 pages)
│       │   └── components/
│       │       └── Sidebar.tsx
│       └── Dockerfile
```

---

## Public Website Pages

The public site at `packages/public` replaces the existing Squarespace site. All content is CMS-driven (editable from the Admin CRM).

| Route | Page | Description |
|-------|------|-------------|
| `/` | Home | Hero, services cards, testimonials carousel, newsletter signup |
| `/about` | About | Company history, team member grid |
| `/expertise` | Expertise | Insurance, annuity, and 403(b) product cards |
| `/quality-commitment` | Quality Commitment | Mission, goals, affiliations |
| `/contact` | Contact | Contact form → creates CRM lead |
| `/schedule-an-appointment` | Schedule | Appointment request form → creates CRM lead + appointment |
| `/events` | Events | Upcoming webinars/seminars list |
| `/events/:id` | Event Detail | Event info + registration form → creates CRM lead |
| `/calculator` | Calculator | Retirement readiness calculator with lead capture |
| `/enroll` | Enroll | HomeHealth Care enrollment form |
| `/national-life-transition` | NLG Transition | National Life Group account transfer info |
| `/blog` | Blog | Paginated blog listing with tag filtering |
| `/blog/:slug` | Blog Post | Full article with sidebar CTAs |
| `/resources` | Resources | External links (ERS, EUTF, SSA, NLG login) |

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
| `/reports` | Reports | Pipeline funnel, lead sources, agent activity, revenue |
| `/settings` | Settings | User management, SMTP, Quo API integration |
| `/cms/*` | CMS | Manage all public website content (pages, blog, team, events, testimonials, subscribers) |

### Pipeline Stages

Contacts move through 9 stages, each triggering automated actions:

```
New Lead → Contacted → Consultation Scheduled → Consultation Completed
→ Proposal Sent → Application Submitted → Policy Issued → Active Client
                                                            ↘ Lost / Not Now
```

---

## Database Schema

19 PostgreSQL tables managed by Drizzle ORM:

**CRM Core:**
- `users` — Agents and admins (3 roles: admin, agent, viewer)
- `contacts` — Leads and clients with employment, financial, and insurance data
- `pipeline_entries` — Pipeline stage history (each contact has one active entry)
- `policies` — Insurance and annuity products sold to contacts
- `tasks` — Assigned action items with priority and due dates
- `activities` — Timeline log of all interactions per contact
- `appointments` — Scheduled consultations

**Email:**
- `email_templates` — Reusable templates with merge tags (`{{first_name}}`, etc.)
- `email_queue` — Scheduled outbound emails processed every 5 minutes

**Phone/SMS (Quo):**
- `quo_phone_numbers` — Cached workspace phone numbers
- `call_logs` — Inbound/outbound calls with recordings and transcriptions
- `sms_messages` — Text message history

**Public Website CMS:**
- `site_pages` — CMS page content (JSON content blocks)
- `testimonials` — Client testimonials for the public site
- `team_members` — Staff bios and contact info
- `events` — Webinars and seminars
- `event_registrations` — Event attendee registrations
- `blog_posts` — Blog articles with Markdown/HTML body
- `newsletter_subscribers` — Email list with source tracking

---

## API Endpoints

### Public API (no authentication)

These endpoints serve the public website and accept form submissions:

```
GET    /api/public/pages              # List published CMS pages
GET    /api/public/pages/:slug        # Get page content by slug
GET    /api/public/testimonials       # List published testimonials
GET    /api/public/team               # List published team members
GET    /api/public/events             # List upcoming events
GET    /api/public/events/:id         # Get event detail
POST   /api/public/events/:id/register # Register for event → creates lead
GET    /api/public/blog               # List published posts (paginated)
GET    /api/public/blog/:slug         # Get blog post by slug
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

# CMS (admin only)
GET|POST          /api/cms/pages, /api/cms/testimonials, /api/cms/team, etc.
GET|PATCH|DELETE  /api/cms/pages/:id, /api/cms/blog/:id, etc.

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
| Every 15 min | Sync Quo calls and messages |
| Daily 8am HST | Renewal reminders, annual reviews, birthday emails |
| Daily 9am HST | Re-score all leads, auto-book hot leads |
| Weekly Monday | Generate blog post draft (AI) |
| Biweekly Friday | Generate newsletter draft (AI) |
| Daily midnight | Sync Quo phone numbers |
| Daily | Expire stale proposals (>14 days → Lost) |

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
- **public** — Public website (nginx serving built React app)
- **nginx** — Reverse proxy routing:
  - Port 80 (windward.financial) → public site
  - Port 8080 (admin.windward.financial) → admin CRM
  - `/api/*` → backend API (both domains)

### Railway Deployment

The app is also designed for Railway:
- **API** → Web service (Node.js, port from `$PORT`)
- **Public** → Static site (Vite build output, `packages/public/dist`)
- **Admin** → Static site (Vite build output, `packages/web/dist`)
- **PostgreSQL** → Railway managed Postgres

Set `VITE_API_URL` on both frontend services to point to the API service URL.

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
npm run dev              # Vite dev server (port 5174)
npm run build            # Production build to dist/

# Admin CRM
cd packages/web
npm run dev              # Vite dev server (port 5173)
npm run build            # Production build to dist/
```

---

## License

Private — Windward Financial internal use only.
