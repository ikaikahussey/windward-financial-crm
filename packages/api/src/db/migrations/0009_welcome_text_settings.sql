-- Welcome text is configured in the Admin CRM (Welcome Text page), not in code:
-- rep photos live on the user row, and the message template / on-off switch
-- live in app_settings.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "photo_data" text;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "photo_mime" varchar(50);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "app_settings" (
  "key" varchar(100) PRIMARY KEY NOT NULL,
  "value" text NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "updated_by" integer REFERENCES "users"("id") ON DELETE SET NULL
);
