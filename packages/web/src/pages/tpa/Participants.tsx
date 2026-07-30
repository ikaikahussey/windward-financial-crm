import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { TpaParticipant, TpaPlan, TpaSra, TpaVendor } from '@/types';
import { PageHelp } from '@/components/PageHelp';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Dialog, Field, DialogActions, fmtDate } from '@/pages/tpa/Plans';
import { formatMoney } from '@/lib/sheet';

const STATUSES = ['Active', 'Suspended', 'Terminated', 'Retired', 'Deceased'] as const;
const CONTRIB_TYPES = ['Employee Pre-Tax', 'Employee Roth', 'Employer Match', 'Employer Non-Elective'] as const;
const SRA_STATUSES = ['Pending', 'Active', 'Suspended', 'Terminated'] as const;

const inputCls =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30';

export default function TpaParticipants() {
  const [participants, setParticipants] = useState<TpaParticipant[]>([]);
  const [plans, setPlans] = useState<TpaPlan[]>([]);
  const [vendors, setVendors] = useState<TpaVendor[]>([]);
  const [planFilter, setPlanFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<TpaParticipant | 'new' | null>(null);

  function load() {
    setLoading(true);
    Promise.all([
      api.get<TpaParticipant[]>('/api/tpa/participants'),
      api.get<TpaPlan[]>('/api/tpa/plans'),
      api.get<TpaVendor[]>('/api/tpa/vendors'),
    ])
      .then(([p, pl, v]) => {
        setParticipants(p);
        setPlans(pl);
        setVendors(v);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load participants'))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  const visible = planFilter === 'All'
    ? participants
    : participants.filter((p) => String(p.plan_id) === planFilter);

  const activeSraTotal = (p: TpaParticipant) =>
    (p.sras || [])
      .filter((s) => s.status === 'Active')
      .reduce((sum, s) => sum + (parseFloat(s.per_pay_amount) || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-primary-dark">TPA — Participants</h1>
        <div className="flex items-center gap-2">
          <select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)} className={`${inputCls} w-auto bg-white`}>
            <option value="All">All plans</option>
            {plans.map((p) => <option key={p.id} value={p.id}>{p.employer_name} — {p.plan_name}</option>)}
          </select>
          <button
            onClick={() => setEditing('new')}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition text-sm font-medium"
          >
            <Plus className="h-4 w-4" /> Add Participant
          </button>
        </div>
      </div>

      <PageHelp
        id="tpa-participants"
        title="What lives on the Participants page?"
        description="Every employee enrolled in a plan you administer, with their salary reduction agreements (SRAs)."
        tips={[
          'Each participant belongs to one plan; link them to a CRM contact later if useful.',
          'Open a participant to manage their SRAs — vendor, pre-tax/Roth, and per-paycheck amount.',
          'Only Active SRAs on Active participants are picked up when you prefill a remittance batch.',
          'Birth date drives age-50 catch-up eligibility on the Compliance page.',
        ]}
      />

      {error && <div className="bg-coral-light text-coral p-3 rounded-lg text-sm">{error}</div>}

      <div className="bg-white rounded-xl shadow-sm border border-sand-dark overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]">
          <thead>
            <tr className="border-b border-sand-dark bg-sand/50">
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Name</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Plan</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Employee ID</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600">SRAs</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600">Per-Pay (Active)</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">Loading…</td></tr>
            ) : visible.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">No participants</td></tr>
            ) : (
              visible.map((p) => (
                <tr key={p.id} className="border-b border-sand-dark/50 hover:bg-sand/30">
                  <td className="px-4 py-3 font-medium text-primary-dark">{p.last_name}, {p.first_name}</td>
                  <td className="px-4 py-3 text-gray-600">{p.employer_name} — {p.plan_name}</td>
                  <td className="px-4 py-3 text-gray-600">{p.employee_id || '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-3 text-right text-gray-600">{(p.sras || []).length}</td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">{formatMoney(activeSraTotal(p))}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setEditing(p)} className="text-gray-400 hover:text-primary" title="Edit">
                      <Pencil className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="bg-sand/50 border-t border-sand-dark">
              <td colSpan={7} className="px-4 py-3 font-semibold text-primary-dark">
                {visible.length} participant{visible.length === 1 ? '' : 's'}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {editing && (
        <ParticipantDialog
          participant={editing === 'new' ? undefined : editing}
          plans={plans}
          vendors={vendors}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
          onChanged={load}
        />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Active: 'bg-green-100 text-green-800',
    Pending: 'bg-yellow-100 text-yellow-800',
    Suspended: 'bg-yellow-100 text-yellow-800',
    Terminated: 'bg-gray-200 text-gray-700',
    Retired: 'bg-blue-100 text-blue-800',
    Deceased: 'bg-gray-200 text-gray-700',
  };
  return <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', map[status] || 'bg-gray-100 text-gray-700')}>{status}</span>;
}

function ParticipantDialog({
  participant, plans, vendors, onClose, onSaved, onChanged,
}: {
  participant?: TpaParticipant;
  plans: TpaPlan[];
  vendors: TpaVendor[];
  onClose: () => void;
  onSaved: () => void;
  onChanged: () => void;
}) {
  const [form, setForm] = useState({
    plan_id: String(participant?.plan_id ?? plans[0]?.id ?? ''),
    first_name: participant?.first_name ?? '',
    last_name: participant?.last_name ?? '',
    email: participant?.email ?? '',
    phone: participant?.phone ?? '',
    employee_id: participant?.employee_id ?? '',
    birth_date: participant?.birth_date ? participant.birth_date.slice(0, 10) : '',
    hire_date: participant?.hire_date ? participant.hire_date.slice(0, 10) : '',
    status: participant?.status ?? 'Active',
    notes: participant?.notes ?? '',
  });
  const [sras, setSras] = useState<TpaSra[]>(participant?.sras ?? []);
  const [newSra, setNewSra] = useState({ vendor_id: '', contribution_type: 'Employee Pre-Tax', per_pay_amount: '', status: 'Active' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = { ...form, plan_id: parseInt(form.plan_id, 10) };
      if (participant) await api.patch(`/api/tpa/participants/${participant.id}`, payload);
      else await api.post('/api/tpa/participants', payload);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save participant');
    } finally {
      setSaving(false);
    }
  }

  async function addSra() {
    if (!participant || !newSra.vendor_id || !newSra.per_pay_amount) return;
    setError('');
    try {
      await api.post<TpaSra>('/api/tpa/sras', {
        participant_id: participant.id,
        vendor_id: parseInt(newSra.vendor_id, 10),
        contribution_type: newSra.contribution_type,
        per_pay_amount: newSra.per_pay_amount,
        status: newSra.status,
      });
      // Refresh from the server so joins (vendor name) are populated.
      const fresh = await api.get<TpaParticipant[]>('/api/tpa/participants');
      setSras(fresh.find((p) => p.id === participant.id)?.sras ?? []);
      setNewSra({ vendor_id: '', contribution_type: 'Employee Pre-Tax', per_pay_amount: '', status: 'Active' });
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add SRA');
    }
  }

  async function patchSra(id: number, field: string, value: string) {
    setError('');
    try {
      await api.patch(`/api/tpa/sras/${id}`, { [field]: field === 'vendor_id' ? parseInt(value, 10) : value });
      setSras((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save SRA');
    }
  }

  async function deleteSra(id: number) {
    if (!confirm('Delete this SRA?')) return;
    setError('');
    try {
      await api.delete(`/api/tpa/sras/${id}`);
      setSras((prev) => prev.filter((s) => s.id !== id));
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete SRA');
    }
  }

  return (
    <Dialog title={participant ? `${participant.first_name} ${participant.last_name}` : 'Add Participant'} onClose={onClose}>
      {error && <div className="bg-coral-light text-coral p-3 rounded-lg text-sm mb-4">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Plan" required>
            <select required value={form.plan_id} onChange={(e) => setForm({ ...form, plan_id: e.target.value })} className={`${inputCls} bg-white`}>
              {plans.map((p) => <option key={p.id} value={p.id}>{p.employer_name} — {p.plan_name}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as TpaParticipant['status'] })} className={`${inputCls} bg-white`}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="First Name" required>
            <input required value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Last Name" required>
            <input required value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Email">
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Phone">
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Employee ID">
            <input value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Birth Date">
            <input type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Hire Date">
            <input type="date" value={form.hire_date} onChange={(e) => setForm({ ...form, hire_date: e.target.value })} className={inputCls} />
          </Field>
        </div>
        <Field label="Notes">
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputCls} rows={2} />
        </Field>
        <DialogActions saving={saving} onClose={onClose} saveLabel={participant ? 'Save' : 'Create Participant'} />
      </form>

      {participant && (
        <div className="mt-6 border-t border-sand-dark pt-4">
          <h3 className="text-sm font-bold text-primary-dark mb-2">Salary Reduction Agreements</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sand-dark bg-sand/50">
                <th className="text-left px-2 py-2 font-semibold text-gray-600">Vendor</th>
                <th className="text-left px-2 py-2 font-semibold text-gray-600">Type</th>
                <th className="text-right px-2 py-2 font-semibold text-gray-600">Per Pay</th>
                <th className="text-left px-2 py-2 font-semibold text-gray-600">Status</th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {sras.length === 0 && (
                <tr><td colSpan={5} className="text-center py-4 text-gray-400">No SRAs yet</td></tr>
              )}
              {sras.map((s) => (
                <tr key={s.id} className="border-b border-sand-dark/50">
                  <td className="px-2 py-1">
                    <select value={s.vendor_id} onChange={(e) => patchSra(s.id, 'vendor_id', e.target.value)} className="w-full bg-transparent px-1 py-1 text-sm rounded focus:outline-none focus:ring-1 focus:ring-primary/40">
                      {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-1">
                    <select value={s.contribution_type} onChange={(e) => patchSra(s.id, 'contribution_type', e.target.value)} className="w-full bg-transparent px-1 py-1 text-sm rounded focus:outline-none focus:ring-1 focus:ring-primary/40">
                      {CONTRIB_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-1 text-right">
                    <input
                      type="number"
                      step="0.01"
                      defaultValue={parseFloat(s.per_pay_amount).toFixed(2)}
                      onBlur={(e) => e.target.value && patchSra(s.id, 'per_pay_amount', e.target.value)}
                      className="w-24 text-right bg-transparent px-1 py-1 text-sm rounded focus:outline-none focus:ring-1 focus:ring-primary/40 tabular-nums"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <select value={s.status} onChange={(e) => patchSra(s.id, 'status', e.target.value)} className="bg-transparent px-1 py-1 text-sm rounded focus:outline-none focus:ring-1 focus:ring-primary/40">
                      {SRA_STATUSES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-1 text-right">
                    <button type="button" onClick={() => deleteSra(s.id)} className="text-gray-300 hover:text-red-600" title="Delete SRA">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {/* Add SRA row */}
              <tr className="bg-sand/20">
                <td className="px-2 py-1">
                  <select value={newSra.vendor_id} onChange={(e) => setNewSra({ ...newSra, vendor_id: e.target.value })} className="w-full bg-transparent px-1 py-1 text-sm rounded focus:outline-none focus:ring-1 focus:ring-primary/40">
                    <option value="">Vendor…</option>
                    {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </td>
                <td className="px-2 py-1">
                  <select value={newSra.contribution_type} onChange={(e) => setNewSra({ ...newSra, contribution_type: e.target.value })} className="w-full bg-transparent px-1 py-1 text-sm rounded focus:outline-none focus:ring-1 focus:ring-primary/40">
                    {CONTRIB_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </td>
                <td className="px-2 py-1 text-right">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={newSra.per_pay_amount}
                    onChange={(e) => setNewSra({ ...newSra, per_pay_amount: e.target.value })}
                    className="w-24 text-right bg-transparent px-1 py-1 text-sm rounded focus:outline-none focus:ring-1 focus:ring-primary/40 tabular-nums"
                  />
                </td>
                <td className="px-2 py-1">
                  <select value={newSra.status} onChange={(e) => setNewSra({ ...newSra, status: e.target.value })} className="bg-transparent px-1 py-1 text-sm rounded focus:outline-none focus:ring-1 focus:ring-primary/40">
                    {SRA_STATUSES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </td>
                <td className="px-2 py-1 text-right">
                  <button
                    type="button"
                    onClick={addSra}
                    disabled={!newSra.vendor_id || !newSra.per_pay_amount}
                    className="text-primary hover:text-primary-dark disabled:text-gray-300"
                    title="Add SRA"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          <p className="text-xs text-gray-400 mt-2">
            Effective {fmtDate(participant.hire_date)} hire · SRA changes save immediately.
          </p>
        </div>
      )}
    </Dialog>
  );
}
