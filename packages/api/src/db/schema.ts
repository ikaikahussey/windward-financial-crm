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
  jsonb,
  pgEnum,
  index,
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
  leadScore: integer('lead_score'),
  leadScoreUpdatedAt: timestamp('lead_score_updated_at'),
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
  campaignId: integer('campaign_id'),
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

// ── Events ──

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

export const newsletterSubscribers = pgTable('newsletter_subscribers', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  firstName: varchar('first_name', { length: 255 }),
  subscribedAt: timestamp('subscribed_at').defaultNow().notNull(),
  unsubscribedAt: timestamp('unsubscribed_at'),
  source: text('source'),
  contactId: integer('contact_id').references(() => contacts.id),
});

// ── Marketing Module Enums ──

export const productionStatusEnum = pgEnum('production_status', ['Dormant', 'Low Prod']);
export const campaignTypeEnum = pgEnum('campaign_type', ['email', 'webinar', 'pdf']);
export const campaignStatusEnum = pgEnum('campaign_status', ['draft', 'active', 'paused', 'completed']);
export const campaignStepTypeEnum = pgEnum('campaign_step_type', ['email', 'sms']);
export const enrollmentStatusEnum = pgEnum('enrollment_status', ['pending', 'active', 'completed', 'unsubscribed']);
export const campaignEventTypeEnum = pgEnum('campaign_event_type', ['sent', 'opened', 'clicked', 'replied', 'bounced']);
export const documentStatusEnum = pgEnum('document_status', ['sent', 'viewed', 'signed', 'expired']);
export const adPlatformEnum = pgEnum('ad_platform', ['google', 'meta', 'linkedin']);
export const adCampaignStatusEnum = pgEnum('ad_campaign_status', ['draft', 'active', 'paused', 'completed']);

// ── Marketing Module Tables ──

