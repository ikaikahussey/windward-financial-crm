-- TPA (Third-Party Administrator) module: plans, vendors, participants,
-- salary reduction agreements, contribution remittances, and transaction
-- approvals.

DO $$ BEGIN
  CREATE TYPE "tpa_plan_type" AS ENUM ('403(b)', '457(b)', 'Other');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "tpa_participant_status" AS ENUM ('Active', 'Suspended', 'Terminated', 'Retired', 'Deceased');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "tpa_sra_status" AS ENUM ('Pending', 'Active', 'Suspended', 'Terminated');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "tpa_contribution_type" AS ENUM ('Employee Pre-Tax', 'Employee Roth', 'Employer Match', 'Employer Non-Elective');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "tpa_batch_status" AS ENUM ('Open', 'Posted', 'Reconciled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "tpa_transaction_type" AS ENUM ('Loan', 'Hardship Withdrawal', 'Distribution', 'Contract Exchange', 'Rollover In', 'Rollover Out', 'QDRO', 'Other');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "tpa_transaction_status" AS ENUM ('Submitted', 'In Review', 'Approved', 'Denied', 'Completed', 'Cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "tpa_plans" (
  "id" serial PRIMARY KEY,
  "employer_name" varchar(500) NOT NULL,
  "plan_name" varchar(500) NOT NULL,
  "plan_type" "tpa_plan_type" DEFAULT '403(b)' NOT NULL,
  "plan_number" varchar(100),
  "effective_date" timestamp,
  "pay_periods_per_year" integer DEFAULT 24 NOT NULL,
  "plan_document_url" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "tpa_vendors" (
  "id" serial PRIMARY KEY,
  "name" varchar(500) NOT NULL,
  "contact_email" varchar(255),
  "contact_phone" varchar(50),
  "website" text,
  "notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "tpa_plan_vendors" (
  "id" serial PRIMARY KEY,
  "plan_id" integer NOT NULL REFERENCES "tpa_plans"("id"),
  "vendor_id" integer NOT NULL REFERENCES "tpa_vendors"("id"),
  "approved_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "tpa_participants" (
  "id" serial PRIMARY KEY,
  "plan_id" integer NOT NULL REFERENCES "tpa_plans"("id"),
  "contact_id" integer REFERENCES "contacts"("id"),
  "first_name" varchar(255) NOT NULL,
  "last_name" varchar(255) NOT NULL,
  "email" varchar(255),
  "phone" varchar(50),
  "employee_id" varchar(100),
  "birth_date" timestamp,
  "hire_date" timestamp,
  "status" "tpa_participant_status" DEFAULT 'Active' NOT NULL,
  "notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "tpa_sras" (
  "id" serial PRIMARY KEY,
  "participant_id" integer NOT NULL REFERENCES "tpa_participants"("id"),
  "vendor_id" integer NOT NULL REFERENCES "tpa_vendors"("id"),
  "contribution_type" "tpa_contribution_type" DEFAULT 'Employee Pre-Tax' NOT NULL,
  "per_pay_amount" numeric(12,2) NOT NULL,
  "effective_date" timestamp,
  "signed_date" timestamp,
  "status" "tpa_sra_status" DEFAULT 'Pending' NOT NULL,
  "notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "tpa_remittance_batches" (
  "id" serial PRIMARY KEY,
  "plan_id" integer NOT NULL REFERENCES "tpa_plans"("id"),
  "pay_date" timestamp NOT NULL,
  "status" "tpa_batch_status" DEFAULT 'Open' NOT NULL,
  "notes" text,
  "created_by" integer REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "tpa_contributions" (
  "id" serial PRIMARY KEY,
  "batch_id" integer NOT NULL REFERENCES "tpa_remittance_batches"("id"),
  "participant_id" integer NOT NULL REFERENCES "tpa_participants"("id"),
  "vendor_id" integer NOT NULL REFERENCES "tpa_vendors"("id"),
  "contribution_type" "tpa_contribution_type" DEFAULT 'Employee Pre-Tax' NOT NULL,
  "amount" numeric(12,2) NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "tpa_contributions_batch_idx" ON "tpa_contributions" ("batch_id");
CREATE INDEX IF NOT EXISTS "tpa_contributions_participant_idx" ON "tpa_contributions" ("participant_id");

CREATE TABLE IF NOT EXISTS "tpa_transactions" (
  "id" serial PRIMARY KEY,
  "participant_id" integer NOT NULL REFERENCES "tpa_participants"("id"),
  "vendor_id" integer REFERENCES "tpa_vendors"("id"),
  "txn_type" "tpa_transaction_type" NOT NULL,
  "amount" numeric(12,2),
  "status" "tpa_transaction_status" DEFAULT 'Submitted' NOT NULL,
  "requested_at" timestamp DEFAULT now() NOT NULL,
  "decided_at" timestamp,
  "decided_by" integer REFERENCES "users"("id"),
  "decision_notes" text,
  "notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
