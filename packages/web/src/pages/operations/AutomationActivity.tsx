import { useEffect, useMemo, useState } from 'react';
import { adminApi } from '@/lib/admin-api';
import { cn } from '@/lib/utils';
import { RefreshCw, X } from 'lucide-react';
import { format, formatDistanceToNow, subDays } from 'date-fns';

type Tab = 'email' | 'stage' | 'jobs';

const TABS: { id: Tab; label: string }[] = [
  { id: 'email', label: 'Email Queue' },
  { id: 'stage', label: 'Stage Automation' },
  { id: 'jobs', label: 'Background Jobs' },
];

export default function AutomationActivity() {
  const [tab, setTab] = useState<Tab>('email');
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-primary-dark">Automation Activity</h1>
      <div className="border-b border-sand-dark flex gap-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition',
              tab === t.id
                ? 'border-primary text-primary-dark'
                : 'border-transparent text-gray-500 hover:text-primary-dark',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'email' && <EmailQueueTab />}
      {tab === 'stage' && <StageTab />}
      {tab === 'jobs' && <JobsTab />}
    </div>
  );
}

// ── Email Queue tab ──

function EmailQueueTab() {
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof adminApi.emailQueueSummary>> | null>(null);
  const [items, setItems] = useState<Awaited<ReturnType<typeof adminApi.emailQueue>>['items']>([]);
  const [statusFilter, setStatusFilter] = useState('');

  function loadSummary() {
    adminApi.emailQueueSummary().then(setSummary).catch(() => setSummary(null));
  }
  function loadItems() {
    const params = new URLSearchParams();
    params.set('limit', '100');
    if (statusFilter) params.set('status', statusFilter);
    adminApi.emailQueue(params).then((d) => setItems(d.items)).catch(() => setItems([]));
  }

  useEffect(() => {
    loadSummary();
    const t = setInterval(loadSummary, 30_000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => loadItems(), [statusFilter]);

  async function retry(id: number) {
    await adminApi.emailQueueRetry(id);
    loadItems();
    loadSummary();
  }
  async function retryAll() {
    const { retried } = await adminApi.emailQueueRetryFailedToday();
    alert(`Retried ${retried} item(s)`);
    loadItems();
    loadSummary();
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Stat label="Pending" value={summary?.pending ?? 0} />
        <Stat label="Sent today" value={summary?.sent_today ?? 0} />
        <Stat label="Sent this week" value={summary?.sent_this_week ?? 0} />
        <Stat
          label="Failed today"
          value={summary?.failed_today ?? 0}
          tone={(summary?.failed_today ?? 0) > 0 ? 'bad' : 'neutral'}
        />
        <Stat
          label="Oldest pending"
          valueText={
            summary?.oldest_pending_at
              ? formatDistanceToNow(new Date(summary.oldest_pending_at), { addSuffix: true })
              : '—'
          }
        />
        <Stat label="Next run in" valueText={`${summary?.next_run_in_min ?? '—'} min`} />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-sand-dark">
        <div className="flex items-center gap-3 p-4 border-b border-sand-dark">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-2 py-1 text-sm bg-white"
          >
            <option value="">All statuses</option>
            <option value="Pending">Pending</option>
            <option value="Sent">Sent</option>
            <option value="Failed">Failed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
          <button
            onClick={retryAll}
            className="ml-auto px-3 py-1.5 bg-amber-100 text-amber-800 rounded-lg text-sm hover:bg-amber-200 transition"
          >
            Retry all failed today
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-sand/50">
                <th className="text-left px-4 py-2 text-gray-600">Scheduled</th>
                <th className="text-left px-4 py-2 text-gray-600">Recipient</th>
                <th className="text-left px-4 py-2 text-gray-600">Template</th>
                <th className="text-left px-4 py-2 text-gray-600">Status</th>
                <th className="text-right px-4 py-2 text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-400">
                    No queued emails
                  </td>
                </tr>
              ) : (
                items.map((it) => (
                  <tr key={it.id} className="border-b border-sand-dark/50">
                    <td className="px-4 py-2 text-xs text-gray-500">
                      {format(new Date(it.scheduled_for), 'MMM d, HH:mm')}
                    </td>
                    <td className="px-4 py-2">{it.contact?.email ?? it.contact?.name ?? '—'}</td>
                    <td className="px-4 py-2 text-gray-600">{it.template ?? '—'}</td>
                    <td className="px-4 py-2">
                      <Badge text={it.status} />
                    </td>
                    <td className="px-4 py-2 text-right">
                      {it.status !== 'Sent' && (
                        <button
                          onClick={() => retry(it.id)}
                          className="text-primary hover:underline text-xs"
                        >
                          Retry
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Stage Automation tab ──

function StageTab() {
  const [items, setItems] = useState<Awaited<ReturnType<typeof adminApi.automationLog>>['items']>([]);
  const [selected, setSelected] = useState<(typeof items)[number] | null>(null);

  function load() {
    const params = new URLSearchParams();
    params.set('limit', '200');
    adminApi.automationLog(params).then((d) => setItems(d.items)).catch(() => setItems([]));
  }
  useEffect(load, []);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-sand-dark overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-sand/50">
            <th className="text-left px-4 py-2 text-gray-600">When</th>
            <th className="text-left px-4 py-2 text-gray-600">Contact</th>
            <th className="text-left px-4 py-2 text-gray-600">Transition</th>
            <th className="text-right px-4 py-2 text-gray-600">Actions</th>
            <th className="text-left px-4 py-2 text-gray-600">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={5} className="text-center py-8 text-gray-400">
                No transitions
              </td>
            </tr>
          ) : (
            items.map((it) => (
              <tr
                key={it.id}
                onClick={() => setSelected(it)}
                className="border-b border-sand-dark/50 hover:bg-sand/30 cursor-pointer"
              >
                <td className="px-4 py-2 text-xs">
                  {format(new Date(it.fired_at), 'MMM d, HH:mm')}
                </td>
                <td className="px-4 py-2">
                  {it.contact ? (
                    <a
                      href={`/contacts/${it.contact.id}`}
                      className="text-primary hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {it.contact.name}
                    </a>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-4 py-2 text-gray-700">
                  {it.from_stage ?? '—'} → {it.to_stage ?? '—'}
                </td>
                <td className="px-4 py-2 text-right">{it.actions.length}</td>
                <td className="px-4 py-2">
                  <Badge text={it.status} />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      {selected && (
        <Drawer title="Transition Detail" onClose={() => setSelected(null)}>
          <p className="text-sm mb-3">
            <strong>{selected.from_stage ?? '—'}</strong> →{' '}
            <strong>{selected.to_stage ?? '—'}</strong>
          </p>
          <h4 className="font-semibold text-sm mb-2">Side-effects</h4>
          {selected.actions.length === 0 ? (
            <p className="text-sm text-gray-400">No side-effects recorded</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {selected.actions.map((a) => (
                <li key={a.id} className="flex items-start gap-2">
                  <Badge text={a.type} />
                  <span className="text-gray-700">{a.subject ?? '(no subject)'}</span>
                </li>
              ))}
            </ul>
          )}
        </Drawer>
      )}
    </div>
  );
}

// ── Background Jobs tab ──

function JobsTab() {
  const [heatmap, setHeatmap] = useState<Awaited<ReturnType<typeof adminApi.jobsHeatmap>> | null>(
    null,
  );
  const [runs, setRuns] = useState<Awaited<ReturnType<typeof adminApi.jobsRuns>>['runs']>([]);
  const [jobFilter, setJobFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<(typeof runs)[number] | null>(null);

  function loadHeatmap() {
    adminApi.jobsHeatmap(30).then(setHeatmap).catch(() => setHeatmap(null));
  }
  function loadRuns() {
    const params = new URLSearchParams();
    params.set('limit', '200');
    if (jobFilter) params.set('jobName', jobFilter);
    if (statusFilter) params.set('status', statusFilter);
    adminApi.jobsRuns(params).then((d) => setRuns(d.runs)).catch(() => setRuns([]));
  }

  useEffect(() => {
    loadHeatmap();
    loadRuns();
  }, []);
  useEffect(loadRuns, [jobFilter, statusFilter]);

  // Build per-job-per-day matrix from cells
  const { jobNames, days, matrix } = useMemo(() => {
    if (!heatmap) return { jobNames: [] as string[], days: [] as string[], matrix: {} as Record<string, Record<string, { success: number; partial: number; failed: number }>> };
    const days: string[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = heatmap.days - 1; i >= 0; i--) {
      const d = subDays(today, i);
      days.push(format(d, 'yyyy-MM-dd'));
    }
    const jobNames = Array.from(new Set(heatmap.cells.map((c) => c.job_name))).sort();
    const matrix: Record<string, Record<string, { success: number; partial: number; failed: number }>> = {};
    for (const j of jobNames) matrix[j] = {};
    for (const c of heatmap.cells) {
      matrix[c.job_name][c.day] = { success: c.success, partial: c.partial, failed: c.failed };
    }
    return { jobNames, days, matrix };
  }, [heatmap]);

  function cellColor(cell?: { success: number; partial: number; failed: number }) {
    if (!cell) return 'bg-sand-dark/30';
    if (cell.failed > 0) return 'bg-red-400';
    if (cell.partial > 0) return 'bg-amber-300';
    if (cell.success > 0) return 'bg-green-400';
    return 'bg-sand-dark/30';
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-sand-dark p-4 overflow-x-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-primary-dark">30-day Heatmap</h2>
          <button
            onClick={loadHeatmap}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-primary"
          >
            <RefreshCw className="h-3 w-3" /> Refresh
          </button>
        </div>
        <table className="text-xs">
          <thead>
            <tr>
              <th className="text-left pr-3 text-gray-500 font-normal">Job</th>
              {days.map((d) => (
                <th key={d} className="font-normal text-gray-400 px-0.5">
                  {d.slice(8)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {jobNames.map((j) => (
              <tr key={j}>
                <td className="pr-3 py-0.5 text-gray-700 font-mono">{j}</td>
                {days.map((d) => {
                  const cell = matrix[j]?.[d];
                  return (
                    <td key={d} className="p-0.5">
                      <div
                        title={
                          cell
                            ? `s:${cell.success} p:${cell.partial} f:${cell.failed}`
                            : 'no runs'
                        }
                        className={cn('w-4 h-4 rounded-sm', cellColor(cell))}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
            {jobNames.length === 0 && (
              <tr>
                <td className="py-4 text-gray-400">No runs in window</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-sand-dark">
        <div className="flex items-center gap-3 p-4 border-b border-sand-dark">
          <select
            value={jobFilter}
            onChange={(e) => setJobFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-2 py-1 text-sm bg-white"
          >
            <option value="">All jobs</option>
            {jobNames.map((j) => (
              <option key={j} value={j}>
                {j}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-2 py-1 text-sm bg-white"
          >
            <option value="">All statuses</option>
            <option value="success">success</option>
            <option value="partial">partial</option>
            <option value="failed">failed</option>
            <option value="running">running</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-sand/50">
                <th className="text-left px-4 py-2 text-gray-600">Job</th>
                <th className="text-left px-4 py-2 text-gray-600">Started</th>
                <th className="text-right px-4 py-2 text-gray-600">Duration</th>
                <th className="text-left px-4 py-2 text-gray-600">Status</th>
                <th className="text-right px-4 py-2 text-gray-600">OK</th>
                <th className="text-right px-4 py-2 text-gray-600">Failed</th>
                <th className="text-left px-4 py-2 text-gray-600">Error</th>
              </tr>
            </thead>
            <tbody>
              {runs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-400">
                    No runs
                  </td>
                </tr>
              ) : (
                runs.map((r) => {
                  const dur =
                    r.finished_at
                      ? new Date(r.finished_at).getTime() - new Date(r.started_at).getTime()
                      : null;
                  return (
                    <tr
                      key={r.id}
                      onClick={() => setSelected(r)}
                      className="border-b border-sand-dark/50 hover:bg-sand/30 cursor-pointer"
                    >
                      <td className="px-4 py-2 font-mono text-xs">{r.job_name}</td>
                      <td className="px-4 py-2 text-xs">
                        {format(new Date(r.started_at), 'MMM d, HH:mm:ss')}
                      </td>
                      <td className="px-4 py-2 text-right text-xs text-gray-500">
                        {dur ? `${(dur / 1000).toFixed(1)}s` : '—'}
                      </td>
                      <td className="px-4 py-2">
                        <Badge text={r.status} />
                      </td>
                      <td className="px-4 py-2 text-right">{r.items_processed}</td>
                      <td className="px-4 py-2 text-right text-red-600">{r.items_failed}</td>
                      <td className="px-4 py-2 text-xs text-gray-500 max-w-[300px] truncate">
                        {r.error?.split('\n')[0] ?? ''}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <Drawer title={`${selected.job_name} #${selected.id}`} onClose={() => setSelected(null)}>
          <dl className="space-y-1 text-sm mb-3">
            <Row label="Status" value={<Badge text={selected.status} />} />
            <Row label="Triggered by" value={selected.triggered_by} />
            <Row label="Started" value={format(new Date(selected.started_at), 'PPpp')} />
            {selected.finished_at && (
              <Row label="Finished" value={format(new Date(selected.finished_at), 'PPpp')} />
            )}
            <Row label="Items processed" value={selected.items_processed} />
            <Row label="Items failed" value={selected.items_failed} />
          </dl>
          {selected.error && (
            <>
              <h4 className="font-semibold text-sm mb-1">Error</h4>
              <pre className="bg-red-50 text-red-700 p-2 rounded text-xs whitespace-pre-wrap mb-3">
                {selected.error}
              </pre>
            </>
          )}
          {selected.log && (
            <>
              <h4 className="font-semibold text-sm mb-1">Log</h4>
              <pre className="bg-sand p-2 rounded text-xs whitespace-pre-wrap">{selected.log}</pre>
            </>
          )}
        </Drawer>
      )}
    </div>
  );
}

// ── shared ──

function Stat({
  label,
  value,
  valueText,
  tone,
}: {
  label: string;
  value?: number;
  valueText?: string;
  tone?: 'bad' | 'neutral';
}) {
  return (
    <div className="bg-white rounded-xl border border-sand-dark p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p
        className={cn(
          'text-xl font-semibold mt-0.5',
          tone === 'bad' ? 'text-red-600' : 'text-primary-dark',
        )}
      >
        {valueText ?? value ?? 0}
      </p>
    </div>
  );
}

function Badge({ text }: { text: string }) {
  const t = text.toLowerCase();
  const map: Record<string, string> = {
    success: 'bg-green-100 text-green-700',
    sent: 'bg-green-100 text-green-700',
    pending: 'bg-blue-100 text-blue-700',
    partial: 'bg-amber-100 text-amber-700',
    failed: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-700',
    running: 'bg-blue-100 text-blue-700',
  };
  return (
    <span
      className={cn(
        'px-2 py-0.5 rounded-full text-xs font-medium',
        map[t] || 'bg-gray-100 text-gray-700',
      )}
    >
      {text}
    </span>
  );
}

function Drawer({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-end" onClick={onClose}>
      <div
        className="bg-white w-full max-w-xl h-full overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-primary-dark">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-gray-800 text-right">{value}</dd>
    </div>
  );
}
