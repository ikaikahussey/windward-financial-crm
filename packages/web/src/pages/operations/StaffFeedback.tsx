import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Bug,
  Sparkles,
  HelpCircle,
  Heart,
  RefreshCw,
  Send,
  X,
  MessageSquare,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { PageHelp } from '@/components/PageHelp';
import { cn } from '@/lib/utils';
import {
  staffFeedbackApi,
  StaffComment,
  StaffCommentReply,
  StaffCommentStatus,
  StaffCommentType,
} from '@/lib/staff-feedback-api';

const TYPE_META: Record<
  StaffCommentType,
  { label: string; icon: typeof Bug; tone: string }
> = {
  bug: { label: 'Bug', icon: Bug, tone: 'bg-red-100 text-red-700' },
  improvement: {
    label: 'Improvement',
    icon: Sparkles,
    tone: 'bg-amber-100 text-amber-700',
  },
  question: {
    label: 'Question',
    icon: HelpCircle,
    tone: 'bg-blue-100 text-blue-700',
  },
  praise: { label: 'Praise', icon: Heart, tone: 'bg-emerald-100 text-emerald-700' },
};

const STATUS_TONE: Record<StaffCommentStatus, string> = {
  open: 'bg-amber-100 text-amber-800',
  in_progress: 'bg-blue-100 text-blue-800',
  resolved: 'bg-green-100 text-green-800',
  wont_fix: 'bg-gray-200 text-gray-700',
};

const STATUS_LABELS: { id: StaffCommentStatus | ''; label: string }[] = [
  { id: '', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'wont_fix', label: "Won't fix" },
];

const TYPE_LABELS: { id: StaffCommentType | ''; label: string }[] = [
  { id: '', label: 'All types' },
  { id: 'bug', label: 'Bugs' },
  { id: 'improvement', label: 'Improvements' },
  { id: 'question', label: 'Questions' },
  { id: 'praise', label: 'Praise' },
];

