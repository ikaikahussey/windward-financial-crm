// Curated changelog. Add a new entry at the TOP whenever you ship.
// `version` should be the short git SHA the entry corresponds to (or a tag).
// Entries flow into the /changelog page and the sidebar's version footer.

export interface ChangelogEntry {
  version: string;
  date: string; // ISO date
  title: string;
  changes: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '4a24fb8',
    date: '2026-04-29',
    title: 'Contacts admin fix + Operations Dashboard',
    changes: [
      'Fix Add Contact and Edit Contact (snake_case ↔ camelCase API contract).',
      'Pipeline-stage / employment / island / lead-source enums realigned to DB values.',
      'New admin-only Operations pages: Quo Status, Lead Scoring, Automation Activity.',
      'New ops tables: job_runs, webhook_events, lead_score_history.',
      'Lead-score updates now write to history instead of spamming the activity feed.',
      'Cron and manual jobs route through runJob() with full success/partial/failed bookkeeping.',
      'Vitest set up in packages/api with 11 tests covering job-runner, webhooks, scoring, admin auth.',
    ],
  },
  {
    version: 'e2f03e7',
    date: '2026-04-28',
    title: 'Public site Railway deploy fix',
    changes: ['Drop Dockerfile so Railway uses nixpacks, not multi-stage.'],
  },
  {
    version: 'f2375a6',
    date: '2026-04-27',
    title: 'CI hardening',
    changes: ['Issue-creation step is resilient to missing labels and empty results.'],
  },
];
