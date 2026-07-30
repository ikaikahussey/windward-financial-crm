import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { TpaPlan, TpaVendor } from '@/types';
import { PageHelp } from '@/components/PageHelp';
import { Plus, Pencil, X } from 'lucide-react';
import { format } from 'date-fns';

const PLAN_TYPES = ['403(b)', '457(b)', 'Other'] as const;

const inputCls =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30';

export default function TpaPlans() {
  const [plans, setPlans] = useState<TpaPlan[]>([]);
  const [vendors, setVendors] = useState<TpaVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingPlan, setEditingPlan] = useState<TpaPlan | 'new' | null>(null);
  const [editingVendor, setEditingVendor] = useState<TpaVendor | 'new' | null>(null);

  function load() {
    setLoading(true);
    Promise.all([api.get<TpaPlan[]>('/api/tpa/plans'), api.get<TpaVendor[]>('/api/tpa/vendors')])
      .then(([p, v]) => {
        setPlans(p);
        setVendors(v);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load plans'))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary-dark">TPA — Plans & Vendors</h1>
        <button
          onClick={() => setEditingPlan('new')}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition text-sm font-medium"
        >
          <Plus className="h-4 w-4" /> Add Plan
        </button>
      </div>

      <PageHelp
        id="tpa-plans"
        title="What lives on the Plans & Vendors page?"
        description="The employer plans you administer as TPA, and the product vendors approved to receive contributions under each plan."
        tips={[
          'Add each employer plan (403(b) / 457(b)) with its pay-period schedule — remittance batches and compliance use it.',
          'Maintain the master vendor list below, then check off which vendors are approved inside each plan.',
          'Deactivate a plan you no longer administer rather than deleting it — history stays intact.',
        ]}
      />

      {error && <div className="bg-coral-light text-coral p-3 rounded-lg text-sm">{error}</div>}

      <div className="bg-white rounded-xl shadow-sm border border-sand-dark overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]">
          <thead>
            <tr className="border-b border-sand-dark bg-sand/50">
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Employer</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Plan</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Type</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Plan #</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600">Pay Periods</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600">Participants</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Approved Vendors</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-8 text-gray-400">Loading…</td></tr>
            ) : plans.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-8 text-gray-400">No plans yet</td></tr>
            ) : (
              plans.map((p) => (
                <tr key={p.id} className={cn('border-b border-sand-dark/50 hover:bg-sand/30', !p.is_active && 'opacity-50')}>
                  <td className="px-4 py-3 font-medium text-primary-dark">{p.employer_name}</td>
                  <td className="px-4 py-3 text-gray-600">{p.plan_name}</td>
                  <td className="px-4 py-3 text-gray-600">{p.plan_type}</td>
                  <td className="px-4 py-3 text-gray-600">{p.plan_number || '—'}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{p.pay_periods_per_year}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{p.participant_count ?? 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(p.vendors || []).map((v) => (
                        <span key={v.id} className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800">{v.name}</span>
                      ))}
                      {(p.vendors || []).length === 0 && <span className="text-gray-400 text-xs">None</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setEditingPlan(p)} className="text-gray-400 hover:text-primary" title="Edit">
                      <Pencil className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Vendors */}
      <div className="flex items-center justify-between pt-4">
        <h2 className="text-xl font-bold text-primary-dark">Vendors</h2>
        <button
          onClick={() => setEditingVendor('new')}
          className="flex items-center gap-2 border border-primary text-primary px-3 py-2 rounded-lg hover:bg-primary/5 transition text-sm font-medium"
        >
          <Plus className="h-4 w-4" /> Add Vendor
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-sand-dark overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-sand-dark bg-sand/50">
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Vendor</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Email</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Phone</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Notes</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {vendors.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-gray-400">No vendors yet</td></tr>
            ) : (
              vendors.map((v) => (
                <tr key={v.id} className="border-b border-sand-dark/50 hover:bg-sand/30">
                  <td className="px-4 py-3 font-medium text-primary-dark">{v.name}</td>
                  <td className="px-4 py-3 text-gray-600">{v.contact_email || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{v.contact_phone || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{v.notes || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setEditingVendor(v)} className="text-gray-400 hover:text-primary" title="Edit">
                      <Pencil className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editingPlan && (
        <PlanDialog
          plan={editingPlan === 'new' ? undefined : editingPlan}
          vendors={vendors}
          onClose={() => setEditingPlan(null)}
          onSaved={() => { setEditingPlan(null); load(); }}
        />
      )}
      {editingVendor && (
        <VendorDialog
          vendor={editingVendor === 'new' ? undefined : editingVendor}
          onClose={() => setEditingVendor(null)}
          onSaved={() => { setEditingVendor(null); load(); }}
        />
      )}
    </div>
  );
}

function PlanDialog({
  plan, vendors, onClose, onSaved,
}: { plan?: TpaPlan; vendors: TpaVendor[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    employer_name: plan?.employer_name ?? '',
    plan_name: plan?.plan_name ?? '',
    plan_type: plan?.plan_type ?? '403(b)',
    plan_number: plan?.plan_number ?? '',
    effective_date: plan?.effective_date ? plan.effective_date.slice(0, 10) : '',
    pay_periods_per_year: String(plan?.pay_periods_per_year ?? 24),
    is_active: plan?.is_active ?? true,
    notes: plan?.notes ?? '',
  });
  const [vendorIds, setVendorIds] = useState<number[]>((plan?.vendors || []).map((v) => v.id));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = { ...form, pay_periods_per_year: parseInt(form.pay_periods_per_year, 10) || 24 };
      let planId = plan?.id;
      if (plan) {
        await api.patch(`/api/tpa/plans/${plan.id}`, payload);
      } else {
        const created = await api.post<TpaPlan>('/api/tpa/plans', payload);
        planId = created.id;
      }
      if (planId) {
        await fetchPutVendors(planId, vendorIds);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save plan');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog title={plan ? `Edit ${plan.plan_name}` : 'Add Plan'} onClose={onClose}>
      {error && <div className="bg-coral-light text-coral p-3 rounded-lg text-sm mb-4">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Employer" required>
            <input required value={form.employer_name} onChange={(e) => setForm({ ...form, employer_name: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Plan Name" required>
            <input required value={form.plan_name} onChange={(e) => setForm({ ...form, plan_name: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Plan Type">
            <select value={form.plan_type} onChange={(e) => setForm({ ...form, plan_type: e.target.value as TpaPlan['plan_type'] })} className={`${inputCls} bg-white`}>
              {PLAN_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Plan #">
            <input value={form.plan_number} onChange={(e) => setForm({ ...form, plan_number: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Effective Date">
            <input type="date" value={form.effective_date} onChange={(e) => setForm({ ...form, effective_date: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Pay Periods / Year">
            <input type="number" min="1" max="52" value={form.pay_periods_per_year} onChange={(e) => setForm({ ...form, pay_periods_per_year: e.target.value })} className={inputCls} />
          </Field>
        </div>
        <Field label="Approved Vendors">
          <div className="flex flex-wrap gap-3 border border-gray-200 rounded-lg p-3">
            {vendors.length === 0 && <span className="text-sm text-gray-400">Add vendors first</span>}
            {vendors.map((v) => (
              <label key={v.id} className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={vendorIds.includes(v.id)}
                  onChange={(e) =>
                    setVendorIds((prev) => (e.target.checked ? [...prev, v.id] : prev.filter((id) => id !== v.id)))
                  }
                />
                {v.name}
              </label>
            ))}
          </div>
        </Field>
        <Field label="Notes">
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputCls} rows={2} />
        </Field>
        {plan && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
            Plan is active
          </label>
        )}
        <DialogActions saving={saving} onClose={onClose} saveLabel={plan ? 'Save' : 'Create Plan'} />
      </form>
    </Dialog>
  );
}

async function fetchPutVendors(planId: number, vendorIds: number[]) {
  const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/tpa/plans/${planId}/vendors`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ vendorIds }),
  });
  if (!res.ok) throw new Error('Failed to save approved vendors');
}

function VendorDialog({ vendor, onClose, onSaved }: { vendor?: TpaVendor; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: vendor?.name ?? '',
    contact_email: vendor?.contact_email ?? '',
    contact_phone: vendor?.contact_phone ?? '',
    website: vendor?.website ?? '',
    notes: vendor?.notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (vendor) await api.patch(`/api/tpa/vendors/${vendor.id}`, form);
      else await api.post('/api/tpa/vendors', form);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save vendor');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog title={vendor ? `Edit ${vendor.name}` : 'Add Vendor'} onClose={onClose}>
      {error && <div className="bg-coral-light text-coral p-3 rounded-lg text-sm mb-4">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Name" required>
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Contact Email">
            <input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Contact Phone">
            <input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} className={inputCls} />
          </Field>
        </div>
        <Field label="Website">
          <input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} className={inputCls} />
        </Field>
        <Field label="Notes">
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputCls} rows={2} />
        </Field>
        <DialogActions saving={saving} onClose={onClose} saveLabel={vendor ? 'Save' : 'Create Vendor'} />
      </form>
    </Dialog>
  );
}

// ── Shared dialog scaffolding for the TPA pages ──

export function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-primary-dark">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && ' *'}
      </label>
      {children}
    </div>
  );
}

export function DialogActions({ saving, onClose, saveLabel }: { saving: boolean; onClose: () => void; saveLabel: string }) {
  return (
    <div className="flex justify-end gap-3 pt-2">
      <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
      <button type="submit" disabled={saving} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50">
        {saving ? 'Saving…' : saveLabel}
      </button>
    </div>
  );
}

export function fmtDate(d?: string | null) {
  // Dates here are date-only (pay dates, birth dates): format the stored
  // calendar date, not its UTC-midnight instant shifted to local time.
  return d ? format(new Date(`${d.slice(0, 10)}T12:00:00`), 'M/d/yyyy') : '—';
}
