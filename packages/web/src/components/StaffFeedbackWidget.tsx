import { FormEvent, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  MessageSquarePlus,
  X,
  Bug,
  Sparkles,
  HelpCircle,
  Heart,
  Send,
  Check,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { labelForPath, normalizePath } from '@/lib/page-labels';
import {
  staffFeedbackApi,
  StaffComment,
  StaffCommentPriority,
  StaffCommentType,
} from '@/lib/staff-feedback-api';
import { formatDistanceToNow } from 'date-fns';

const TYPES: { id: StaffCommentType; label: string; icon: typeof Bug; tone: string }[] = [
  { id: 'bug', label: 'Bug', icon: Bug, tone: 'bg-red-50 border-red-200 text-red-700' },
  {
    id: 'improvement',
    label: 'Improvement',
    icon: Sparkles,
    tone: 'bg-amber-50 border-amber-200 text-amber-700',
  },
  {
    id: 'question',
    label: 'Question',
    icon: HelpCircle,
    tone: 'bg-blue-50 border-blue-200 text-blue-700',
  },
  {
    id: 'praise',
    label: 'Praise',
    icon: Heart,
    tone: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  },
];

const PRIORITIES: { id: StaffCommentPriority; label: string }[] = [
  { id: 'low', label: 'Low' },
  { id: 'normal', label: 'Normal' },
  { id: 'high', label: 'High' },
];

const STATUS_TONE: Record<string, string> = {
  open: 'bg-amber-100 text-amber-800',
  in_progress: 'bg-blue-100 text-blue-800',
  resolved: 'bg-green-100 text-green-800',
  wont_fix: 'bg-gray-100 text-gray-700',
};

export function StaffFeedbackWidget() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'list' | 'create'>('list');
  const [comments, setComments] = useState<StaffComment[]>([]);
  const [loading, setLoading] = useState(false);

  const pagePath = normalizePath(location.pathname);
  const pageLabel = labelForPath(location.pathname);

  function loadComments() {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('pagePath', pagePath);
    params.set('limit', '50');
    staffFeedbackApi
      .list(params)
      .then((d) => setComments(d.comments))
      .catch(() => setComments([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (open) loadComments();
    // Reset to list when reopening or changing page.
    if (open) setView('list');
  }, [open, pagePath]);

  const openCount = comments.filter(
    (c) => c.status === 'open' || c.status === 'in_progress',
  ).length;

  return (
    <>
      {/* Floating launcher */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-30 flex items-center gap-2 rounded-full bg-coral text-white shadow-lg px-4 py-3 hover:bg-coral/90 transition-colors"
        title="Staff feedback for this page"
      >
        <MessageSquarePlus className="h-5 w-5" />
        <span className="text-sm font-medium">Feedback</span>
        {openCount > 0 && (
          <span className="ml-1 rounded-full bg-white/25 text-xs font-semibold px-2 py-0.5">
            {openCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/40"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full sm:max-w-md h-full bg-white shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-sand-dark flex items-center gap-3">
              <MessageSquarePlus className="h-5 w-5 text-primary-dark" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-primary-dark truncate">
                  {pageLabel}
                </p>
                <p className="text-xs text-gray-500 truncate">{pagePath}</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded hover:bg-sand text-gray-500"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {view === 'list' ? (
              <CommentList
                comments={comments}
                loading={loading}
                onNew={() => setView('create')}
                onUpdated={loadComments}
              />
            ) : (
              <CreateForm
                pagePath={pagePath}
                pageLabel={pageLabel}
                onCancel={() => setView('list')}
                onCreated={() => {
                  setView('list');
                  loadComments();
                }}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}

function CommentList({
  comments,
  loading,
  onNew,
  onUpdated,
}: {
  comments: StaffComment[];
  loading: boolean;
  onNew: () => void;
  onUpdated: () => void;
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-4 py-3 border-b border-sand-dark flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {loading
            ? 'Loading…'
            : comments.length === 0
              ? 'No feedback for this page yet.'
              : `${comments.length} comment${comments.length === 1 ? '' : 's'}`}
        </p>
        <button
          onClick={onNew}
          className="text-sm font-medium bg-primary text-white rounded-lg px-3 py-1.5 hover:bg-primary-dark transition"
        >
          New feedback
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {comments.map((c) => (
          <CommentCard
            key={c.id}
            comment={c}
            expanded={expandedId === c.id}
            onToggle={() => setExpandedId(expandedId === c.id ? null : c.id)}
            onUpdated={onUpdated}
          />
        ))}
        {!loading && comments.length === 0 && (
          <div className="text-center text-sm text-gray-500 py-8">
            Be the first to leave a note about this page — bugs, ideas, and
            confused-by-this moments are all welcome.
          </div>
        )}
      </div>
    </div>
  );
}

function CommentCard({
  comment,
  expanded,
  onToggle,
  onUpdated,
}: {
  comment: StaffComment;
  expanded: boolean;
  onToggle: () => void;
  onUpdated: () => void;
}) {
  const typeMeta = TYPES.find((t) => t.id === comment.type) ?? TYPES[1];
  const Icon = typeMeta.icon;

  async function setStatus(status: StaffComment['status']) {
    await staffFeedbackApi.update(comment.id, { status }).catch(() => {});
    onUpdated();
  }

  return (
    <div className="border border-sand-dark rounded-lg bg-white">
      <button
        onClick={onToggle}
        className="w-full px-3 py-2.5 flex items-start gap-2 text-left"
      >
        <span
          className={cn(
            'mt-0.5 inline-flex items-center justify-center h-7 w-7 rounded-md border shrink-0',
            typeMeta.tone,
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-primary-dark truncate">
            {comment.title}
          </p>
          <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                STATUS_TONE[comment.status] ?? STATUS_TONE.open,
              )}
            >
              {comment.status.replace('_', ' ')}
            </span>
            <span>·</span>
            <span>{comment.created_by_name ?? 'Unknown'}</span>
            <span>·</span>
            <span>
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
            </span>
          </div>
        </div>
        <ChevronRight
          className={cn(
            'h-4 w-4 text-gray-400 shrink-0 transition-transform',
            expanded && 'rotate-90',
          )}
        />
      </button>
      {expanded && (
        <div className="border-t border-sand-dark px-3 py-3 space-y-3">
          {comment.body && (
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.body}</p>
          )}
          <div className="flex flex-wrap gap-1.5">
            {(['open', 'in_progress', 'resolved', 'wont_fix'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={cn(
                  'text-xs px-2 py-1 rounded border transition',
                  comment.status === s
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-gray-600 border-sand-dark hover:bg-sand',
                )}
              >
                {comment.status === s && <Check className="h-3 w-3 inline mr-1" />}
                {s.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CreateForm({
  pagePath,
  pageLabel,
  onCancel,
  onCreated,
}: {
  pagePath: string;
  pageLabel: string;
  onCancel: () => void;
  onCreated: () => void;
}) {
  const [type, setType] = useState<StaffCommentType>('improvement');
  const [priority, setPriority] = useState<StaffCommentPriority>('normal');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please add a short title.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await staffFeedbackApi.create({
        pagePath,
        pageLabel,
        type,
        priority,
        title: title.trim(),
        body: body.trim() || null,
        userAgent: navigator.userAgent.slice(0, 500),
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      });
      onCreated();
    } catch (err) {
      setError((err as Error).message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500 font-medium mb-2">
            Type
          </p>
          <div className="grid grid-cols-2 gap-2">
            {TYPES.map((t) => {
              const Icon = t.icon;
              const active = type === t.id;
              return (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => setType(t.id)}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition',
                    active
                      ? 'border-primary bg-primary text-white'
                      : 'border-sand-dark bg-white text-gray-700 hover:bg-sand',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500 font-medium mb-2">
            Priority
          </p>
          <div className="flex gap-2">
            {PRIORITIES.map((p) => (
              <button
                type="button"
                key={p.id}
                onClick={() => setPriority(p.id)}
                className={cn(
                  'flex-1 rounded-lg border px-3 py-1.5 text-sm transition',
                  priority === p.id
                    ? 'border-primary bg-primary text-white'
                    : 'border-sand-dark bg-white text-gray-700 hover:bg-sand',
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="text-xs uppercase tracking-wide text-gray-500 font-medium">
            Title
          </span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Short summary"
            maxLength={500}
            className="mt-1 w-full rounded-lg border border-sand-dark px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </label>

        <label className="block">
          <span className="text-xs uppercase tracking-wide text-gray-500 font-medium">
            Details (optional)
          </span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            placeholder="What were you trying to do? What did you expect? What happened?"
            className="mt-1 w-full rounded-lg border border-sand-dark px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-y"
          />
        </label>

        <div className="rounded-lg bg-sand/60 border border-sand-dark px-3 py-2 text-xs text-gray-600">
          <p>
            <span className="font-medium">Page:</span> {pageLabel} ({pagePath})
          </p>
          <p>
            <span className="font-medium">Browser:</span>{' '}
            {window.innerWidth}×{window.innerHeight}
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-3 py-2 text-sm">
            {error}
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-t border-sand-dark flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-gray-600 hover:text-primary-dark"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className={cn(
            'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition',
            submitting ? 'bg-primary/60' : 'bg-primary hover:bg-primary-dark',
          )}
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Submit feedback
        </button>
      </div>
    </form>
  );
}
