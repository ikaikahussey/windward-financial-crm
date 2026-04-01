CREATE TYPE "public"."ad_campaign_status" AS ENUM('draft', 'active', 'paused', 'completed');--> statement-breakpoint
CREATE TYPE "public"."ad_platform" AS ENUM('google', 'meta', 'linkedin');--> statement-breakpoint
CREATE TYPE "public"."campaign_event_type" AS ENUM('sent', 'opened', 'clicked', 'replied', 'bounced');--> statement-breakpoint
CREATE TYPE "public"."campaign_status" AS ENUM('draft', 'active', 'paused', 'completed');--> statement-breakpoint
CREATE TYPE "public"."campaign_step_type" AS ENUM('email', 'sms');--> statement-breakpoint
CREATE TYPE "public"."campaign_type" AS ENUM('email', 'webinar', 'pdf');--> statement-breakpoint
CREATE TYPE "public"."document_status" AS ENUM('sent', 'viewed', 'signed', 'expired');--> statement-breakpoint
CREATE TYPE "public"."enrollment_status" AS ENUM('pending', 'active', 'completed', 'unsubscribed');--> statement-breakpoint
CREATE TYPE "public"."production_status" AS ENUM('Dormant', 'Low Prod');--> statement-breakpoint
CREATE TABLE "campaign_enrollments" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaign_id" integer NOT NULL,
	"district_id" integer NOT NULL,
	"district_contact_id" integer,
	"status" "enrollment_status" DEFAULT 'pending' NOT NULL,
	"current_step" integer DEFAULT 0 NOT NULL,
	"enrolled_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"last_step_sent_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "campaign_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"enrollment_id" integer NOT NULL,
	"step_number" integer NOT NULL,
	"event_type" "campaign_event_type" NOT NULL,
	"occurred_at" timestamp DEFAULT now() NOT NULL,
	"metadata" json
);
--> statement-breakpoint
CREATE TABLE "campaign_steps" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaign_id" integer NOT NULL,
	"step_number" integer NOT NULL,
	"delay_days" integer DEFAULT 0 NOT NULL,
	"subject" varchar(500) NOT NULL,
	"body" text NOT NULL,
	"type" "campaign_step_type" DEFAULT 'email' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(500) NOT NULL,
	"type" "campaign_type" DEFAULT 'email' NOT NULL,
	"status" "campaign_status" DEFAULT 'draft' NOT NULL,
	"subject" varchar(500),
	"from_name" varchar(255),
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "district_contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"district_id" integer NOT NULL,
	"first_name" varchar(255),
	"last_name" varchar(255),
	"title" varchar(255),
	"email" varchar(255),
	"phone" varchar(50),
	"linkedin_url" text,
	"found_via" text,
	"verified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "districts" (
	"id" serial PRIMARY KEY NOT NULL,
	"employer_name" varchar(500) NOT NULL,
	"city" varchar(255),
	"county" varchar(255),
	"state" varchar(2),
	"group_type" varchar(255),
	"classification_source" text,
	"production_status" "production_status",
	"plan_admin_name" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"district_id" integer,
	"district_contact_id" integer,
	"contact_id" integer,
	"document_type" varchar(255) NOT NULL,
	"status" "document_status" DEFAULT 'sent' NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	"viewed_at" timestamp,
	"signed_at" timestamp,
	"document_url" text
);
--> statement-breakpoint
CREATE TABLE "geo_ad_campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"district_id" integer,
	"campaign_id" integer,
	"platform" "ad_platform" NOT NULL,
	"status" "ad_campaign_status" DEFAULT 'draft' NOT NULL,
	"geo_target" text,
	"budget_daily" numeric(10, 2),
	"impressions" integer DEFAULT 0 NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"start_date" timestamp,
	"end_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webinar_registrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"district_contact_id" integer,
	"contact_id" integer,
	"first_name" varchar(255) NOT NULL,
	"last_name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(50),
	"district_name" varchar(500),
	"webinar_date" timestamp,
	"webinar_topic" varchar(500),
	"registered_at" timestamp DEFAULT now() NOT NULL,
	"attended" boolean
);
--> statement-breakpoint
ALTER TABLE "campaign_enrollments" ADD CONSTRAINT "campaign_enrollments_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_enrollments" ADD CONSTRAINT "campaign_enrollments_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_enrollments" ADD CONSTRAINT "campaign_enrollments_district_contact_id_district_contacts_id_fk" FOREIGN KEY ("district_contact_id") REFERENCES "public"."district_contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_events" ADD CONSTRAINT "campaign_events_enrollment_id_campaign_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."campaign_enrollments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_steps" ADD CONSTRAINT "campaign_steps_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "district_contacts" ADD CONSTRAINT "district_contacts_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_requests" ADD CONSTRAINT "document_requests_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_requests" ADD CONSTRAINT "document_requests_district_contact_id_district_contacts_id_fk" FOREIGN KEY ("district_contact_id") REFERENCES "public"."district_contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_requests" ADD CONSTRAINT "document_requests_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geo_ad_campaigns" ADD CONSTRAINT "geo_ad_campaigns_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geo_ad_campaigns" ADD CONSTRAINT "geo_ad_campaigns_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webinar_registrations" ADD CONSTRAINT "webinar_registrations_district_contact_id_district_contacts_id_fk" FOREIGN KEY ("district_contact_id") REFERENCES "public"."district_contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webinar_registrations" ADD CONSTRAINT "webinar_registrations_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;