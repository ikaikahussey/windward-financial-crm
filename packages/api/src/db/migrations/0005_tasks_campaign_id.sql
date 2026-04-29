-- Tasks can be related to a campaign in addition to (or instead of) a contact.
ALTER TABLE "tasks"
  ADD COLUMN IF NOT EXISTS "campaign_id" integer
  REFERENCES "campaigns"("id");

CREATE INDEX IF NOT EXISTS "tasks_campaign_id_idx" ON "tasks" ("campaign_id");
