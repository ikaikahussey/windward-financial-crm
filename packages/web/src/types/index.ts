export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'agent' | 'viewer';
  phone?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type PipelineStage =
  | 'New Lead'
  | 'Contacted'
  | 'Consultation Scheduled'
  | 'Consultation Completed'
  | 'Proposal Sent'
  | 'Application Submitted'
  | 'Policy Issued'
  | 'Active Client'
  | 'Lost / Not Now';

export type EmploymentType =
  | 'DOE Teacher'
  | 'DOE Staff'
  | 'State Employee'
  | 'City & County'
  | 'Other';

export type Island =
  | 'Oahu'
  | 'Maui'
  | 'Big Island'
  | 'Kauai'
  | 'Molokai'
  | 'Lanai';

export type LeadSource =
  | 'Webinar'
  | 'Calculator'
  | 'Referral'
  | 'School Visit'
  | 'Website'
  | 'Social Media'
  | 'Enrollment'
  | 'Other';

export interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  phone_secondary?: string;
  date_of_birth?: string;
  employment_type?: EmploymentType;
  employer?: string;
  occupation?: string;
  annual_income?: number;
  island?: Island;
  city?: string;
  address?: string;
  zip_code?: string;
  pipeline_stage: PipelineStage;
  lead_source?: string;
  lead_source_detail?: string;
  assigned_agent_id?: string;
  assigned_agent?: User;
  notes?: string;
  tags?: string[];
  stage_changed_at?: string;
  last_contacted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface PipelineEntry {
  contact_id: string;
  contact: Contact;
  stage: PipelineStage;
  days_in_stage: number;
  entered_stage_at: string;
}

export interface Policy {
  id: string;
  contact_id: string;
  carrier: string;
  policy_number?: string;
  type: string;
  status: 'active' | 'pending' | 'lapsed' | 'cancelled';
  premium_monthly?: number;
  premium_annual?: number;
  face_amount?: number;
  effective_date?: string;
  expiration_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  type: 'follow_up' | 'call' | 'email' | 'meeting' | 'review' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'completed' | 'cancelled';
  due_date?: string;
  completed_at?: string;
  contact_id?: string;
  contact?: Contact;
  campaign_id?: string;
  campaign?: { id: string | number; name: string };
  assigned_to_id: string;
  assigned_to?: User;
  created_by_id: string;
  created_at: string;
  updated_at: string;
}

