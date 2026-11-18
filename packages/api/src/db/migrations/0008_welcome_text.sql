-- Instant welcome text for new registrations.
-- Adds the rep profile fields the text needs and a round-robin cursor.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "title" varchar(255);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "profile_slug" varchar(255);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_lead_rep" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_lead_assigned_at" timestamp;
