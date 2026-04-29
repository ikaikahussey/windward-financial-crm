-- Staff feedback comments (per-page bug reports / improvement ideas) and
-- lightweight page-view analytics.

DO $$ BEGIN
  CREATE TYPE "staff_comment_type" AS ENUM ('bug', 'improvement', 'question', 'praise');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "staff_comment_status" AS ENUM ('open', 'in_progress', 'resolved', 'wont_fix');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "staff_comment_priority" AS ENUM ('low', 'normal', 'high');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "staff_comments" (
  "id" serial PRIMARY KEY,
  "page_path" varchar(255) NOT NULL,
  "page_label" varchar(255),
  "type" "staff_comment_type" NOT NULL DEFAULT 'improvement',
  "status" "staff_comment_status" NOT NULL DEFAULT 'open',
  "priority" "staff_comment_priority" NOT NULL DEFAULT 'normal',
  "title" varchar(500) NOT NULL,
  "body" text,
  "user_agent" text,
  "viewport_width" integer,
  "viewport_height" integer,
  "created_by_id" integer NOT NULL REFERENCES "users"("id"),
  "resolved_at" timestamp,
  "resolved_by_id" integer REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "staff_comments_page_idx" ON "staff_comments" ("page_path");
CREATE INDEX IF NOT EXISTS "staff_comments_created_idx" ON "staff_comments" ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "staff_comments_status_idx" ON "staff_comments" ("status");

CREATE TABLE IF NOT EXISTS "staff_comment_replies" (
  "id" serial PRIMARY KEY,
  "comment_id" integer NOT NULL REFERENCES "staff_comments"("id") ON DELETE CASCADE,
  "body" text NOT NULL,
  "created_by_id" integer NOT NULL REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "staff_comment_replies_comment_idx"
  ON "staff_comment_replies" ("comment_id", "created_at");

CREATE TABLE IF NOT EXISTS "page_views" (
  "id" serial PRIMARY KEY,
  "user_id" integer REFERENCES "users"("id"),
  "page_path" varchar(255) NOT NULL,
  "page_label" varchar(255),
  "session_id" varchar(64),
  "referrer" text,
  "duration_ms" integer,
  "viewed_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "page_views_viewed_idx" ON "page_views" ("viewed_at" DESC);
CREATE INDEX IF NOT EXISTS "page_views_user_viewed_idx" ON "page_views" ("user_id", "viewed_at" DESC);
CREATE INDEX IF NOT EXISTS "page_views_page_viewed_idx" ON "page_views" ("page_path", "viewed_at" DESC);
