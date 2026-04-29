import { useEffect, useMemo, useState } from 'react';
import { adminApi } from '@/lib/admin-api';
import { cn } from '@/lib/utils';
import { ArrowDown, ArrowUp, Eye, X, Flame } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { PageHelp } from '@/components/PageHelp';

type Lead = Awaited<ReturnType<typeof adminApi.leadsList>>['leads'][number];
type ContactDetail = Awaited<ReturnType<typeof adminApi.leadsContact>>;

export default function LeadScoring() {
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof adminApi.leadsSummary>> | null>(
    null,
  );
  const [distribution, setDistribution] = useState<{ range: string; count: number }[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [employmentFilter, setEmploymentFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [scoreRange, setScoreRange] = useState<{ min?: number; max?: number }>({});
  const [drawerContact, setDrawerContact] = useState<ContactDetail | null>(null);
  const [runsOpen, setRunsOpen] = useState(false);
  const [runs, setRuns] = useState<Awaited<ReturnType<typeof adminApi.leadsRuns>>['runs']>([]);

  function loadSummary() {
    adminApi.leadsSummary().then(setSummary).catch(() => setSummary(null));
    adminApi
      .leadsDistribution()
      .then((d) => setDistribution(d.buckets))
      .catch(() => setDistribution([]));
  }

  function loadLeads() {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('limit', '100');
    if (search) params.set('search', search);
    if (employmentFilter) params.set('employmentType', employmentFilter);
    if (sourceFilter) params.set('source', sourceFilter);
    if (stageFilter) params.set('pipelineStage', stageFilter);
    if (scoreRange.min != null) params.set('minScore', String(scoreRange.min));
    if (scoreRange.max != null) params.set('maxScore', String(scoreRange.max));
    adminApi
      .leadsList(params)
      .then((d) => setLeads(d.leads))
      .catch(() => setLeads([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadSummary();
  }, []);

  useEffect(() => {
    loadLeads();
  }, [search, employmentFilter, sourceFilter, stageFilter, scoreRange]);

  function openDrawer(id: number) {
    adminApi.leadsContact(id).then(setDrawerContact).catch(() => setDrawerContact(null));
  }

  function toggleRuns() {
    setRunsOpen((v) => !v);
    if (!runsOpen && runs.length === 0) {
      adminApi.leadsRuns(30).then((d) => setRuns(d.runs));
    }
  }

  const maxBucketCount = useMemo(
    () => distribution.reduce((m, b) => Math.max(m, b.count), 0),
    [distribution],
  );

  const employmentTypes = useMemo(
    () => Array.from(new Set(leads.map((l) => l.employment_type).filter(Boolean))) as string[],
    [leads],
  );
  const sources = useMemo(
    () => Array.from(new Set(leads.map((l) => l.lead_source).filter(Boolean))) as string[],
    [leads],
  );
  const stages = useMemo(
    () => Array.from(new Set(leads.map((l) => l.pipeline_stage).filter(Boolean))) as string[],
    [leads],
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-primary-dark">Lead Scoring</h1>

      <PageHelp
        id="ops-leads"
        title="What is Lead Scoring?"
        description="Visibility into the AI lead-scoring system. Each contact gets a 0-100 score recomputed daily based on employment, years of service, life-insurance status, lead source, and profile completeness."
        tips={[
          'Hot leads (≥70) auto-book a Consultation Scheduled stage entry — see "Auto-Booked Today" in the KPI row.',
          'Click a histogram bucket to filter the leads table to that score range.',
          'Use the eye icon on a lead row to open the per-contact drawer with factor-by-factor contributions and the recent score history.',
          'Run history (collapsed at the bottom) shows the last 30 scoring jobs with averages, hot counts, and durations.',
          'Re-scoring runs daily at 9am HST. To trigger one manually you can hit POST /api/admin/leads/scoring (not yet exposed in UI) or wait for the cron.',
        ]}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Total" value={summary?.total ?? 0} />
        <Stat label="Hot Leads (≥70)" value={summary?.hot ?? 0} tone="hot" />
        <Stat label="Avg Score" value={summary?.average_score ?? 0} />
        <Stat label="Auto-Booked Today" value={summary?.auto_booked_today ?? 0} />
      </div>

      {/* Distribution */}
      <div className="bg-white rounded-xl shadow-sm border border-sand-dark p-4">
        <h2 className="font-semibold text-primary-dark mb-4">Score Distribution</h2>
        <div className="grid grid-cols-10 gap-2 items-end h-40">
          {distribution.map((b) => {
            const [minStr, maxStr] = b.range.split('-');
            const min = parseInt(minStr, 10);
            const max = parseInt(maxStr, 10);
            const heightPct = maxBucketCount > 0 ? (b.count / maxBucketCount) * 100 : 0;
            const isHot = min >= 70;
            return (
              <button
                key={b.range}
                onClick={() => setScoreRange({ min, max })}
                className="flex flex-col items-center justify-end gap-1 h-full hover:opacity-80 transition"
              >
                <span className="text-xs text-gray-500">{b.count}</span>
                <div
                  className={cn(
                    'w-full rounded-t-md transition',
                    isHot ? 'bg-green-500' : min >= 40 ? 'bg-amber-400' : 'bg-red-300',
                  )}
                  style={{ height: `${heightPct}%`, minHeight: b.count > 0 ? '4px' : '0' }}
                />
                <span className="text-xs text-gray-500">{b.range}</span>
              </button>
            );
          })}
        </div>
        {(scoreRange.min != null || scoreRange.max != null) && (
          <div className="mt-3 text-xs text-gray-500">
            Filtered to {scoreRange.min}–{scoreRange.max}.{' '}
            <button
              onClick={() => setScoreRange({})}
              className="text-primary hover:underline"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-sand-dark p-4 flex flex-wrap gap-3">
        <input
          placeholder="Search name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px]"
        />
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">All Sources</option>
          {sources.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={employmentFilter}
          onChange={(e) => setEmploymentFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">All Employment</option>
          {employmentTypes.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">All Stages</option>
          {stages.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Leads table */}
      <div className="bg-white rounded-xl shadow-sm border border-sand-dark overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-sand-dark bg-sand/50">
              <th className="text-left px-4 py-2 font-semibold text-gray-600">Name</th>
              <th className="text-left px-4 py-2 font-semibold text-gray-600">Source</th>
              <th className="text-left px-4 py-2 font-semibold text-gray-600">Employment</th>
              <th className="text-left px-4 py-2 font-semibold text-gray-600">Stage</th>
              <th className="text-right px-4 py-2 font-semibold text-gray-600">Score</th>
              <th className="text-right px-4 py-2 font-semibold text-gray-600">Δ</th>
              <th className="text-right px-4 py-2 font-semibold text-gray-600">Last Scored</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-gray-400">
                  Loading…
                </td>
              </tr>
            ) : leads.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-gray-400">
                  No leads
                </td>
              </tr>
            ) : (
              leads.map((l) => {
                const delta =
                  l.score != null && l.previous_score != null ? l.score - l.previous_score : null;
                return (
                  <tr key={l.id} className="border-b border-sand-dark/50 hover:bg-sand/30">
                    <td className="px-4 py-2 font-medium">
                      <a href={`/contacts/${l.id}`} className="text-primary-dark hover:text-primary">
                        {l.first_name} {l.last_name}
                      </a>
                      {l.is_hot && (
                        <Flame className="inline h-3 w-3 ml-1 text-orange-500" />
                      )}
                    </td>
                    <td className="px-4 py-2 text-gray-600">{l.lead_source ?? '—'}</td>
                    <td className="px-4 py-2 text-gray-600">{l.employment_type ?? '—'}</td>
                    <td className="px-4 py-2 text-gray-600">{l.pipeline_stage ?? '—'}</td>
                    <td className="px-4 py-2 text-right">
                      <ScoreBadge score={l.score ?? 0} />
                    </td>
                    <td className="px-4 py-2 text-right text-xs">
                      {delta == null ? (
                        <span className="text-gray-300">—</span>
                      ) : delta > 0 ? (
                        <span className="text-green-600 inline-flex items-center gap-0.5">
                          <ArrowUp className="h-3 w-3" />
                          {delta}
                        </span>
                      ) : delta < 0 ? (
                        <span className="text-red-500 inline-flex items-center gap-0.5">
                          <ArrowDown className="h-3 w-3" />
                          {Math.abs(delta)}
                        </span>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right text-xs text-gray-500">
                      {l.scored_at
                        ? formatDistanceToNow(new Date(l.scored_at), { addSuffix: true })
                        : '—'}
                    </td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => openDrawer(l.id)}
                        className="text-primary hover:text-primary-dark"
                        title="View breakdown"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Run history */}
      <div className="bg-white rounded-xl shadow-sm border border-sand-dark">
        <button
          onClick={toggleRuns}
          className="w-full flex items-center justify-between p-4 text-left"
        >
          <h2 className="font-semibold text-primary-dark">Scoring Run History</h2>
          <span className="text-xs text-gray-500">{runsOpen ? 'Hide' : 'Show'}</span>
        </button>
        {runsOpen && (
          <div className="border-t border-sand-dark overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-sand/50">
                  <th className="text-left px-4 py-2 text-gray-600">When</th>
                  <th className="text-right px-4 py-2 text-gray-600">Scored</th>
                  <th className="text-right px-4 py-2 text-gray-600">Avg</th>
                  <th className="text-right px-4 py-2 text-gray-600">Hot</th>
                  <th className="text-right px-4 py-2 text-gray-600">Duration</th>
                  <th className="text-left px-4 py-2 text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id} className="border-b border-sand-dark/50">
                    <td className="px-4 py-2 text-xs">
                      {format(new Date(r.started_at), 'MMM d, HH:mm')}
                    </td>
                    <td className="px-4 py-2 text-right">{r.scored}</td>
                    <td className="px-4 py-2 text-right">{r.average_score}</td>
                    <td className="px-4 py-2 text-right">{r.hot_count}</td>
                    <td className="px-4 py-2 text-right text-xs text-gray-500">
                      {r.duration_ms ? `${Math.round(r.duration_ms / 1000)}s` : '—'}
                    </td>
                    <td className="px-4 py-2">
                      <RunStatus status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {drawerContact && (
        <ScoreBreakdownDrawer detail={drawerContact} onClose={() => setDrawerContact(null)} />
      )}
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
  tone?: 'hot';
}) {
  return (
    <div className="bg-white rounded-xl border border-sand-dark p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p
        className={cn(
          'text-2xl font-bold mt-1',
          tone === 'hot' ? 'text-orange-600' : 'text-primary-dark',
        )}
      >
        {value}
      </p>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const tone =
    score >= 70 ? 'bg-green-100 text-green-800' : score >= 40 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-700';
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-xs font-mono font-medium', tone)}>
      {score}
    </span>
  );
}

function RunStatus({ status }: { status: string }) {
  const map: Record<string, string> = {
    success: 'bg-green-100 text-green-700',
    partial: 'bg-amber-100 text-amber-700',
    failed: 'bg-red-100 text-red-700',
    running: 'bg-blue-100 text-blue-700',
  };
  return (
    <span
      className={cn(
        'px-2 py-0.5 rounded-full text-xs font-medium',
        map[status] || 'bg-gray-100 text-gray-700',
      )}
    >
      {status}
    </span>
  );
}

function ScoreBreakdownDrawer({
  detail,
  onClose,
}: {
  detail: ContactDetail;
  onClose: () => void;
}) {
  const latest = detail.history[0];
  const factors = (latest?.factors ?? {}) as Record<
    string,
    { value: unknown; contribution: number }
  >;
  const maxFactor = Math.max(...Object.values(factors).map((f) => f.contribution), 1);
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-end" onClick={onClose}>
      <div
        className="bg-white w-full max-w-xl h-full overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-primary-dark">
              {detail.contact.first_name} {detail.contact.last_name}
            </h2>
            <p className="text-xs text-gray-500">
              Score: <strong>{detail.contact.score ?? '—'}</strong> · last scored{' '}
              {detail.contact.scored_at
                ? formatDistanceToNow(new Date(detail.contact.scored_at), { addSuffix: true })
                : '—'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <h3 className="font-semibold text-primary-dark text-sm mb-2">Factor Contributions</h3>
        <ul className="space-y-2 mb-6">
          {Object.entries(factors).map(([k, f]) => (
            <li key={k}>
              <div className="flex justify-between text-xs text-gray-600 mb-0.5">
                <span>
                  {k} <span className="text-gray-400">({String(f.value)})</span>
                </span>
                <span className="font-mono">+{f.contribution}</span>
              </div>
              <div className="h-2 bg-sand rounded-full">
                <div
                  className="h-2 bg-primary rounded-full"
                  style={{ width: `${(f.contribution / maxFactor) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>

        <h3 className="font-semibold text-primary-dark text-sm mb-2">Recent Scores</h3>
        <Sparkline data={detail.history.map((h) => h.score)} />
        <table className="w-full text-xs mt-2">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-1">When</th>
              <th className="py-1 text-right">Score</th>
              <th className="py-1 text-right">Δ</th>
            </tr>
          </thead>
          <tbody>
            {detail.history.slice(0, 10).map((h) => {
              const delta =
                h.previous_score != null ? h.score - h.previous_score : null;
              return (
                <tr key={h.id} className="border-t border-sand-dark/40">
                  <td className="py-1 text-gray-600">
                    {format(new Date(h.scored_at), 'MMM d, HH:mm')}
                  </td>
                  <td className="py-1 text-right">{h.score}</td>
                  <td className="py-1 text-right">{delta == null ? '—' : delta > 0 ? `+${delta}` : delta}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Sparkline({ data }: { data: number[] }) {
  if (data.length === 0) return <p className="text-xs text-gray-400">No history</p>;
  const points = [...data].reverse();
  const max = Math.max(...points, 1);
  const w = 200;
  const h = 40;
  const step = points.length > 1 ? w / (points.length - 1) : 0;
  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${i * step},${h - (p / max) * h}`)
    .join(' ');
  return (
    <svg width={w} height={h} className="text-primary">
      <path d={path} stroke="currentColor" strokeWidth={1.5} fill="none" />
    </svg>
  );
}
