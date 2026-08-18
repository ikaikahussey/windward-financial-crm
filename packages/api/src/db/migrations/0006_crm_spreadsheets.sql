-- CRM spreadsheet tables: client roster, referrals, and agency payments.

DO $$ BEGIN
  CREATE TYPE "referral_program" AS ENUM ('DOE', 'CHAMP');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "client_roster" (
  "id" serial PRIMARY KEY,
  "name" varchar(255) NOT NULL,
  "policy_numbers" text,
  "notes" text,
  "contact_id" integer REFERENCES "contacts"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "referrals" (
  "id" serial PRIMARY KEY,
  "name" varchar(255) NOT NULL,
  "phone" varchar(50),
  "email" varchar(255),
  "source" "referral_program" NOT NULL,
  "referral_date" timestamp,
  "servicing_agent_id" integer REFERENCES "users"("id"),
  "notes" text,
  "contact_id" integer REFERENCES "contacts"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "payments" (
  "id" serial PRIMARY KEY,
  "payee_name" varchar(255) NOT NULL,
  "payment_date" timestamp NOT NULL,
  "amount" numeric(12,2) NOT NULL,
  "account" varchar(100) DEFAULT 'Checking' NOT NULL,
  "notes" text,
  "contact_id" integer REFERENCES "contacts"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "payments_payment_date_idx" ON "payments" ("payment_date");
CREATE INDEX IF NOT EXISTS "referrals_referral_date_idx" ON "referrals" ("referral_date");
