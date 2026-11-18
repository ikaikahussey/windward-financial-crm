import { useEffect, useState } from 'react';
import { apiRaw } from '@/lib/api';
import { cn } from '@/lib/utils';
import { PageHelp } from '@/components/PageHelp';
import { AlertTriangle, CalendarCheck } from 'lucide-react';

interface Messages {
  invite: string;
  confirmation: string;
  reminder24h: string;
  reminder1h: string;
  noShow: string;
}

interface Config {
  timezone: string;
  days: number[];
  startTime: string;
  endTime: string;
  durationMinutes: number;
  slotStepMinutes: number;
  bufferMinutes: number;
  minNoticeHours: number;
  horizonDays: number;
  ignoreAllDay: boolean;
  location: string;
  nudgeAfterMinutes: number;
  messages: Messages;
}

interface Rep {
  id: number;
  name: string;
  isLeadRep: boolean;
  calendarFeedUrl: string | null;
}

interface State {
  config: Config;
  defaults: Config;
  messageVariables: string[];
  reps: Rep[];
  warnings: string[];
}

interface TestResult {
  calendarConnected: boolean;
  busyBlocks: number | null;
  openSlots: number;
  nextOpen: string[];
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MESSAGE_LABELS: Record<keyof Messages, string> = {
  invite: 'Booking link (new leads who have not booked)',
  confirmation: 'Confirmation (right after booking)',
  reminder24h: 'Reminder, 24 hours before',
  reminder1h: 'Reminder, 1 hour before',
  noShow: 'Missed call (rebooking link)',
};

const inputCls =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30';

function Num({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  suffix: string;
}) {
  return (
    <label className="block text-sm">
      <span className="block text-gray-700 mb-1">{label}</span>
      <span className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className={cn(inputCls, 'w-24')}
        />
        <span className="text-gray-500">{suffix}</span>
      </span>
    </label>
  );
}

export default function Booking() {
  const [state, setState] = useState<State | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function apply(s: State) {
    setState(s);
    setConfig(s.config);
  }

  useEffect(() => {
    apiRaw.get<State>('/api/booking-settings').then(apply).catch((e) => setError(e.message));
  }, []);

  if (!state || !config) return <div className="text-gray-500">{error ?? 'Loading…'}</div>;

  const dirty = JSON.stringify(config) !== JSON.stringify(state.config);
  const set = <K extends keyof Config>(key: K, value: Config[K]) => setConfig({ ...config, [key]: value });

  async function save() {
    setError(null);
    setNotice(null);
    setSaving(true);
    try {
      apply(await apiRaw.put<State>('/api/booking-settings', config));
      setNotice('Saved.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 max-w-5xl">
      <h1 className="text-2xl font-bold text-primary-dark">Booking</h1>

      <PageHelp
        id="booking"
        title="What does this page control?"
        description="Clients pick their own call time from a link we text them. Open times are your working hours, minus what is busy on the rep's calendar, minus calls already booked here."
        tips={[
          'Calendar link: in Proton Calendar on the web, open Settings → Calendars → pick the calendar → Share with anyone → Create link. Limited view is enough; only the times are read.',
          'When a client books, the rep gets a text and an email with a calendar invite to add to Proton.',
          'Booking moves the contact to Consultation Scheduled automatically. Clients can reschedule or cancel from the same link.',
          'New leads who have not booked or been reached get the link by text once, after the delay set below, between 8am and 8pm only.',
        ]}
      />

      {state.warnings.map((w) => (
        <div key={w} className="flex items-center gap-2 bg-amber-50 text-amber-800 border border-amber-200 p-3 rounded-lg text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {w}
        </div>
      ))}
      {error && <div className="bg-coral-light text-coral p-3 rounded-lg text-sm">{error}</div>}
      {notice && <div className="bg-primary-light/40 text-primary-dark p-3 rounded-lg text-sm">{notice}</div>}

      {/* ── Rep calendars ── */}
      <section className="bg-white rounded-xl shadow-sm border border-sand-dark overflow-hidden">
        <div className="px-4 py-3 border-b border-sand-dark bg-sand/50">
          <h2 className="font-semibold text-primary-dark">Rep calendars</h2>
        </div>
        <div className="divide-y divide-sand-dark">
          {state.reps
            .filter((r) => r.isLeadRep || r.calendarFeedUrl)
            .map((rep) => (
              <RepCalendar key={rep.id} rep={rep} onSaved={apply} onError={setError} />
            ))}
          {state.reps.every((r) => !r.isLeadRep && !r.calendarFeedUrl) && (
            <p className="p-4 text-sm text-gray-500">Select reps on the Welcome Text page first.</p>
          )}
        </div>
      </section>

      {/* ── Hours ── */}
      <section className="bg-white rounded-xl shadow-sm border border-sand-dark p-4 space-y-4">
        <h2 className="font-semibold text-primary-dark">Hours and call length</h2>
        <div className="flex flex-wrap gap-2">
          {DAYS.map((d, i) => (
            <button
              key={d}
              type="button"
              onClick={() =>
                set('days', config.days.includes(i) ? config.days.filter((x) => x !== i) : [...config.days, i].sort())
              }
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium border',
                config.days.includes(i)
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-gray-600 border-gray-200',
              )}
            >
              {d}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-6">
          <label className="block text-sm">
            <span className="block text-gray-700 mb-1">First call starts</span>
            <input type="time" value={config.startTime} onChange={(e) => set('startTime', e.target.value)} className={cn(inputCls, 'w-36')} />
          </label>
          <label className="block text-sm">
            <span className="block text-gray-700 mb-1">Last call ends</span>
            <input type="time" value={config.endTime} onChange={(e) => set('endTime', e.target.value)} className={cn(inputCls, 'w-36')} />
          </label>
          <Num label="Call length" value={config.durationMinutes} onChange={(n) => set('durationMinutes', n)} suffix="min" />
          <Num label="Offer a time every" value={config.slotStepMinutes} onChange={(n) => set('slotStepMinutes', n)} suffix="min" />
          <Num label="Gap around other events" value={config.bufferMinutes} onChange={(n) => set('bufferMinutes', n)} suffix="min" />
          <Num label="Earliest booking" value={config.minNoticeHours} onChange={(n) => set('minNoticeHours', n)} suffix="hours ahead" />
          <Num label="Show the next" value={config.horizonDays} onChange={(n) => set('horizonDays', n)} suffix="days" />
          <Num label="Text the link to unbooked leads after" value={config.nudgeAfterMinutes} onChange={(n) => set('nudgeAfterMinutes', n)} suffix="min (0 = off)" />
        </div>
        <div className="flex flex-wrap gap-6 items-end">
          <label className="block text-sm flex-1 min-w-[14rem]">
            <span className="block text-gray-700 mb-1">Where the call happens</span>
            <input value={config.location} onChange={(e) => set('location', e.target.value)} className={inputCls} />
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 pb-2">
            <input type="checkbox" checked={config.ignoreAllDay} onChange={(e) => set('ignoreAllDay', e.target.checked)} />
            All-day calendar events do not block booking
          </label>
        </div>
        <p className="text-xs text-gray-500">Time zone: {config.timezone}</p>
      </section>

      {/* ── Messages ── */}
      <section className="bg-white rounded-xl shadow-sm border border-sand-dark p-4 space-y-3">
        <h2 className="font-semibold text-primary-dark">Texts</h2>
        <p className="text-xs text-gray-500">
          Variables: {state.messageVariables.map((v) => `{{${v}}}`).join('  ')}
        </p>
        {(Object.keys(MESSAGE_LABELS) as (keyof Messages)[]).map((key) => (
          <label key={key} className="block text-sm">
            <span className="flex items-center justify-between text-gray-700 mb-1">
              {MESSAGE_LABELS[key]}
              {config.messages[key] !== state.defaults.messages[key] && (
                <button
                  type="button"
                  className="text-xs text-gray-500 hover:text-gray-800"
                  onClick={() => set('messages', { ...config.messages, [key]: state.defaults.messages[key] })}
                >
                  Reset to default
                </button>
              )}
            </span>
            <textarea
              rows={3}
              value={config.messages[key]}
              onChange={(e) => set('messages', { ...config.messages, [key]: e.target.value })}
              className={cn(inputCls, 'font-mono')}
            />
          </label>
        ))}
      </section>

      <div className="sticky bottom-0 bg-sand/90 backdrop-blur py-3 flex items-center gap-3">
        <button
          disabled={!dirty || saving}
          onClick={save}
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50"
        >
          Save changes
        </button>
        {dirty && (
          <button type="button" onClick={() => setConfig(state.config)} className="text-sm text-gray-600 hover:text-gray-800">
            Discard
          </button>
        )}
      </div>
    </div>
  );
}

function RepCalendar({
  rep,
  onSaved,
  onError,
}: {
  rep: Rep;
  onSaved: (s: State) => void;
  onError: (msg: string | null) => void;
}) {
  const [url, setUrl] = useState(rep.calendarFeedUrl ?? '');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  useEffect(() => setUrl(rep.calendarFeedUrl ?? ''), [rep.calendarFeedUrl]);
  const dirty = url !== (rep.calendarFeedUrl ?? '');

  async function run(fn: () => Promise<void>) {
    onError(null);
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setResult(null);
      onError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  const save = () =>
    run(async () => {
      onSaved(await apiRaw.patch<State>(`/api/booking-settings/reps/${rep.id}`, { calendarFeedUrl: url || null }));
      setResult(null);
    });
  const test = () =>
    run(async () => setResult(await apiRaw.post<TestResult>(`/api/booking-settings/reps/${rep.id}/test`)));

  return (
    <div className="p-4 space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-44 font-medium text-gray-900">{rep.name}</div>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://calendar.proton.me/api/calendar/v1/url/…"
          className={cn(inputCls, 'flex-1 min-w-[16rem] font-mono text-xs')}
        />
        <button
          disabled={!dirty || busy}
          onClick={save}
          className="px-3 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-40"
        >
          Save
        </button>
        <button
          disabled={dirty || busy}
          onClick={test}
          className="flex items-center gap-2 px-3 py-2 border border-primary text-primary-dark rounded-lg text-sm font-medium hover:bg-primary-light/30 disabled:opacity-40"
        >
          <CalendarCheck className="h-4 w-4" /> Test
        </button>
      </div>
      {result && (
        <p className="text-xs text-gray-600 pl-1">
          {result.calendarConnected
            ? `Calendar read: ${result.busyBlocks} busy block${result.busyBlocks === 1 ? '' : 's'} in the booking window.`
            : 'No calendar link; only CRM bookings block times.'}{' '}
          {result.openSlots} open times. {result.nextOpen.length > 0 && `Next: ${result.nextOpen.join(' · ')}`}
        </p>
      )}
    </div>
  );
}
