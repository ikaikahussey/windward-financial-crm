import { useEffect, useMemo, useState } from 'react';
import { adminApi, type QuoHealth, type WebhookEventRow } from '@/lib/admin-api';
import { cn } from '@/lib/utils';
import {
  Activity,
  CheckCircle2,
  XCircle,
  RefreshCw,
  KeyRound,
  Clock,
  Webhook,
  X,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { PageHelp } from '@/components/PageHelp';

const HEALTH_REFRESH_MS = 30_000;

export default function QuoStatus() {
  const [health, setHealth] = useState<QuoHealth | null>(null);
  const [events, setEvents] = useState<WebhookEventRow[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [unmatchedOnly, setUnmatchedOnly] = useState(false);
  const [showWebhookDetail, setShowWebhookDetail] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<WebhookEventRow | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  function loadHealth() {
    adminApi.quoHealth().then(setHealth).catch(() => setHealth(null));
  }

  function loadEvents() {
    setEventsLoading(true);
    const params = new URLSearchParams();
    params.set('limit', '50');
    if (eventTypeFilter) params.set('eventType', eventTypeFilter);
    if (unmatchedOnly) params.set('matched', 'false');
    adminApi
      .quoWebhookEvents(params)
      .then((d) => setEvents(d.events))
      .catch(() => setEvents([]))
      .finally(() => setEventsLoading(false));
  }

  useEffect(() => {
    loadHealth();
    const t = setInterval(loadHealth, HEALTH_REFRESH_MS);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    loadEvents();
  }, [eventTypeFilter, unmatchedOnly]);

  async function handleSyncNow() {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const { previous_run_id } = await adminApi.quoSyncNow();
      // Poll history until a newer run shows up or 30s elapse.
      const start = Date.now();
      while (Date.now() - start < 30_000) {
        await new Promise((r) => setTimeout(r, 2000));
        const { runs } = await adminApi.quoSyncHistory(1);
        const latest = runs[0];
        if (latest && latest.id !== previous_run_id) {
          setSyncMsg(`Sync ${latest.status}`);
          loadHealth();
          break;
        }
      }
    } catch (err) {
      setSyncMsg(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }

  const eventTypes = useMemo(() => {
    const set = new Set(events.map((e) => e.event_type));
    return Array.from(set).sort();
  }, [events]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary-dark">Quo Status</h1>
        <div className="flex gap-2">
          <button
            onClick={loadHealth}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-sand-dark text-gray-700 rounded-lg text-sm hover:bg-sand transition"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <button
            onClick={handleSyncNow}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary-dark transition disabled:opacity-50"
          >
            <Activity className="h-4 w-4" />
            {syncing ? 'Syncing…' : 'Sync Now'}
          </button>
        </div>
      </div>

      <PageHelp
        id="ops-quo"
        title="What is Quo Status?"
        description="Health dashboard for the OpenPhone (Quo) integration that powers calls and SMS. First place to look when communications stop syncing."
        tips={[
          'API Key card flips red when QUO_API_KEY is unset; set it in env or in Settings → Quo Integration.',
          'Webhooks card shows how many of the 4 expected events are registered. 0/4 is normal in dev; should be 4/4 in prod.',
          '24-hour counters show webhook volume + outcome. A growing "Unmatched" count usually means a new phone number isn\'t on a contact yet.',
          'Sync Now triggers a manual quo-sync job and polls until it lands; check Operations → Automation Activity for the run record.',
          'Click any webhook row to see the full JSON payload OpenPhone sent — useful for debugging unmatched events.',
        ]}
      />

      {syncMsg && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-3 py-2 rounded-lg text-sm">
          {syncMsg}
        </div>
      )}

      {/* Health strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <HealthCard
          icon={<KeyRound className="h-4 w-4" />}
          label="API Key"
          value={health?.api_key_configured ? 'Configured' : 'Missing'}
          tone={health?.api_key_configured ? 'good' : 'bad'}
        />
        <HealthCard
          icon={<RefreshCw className="h-4 w-4" />}
          label="Last Sync"
          value={
            health?.last_sync_at
              ? formatDistanceToNow(new Date(health.last_sync_at), { addSuffix: true })
              : '—'
          }
          tone={health?.last_sync_status === 'success' ? 'good' : health?.last_sync_status === 'failed' ? 'bad' : 'neutral'}
        />
        <HealthCard
          icon={<Clock className="h-4 w-4" />}
          label="Next Sync"
          value={
            health?.next_sync_at
              ? formatDistanceToNow(new Date(health.next_sync_at), { addSuffix: true })
              : '—'
          }
          tone="neutral"
        />
        <button
          onClick={() => setShowWebhookDetail((v) => !v)}
          className="text-left bg-white rounded-xl border border-sand-dark p-4 hover:border-primary transition"
        >
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Webhook className="h-4 w-4" /> Webhooks
          </div>
          <p className="text-2xl font-semibold text-primary-dark mt-1">
            {health?.registered_webhooks?.filter((w) => w.registered).length ?? 0}/
            {health?.registered_webhooks?.length ?? 0}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {showWebhookDetail ? 'Click to collapse' : 'Click to expand'}
          </p>
        </button>
      </div>

      {showWebhookDetail && health?.registered_webhooks && (
        <div className="bg-white rounded-xl shadow-sm border border-sand-dark p-4">
          <h3 className="font-semibold text-primary-dark mb-3">Registered Webhooks</h3>
          <ul className="space-y-2">
            {health.registered_webhooks.map((w) => (
              <li key={w.event} className="flex items-center gap-2 text-sm">
                {w.registered ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span className="font-mono">{w.event}</span>
                <span className={cn('ml-auto text-xs', w.registered ? 'text-green-700' : 'text-red-600')}>
                  {w.registered ? 'registered' : 'missing'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 24-hour counters */}
      <div className="grid grid-cols-4 gap-4">
        <Counter label="Received (24h)" value={health?.counts?.last24h?.received ?? 0} />
        <Counter
          label="Processed"
          value={health?.counts?.last24h?.processed ?? 0}
          tone="good"
        />
        <Counter
          label="Errors"
          value={health?.counts?.last24h?.error ?? 0}
          tone={(health?.counts?.last24h?.error ?? 0) > 0 ? 'bad' : 'neutral'}
        />
        <Counter
          label="Unmatched"
          value={health?.counts?.last24h?.unmatched ?? 0}
          tone={(health?.counts?.last24h?.unmatched ?? 0) > 0 ? 'warn' : 'neutral'}
        />
      </div>

      {/* Webhook activity feed */}
      <div className="bg-white rounded-xl shadow-sm border border-sand-dark">
        <div className="flex items-center gap-3 p-4 border-b border-sand-dark">
          <h2 className="font-semibold text-primary-dark mr-auto">Webhook Activity</h2>
          <select
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-2 py-1 text-sm bg-white"
          >
            <option value="">All events</option>
            {eventTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={unmatchedOnly}
              onChange={(e) => setUnmatchedOnly(e.target.checked)}
              className="rounded text-primary"
            />
            Unmatched only
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sand-dark bg-sand/50">
                <th className="text-left px-4 py-2 font-semibold text-gray-600">Time</th>
                <th className="text-left px-4 py-2 font-semibold text-gray-600">Event</th>
                <th className="text-left px-4 py-2 font-semibold text-gray-600">Contact</th>
                <th className="text-left px-4 py-2 font-semibold text-gray-600">Status</th>
                <th className="text-right px-4 py-2 font-semibold text-gray-600">ms</th>
              </tr>
            </thead>
            <tbody>
              {eventsLoading ? (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-gray-400">
                    Loading…
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-gray-400">
                    No webhook events
                  </td>
                </tr>
              ) : (
                events.map((e) => (
                  <tr
                    key={e.id}
                    onClick={() => setSelectedEvent(e)}
                    className="border-b border-sand-dark/50 hover:bg-sand/30 cursor-pointer"
                  >
                    <td className="px-4 py-2 text-gray-500 text-xs">
                      {format(new Date(e.received_at), 'MMM d, HH:mm:ss')}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">{e.event_type}</td>
                    <td className="px-4 py-2">
                      {e.matched_contact ? (
                        <a
                          href={`/contacts/${e.matched_contact.id}`}
                          className="text-primary hover:underline"
                          onClick={(ev) => ev.stopPropagation()}
                        >
                          {e.matched_contact.name}
                        </a>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <StatusBadge status={e.status} />
                    </td>
                    <td className="px-4 py-2 text-right text-gray-500 text-xs">
                      {e.processing_ms ?? '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedEvent && (
        <PayloadDrawer event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </div>
  );
}

function HealthCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: 'good' | 'bad' | 'neutral';
}) {
  const toneCls =
    tone === 'good'
      ? 'text-green-700'
      : tone === 'bad'
        ? 'text-red-600'
        : 'text-primary-dark';
  return (
    <div className="bg-white rounded-xl border border-sand-dark p-4">
      <div className="flex items-center gap-2 text-gray-500 text-sm">
        {icon} {label}
      </div>
      <p className={cn('text-lg font-semibold mt-1', toneCls)}>{value}</p>
    </div>
  );
}

function Counter({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: number;
  tone?: 'good' | 'bad' | 'warn' | 'neutral';
}) {
  const cls = {
    good: 'text-green-700',
    bad: 'text-red-600',
    warn: 'text-amber-600',
    neutral: 'text-primary-dark',
  }[tone];
  return (
    <div className="bg-white rounded-xl border border-sand-dark p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={cn('text-2xl font-bold mt-1', cls)}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    processed: 'bg-green-100 text-green-800',
    received: 'bg-blue-100 text-blue-800',
    error: 'bg-red-100 text-red-800',
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

function PayloadDrawer({
  event,
  onClose,
}: {
  event: WebhookEventRow;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-end" onClick={onClose}>
      <div
        className="bg-white w-full max-w-xl h-full overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-primary-dark">Webhook Event #{event.id}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <dl className="space-y-2 text-sm mb-4">
          <Row label="Event" value={<span className="font-mono">{event.event_type}</span>} />
          <Row label="Status" value={<StatusBadge status={event.status} />} />
          <Row label="Received" value={format(new Date(event.received_at), 'PPpp')} />
          <Row label="Processing time" value={`${event.processing_ms ?? '—'} ms`} />
          <Row
            label="Matched"
            value={event.matched_contact ? event.matched_contact.name : 'Unmatched'}
          />
          {event.error && (
            <Row label="Error" value={<pre className="text-xs whitespace-pre-wrap">{event.error}</pre>} />
          )}
        </dl>
        <h3 className="font-semibold text-primary-dark text-sm mb-2">Payload</h3>
        <pre className="bg-sand p-3 rounded-lg text-xs overflow-x-auto">
          {JSON.stringify(event.payload, null, 2)}
        </pre>
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
