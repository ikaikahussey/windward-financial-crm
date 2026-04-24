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
  | 'new_lead'
  | 'contacted'
  | 'discovery_scheduled'
  | 'discovery_completed'
  | 'proposal_sent'
  | 'follow_up'
  | 'closed_won'
  | 'closed_lost'
  | 'nurture';

export type EmploymentType =
  | 'w2'
  | 'self_employed'
  | 'business_owner'
  | 'retired'
  | 'other';

export type Island =
  | 'oahu'
  | 'maui'
  | 'big_island'
  | 'kauai'
  | 'molokai'
  | 'lanai'
  | 'out_of_state';

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

export interface Event {
  id: number;
  title: string;
  description: string;
  eventDate: string;
  endDate?: string;
  location?: string;
  zoomLink?: string;
  registrationRequired: boolean;
  maxAttendees?: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EventRegistration {
  id: number;
  eventId: number;
  contactId?: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  employmentType?: string;
  employerSchool?: string;
  registeredAt: string;
  attended?: boolean;
}

export interface DashboardStats {
  total_contacts: number;
  by_stage: Record<PipelineStage, number>;
  tasks_due_today: number;
  overdue_tasks: number;
  appointments_this_week: number;
}
