# Changelog

All notable changes to this repository are documented here.
The format roughly follows [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased] — refactor: remove CMS and blog, migrate public site to Astro

### Removed

- **Blog feature, end-to-end.**
  - `blog_posts` table (Drizzle schema + seed data).
  - `/api/public/blog`, `/api/public/blog/:slug` endpoints.
  - `/api/cms/blog/*` endpoints.
  - `packages/web` admin CRM `/cms/blog` editor.
  - `packages/public` `/blog` and `/blog/:slug` routes.
  - `packages/api/src/services/content-engine.ts` (AI blog + newsletter drafting).
  - Cron jobs: weekly Monday blog draft + biweekly Friday newsletter draft.
  - Blog-related nav/footer links.
- **Runtime CMS for content that doesn't change operationally.**
  - `site_pages`, `testimonials`, `team_members` tables (Drizzle schema + seed).
  - `/api/public/pages`, `/api/public/pages/:slug`, `/api/public/testimonials`,
    `/api/public/team` endpoints.
  - `/api/cms/*` routes — the entire `packages/api/src/routes/cms.ts` file.
  - Admin CRM CMS pages: `pages`, `testimonials`, `team`, `events`, `blog`,
    `subscribers` (under `packages/web/src/pages/cms/`).
  - CMS sidebar group in the admin CRM.
- Obsolete `/section-125` public pages (not part of the target page set).
- `packages/api/src/routes/public.ts` (replaced — see below).

### Migrated

- **Public site → Astro static build.**
  `packages/public` is no longer a Vite SPA. It is an Astro 4 project with
  `output: 'static'`, `@astrojs/react`, `@astrojs/tailwind`, and
  `@astrojs/sitemap`. Existing React page components are preserved as
  interactive islands; visual design, brand colors, and typography are
  unchanged.
- **Team + testimonials → Markdown.** Content migrated from seed data to
  Astro Content Collections under `packages/public/src/content/`.
  Editing is currently via pull request (see README for the pending
  decision on a non-developer editing tool).
- **Events → build-time query.** `packages/public/src/lib/events.ts`
  reads the `events` table via `BUILD_DATABASE_URL` (read-only role) and
  bakes the list into HTML. A missing `BUILD_DATABASE_URL` logs a warning
  and produces an empty list — CI previews still build cleanly.

### Added

- `packages/api/src/routes/public-forms.ts` — the narrowed replacement
  for the old `routes/public.ts`. Handles contact, subscribe,
  calculator-lead, schedule, enroll, and event registration.
- `packages/api/src/routes/events.ts` — admin-facing events CRUD (auth
  required). Calls `triggerRebuild` on create/update/delete.
- `packages/api/src/services/rebuild-trigger.ts` — fire-and-forget POST
  to `REBUILD_WEBHOOK_URL`. No-op when unset.
- `packages/web/src/pages/Events.tsx` — single admin Events management
  page (list, create, edit, delete, view registrations) replacing the
  old CMS section. New sidebar entry.
- `packages/api/src/db/migrations/0003_drop_cms_and_blog.sql` — Drizzle
  migration dropping `blog_posts`, `site_pages`, `testimonials`,
  `team_members` in that order.
- Env vars `BUILD_DATABASE_URL` and `REBUILD_WEBHOOK_URL`, documented
  in `.env.example`. Also added `PUBLIC_API_URL`, `PUBLIC_SITE_URL`,
  `PUBLIC_NLG_LOGIN_URL` for the Astro build.
- Multi-stage `packages/public/Dockerfile` (Node builder → nginx runtime)
  serving Astro's `dist/`.
- `CHANGELOG.md` (this file).

### Unchanged

- CRM core: contacts, pipeline, tasks, policies, activities, appointments.
- Automation: stage-change triggers, lead scoring, lead capture, email
  queue, AI recommendations.
- Quo integration: routes, webhooks, sync jobs, call logs, SMS.
- Auth (session-based, bcrypt, connect-pg-simple).
- Nine pipeline stages and their automation triggers.
- The 6-email nurture drip sequence.
- Seed data for contacts, users, policies, tasks, templates, events.
- Brand colors, typography, and existing visual design of the public site.
- The admin CRM framework (React + Vite).
