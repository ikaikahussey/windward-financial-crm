import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Activity as ActivityIcon } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { PageHelp } from '@/components/PageHelp';
import { cn } from '@/lib/utils';
import { analyticsApi, AnalyticsSummary } from '@/lib/staff-feedback-api';

type RangeKey = '7' | '30' | '90';

const RANGES: { id: RangeKey; label: string }[] = [
  { id: '7', label: 'Last 7 days' },
  { id: '30', label: 'Last 30 days' },
  { id: '90', label: 'Last 90 days' },
];

function formatDuration(ms: number) {
  if (!ms || ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem ? `${m}m ${rem}s` : `${m}m`;
}

export default function Analytics() {
  const [range, setRange] = useState<RangeKey>('30');
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [recent, setRecent] = useState<
    Awaited<ReturnType<typeof analyticsApi.recent>>['events']
  >([]);
  const [heatmap, setHeatmap] = useState<
    Awaited<ReturnType<typeof analyticsApi.heatmap>>
  >({ days: 30, since: '', cells: [] });
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    Promise.all([
      analyticsApi.summary(parseInt(range, 10)),
      analyticsApi.recent(50),
      analyticsApi.heatmap(parseInt(range, 10)),
    ])
      .then(([s, r, h]) => {
        setSummary(s);
        setRecent(r.events);
        setHeatmap(h);
      })
      .catch(() => {
        setSummary(null);
        setRecent([]);
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, [range]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary-dark">Analytics</h1>
        <button
          onClick={load}
          className="flex items-center gap-2 text-sm text-primary-dark hover:bg-sand rounded-lg px-3 py-1.5"
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} /> Refresh
        </button>
      </div>

      <PageHelp
        id="ops-analytics"
        title="What is Analytics?"
        description="Tracks how the CRM is being used: page views per user, most-visited pages, time-of-day activity, and the recent activity stream. Page views are tracked for every authenticated route change."
        tips={[
          'Choose a 7 / 30 / 90 day window with the buttons below.',
          'Top Pages shows which screens get the most attention — useful for prioritizing improvements.',
          'Top Users surfaces who is logging in regularly vs. who has gone quiet.',
          'The heatmap shows day-of-week × hour-of-day intensity — handy for picking maintenance windows.',
        ]}
      />

      <div className="flex gap-1 bg-white rounded-lg p-1 shadow-sm border border-sand-dark w-fit">
        {RANGES.map((r) => (
          <button
            key={r.id}
            onClick={() => setRange(r.id)}
            className={cn(
              'px-3 py-1.5 rounded-md text-sm font-medium transition',
              range === r.id ? 'bg-primary text-white' : 'text-gray-600 hover:bg-sand',
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Page views" value={summary?.totals.total_views ?? 0} />
        <Stat label="Unique staff" value={summary?.totals.unique_users ?? 0} />
        <Stat label="Sessions" value={summary?.totals.unique_sessions ?? 0} />
        <Stat
          label="Avg. time on page"
          valueLabel={formatDuration(summary?.totals.avg_duration_ms ?? 0)}
        />
      </div>

      {/* Daily trend */}
      <DailyTrend trend={summary?.daily_trend ?? []} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top pages */}
        <div className="bg-white rounded-xl border border-sand-dark p-4">
          <p className="text-sm font-semibold text-primary-dark mb-3">Top pages</p>
          {(summary?.top_pages.length ?? 0) === 0 ? (
            <p className="text-sm text-gray-500">No views in this window.</p>
          ) : (
            <TopPagesTable pages={summary?.top_pages ?? []} />
          )}
        </div>

        {/* Top users */}
        <div className="bg-white rounded-xl border border-sand-dark p-4">
          <p className="text-sm font-semibold text-primary-dark mb-3">Top users</p>
          {(summary?.top_users.length ?? 0) === 0 ? (
            <p className="text-sm text-gray-500">No active users in this window.</p>
          ) : (
            <TopUsersTable users={summary?.top_users ?? []} />
          )}
        </div>
      </div>

      {/* Heatmap */}
      <div className="bg-white rounded-xl border border-sand-dark p-4">
        <p className="text-sm font-semibold text-primary-dark mb-3">
          Activity heatmap (day × hour)
        </p>
        <Heatmap cells={heatmap.cells} />
      </div>

      {/* Recent activity */}
      <div className="bg-white rounded-xl border border-sand-dark p-4">
        <div className="flex items-center gap-2 mb-3">
          <ActivityIcon className="h-4 w-4 text-primary-dark" />
          <p className="text-sm font-semibold text-primary-dark">Recent activity</p>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-gray-500">No recent activity.</p>
        ) : (
          <div className="divide-y divide-sand-dark">
            {recent.map((e) => (
              <div key={e.id} className="py-2 flex items-center gap-3 text-sm">
                <span className="text-gray-500 w-32 shrink-0">
                  {formatDistanceToNow(new Date(e.viewed_at), { addSuffix: true })}
                </span>
                <span className="text-primary-dark font-medium w-40 shrink-0 truncate">
                  {e.user_name || 'Anonymous'}
                </span>
                <span className="text-gray-700 truncate flex-1">
                  {e.page_label || e.page_path}
                </span>
                <span className="text-gray-400 text-xs">
                  {e.duration_ms ? formatDuration(e.duration_ms) : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  valueLabel,
}: {
  label: string;
  value?: number;
  valueLabel?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-sand-dark p-4">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-primary-dark mt-1">
        {valueLabel !== undefined ? valueLabel : (value ?? 0).toLocaleString()}
      </p>
    </div>
  );
}

function DailyTrend({
  trend,
}: {
  trend: { day: string; views: number; unique_users: number }[];
}) {
  const max = Math.max(1, ...trend.map((t) => t.views));
  return (
    <div className="bg-white rounded-xl border border-sand-dark p-4">
      <p className="text-sm font-semibold text-primary-dark mb-3">Daily page views</p>
      {trend.length === 0 ? (
        <p className="text-sm text-gray-500">No data yet.</p>
      ) : (
        <div className="flex items-end gap-1 h-32">
          {trend.map((t) => (
            <div key={t.day} className="flex-1 flex flex-col items-center gap-1 group">
              <div
                className="w-full bg-primary rounded-t transition-colors hover:bg-primary-dark"
                style={{ height: `${(t.views / max) * 100}%`, minHeight: '2px' }}
                title={`${t.day} — ${t.views} views, ${t.unique_users} users`}
              />
              <span className="text-[9px] text-gray-400 hidden md:block">
                {t.day.slice(5)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TopPagesTable({
  pages,
}: {
  pages: AnalyticsSummary['top_pages'];
}) {
  const max = Math.max(1, ...pages.map((p) => p.views));
  return (
    <div className="space-y-1.5">
      {pages.map((p) => (
        <div key={p.page_path} className="flex items-center gap-3 text-sm">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-primary-dark truncate font-medium">
                {p.page_label || p.page_path}
              </span>
              <span className="text-gray-500 text-xs whitespace-nowrap">
                {p.views.toLocaleString()} views · {p.unique_users} users
              </span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-sand overflow-hidden">
              <div
                className="h-full bg-primary"
                style={{ width: `${(p.views / max) * 100}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function TopUsersTable({
  users,
}: {
  users: AnalyticsSummary['top_users'];
}) {
  return (
    <div className="divide-y divide-sand-dark">
      {users.map((u, i) => (
        <div
          key={`${u.user_id ?? 'anon'}-${i}`}
          className="py-2 flex items-center gap-3 text-sm"
        >
          <div className="flex-1 min-w-0">
            <p className="font-medium text-primary-dark truncate">
              {u.user_name || u.user_email || 'Anonymous'}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {u.distinct_pages} pages · last seen{' '}
              {u.last_seen
                ? formatDistanceToNow(new Date(u.last_seen), { addSuffix: true })
                : '—'}
            </p>
          </div>
          <span className="text-sm font-semibold text-primary-dark">
            {u.views.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

function Heatmap({
  cells,
}: {
  cells: { day_of_week: number; hour_of_day: number; views: number }[];
}) {
  const grid = useMemo(() => {
    // 7 rows × 24 cols, Sunday-first to match Postgres DOW (0 = Sunday).
    const out: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    cells.forEach((c) => {
      out[c.day_of_week][c.hour_of_day] = c.views;
    });
    return out;
  }, [cells]);

  const max = Math.max(1, ...cells.map((c) => c.views));

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="overflow-x-auto">
      <table className="text-[10px] text-gray-500">
        <thead>
          <tr>
            <th></th>
            {Array.from({ length: 24 }).map((_, h) => (
              <th key={h} className="px-0.5 font-normal text-center w-5">
                {h % 3 === 0 ? h : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.map((row, dow) => (
            <tr key={dow}>
              <td className="pr-2 text-right font-medium text-gray-600">
                {dayLabels[dow]}
              </td>
              {row.map((v, h) => (
                <td key={h} className="p-0.5">
                  <div
                    title={`${dayLabels[dow]} ${h}:00 — ${v} views`}
                    className="w-5 h-5 rounded"
                    style={{
                      backgroundColor:
                        v === 0
                          ? '#F3EEE2' // sand-ish
                          : `rgba(45, 106, 79, ${0.15 + 0.85 * (v / max)})`,
                    }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

void format;
