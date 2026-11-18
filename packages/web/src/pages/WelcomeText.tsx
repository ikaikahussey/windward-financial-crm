import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { apiRaw } from '@/lib/api';
import { cn } from '@/lib/utils';
import { PageHelp } from '@/components/PageHelp';
import { AlertTriangle, Camera, Send, Trash2 } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

interface Rep {
  id: number;
  name: string;
  email: string;
  role: string;
  phone: string | null;
  title: string | null;
  profileSlug: string | null;
  isLeadRep: boolean;
  hasPhoto: boolean;
  photoUrl: string | null;
  cardUrl: string | null;
  warnings: string[];
}

interface State {
  enabled: boolean;
  template: string;
  defaultTemplate: string;
  maxTemplateLength: number;
  variables: { name: string; description: string }[];
  reps: Rep[];
  warnings: string[];
  preview: { body: string; length: number; segments: number; repId: number | null };
}

const inputCls =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30';

/** Downscale to a 600px square JPEG so the upload stays under the 600 KB limit. */
function fileToSquareJpeg(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const size = 600;
      const side = Math.min(img.width, img.height);
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Could not read image'));
      ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
      URL.revokeObjectURL(img.src);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => reject(new Error('Could not read image'));
    img.src = URL.createObjectURL(file);
  });
}

