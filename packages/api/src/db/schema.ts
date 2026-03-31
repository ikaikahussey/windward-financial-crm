import {
  pgTable,
  serial,
  text,
  varchar,
  integer,
  decimal,
  boolean,
  timestamp,
  json,
  pgEnum,
} from 'drizzle-orm/pg-core';

// ── Enums ──

export const userRoleEnum = pgEnum('user_role', ['admin', 'agent', 'viewer']);

export const islandEnum = pgEnum('island', [
  'Oahu', 'Maui', 'Big Island', 'Kauai', 'Molokai', 'Lanai',
]);

export const employmentTypeEnum = pgEnum('employment_type', [
  'DOE Teacher', 'DOE Staff', 'State Employee', 'City & County', 'Other',
]);

export const ersPlanTypeEnum = pgEnum('ers_plan_type', [
  'Contributory I', 'Contributory II', 'Noncontributory', 'Hybrid', 'Unknown',
]);

export const lifeInsuranceStatusEnum = pgEnum('life_insurance_status', [
  'None', 'Employer Only', 'Personal', 'Both',
]);

export const leadSourceEnum = pgEnum('lead_source', [
  'Webinar', 'Calculator', 'Referral', 'School Visit', 'Website', 'Social Media', 'Enrollment', 'Other',
]);

export const pipelineStageEnum = pgEnum('pipeline_stage', [
  'New Lead',
  'Contacted',
  'Consultation Scheduled',
  'Consultation Completed',
  'Proposal Sent',
  'Application Submitted',
  'Policy Issued',
  'Active Client',
  'Lost / Not Now',
]);

export const productTypeEnum = pgEnum('product_type', [
  'Term Life', 'Guaranteed Universal Life', 'Indexed Universal Life',
  'Fixed Annuity', 'Fixed Indexed Annuity', '403b SPDA', '403b FPDA',
]);

export const policyStatusEnum = pgEnum('policy_status', [
  'Applied', 'Issued', 'Active', 'Lapsed', 'Cancelled',
]);

export const taskPriorityEnum = pgEnum('task_priority', [
  'Low', 'Normal', 'High', 'Urgent',
]);

export const taskTypeEnum = pgEnum('task_type', [
  'Call', 'Email', 'Follow Up', 'Review', 'Meeting', 'Other',
]);

export const activityTypeEnum = pgEnum('activity_type', [
  'Note', 'Call', 'Email Sent', 'Email Opened', 'Meeting',
  'Stage Change', 'Task Completed', 'Policy Added',
  'SMS Sent', 'SMS Received', 'Call Inbound', 'Call Outbound', 'Voicemail',
]);

export const emailQueueStatusEnum = pgEnum('email_queue_status', [
  'Pending', 'Sent', 'Failed', 'Cancelled',
]);

export const appointmentStatusEnum = pgEnum('appointment_status', [
  'Scheduled', 'Completed', 'Cancelled', 'No Show',
]);

export const callDirectionEnum = pgEnum('call_direction', ['inbound', 'outbound']);
export const callStatusEnum = pgEnum('call_status', ['completed', 'missed', 'voicemail', 'cancelled']);
export const smsDirectionEnum = pgEnum('sms_direction', ['inbound', 'outbound']);
export const smsStatusEnum = pgEnum('sms_status', ['queued', 'sent', 'delivered', 'failed', 'received']);

