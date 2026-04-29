-- Operations dashboard tables: job_runs, webhook_events, lead_score_history.
-- Also adds lead_score and lead_score_updated_at columns to contacts.

ALTER TABLE "contacts"
  ADD COLUMN IF NOT EXISTS "lead_score" integer,
  ADD COLUMN IF NOT EXISTS "lead_score_updated_at" timestamp;

CREATE TABLE IF NOT EXISTS "job_runs" (
  "id" serial PRIMARY KEY,
  "job_name" varchar(64) NOT NULL,
  "started_at" timestamp DEFAULT now() NOT NULL,
  "finished_at" timestamp,
  "status" varchar(16) NOT NULL,
  "items_processed" integer DEFAULT 0 NOT NULL,
  "items_failed" integer DEFAULT 0 NOT NULL,
  "error" text,
  "log" text,
  "triggered_by" varchar(16) NOT NULL,
  "triggered_by_user_id" integer REFERENCES "users"("id")
);

CREATE INDEX IF NOT EXISTS "job_runs_job_name_started_idx"
  ON "job_runs" ("job_name", "started_at" DESC);
CREATE INDEX IF NOT EXISTS "job_runs_started_idx"
  ON "job_runs" ("started_at" DESC);

CREATE TABLE IF NOT EXISTS "webhook_events" (
  "id" serial PRIMARY KEY,
  "source" varchar(32) NOT NULL,
  "event_type" varchar(64) NOT NULL,
  "payload" jsonb NOT NULL,
  "matched_contact_id" integer REFERENCES "contacts"("id"),
  "status" varchar(16) NOT NULL,
  "error" text,
  "processing_ms" integer,
  "received_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "webhook_events_received_idx"
  ON "webhook_events" ("received_at" DESC);
CREATE INDEX IF NOT EXISTS "webhook_events_event_type_received_idx"
  ON "webhook_events" ("event_type", "received_at" DESC);

CREATE TABLE IF NOT EXISTS "lead_score_history" (
  "id" serial PRIMARY KEY,
  "contact_id" integer NOT NULL REFERENCES "contacts"("id"),
  "score" integer NOT NULL,
  "previous_score" integer,
  "factors" jsonb NOT NULL,
  "run_id" integer REFERENCES "job_runs"("id"),
  "scored_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "lead_score_history_contact_scored_idx"
  ON "lead_score_history" ("contact_id", "scored_at" DESC);
