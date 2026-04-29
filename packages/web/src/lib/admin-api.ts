import { api } from './api';

// Thin typed wrapper around the existing api client for /api/admin/* endpoints.
// Keeps response types in one place so pages don't have to redefine them.

// ── Quo ──

export interface QuoHealth {
  api_key_configured: boolean;
  last_sync_at: string | null;
  last_sync_status: string | null;
  next_sync_at: string | null;
  registered_webhooks: { event: string; registered: boolean }[];
  counts: {
    last24h: { received: number; processed: number; error: number; unmatched: number };
  };
}

export interface WebhookEventRow {
  id: number;
  source: string;
  event_type: string;
  status: string;
  error: string | null;
  processing_ms: number | null;
  received_at: string;
  payload: unknown;
  matched_contact: { id: number; name: string } | null;
}

export interface JobRunRow {
  id: number;
  job_name: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  items_processed: number;
  items_failed: number;
  error: string | null;
  log: string | null;
  triggered_by: string;
  triggered_by_user_id: number | null;
}

export const adminApi = {
  // Quo
  quoHealth: () => api.get<QuoHealth>('/api/admin/quo/health'),
  quoWebhookEvents: (params: URLSearchParams) =>
    api.get<{ events: WebhookEventRow[]; page: number; limit: number }>(
      `/api/admin/quo/webhook-events?${params}`,
    ),
  quoSyncHistory: (limit = 20) =>
    api.get<{ runs: JobRunRow[] }>(`/api/admin/quo/sync-history?limit=${limit}`),
  quoSyncNow: () =>
    api.post<{ started: boolean; previous_run_id: number | null }>(
      '/api/admin/quo/sync-now',
    ),

  // Leads
  leadsSummary: () =>
    api.get<{
      total: number;
      hot: number;
      average_score: number;
      auto_booked_today: number;
    }>('/api/admin/leads/scoring/summary'),
  leadsDistribution: () =>
    api.get<{ buckets: { range: string; count: number }[] }>(
      '/api/admin/leads/scoring/distribution',
    ),
  leadsList: (params: URLSearchParams) =>
    api.get<{
      leads: {
        id: number;
        first_name: string;
        last_name: string;
        email: string | null;
        lead_source: string | null;
        employment_type: string | null;
        pipeline_stage: string | null;
        score: number | null;
        previous_score: number | null;
        scored_at: string | null;
        is_hot: boolean;
      }[];
      page: number;
      limit: number;
    }>(`/api/admin/leads/scoring/list?${params}`),
  leadsRuns: (limit = 30) =>
    api.get<{
      runs: {
        id: number;
        started_at: string;
        finished_at: string | null;
        status: string;
        items_processed: number;
        items_failed: number;
        scored: number;
        hot_count: number;
        average_score: number;
        duration_ms: number | null;
        triggered_by: string;
        triggered_by_user: string | null;
      }[];
    }>(`/api/admin/leads/scoring/runs?limit=${limit}`),
  leadsContact: (id: number) =>
    api.get<{
      contact: {
        id: number;
        first_name: string;
        last_name: string;
        email: string | null;
        score: number | null;
        scored_at: string | null;
      };
      history: {
        id: number;
        contact_id: number;
        score: number;
        previous_score: number | null;
        factors: Record<string, { value: unknown; contribution: number }>;
        scored_at: string;
      }[];
      pipeline: {
        id: number;
        contact_id: number;
        pipeline_stage: string;
        moved_at: string;
      }[];
    }>(`/api/admin/leads/scoring/contact/${id}`),

  // Jobs
  jobsRuns: (params: URLSearchParams) =>
    api.get<{ runs: JobRunRow[] }>(`/api/admin/jobs/runs?${params}`),
  jobsHeatmap: (days = 30) =>
    api.get<{
      days: number;
      since: string;
      cells: { job_name: string; day: string; success: number; partial: number; failed: number }[];
    }>(`/api/admin/jobs/heatmap?days=${days}`),
  emailQueueSummary: () =>
    api.get<{
      pending: number;
      sent_today: number;
      sent_this_week: number;
      failed_today: number;
      oldest_pending_at: string | null;
      next_run_in_min: number;
    }>('/api/admin/jobs/email-queue/summary'),
  emailQueue: (params: URLSearchParams) =>
    api.get<{
      items: {
        id: number;
        scheduled_for: string;
        sent_at: string | null;
        status: string;
        template: string | null;
        contact: { id: number; name: string; email: string | null } | null;
        attempts: number | null;
        error: string | null;
      }[];
      page: number;
      limit: number;
    }>(`/api/admin/jobs/email-queue?${params}`),
  emailQueueRetry: (id: number) =>
    api.post<{ item: unknown }>(`/api/admin/jobs/email-queue/${id}/retry`),
  emailQueueRetryFailedToday: () =>
    api.post<{ retried: number }>('/api/admin/jobs/email-queue/retry-failed-today'),
  automationLog: (params: URLSearchParams) =>
    api.get<{
      items: {
        id: number;
        fired_at: string;
        contact: { id: number; name: string } | null;
        from_stage: string | null;
        to_stage: string | null;
        actions: { id: number; type: string; subject: string | null }[];
        status: string;
      }[];
    }>(`/api/admin/jobs/automation-log?${params}`),
};