// ── Tables ──

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  role: userRoleEnum('role').notNull().default('agent'),
  phone: varchar('phone', { length: 50 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const contacts = pgTable('contacts', {
  id: serial('id').primaryKey(),
  firstName: varchar('first_name', { length: 255 }).notNull(),
  lastName: varchar('last_name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  address: text('address'),
  city: varchar('city', { length: 255 }),
  island: islandEnum('island'),
  zip: varchar('zip', { length: 20 }),
  employmentType: employmentTypeEnum('employment_type'),
  employerSchool: text('employer_school'),
  yearsOfService: integer('years_of_service'),
  annualSalary: decimal('annual_salary', { precision: 12, scale: 2 }),
  ersPlanType: ersPlanTypeEnum('ers_plan_type'),
  current403bBalance: decimal('current_403b_balance', { precision: 12, scale: 2 }),
  lifeInsuranceStatus: lifeInsuranceStatusEnum('life_insurance_status'),
  leadSource: leadSourceEnum('lead_source'),
  referralSource: text('referral_source'),
  assignedAgentId: integer('assigned_agent_id').references(() => users.id),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  lastContactedAt: timestamp('last_contacted_at'),
});

export const pipelineEntries = pgTable('pipeline_entries', {
  id: serial('id').primaryKey(),
  contactId: integer('contact_id').references(() => contacts.id).notNull(),
  pipelineStage: pipelineStageEnum('pipeline_stage').notNull(),
  movedAt: timestamp('moved_at').defaultNow().notNull(),
  movedBy: integer('moved_by').references(() => users.id),
});

export const policies = pgTable('policies', {
  id: serial('id').primaryKey(),
  contactId: integer('contact_id').references(() => contacts.id).notNull(),
  productType: productTypeEnum('product_type').notNull(),
  carrier: text('carrier'),
  policyNumber: text('policy_number'),
  annualPremium: decimal('annual_premium', { precision: 12, scale: 2 }),
  status: policyStatusEnum('status').notNull().default('Applied'),
  issueDate: timestamp('issue_date'),
  expiryDate: timestamp('expiry_date'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const tasks = pgTable('tasks', {
  id: serial('id').primaryKey(),
  contactId: integer('contact_id').references(() => contacts.id),
  assignedTo: integer('assigned_to').references(() => users.id).notNull(),
  createdBy: integer('created_by').references(() => users.id).notNull(),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  dueDate: timestamp('due_date'),
  completedAt: timestamp('completed_at'),
  priority: taskPriorityEnum('priority').notNull().default('Normal'),
  taskType: taskTypeEnum('task_type').notNull().default('Other'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const activities = pgTable('activities', {
  id: serial('id').primaryKey(),
  contactId: integer('contact_id').references(() => contacts.id).notNull(),
  userId: integer('user_id').references(() => users.id),
  activityType: activityTypeEnum('activity_type').notNull(),
  subject: text('subject'),
  body: text('body'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const emailTemplates = pgTable('email_templates', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  subject: varchar('subject', { length: 500 }).notNull(),
  body: text('body').notNull(),
  sequencePosition: integer('sequence_position'),
  delayDays: integer('delay_days'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const emailQueue = pgTable('email_queue', {
  id: serial('id').primaryKey(),
  contactId: integer('contact_id').references(() => contacts.id).notNull(),
  templateId: integer('template_id').references(() => emailTemplates.id).notNull(),
  scheduledFor: timestamp('scheduled_for').notNull(),
  sentAt: timestamp('sent_at'),
  status: emailQueueStatusEnum('status').notNull().default('Pending'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const appointments = pgTable('appointments', {
  id: serial('id').primaryKey(),
  contactId: integer('contact_id').references(() => contacts.id).notNull(),
  agentId: integer('agent_id').references(() => users.id).notNull(),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time').notNull(),
  location: text('location'),
  status: appointmentStatusEnum('status').notNull().default('Scheduled'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const quoPhoneNumbers = pgTable('quo_phone_numbers', {
  id: serial('id').primaryKey(),
  quoPhoneNumberId: text('quo_phone_number_id').notNull().unique(),
  phoneNumber: varchar('phone_number', { length: 20 }).notNull(),
  label: text('label'),
  assignedUserId: integer('assigned_user_id').references(() => users.id),
  syncedAt: timestamp('synced_at').defaultNow().notNull(),
});

export const callLogs = pgTable('call_logs', {
  id: serial('id').primaryKey(),
  quoCallId: text('quo_call_id').unique(),
  contactId: integer('contact_id').references(() => contacts.id),
  agentId: integer('agent_id').references(() => users.id),
  direction: callDirectionEnum('direction').notNull(),
  status: callStatusEnum('status').notNull(),
  durationSeconds: integer('duration_seconds'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  recordingUrl: text('recording_url'),
  transcription: text('transcription'),
  aiSummary: text('ai_summary'),
  quoPhoneNumberId: text('quo_phone_number_id'),
  participantNumber: varchar('participant_number', { length: 20 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const smsMessages = pgTable('sms_messages', {
  id: serial('id').primaryKey(),
  quoMessageId: text('quo_message_id').unique(),
  contactId: integer('contact_id').references(() => contacts.id),
  agentId: integer('agent_id').references(() => users.id),
  direction: smsDirectionEnum('direction').notNull(),
  body: text('body').notNull(),
  status: smsStatusEnum('status').notNull().default('queued'),
  quoPhoneNumberId: text('quo_phone_number_id'),
  participantNumber: varchar('participant_number', { length: 20 }),
  sentAt: timestamp('sent_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ── CMS Tables ──

export const sitePages = pgTable('site_pages', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  metaDescription: text('meta_description'),
  heroImageUrl: text('hero_image_url'),
  content: json('content').$type<ContentBlock[]>(),
  isPublished: boolean('is_published').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const testimonials = pgTable('testimonials', {
  id: serial('id').primaryKey(),
  clientName: text('client_name').notNull(),
  clientTitle: text('client_title'),
  body: text('body').notNull(),
  isFeatured: boolean('is_featured').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  isPublished: boolean('is_published').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const teamMembers = pgTable('team_members', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  role: text('role').notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  photoUrl: text('photo_url'),
  bio: text('bio'),
  sortOrder: integer('sort_order').notNull().default(0),
  isPublished: boolean('is_published').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  eventDate: timestamp('event_date').notNull(),
  endDate: timestamp('end_date'),
  location: text('location'),
  zoomLink: text('zoom_link'),
  registrationRequired: boolean('registration_required').notNull().default(true),
  maxAttendees: integer('max_attendees'),
  isPublished: boolean('is_published').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const eventRegistrations = pgTable('event_registrations', {
  id: serial('id').primaryKey(),
  eventId: integer('event_id').references(() => events.id).notNull(),
  contactId: integer('contact_id').references(() => contacts.id),
  firstName: varchar('first_name', { length: 255 }).notNull(),
  lastName: varchar('last_name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }),
  employmentType: employmentTypeEnum('employment_type'),
  employerSchool: text('employer_school'),
  registeredAt: timestamp('registered_at').defaultNow().notNull(),
  attended: boolean('attended'),
});

export const blogPosts = pgTable('blog_posts', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  excerpt: text('excerpt'),
  body: text('body').notNull(),
  authorId: integer('author_id').references(() => users.id),
  featuredImageUrl: text('featured_image_url'),
  metaDescription: text('meta_description'),
  tags: text('tags').array(),
  isPublished: boolean('is_published').notNull().default(false),
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const newsletterSubscribers = pgTable('newsletter_subscribers', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  firstName: varchar('first_name', { length: 255 }),
  subscribedAt: timestamp('subscribed_at').defaultNow().notNull(),
  unsubscribedAt: timestamp('unsubscribed_at'),
  source: text('source'),
  contactId: integer('contact_id').references(() => contacts.id),
});

// ── Types ──

export interface ContentBlock {
  type: 'text' | 'heading' | 'image' | 'cta' | 'testimonial' | 'team_member' | 'product_card' | 'faq';
  data: Record<string, unknown>;
}
