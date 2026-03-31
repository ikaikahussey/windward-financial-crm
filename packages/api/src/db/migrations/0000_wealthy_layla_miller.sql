CREATE TYPE "public"."activity_type" AS ENUM('Note', 'Call', 'Email Sent', 'Email Opened', 'Meeting', 'Stage Change', 'Task Completed', 'Policy Added', 'SMS Sent', 'SMS Received', 'Call Inbound', 'Call Outbound', 'Voicemail');--> statement-breakpoint
CREATE TYPE "public"."appointment_status" AS ENUM('Scheduled', 'Completed', 'Cancelled', 'No Show');--> statement-breakpoint
CREATE TYPE "public"."call_direction" AS ENUM('inbound', 'outbound');--> statement-breakpoint
CREATE TYPE "public"."call_status" AS ENUM('completed', 'missed', 'voicemail', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."email_queue_status" AS ENUM('Pending', 'Sent', 'Failed', 'Cancelled');--> statement-breakpoint
CREATE TYPE "public"."employment_type" AS ENUM('DOE Teacher', 'DOE Staff', 'State Employee', 'City & County', 'Other');--> statement-breakpoint
CREATE TYPE "public"."ers_plan_type" AS ENUM('Contributory I', 'Contributory II', 'Noncontributory', 'Hybrid', 'Unknown');--> statement-breakpoint
CREATE TYPE "public"."island" AS ENUM('Oahu', 'Maui', 'Big Island', 'Kauai', 'Molokai', 'Lanai');--> statement-breakpoint
CREATE TYPE "public"."lead_source" AS ENUM('Webinar', 'Calculator', 'Referral', 'School Visit', 'Website', 'Social Media', 'Enrollment', 'Other');--> statement-breakpoint
CREATE TYPE "public"."life_insurance_status" AS ENUM('None', 'Employer Only', 'Personal', 'Both');--> statement-breakpoint
CREATE TYPE "public"."pipeline_stage" AS ENUM('New Lead', 'Contacted', 'Consultation Scheduled', 'Consultation Completed', 'Proposal Sent', 'Application Submitted', 'Policy Issued', 'Active Client', 'Lost / Not Now');--> statement-breakpoint
CREATE TYPE "public"."policy_status" AS ENUM('Applied', 'Issued', 'Active', 'Lapsed', 'Cancelled');--> statement-breakpoint
CREATE TYPE "public"."product_type" AS ENUM('Term Life', 'Guaranteed Universal Life', 'Indexed Universal Life', 'Fixed Annuity', 'Fixed Indexed Annuity', '403b SPDA', '403b FPDA');--> statement-breakpoint
CREATE TYPE "public"."sms_direction" AS ENUM('inbound', 'outbound');--> statement-breakpoint
CREATE TYPE "public"."sms_status" AS ENUM('queued', 'sent', 'delivered', 'failed', 'received');--> statement-breakpoint
CREATE TYPE "public"."task_priority" AS ENUM('Low', 'Normal', 'High', 'Urgent');--> statement-breakpoint
CREATE TYPE "public"."task_type" AS ENUM('Call', 'Email', 'Follow Up', 'Review', 'Meeting', 'Other');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'agent', 'viewer');--> statement-breakpoint
CREATE TABLE "activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"contact_id" integer NOT NULL,
	"user_id" integer,
	"activity_type" "activity_type" NOT NULL,
	"subject" text,
	"body" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" serial PRIMARY KEY NOT NULL,
	"contact_id" integer NOT NULL,
	"agent_id" integer NOT NULL,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"location" text,
	"status" "appointment_status" DEFAULT 'Scheduled' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blog_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"excerpt" text,
	"body" text NOT NULL,
	"author_id" integer,
	"featured_image_url" text,
	"meta_description" text,
	"tags" text[],
	"is_published" boolean DEFAULT false NOT NULL,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "blog_posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "call_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"quo_call_id" text,
	"contact_id" integer,
	"agent_id" integer,
	"direction" "call_direction" NOT NULL,
	"status" "call_status" NOT NULL,
	"duration_seconds" integer,
	"started_at" timestamp,
	"completed_at" timestamp,
	"recording_url" text,
	"transcription" text,
	"ai_summary" text,
	"quo_phone_number_id" text,
	"participant_number" varchar(20),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "call_logs_quo_call_id_unique" UNIQUE("quo_call_id")
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"first_name" varchar(255) NOT NULL,
	"last_name" varchar(255) NOT NULL,
	"email" varchar(255),
	"phone" varchar(50),
	"address" text,
	"city" varchar(255),
	"island" "island",
	"zip" varchar(20),
	"employment_type" "employment_type",
	"employer_school" text,
	"years_of_service" integer,
	"annual_salary" numeric(12, 2),
	"ers_plan_type" "ers_plan_type",
	"current_403b_balance" numeric(12, 2),
	"life_insurance_status" "life_insurance_status",
	"lead_source" "lead_source",
	"referral_source" text,
	"assigned_agent_id" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_contacted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "email_queue" (
	"id" serial PRIMARY KEY NOT NULL,
	"contact_id" integer NOT NULL,
	"template_id" integer NOT NULL,
	"scheduled_for" timestamp NOT NULL,
	"sent_at" timestamp,
	"status" "email_queue_status" DEFAULT 'Pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"subject" varchar(500) NOT NULL,
	"body" text NOT NULL,
	"sequence_position" integer,
	"delay_days" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_registrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"contact_id" integer,
	"first_name" varchar(255) NOT NULL,
	"last_name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(50),
	"employment_type" "employment_type",
	"employer_school" text,
	"registered_at" timestamp DEFAULT now() NOT NULL,
	"attended" boolean
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"event_date" timestamp NOT NULL,
	"end_date" timestamp,
	"location" text,
	"zoom_link" text,
	"registration_required" boolean DEFAULT true NOT NULL,
	"max_attendees" integer,
	"is_published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "newsletter_subscribers" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"first_name" varchar(255),
	"subscribed_at" timestamp DEFAULT now() NOT NULL,
	"unsubscribed_at" timestamp,
	"source" text,
	"contact_id" integer,
	CONSTRAINT "newsletter_subscribers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "pipeline_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"contact_id" integer NOT NULL,
	"pipeline_stage" "pipeline_stage" NOT NULL,
	"moved_at" timestamp DEFAULT now() NOT NULL,
	"moved_by" integer
);
--> statement-breakpoint
CREATE TABLE "policies" (
	"id" serial PRIMARY KEY NOT NULL,
	"contact_id" integer NOT NULL,
	"product_type" "product_type" NOT NULL,
	"carrier" text,
	"policy_number" text,
	"annual_premium" numeric(12, 2),
	"status" "policy_status" DEFAULT 'Applied' NOT NULL,
	"issue_date" timestamp,
	"expiry_date" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quo_phone_numbers" (
	"id" serial PRIMARY KEY NOT NULL,
	"quo_phone_number_id" text NOT NULL,
	"phone_number" varchar(20) NOT NULL,
	"label" text,
	"assigned_user_id" integer,
	"synced_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "quo_phone_numbers_quo_phone_number_id_unique" UNIQUE("quo_phone_number_id")
);
--> statement-breakpoint
CREATE TABLE "site_pages" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"meta_description" text,
	"hero_image_url" text,
	"content" json,
	"is_published" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "site_pages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "sms_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"quo_message_id" text,
	"contact_id" integer,
	"agent_id" integer,
	"direction" "sms_direction" NOT NULL,
	"body" text NOT NULL,
	"status" "sms_status" DEFAULT 'queued' NOT NULL,
	"quo_phone_number_id" text,
	"participant_number" varchar(20),
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sms_messages_quo_message_id_unique" UNIQUE("quo_message_id")
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"contact_id" integer,
	"assigned_to" integer NOT NULL,
	"created_by" integer NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"due_date" timestamp,
	"completed_at" timestamp,
	"priority" "task_priority" DEFAULT 'Normal' NOT NULL,
	"task_type" "task_type" DEFAULT 'Other' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"email" varchar(255),
	"phone" varchar(50),
	"photo_url" text,
	"bio" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "testimonials" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_name" text NOT NULL,
	"client_title" text,
	"body" text NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"name" varchar(255) NOT NULL,
	"role" "user_role" DEFAULT 'agent' NOT NULL,
	"phone" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_agent_id_users_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_logs" ADD CONSTRAINT "call_logs_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_logs" ADD CONSTRAINT "call_logs_agent_id_users_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_assigned_agent_id_users_id_fk" FOREIGN KEY ("assigned_agent_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_queue" ADD CONSTRAINT "email_queue_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_queue" ADD CONSTRAINT "email_queue_template_id_email_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."email_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "newsletter_subscribers" ADD CONSTRAINT "newsletter_subscribers_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_entries" ADD CONSTRAINT "pipeline_entries_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_entries" ADD CONSTRAINT "pipeline_entries_moved_by_users_id_fk" FOREIGN KEY ("moved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policies" ADD CONSTRAINT "policies_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quo_phone_numbers" ADD CONSTRAINT "quo_phone_numbers_assigned_user_id_users_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sms_messages" ADD CONSTRAINT "sms_messages_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sms_messages" ADD CONSTRAINT "sms_messages_agent_id_users_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;