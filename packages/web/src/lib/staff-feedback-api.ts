import { api } from './api';

export type StaffCommentType = 'bug' | 'improvement' | 'question' | 'praise';
export type StaffCommentStatus = 'open' | 'in_progress' | 'resolved' | 'wont_fix';
export type StaffCommentPriority = 'low' | 'normal' | 'high';

export interface StaffComment {
  id: number;
  page_path: string;
  page_label: string | null;
  type: StaffCommentType;
  status: StaffCommentStatus;
  priority: StaffCommentPriority;
  title: string;
  body: string | null;
  user_agent?: string | null;
  viewport_width?: number | null;
  viewport_height?: number | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  created_by_id: number;
  created_by_name: string | null;
  reply_count?: number;
}

export interface StaffCommentReply {
  id: number;
  comment_id: number;
  body: string;
  created_at: string;
  created_by_id: number;
  created_by_name: string | null;
}

export interface CreateCommentInput {
  pagePath: string;
  pageLabel?: string | null;
  type: StaffCommentType;
  priority: StaffCommentPriority;
  title: string;
  body?: string | null;
  userAgent?: string | null;
  viewportWidth?: number | null;
  viewportHeight?: number | null;
}

export interface UpdateCommentInput {
  status?: StaffCommentStatus;
  priority?: StaffCommentPriority;
  type?: StaffCommentType;
  title?: string;
  body?: string | null;
}

export const staffFeedbackApi = {
  list: (params?: URLSearchParams) =>
    api.get<{ comments: StaffComment[] }>(
      `/api/staff-comments${params && params.toString() ? `?${params}` : ''}`,
    ),
  get: (id: number) =>
    api.get<{ comment: StaffComment; replies: StaffCommentReply[] }>(
      `/api/staff-comments/${id}`,
    ),
  summary: () =>
    api.get<{
      by_status: { status: StaffCommentStatus; count: number }[];
      by_type: { type: StaffCommentType; count: number }[];
      by_page: {
        page_path: string;
        page_label: string | null;
        open_count: number;
        total_count: number;
      }[];
    }>('/api/staff-comments/summary'),
  create: (input: CreateCommentInput) =>
    api.post<{ comment: StaffComment }>('/api/staff-comments', input),
  update: (id: number, input: UpdateCommentInput) =>
    api.patch<{ comment: StaffComment }>(`/api/staff-comments/${id}`, input),
  remove: (id: number) => api.delete<void>(`/api/staff-comments/${id}`),
  reply: (id: number, body: string) =>
    api.post<{ reply: StaffCommentReply }>(`/api/staff-comments/${id}/replies`, { body }),
};

export interface AnalyticsSummary {
  days: number;
  since: string;
  totals: {
    total_views: number;
    unique_users: number;
    unique_sessions: number;
    avg_duration_ms: number;
  };
  top_pages: {
    page_path: string;
    page_label: string | null;
    views: number;
    unique_users: number;
    avg_duration_ms: number;
  }[];
  top_users: {
    user_id: number | null;
    user_name: string | null;
    user_email: string | null;
    views: number;
    distinct_pages: number;
    last_seen: string;
  }[];
  daily_trend: { day: string; views: number; unique_users: number }[];
}

export const analyticsApi = {
  track: (input: {
    pagePath: string;
    pageLabel?: string | null;
    sessionId?: string | null;
    referrer?: string | null;
    durationMs?: number | null;
  }) => api.post<{ tracked: boolean }>('/api/analytics/track', input),
  summary: (days = 30) =>
    api.get<AnalyticsSummary>(`/api/analytics/summary?days=${days}`),
  recent: (limit = 50) =>
    api.get<{
      events: {
        id: number;
        page_path: string;
        page_label: string | null;
        duration_ms: number | null;
        viewed_at: string;
        user_id: number | null;
        user_name: string | null;
      }[];
    }>(`/api/analytics/recent?limit=${limit}`),
  heatmap: (days = 30) =>
    api.get<{
      days: number;
      since: string;
      cells: { day_of_week: number; hour_of_day: number; views: number }[];
    }>(`/api/analytics/heatmap?days=${days}`),
};