export default function WelcomeText() {
  const [state, setState] = useState<State | null>(null);
  const [template, setTemplate] = useState('');
  const [preview, setPreview] = useState<State['preview'] | null>(null);
  const [previewRepId, setPreviewRepId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testTo, setTestTo] = useState('');
  const textarea = useRef<HTMLTextAreaElement>(null);

  function apply(s: State) {
    setState(s);
    setTemplate(s.template);
    setPreview(s.preview);
    setPreviewRepId((id) => id ?? s.preview.repId);
  }

  useEffect(() => {
    apiRaw.get<State>('/api/welcome-text').then(apply).catch((e) => setError(e.message));
  }, []);

  // Live preview of the unsaved template.
  useEffect(() => {
    if (!state || !template.trim()) return;
    const t = setTimeout(() => {
      apiRaw
        .post<State['preview']>('/api/welcome-text/preview', { template, repId: previewRepId })
        .then((p) => {
          setPreview(p);
          setError(null);
        })
        .catch((e) => setError(e.message));
    }, 300);
    return () => clearTimeout(t);
  }, [template, previewRepId, state]);

  async function run(fn: () => Promise<State>, done?: string) {
    setError(null);
    setNotice(null);
    setSaving(true);
    try {
      apply(await fn());
      if (done) setNotice(done);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  const saveSettings = (body: Partial<Pick<State, 'enabled' | 'template'>>, done?: string) =>
    run(() => apiRaw.put<State>('/api/welcome-text', body), done);

  const saveRep = (id: number, body: Record<string, unknown>, done?: string) =>
    run(() => apiRaw.patch<State>(`/api/welcome-text/reps/${id}`, body), done);

  function insertVariable(name: string) {
    const el = textarea.current;
    const token = `{{${name}}}`;
    if (!el) return setTemplate((t) => t + token);
    const next = template.slice(0, el.selectionStart) + token + template.slice(el.selectionEnd);
    const pos = el.selectionStart + token.length;
    setTemplate(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  }

  async function sendTest() {
    setError(null);
    setNotice(null);
    try {
      const r = await apiRaw.post<{ from: string }>('/api/welcome-text/test', { to: testTo, repId: previewRepId });
      setNotice(`Test text sent from ${r.from}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Test failed');
    }
  }

  if (!state) {
    return <div className="text-gray-500">{error ?? 'Loading…'}</div>;
  }

  const dirty = template !== state.template;
  const activeReps = state.reps.filter((r) => r.isLeadRep);

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary-dark">Welcome Text</h1>
        <label className="flex items-center gap-3 text-sm font-medium text-gray-700">
          {state.enabled ? 'On' : 'Off'}
          <button
            role="switch"
            aria-checked={state.enabled}
            disabled={saving}
            onClick={() => saveSettings({ enabled: !state.enabled })}
            className={cn(
              'relative h-6 w-11 rounded-full transition-colors',
              state.enabled ? 'bg-primary' : 'bg-gray-300',
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all',
                state.enabled ? 'left-5' : 'left-0.5',
              )}
            />
          </button>
        </label>
      </div>

      <PageHelp
        id="welcome-text"
        title="What does this page control?"
        description="The text a new client gets seconds after registering on the website. It names their rep, gives the rep's phone and email, links to the rep's photo, and says the rep will call."
        tips={[
          'Reps: check the people who should receive new registrations. Leads rotate evenly across everyone checked.',
          'Phone, title and photo here are what the client sees. Email is the rep’s login email (change it under Users).',
          'Message: edit the wording freely. Variables in {{braces}} are filled in for each client and rep.',
          'The photo is sent as a link to the rep’s card; text messages from our phone system cannot carry an attached image.',
          'Each new registration also creates an Urgent call task for the rep and texts the rep an alert.',
        ]}
      />

      {state.warnings.map((w) => (
        <div key={w} className="flex items-center gap-2 bg-amber-50 text-amber-800 border border-amber-200 p-3 rounded-lg text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {w}
        </div>
      ))}
      {error && <div className="bg-coral-light text-coral p-3 rounded-lg text-sm">{error}</div>}
      {notice && <div className="bg-primary-light/40 text-primary-dark p-3 rounded-lg text-sm">{notice}</div>}

      {/* ── Reps ── */}
      <section className="bg-white rounded-xl shadow-sm border border-sand-dark overflow-hidden">
        <div className="px-4 py-3 border-b border-sand-dark bg-sand/50 flex items-center justify-between">
          <h2 className="font-semibold text-primary-dark">Reps</h2>
          <span className="text-xs text-gray-500">
            {activeReps.length} in rotation
          </span>
        </div>
        <div className="divide-y divide-sand-dark">
          {state.reps.map((rep) => (
            <RepRow key={rep.id} rep={rep} disabled={saving} onSave={saveRep} onError={setError} />
          ))}
        </div>
      </section>

      {/* ── Message ── */}
      <section className="bg-white rounded-xl shadow-sm border border-sand-dark p-4 space-y-3">
        <h2 className="font-semibold text-primary-dark">Message</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <textarea
              ref={textarea}
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              rows={8}
              maxLength={state.maxTemplateLength}
              className={cn(inputCls, 'font-mono')}
            />
            <div className="flex flex-wrap gap-1.5">
              {state.variables.map((v) => (
                <button
                  key={v.name}
                  type="button"
                  title={v.description}
                  onClick={() => insertVariable(v.name)}
                  className="px-2 py-1 rounded-md bg-sand text-xs font-mono text-primary-dark hover:bg-sand-dark"
                >
                  {`{{${v.name}}}`}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button
                disabled={!dirty || saving}
                onClick={() => saveSettings({ template }, 'Message saved.')}
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50"
              >
                Save message
              </button>
              <button
                type="button"
                onClick={() => setTemplate(state.defaultTemplate)}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Reset to default
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Preview as</span>
              <select
                value={previewRepId ?? ''}
                onChange={(e) => setPreviewRepId(Number(e.target.value))}
                className="border border-gray-200 rounded-md px-2 py-1 bg-white text-gray-700"
              >
                {state.reps.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="bg-sand rounded-2xl rounded-bl-sm p-3 text-sm text-gray-800 whitespace-pre-wrap break-words">
              {preview?.body}
            </div>
            <p className="text-xs text-gray-500">
              {preview?.length ?? 0} characters · {preview?.segments ?? 0} SMS segment
              {preview?.segments === 1 ? '' : 's'}
              {dirty && ' · unsaved'}
            </p>
            <div className="flex items-center gap-2 pt-2">
              <input
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
                placeholder="Your mobile number"
                className={inputCls}
              />
              <button
                onClick={sendTest}
                disabled={!testTo || dirty}
                title={dirty ? 'Save the message first' : undefined}
                className="flex items-center gap-2 px-3 py-2 border border-primary text-primary-dark rounded-lg text-sm font-medium whitespace-nowrap hover:bg-primary-light/30 disabled:opacity-50"
              >
                <Send className="h-4 w-4" /> Send test
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function RepRow({
  rep,
  disabled,
  onSave,
  onError,
}: {
  rep: Rep;
  disabled: boolean;
  onSave: (id: number, body: Record<string, unknown>, done?: string) => Promise<void>;
  onError: (msg: string) => void;
}) {
  const [phone, setPhone] = useState(rep.phone ?? '');
  const [title, setTitle] = useState(rep.title ?? '');
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPhone(rep.phone ?? '');
    setTitle(rep.title ?? '');
  }, [rep.phone, rep.title]);

  const dirty = phone !== (rep.phone ?? '') || title !== (rep.title ?? '');

  async function onPhoto(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      await onSave(rep.id, { photo: await fileToSquareJpeg(f) }, `Photo updated for ${rep.name}.`);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not read image');
    }
  }

  return (
    <div className={cn('p-4 flex flex-wrap items-center gap-4', !rep.isLeadRep && 'bg-gray-50/60')}>
      <input
        type="checkbox"
        checked={rep.isLeadRep}
        disabled={disabled}
        onChange={(e) => onSave(rep.id, { isLeadRep: e.target.checked })}
        className="h-5 w-5"
        aria-label={`${rep.name} receives new registrations`}
      />

      <div className="relative shrink-0">
        {rep.photoUrl ? (
          <img src={`${API_BASE}${rep.photoUrl}`} alt={rep.name} className="h-14 w-14 rounded-full object-cover" />
        ) : (
          <div className="h-14 w-14 rounded-full bg-primary-light/40 text-primary-dark flex items-center justify-center font-semibold">
            {rep.name.split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase()}
          </div>
        )}
        <button
          type="button"
          onClick={() => file.current?.click()}
          disabled={disabled}
          title="Upload photo"
          className="absolute -bottom-1 -right-1 bg-white border border-gray-200 rounded-full p-1 text-gray-600 hover:text-primary"
        >
          <Camera className="h-3.5 w-3.5" />
        </button>
        <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={onPhoto} />
      </div>

      <div className="min-w-[10rem] flex-1">
        <div className="font-medium text-gray-900">{rep.name}</div>
        <div className="text-xs text-gray-500 break-all">{rep.email}</div>
        {rep.isLeadRep && rep.cardUrl && (
          <a
            href={rep.cardUrl.startsWith('http') ? rep.cardUrl : `${API_BASE}${rep.cardUrl}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-ocean hover:underline"
          >
            View photo card
          </a>
        )}
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        className={cn(inputCls, 'w-44')}
      />
      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="Phone"
        className={cn(inputCls, 'w-40')}
      />
      <button
        disabled={!dirty || disabled}
        onClick={() => onSave(rep.id, { phone, title }, `Saved ${rep.name}.`)}
        className="px-3 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-40"
      >
        Save
      </button>
      {rep.hasPhoto && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSave(rep.id, { photo: null })}
          title="Remove photo"
          className="text-gray-400 hover:text-coral"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}

      {rep.warnings.length > 0 && (
        <div className="w-full flex items-center gap-2 text-xs text-amber-700">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {rep.warnings.join(' · ')}
        </div>
      )}
    </div>
  );
}
