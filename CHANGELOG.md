# Changelog

## Unreleased — Remove CMS + Blog, Astro public site

### Removed
- Blog feature in its entirety: `/blog` and `/blog/:slug` routes, the `blog_posts`
  table, `/api/cms/blog/*` and `/api/public/blog/*` routes, the admin CRM blog
  editor at `/cms/blog`, and the AI blog/newsletter content engine
  (`services/content-engine.ts` + the weekly/biweekly cron jobs that drove it).
- Runtime CMS for content that doesn't change operationally:
  the `site_pages`, `testimonials`, and `team_members` tables, all
  `/api/cms/{pages,testimonials,team}/*` and `/api/public/{pages,testimonials,team}/*`
  routes, and the admin CRM editors for each.
- Admin CRM CMS sidebar group (Pages, Blog, Testimonials, Team, Subscribers)
  and its sub-pages.
- Section 125 placeholder pages from the public site.
- Vite SPA scaffolding for `packages/public` (`vite.config.ts`,
  `src/main.tsx`, `src/App.tsx`, `index.html`).

### Migrated
- Pages, testimonials, and team members are now Markdown files with frontmatter
  in `packages/public/src/content/` (Astro Content Collections, Zod-validated).
- The public site is now an Astro project that statically generates all routes.
  Page loads issue zero database queries for content reads.

### Added
- Astro 5 + `@astrojs/react` + `@astrojs/tailwind` + `@astrojs/sitemap` for
  `packages/public`. Existing brand colors, typography, and component styles
  preserved.
- React form islands (`Calculator`, `ContactForm`, `ScheduleForm`, `EnrollForm`,
  `EventRegistrationForm`, `NewsletterForm`, `TestimonialsSlider`, `MobileMenu`)
  hydrated only where needed.
- Build-time events query (`packages/public/src/lib/events.ts`) using
  `BUILD_DATABASE_URL` (read-only role). Returns `[]` and warns when the env
  var is unset, so CI previews don't fail without DB access.
- Admin CRM Events page (`/events`): list, create, edit, delete events; view
  registrations per event.
- Dedicated admin events route (`/api/events`) separated from the public
  read-only event endpoints.
- `services/rebuild-trigger.ts` — fires `REBUILD_WEBHOOK_URL` after any
  event create/update/delete so the static site can be re-built.
- Drizzle migration `0003_drop_cms_and_blog.sql` that drops `blog_posts`,
  `site_pages`, `testimonials`, and `team_members` (CASCADE).
- Multi-stage `packages/public/Dockerfile` (Node builder → nginx runtime).
- `.env.example` entries for `BUILD_DATABASE_URL`, `REBUILD_WEBHOOK_URL`,
  `PUBLIC_API_URL`, `PUBLIC_SITE_URL`, `PUBLIC_NLG_LOGIN_URL`.

### Renamed
- `packages/api/src/routes/public.ts` → `routes/public-forms.ts` (now only
  serves form submissions and read-only event lookups).