export const districts = pgTable('districts', {
  id: serial('id').primaryKey(),
  employerName: varchar('employer_name', { length: 500 }).notNull(),
  city: varchar('city', { length: 255 }),
  county: varchar('county', { length: 255 }),
  state: varchar('state', { length: 2 }),
  groupType: varchar('group_type', { length: 255 }),
  classificationSource: text('classification_source'),
  productionStatus: productionStatusEnum('production_status'),
  planAdminName: varchar('plan_admin_name', { length: 500 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const districtContacts = pgTable('district_contacts', {
  id: serial('id').primaryKey(),
  districtId: integer('district_id').references(() => districts.id).notNull(),
  firstName: varchar('first_name', { length: 255 }),
  lastName: varchar('last_name', { length: 255 }),
  title: varchar('title', { length: 255 }),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  linkedinUrl: text('linkedin_url'),
  foundVia: text('found_via'),
  verifiedAt: timestamp('verified_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const campaigns = pgTable('campaigns', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 500 }).notNull(),
  type: campaignTypeEnum('type').notNull().default('email'),
  status: campaignStatusEnum('status').notNull().default('draft'),
  subject: varchar('subject', { length: 500 }),
  fromName: varchar('from_name', { length: 255 }),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const campaignSteps = pgTable('campaign_steps', {
  id: serial('id').primaryKey(),
  campaignId: integer('campaign_id').references(() => campaigns.id).notNull(),
  stepNumber: integer('step_number').notNull(),
  delayDays: integer('delay_days').notNull().default(0),
  subject: varchar('subject', { length: 500 }).notNull(),
  body: text('body').notNull(),
  type: campaignStepTypeEnum('type').notNull().default('email'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const campaignEnrollments = pgTable('campaign_enrollments', {
  id: serial('id').primaryKey(),
  campaignId: integer('campaign_id').references(() => campaigns.id).notNull(),
  districtId: integer('district_id').references(() => districts.id).notNull(),
  districtContactId: integer('district_contact_id').references(() => districtContacts.id),
  status: enrollmentStatusEnum('status').notNull().default('pending'),
  currentStep: integer('current_step').notNull().default(0),
  enrolledAt: timestamp('enrolled_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
  lastStepSentAt: timestamp('last_step_sent_at'),
});

export const campaignEvents = pgTable('campaign_events', {
  id: serial('id').primaryKey(),
  enrollmentId: integer('enrollment_id').references(() => campaignEnrollments.id).notNull(),
  stepNumber: integer('step_number').notNull(),
  eventType: campaignEventTypeEnum('event_type').notNull(),
  occurredAt: timestamp('occurred_at').defaultNow().notNull(),
  metadata: json('metadata'),
});

export const webinarRegistrations = pgTable('webinar_registrations', {
  id: serial('id').primaryKey(),
  districtContactId: integer('district_contact_id').references(() => districtContacts.id),
  contactId: integer('contact_id').references(() => contacts.id),
  firstName: varchar('first_name', { length: 255 }).notNull(),
  lastName: varchar('last_name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }),
  districtName: varchar('district_name', { length: 500 }),
  webinarDate: timestamp('webinar_date'),
  webinarTopic: varchar('webinar_topic', { length: 500 }),
  registeredAt: timestamp('registered_at').defaultNow().notNull(),
  attended: boolean('attended'),
});

export const documentRequests = pgTable('document_requests', {
  id: serial('id').primaryKey(),
  districtId: integer('district_id').references(() => districts.id),
  districtContactId: integer('district_contact_id').references(() => districtContacts.id),
  contactId: integer('contact_id').references(() => contacts.id),
  documentType: varchar('document_type', { length: 255 }).notNull(),
  status: documentStatusEnum('status').notNull().default('sent'),
  sentAt: timestamp('sent_at').defaultNow().notNull(),
  viewedAt: timestamp('viewed_at'),
  signedAt: timestamp('signed_at'),
  documentUrl: text('document_url'),
});

export const geoAdCampaigns = pgTable('geo_ad_campaigns', {
  id: serial('id').primaryKey(),
  districtId: integer('district_id').references(() => districts.id),
  campaignId: integer('campaign_id').references(() => campaigns.id),
  platform: adPlatformEnum('platform').notNull(),
  status: adCampaignStatusEnum('status').notNull().default('draft'),
  geoTarget: text('geo_target'),
  budgetDaily: decimal('budget_daily', { precision: 10, scale: 2 }),
  impressions: integer('impressions').notNull().default(0),
  clicks: integer('clicks').notNull().default(0),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ── CRM Spreadsheets ──

export const referralProgramEnum = pgEnum('referral_program', ['DOE', 'CHAMP']);

export const clientRoster = pgTable('client_roster', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  policyNumbers: text('policy_numbers'),
  notes: text('notes'),
  contactId: integer('contact_id').references(() => contacts.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const referrals = pgTable('referrals', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 255 }),
  source: referralProgramEnum('source').notNull(),
  referralDate: timestamp('referral_date'),
  servicingAgentId: integer('servicing_agent_id').references(() => users.id),
  notes: text('notes'),
  contactId: integer('contact_id').references(() => contacts.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  payeeName: varchar('payee_name', { length: 255 }).notNull(),
  paymentDate: timestamp('payment_date').notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  account: varchar('account', { length: 100 }).notNull().default('Checking'),
  notes: text('notes'),
  contactId: integer('contact_id').references(() => contacts.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ── TPA (Third-Party Administrator) Module ──

export const tpaPlanTypeEnum = pgEnum('tpa_plan_type', ['403(b)', '457(b)', 'Other']);

export const tpaParticipantStatusEnum = pgEnum('tpa_participant_status', [
  'Active', 'Suspended', 'Terminated', 'Retired', 'Deceased',
]);

export const tpaSraStatusEnum = pgEnum('tpa_sra_status', [
  'Pending', 'Active', 'Suspended', 'Terminated',
]);

export const tpaContributionTypeEnum = pgEnum('tpa_contribution_type', [
  'Employee Pre-Tax', 'Employee Roth', 'Employer Match', 'Employer Non-Elective',
]);

export const tpaBatchStatusEnum = pgEnum('tpa_batch_status', [
  'Open', 'Posted', 'Reconciled',
]);

export const tpaTransactionTypeEnum = pgEnum('tpa_transaction_type', [
  'Loan', 'Hardship Withdrawal', 'Distribution', 'Contract Exchange',
  'Rollover In', 'Rollover Out', 'QDRO', 'Other',
]);

export const tpaTransactionStatusEnum = pgEnum('tpa_transaction_status', [
  'Submitted', 'In Review', 'Approved', 'Denied', 'Completed', 'Cancelled',
]);

export const tpaPlans = pgTable('tpa_plans', {
  id: serial('id').primaryKey(),
  employerName: varchar('employer_name', { length: 500 }).notNull(),
  planName: varchar('plan_name', { length: 500 }).notNull(),
  planType: tpaPlanTypeEnum('plan_type').notNull().default('403(b)'),
  planNumber: varchar('plan_number', { length: 100 }),
  effectiveDate: timestamp('effective_date'),
  payPeriodsPerYear: integer('pay_periods_per_year').notNull().default(24),
  planDocumentUrl: text('plan_document_url'),
  isActive: boolean('is_active').notNull().default(true),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const tpaVendors = pgTable('tpa_vendors', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 500 }).notNull(),
  contactEmail: varchar('contact_email', { length: 255 }),
  contactPhone: varchar('contact_phone', { length: 50 }),
  website: text('website'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Which vendors are approved to receive contributions under which plan.
export const tpaPlanVendors = pgTable('tpa_plan_vendors', {
  id: serial('id').primaryKey(),
  planId: integer('plan_id').references(() => tpaPlans.id).notNull(),
  vendorId: integer('vendor_id').references(() => tpaVendors.id).notNull(),
  approvedAt: timestamp('approved_at').defaultNow().notNull(),
});

export const tpaParticipants = pgTable('tpa_participants', {
  id: serial('id').primaryKey(),
  planId: integer('plan_id').references(() => tpaPlans.id).notNull(),
  contactId: integer('contact_id').references(() => contacts.id),
  firstName: varchar('first_name', { length: 255 }).notNull(),
  lastName: varchar('last_name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  employeeId: varchar('employee_id', { length: 100 }),
  birthDate: timestamp('birth_date'),
  hireDate: timestamp('hire_date'),
  status: tpaParticipantStatusEnum('status').notNull().default('Active'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Salary reduction agreements: how much comes out of each paycheck, to whom.
export const tpaSras = pgTable('tpa_sras', {
  id: serial('id').primaryKey(),
  participantId: integer('participant_id').references(() => tpaParticipants.id).notNull(),
  vendorId: integer('vendor_id').references(() => tpaVendors.id).notNull(),
  contributionType: tpaContributionTypeEnum('contribution_type').notNull().default('Employee Pre-Tax'),
  perPayAmount: decimal('per_pay_amount', { precision: 12, scale: 2 }).notNull(),
  effectiveDate: timestamp('effective_date'),
  signedDate: timestamp('signed_date'),
  status: tpaSraStatusEnum('status').notNull().default('Pending'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// A payroll remittance: one batch per plan per pay date, with line items.
export const tpaRemittanceBatches = pgTable('tpa_remittance_batches', {
  id: serial('id').primaryKey(),
  planId: integer('plan_id').references(() => tpaPlans.id).notNull(),
  payDate: timestamp('pay_date').notNull(),
  status: tpaBatchStatusEnum('status').notNull().default('Open'),
  notes: text('notes'),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const tpaContributions = pgTable(
  'tpa_contributions',
  {
    id: serial('id').primaryKey(),
    batchId: integer('batch_id').references(() => tpaRemittanceBatches.id).notNull(),
    participantId: integer('participant_id').references(() => tpaParticipants.id).notNull(),
    vendorId: integer('vendor_id').references(() => tpaVendors.id).notNull(),
    contributionType: tpaContributionTypeEnum('contribution_type').notNull().default('Employee Pre-Tax'),
    amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    batchIdx: index('tpa_contributions_batch_idx').on(t.batchId),
    participantIdx: index('tpa_contributions_participant_idx').on(t.participantId),
  }),
);

// Participant transaction requests that a TPA reviews and approves/denies.
export const tpaTransactions = pgTable('tpa_transactions', {
  id: serial('id').primaryKey(),
  participantId: integer('participant_id').references(() => tpaParticipants.id).notNull(),
  vendorId: integer('vendor_id').references(() => tpaVendors.id),
  txnType: tpaTransactionTypeEnum('txn_type').notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }),
  status: tpaTransactionStatusEnum('status').notNull().default('Submitted'),
  requestedAt: timestamp('requested_at').defaultNow().notNull(),
  decidedAt: timestamp('decided_at'),
  decidedBy: integer('decided_by').references(() => users.id),
  decisionNotes: text('decision_notes'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ── Operations / observability tables ──

export const jobRuns = pgTable(
  'job_runs',
  {
    id: serial('id').primaryKey(),
    jobName: varchar('job_name', { length: 64 }).notNull(),
    startedAt: timestamp('started_at').defaultNow().notNull(),
    finishedAt: timestamp('finished_at'),
    status: varchar('status', { length: 16 }).notNull(),
    itemsProcessed: integer('items_processed').notNull().default(0),
    itemsFailed: integer('items_failed').notNull().default(0),
    error: text('error'),
    log: text('log'),
    triggeredBy: varchar('triggered_by', { length: 16 }).notNull(),
    triggeredByUserId: integer('triggered_by_user_id').references(() => users.id),
  },
  (t) => ({
    jobNameStartedIdx: index('job_runs_job_name_started_idx').on(t.jobName, t.startedAt.desc()),
    startedIdx: index('job_runs_started_idx').on(t.startedAt.desc()),
  }),
);

export const webhookEvents = pgTable(
  'webhook_events',
  {
    id: serial('id').primaryKey(),
    source: varchar('source', { length: 32 }).notNull(),
    eventType: varchar('event_type', { length: 64 }).notNull(),
    payload: jsonb('payload').notNull(),
    matchedContactId: integer('matched_contact_id').references(() => contacts.id),
    status: varchar('status', { length: 16 }).notNull(),
    error: text('error'),
    processingMs: integer('processing_ms'),
    receivedAt: timestamp('received_at').defaultNow().notNull(),
  },
  (t) => ({
    receivedIdx: index('webhook_events_received_idx').on(t.receivedAt.desc()),
    eventTypeReceivedIdx: index('webhook_events_event_type_received_idx').on(
      t.eventType,
      t.receivedAt.desc(),
    ),
  }),
);

export const leadScoreHistory = pgTable(
  'lead_score_history',
  {
    id: serial('id').primaryKey(),
    contactId: integer('contact_id').references(() => contacts.id).notNull(),
    score: integer('score').notNull(),
    previousScore: integer('previous_score'),
    factors: jsonb('factors').notNull(),
    runId: integer('run_id').references(() => jobRuns.id),
    scoredAt: timestamp('scored_at').defaultNow().notNull(),
  },
  (t) => ({
    contactScoredIdx: index('lead_score_history_contact_scored_idx').on(
      t.contactId,
      t.scoredAt.desc(),
    ),
  }),
);