export interface Activity {
  id: string;
  contact_id: string;
  user_id?: string;
  user?: User;
  type: 'note' | 'email' | 'call' | 'sms' | 'stage_change' | 'task' | 'appointment' | 'policy' | 'system';
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  sequence_id?: string;
  sequence_order?: number;
  delay_days?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmailSequence {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  templates?: EmailTemplate[];
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  contact_id: string;
  contact?: Contact;
  agent_id: string;
  agent?: User;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  location?: string;
  meeting_link?: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CallLog {
  id: string;
  contact_id: string;
  contact?: Contact;
  agent_id?: string;
  agent?: User;
  direction: 'inbound' | 'outbound';
  duration_seconds?: number;
  recording_url?: string;
  transcript?: string;
  ai_summary?: string;
  quo_call_id?: string;
  phone_number?: string;
  status: 'completed' | 'missed' | 'voicemail' | 'busy';
  created_at: string;
}

export interface SmsMessage {
  id: string;
  contact_id: string;
  contact?: Contact;
  agent_id?: string;
  agent?: User;
  direction: 'inbound' | 'outbound';
  body: string;
  phone_number?: string;
  status: 'sent' | 'delivered' | 'failed' | 'received';
  quo_message_id?: string;
  created_at: string;
}

export interface SitePage {
  id: string;
  slug: string;
  title: string;
  content: string;
  meta_title?: string;
  meta_description?: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface Testimonial {
  id: string;
  author_name: string;
  author_title?: string;
  body: string;
  rating?: number;
  is_featured: boolean;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  name: string;
  title: string;
  bio?: string;
  photo_url?: string;
  email?: string;
  phone?: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  location?: string;
  start_date: string;
  end_date?: string;
  is_published: boolean;
  max_attendees?: number;
  registration_count?: number;
  created_at: string;
  updated_at: string;
}

export interface EventRegistration {
  id: string;
  event_id: string;
  name: string;
  email: string;
  phone?: string;
  created_at: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  body: string;
  author_id?: string;
  author?: User;
  tags?: string[];
  featured_image_url?: string;
  is_published: boolean;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Subscriber {
  id: string;
  email: string;
  name?: string;
  source?: string;
  is_active: boolean;
  subscribed_at: string;
  unsubscribed_at?: string;
}

export interface ClientRosterRow {
  id: number;
  name: string;
  policy_numbers?: string | null;
  notes?: string | null;
  contact_id?: number | null;
  created_at: string;
  updated_at: string;
}

export interface Referral {
  id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  source: 'DOE' | 'CHAMP';
  referral_date?: string | null;
  servicing_agent_id?: number | null;
  servicing_agent_name?: string | null;
  notes?: string | null;
  contact_id?: number | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: number;
  payee_name: string;
  payment_date: string;
  amount: string;
  account: string;
  notes?: string | null;
  contact_id?: number | null;
  created_at: string;
  updated_at: string;
}

// ── TPA module ──

export type TpaPlanType = '403(b)' | '457(b)' | 'Other';
export type TpaParticipantStatus = 'Active' | 'Suspended' | 'Terminated' | 'Retired' | 'Deceased';
export type TpaSraStatus = 'Pending' | 'Active' | 'Suspended' | 'Terminated';
export type TpaContributionType =
  | 'Employee Pre-Tax'
  | 'Employee Roth'
  | 'Employer Match'
  | 'Employer Non-Elective';
export type TpaBatchStatus = 'Open' | 'Posted' | 'Reconciled';
export type TpaTransactionType =
  | 'Loan'
  | 'Hardship Withdrawal'
  | 'Distribution'
  | 'Contract Exchange'
  | 'Rollover In'
  | 'Rollover Out'
  | 'QDRO'
  | 'Other';
export type TpaTransactionStatus =
  | 'Submitted'
  | 'In Review'
  | 'Approved'
  | 'Denied'
  | 'Completed'
  | 'Cancelled';

export interface TpaVendor {
  id: number;
  name: string;
  contact_email?: string | null;
  contact_phone?: string | null;
  website?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface TpaPlan {
  id: number;
  employer_name: string;
  plan_name: string;
  plan_type: TpaPlanType;
  plan_number?: string | null;
  effective_date?: string | null;
  pay_periods_per_year: number;
  plan_document_url?: string | null;
  is_active: boolean;
  notes?: string | null;
  participant_count?: number;
  vendors?: { id: number; name: string }[];
  created_at: string;
  updated_at: string;
}

export interface TpaSra {
  id: number;
  participant_id: number;
  vendor_id: number;
  vendor_name?: string | null;
  contribution_type: TpaContributionType;
  per_pay_amount: string;
  effective_date?: string | null;
  signed_date?: string | null;
  status: TpaSraStatus;
  notes?: string | null;
}

export interface TpaParticipant {
  id: number;
  plan_id: number;
  plan_name?: string | null;
  employer_name?: string | null;
  contact_id?: number | null;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  employee_id?: string | null;
  birth_date?: string | null;
  hire_date?: string | null;
  status: TpaParticipantStatus;
  notes?: string | null;
  sras?: TpaSra[];
  created_at: string;
  updated_at: string;
}

export interface TpaBatch {
  id: number;
  plan_id: number;
  plan_name?: string | null;
  employer_name?: string | null;
  pay_date: string;
  status: TpaBatchStatus;
  notes?: string | null;
  total?: string;
  line_count?: number;
  created_at: string;
}

export interface TpaContribution {
  id: number;
  batch_id: number;
  participant_id: number;
  participant_first_name?: string | null;
  participant_last_name?: string | null;
  vendor_id: number;
  vendor_name?: string | null;
  contribution_type: TpaContributionType;
  amount: string;
}

export interface TpaBatchDetail extends TpaBatch {
  lines: TpaContribution[];
}

export interface TpaTransaction {
  id: number;
  participant_id: number;
  participant_first_name?: string | null;
  participant_last_name?: string | null;
  vendor_id?: number | null;
  vendor_name?: string | null;
  txn_type: TpaTransactionType;
  amount?: string | null;
  status: TpaTransactionStatus;
  requested_at: string;
  decided_at?: string | null;
  decided_by_name?: string | null;
  decision_notes?: string | null;
  notes?: string | null;
}

export interface TpaComplianceRow {
  participant_id: number;
  first_name: string;
  last_name: string;
  status: TpaParticipantStatus;
  employer_name: string;
  plan_name: string;
  catch_up_eligible: boolean;
  employee_deferrals: string;
  total_contributions: string;
  deferral_limit: number;
  remaining: string;
  over_limit: boolean;
}

export interface TpaComplianceReport {
  year: number;
  limits: { deferral: number; catch_up: number; total: number };
  participants: TpaComplianceRow[];
}

export interface DashboardStats {
  total_contacts: number;
  by_stage: Record<PipelineStage, number>;
  tasks_due_today: number;
  overdue_tasks: number;
  appointments_this_week: number;
}