export default function StaffFeedback() {
  const [comments, setComments] = useState<StaffComment[]>([]);
  const [summary, setSummary] = useState<Awaited<
    ReturnType<typeof staffFeedbackApi.summary>
  > | null>(null);
  const [statusFilter, setStatusFilter] = useState<StaffCommentStatus | ''>('open');
  const [typeFilter, setTypeFilter] = useState<StaffCommentType | ''>('');
  const [pageFilter, setPageFilter] = useState<string>('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (typeFilter) params.set('type', typeFilter);
    if (pageFilter) params.set('pagePath', pageFilter);
    Promise.all([
      staffFeedbackApi.list(params),
      staffFeedbackApi.summary(),
    ])
      .then(([list, sum]) => {
        setComments(list.comments);
        setSummary(sum);
      })
      .catch(() => {
        setComments([]);
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, [statusFilter, typeFilter, pageFilter]);

  const totalsByStatus = useMemo(() => {
    const out: Record<string, number> = {
      open: 0,
      in_progress: 0,
      resolved: 0,
      wont_fix: 0,
    };
    summary?.by_status.forEach((s) => {
      out[s.status] = s.count;
    });
    return out;
  }, [summary]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary-dark">Staff Feedback</h1>
        <button
          onClick={load}
          className="flex items-center gap-2 text-sm text-primary-dark hover:bg-sand rounded-lg px-3 py-1.5"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      <PageHelp
        id="ops-staff-feedback"
        title="What is Staff Feedback?"
        description="Inbox for everything staff have flagged through the floating Feedback button on each page — bugs, improvement ideas, questions, and praise."
        tips={[
          'Click any item to open it, change status, set priority, and post replies. Authors can see your replies in the same widget on the page they reported.',
          'Filter by status, type, or by page (use Pages by feedback section below) to triage quickly.',
          'Resolved / Won\'t fix moves an item out of the default Open view but it stays for history.',
        ]}
      />

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Open" value={totalsByStatus.open} tone="bad" />
        <Stat label="In progress" value={totalsByStatus.in_progress} tone="info" />
        <Stat label="Resolved" value={totalsByStatus.resolved} tone="good" />
        <Stat label="Won't fix" value={totalsByStatus.wont_fix} />
      </div>

      {/* Top pages */}
      {summary?.by_page && summary.by_page.length > 0 && (
        <div className="bg-white rounded-xl border border-sand-dark p-4">
          <p className="text-sm font-semibold text-primary-dark mb-3">
            Pages with most feedback
          </p>
          <div className="flex flex-wrap gap-2">
            {summary.by_page.slice(0, 12).map((p) => (
              <button
                key={p.page_path}
                onClick={() =>
                  setPageFilter(pageFilter === p.page_path ? '' : p.page_path)
                }
                className={cn(
                  'flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs',
                  pageFilter === p.page_path
                    ? 'border-primary bg-primary text-white'
                    : 'border-sand-dark bg-white text-gray-700 hover:bg-sand',
                )}
              >
                <span className="font-medium">{p.page_label || p.page_path}</span>
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-[10px]',
                    pageFilter === p.page_path
                      ? 'bg-white/20'
                      : 'bg-sand text-gray-600',
                  )}
                >
                  {p.open_count} open / {p.total_count}
                </span>
              </button>
            ))}
            {pageFilter && (
              <button
                onClick={() => setPageFilter('')}
                className="text-xs text-gray-500 hover:text-primary-dark"
              >
                Clear page filter
              </button>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 bg-white rounded-lg p-1 shadow-sm border border-sand-dark">
          {STATUS_LABELS.map((s) => (
            <button
              key={s.id || 'all'}
              onClick={() => setStatusFilter(s.id)}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition',
                statusFilter === s.id
                  ? 'bg-primary text-white'
                  : 'text-gray-600 hover:bg-sand',
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as StaffCommentType | '')}
          className="rounded-lg border border-sand-dark bg-white px-3 py-1.5 text-sm"
        >
          {TYPE_LABELS.map((t) => (
            <option key={t.id || 'all'} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-sand-dark overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-gray-500">Loading…</div>
        ) : comments.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            Nothing matches these filters.
          </div>
        ) : (
          <div className="divide-y divide-sand-dark">
            {comments.map((c) => {
              const Icon = TYPE_META[c.type].icon;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className="w-full text-left px-4 py-3 hover:bg-sand/50 transition flex items-start gap-3"
                >
                  <span
                    className={cn(
                      'mt-0.5 inline-flex items-center justify-center h-8 w-8 rounded-md shrink-0',
                      TYPE_META[c.type].tone,
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-primary-dark truncate">
                        {c.title}
                      </p>
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-medium',
                          STATUS_TONE[c.status],
                        )}
                      >
                        {c.status.replace('_', ' ')}
                      </span>
                      {c.priority === 'high' && (
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-red-100 text-red-700">
                          high priority
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {c.page_label || c.page_path} · {c.created_by_name || 'Unknown'} ·{' '}
                      {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                      {(c.reply_count ?? 0) > 0 && (
                        <>
                          {' · '}
                          <span className="inline-flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" /> {c.reply_count}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedId !== null && (
        <CommentDetail
          id={selectedId}
          onClose={() => setSelectedId(null)}
          onChanged={() => {
            load();
          }}
        />
      )}
    </div>
  );
}

function CommentDetail({
  id,
  onClose,
  onChanged,
}: {
  id: number;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [comment, setComment] = useState<StaffComment | null>(null);
  const [replies, setReplies] = useState<StaffCommentReply[]>([]);
  const [reply, setReply] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function load() {
    staffFeedbackApi
      .get(id)
      .then((d) => {
        setComment(d.comment);
        setReplies(d.replies);
      })
      .catch(() => {});
  }

  useEffect(load, [id]);

  async function setStatus(status: StaffCommentStatus) {
    if (!comment) return;
    await staffFeedbackApi.update(comment.id, { status });
    load();
    onChanged();
  }

  async function submitReply(e: FormEvent) {
    e.preventDefault();
    if (!reply.trim() || !comment) return;
    setSubmitting(true);
    await staffFeedbackApi.reply(comment.id, reply.trim()).catch(() => {});
    setReply('');
    setSubmitting(false);
    load();
    onChanged();
  }

  if (!comment) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        onClick={onClose}
      >
        <div className="bg-white rounded-xl px-6 py-4">Loading…</div>
      </div>
    );
  }

  const Icon = TYPE_META[comment.type].icon;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg h-full bg-white shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-sand-dark flex items-start gap-3">
          <span
            className={cn(
              'mt-0.5 inline-flex items-center justify-center h-9 w-9 rounded-md shrink-0',
              TYPE_META[comment.type].tone,
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold text-primary-dark">
              {comment.title}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {comment.page_label || comment.page_path} ·{' '}
              {comment.created_by_name || 'Unknown'} ·{' '}
              {format(new Date(comment.created_at), 'PP p')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-sand text-gray-500"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {comment.body && (
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{comment.body}</p>
          )}

          <div className="rounded-lg bg-sand/60 border border-sand-dark px-3 py-2 text-xs text-gray-600 space-y-1">
            <div>
              <span className="font-medium">Path:</span> {comment.page_path}
            </div>
            {comment.viewport_width && (
              <div>
                <span className="font-medium">Viewport:</span>{' '}
                {comment.viewport_width}×{comment.viewport_height}
              </div>
            )}
            {comment.user_agent && (
              <div className="truncate">
                <span className="font-medium">UA:</span> {comment.user_agent}
              </div>
            )}
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 font-medium mb-1.5">
              Status
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(['open', 'in_progress', 'resolved', 'wont_fix'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={cn(
                    'text-xs px-2.5 py-1 rounded border transition',
                    comment.status === s
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-gray-600 border-sand-dark hover:bg-sand',
                  )}
                >
                  {s.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500 font-medium mb-1.5">
              Replies ({replies.length})
            </p>
            {replies.length === 0 ? (
              <p className="text-sm text-gray-500">No replies yet.</p>
            ) : (
              <div className="space-y-2">
                {replies.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-lg border border-sand-dark bg-sand/40 px-3 py-2"
                  >
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">
                      {r.body}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {r.created_by_name || 'Unknown'} ·{' '}
                      {formatDistanceToNow(new Date(r.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <form
          onSubmit={submitReply}
          className="border-t border-sand-dark px-4 py-3 flex gap-2"
        >
          <input
            type="text"
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Write a reply…"
            className="flex-1 rounded-lg border border-sand-dark px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="submit"
            disabled={submitting || !reply.trim()}
            className={cn(
              'rounded-lg px-3 py-2 text-sm text-white transition flex items-center gap-1',
              submitting || !reply.trim()
                ? 'bg-primary/60'
                : 'bg-primary hover:bg-primary-dark',
            )}
          >
            <Send className="h-4 w-4" /> Reply
          </button>
        </form>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: 'good' | 'bad' | 'info' | 'neutral';
}) {
  const toneClass =
    tone === 'bad'
      ? 'text-red-600'
      : tone === 'good'
        ? 'text-green-600'
        : tone === 'info'
          ? 'text-blue-600'
          : 'text-primary-dark';
  return (
    <div className="bg-white rounded-xl border border-sand-dark p-4">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className={cn('text-2xl font-bold mt-1', toneClass)}>{value}</p>
    </div>
  );
}
