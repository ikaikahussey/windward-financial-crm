-- Self-serve booking, intake, and event-driven stages.
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "public_token" varchar(64);
--> statement-breakpoint
UPDATE "contacts"
  SET "public_token" = replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
  WHERE "public_token" IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "contacts_public_token_idx" ON "contacts" ("public_token");
--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "sms_opt_out" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "sms_opt_out_at" timestamp;
--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "intake_completed_at" timestamp;
--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "booking_invite_sent_at" timestamp;
--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "goals" text;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "calendar_feed_url" text;
--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "source" varchar(30);
--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "reminder_24h_sent_at" timestamp;
--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "reminder_1h_sent_at" timestamp;
