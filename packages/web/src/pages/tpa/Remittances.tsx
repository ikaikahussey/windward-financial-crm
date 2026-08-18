import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { TpaBatch, TpaBatchDetail, TpaParticipant, TpaPlan, TpaVendor } from '@/types';
import { PageHelp } from '@/components/PageHelp';
import { Plus, Trash2, Download, RefreshCw } from 'lucide-react';
import { Dialog, Field, DialogActions, fmtDate } from '@/pages/tpa/Plans';
import { downloadCsv, formatMoney } from '@/lib/sheet';
import { format } from 'date-fns';

const CONTRIB_TYPES = ['Employee Pre-Tax', 'Employee Roth', 'Employer Match', 'Employer Non-Elective'] as const;

const inputCls =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30';

export default function TpaRemittances() {
  const [batches, setBatches] = useState<TpaBatch[]>([]);
  const [plans, setPlans] = useState<TpaPlan[]>([]);
  const [vendors, setVendors] = useState<TpaVendor[]>([]);
  const [participants, setParticipants] = useState<TpaParticipant[]>([]);
  const [selected, setSelected] = useState<TpaBatchDetail | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    Promise.all([
      api.get<TpaBatch[]>('/api/tpa/batches'),
      api.get<TpaPlan[]>('/api/tpa/plans'),
      api.get<TpaVendor[]>('/api/tpa/vendors'),
      api.get<TpaParticipant[]>('/api/tpa/participants'),
    ])
      .then(([b, pl, v, p]) => {
        setBatches(b);
        setPlans(pl);
        setVendors(v);
        setParticipants(p);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load remittances'))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function openBatch(id: number) {
    setError(null);
    try {
      setSelected(await api.get<TpaBatchDetail>(`/api/tpa/batches/${id}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load batch');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary-dark">TPA — Remittances</h1>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition text-sm font-medium"
        >
          <Plus className="h-4 w-4" /> New Batch
        </button>
      </div>

      <PageHelp
        id="tpa-remittances"
        title="What lives on the Remittances page?"
        description="One batch per plan per pay date: the contributions withheld from payroll and forwarded to each vendor."
        tips={[
          'Create a batch for the pay date, then "Prefill from SRAs" to load every active agreement automatically.',
          'Adjust or remove individual lines while the batch is Open; add one-off lines for corrections.',
          'Mark the batch Posted when sent to vendors, Reconciled once confirmed. Posted/Reconciled batches are locked.',
          'Export CSV produces a vendor-ready remittance report for the batch.',
        ]}
      />

      {error && <div className="bg-coral-light text-coral p-3 rounded-lg text-sm">{error}</div>}

      <div className="bg-white rounded-xl shadow-sm border border-sand-dark overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="border-b border-sand-dark bg-sand/50">
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Pay Date</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Plan</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600">Lines</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600">Total</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-8 text-gray-400">Loading…</td></tr>
            ) : batches.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-gray-400">No remittance batches yet</td></tr>
            ) : (
              batches.map((b) => (
                <tr
                  key={b.id}
                  onClick={() => openBatch(b.id)}
                  className={cn(
                    'border-b border-sand-dark/50 hover:bg-sand/30 cursor-pointer',
                    selected?.id === b.id && 'bg-sand/40',
                  )}
                >
                  <td className="px-4 py-3 font-medium text-primary-dark">{fmtDate(b.pay_date)}</td>
                  <td className="px-4 py-3 text-gray-600">{b.employer_name} — {b.plan_name}</td>
                  <td className="px-4 py-3"><BatchBadge status={b.status} /></td>
                  <td className="px-4 py-3 text-right text-gray-600">{b.line_count ?? 0}</td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">{formatMoney(parseFloat(b.total || '0'))}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <BatchDetail
          batch={selected}
          vendors={vendors}
          participants={participants.filter((p) => p.plan_id === selected.plan_id)}
          onRefresh={() => { openBatch(selected.id); load(); }}
          onClose={() => setSelected(null)}
          onDeleted={() => { setSelected(null); load(); }}
        />
      )}

      {creating && (
        <NewBatchDialog
          plans={plans}
          onClose={() => setCreating(false)}
          onSaved={(id) => { setCreating(false); load(); openBatch(id); }}
        />
      )}
    </div>
  );
}

function BatchBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Open: 'bg-yellow-100 text-yellow-800',
    Posted: 'bg-blue-100 text-blue-800',
    Reconciled: 'bg-green-100 text-green-800',
  };
  return <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', map[status])}>{status}</span>;
}

function BatchDetail({
  batch, vendors, participants, onRefresh, onClose, onDeleted,
}: {
  batch: TpaBatchDetail;
  vendors: TpaVendor[];
  participants: TpaParticipant[];
  onRefresh: () => void;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [newLine, setNewLine] = useState({ participant_id: '', vendor_id: '', contribution_type: 'Employee Pre-Tax', amount: '' });
  const isOpen = batch.status === 'Open';
  const total = batch.lines.reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0);

  const run = (fn: () => Promise<unknown>) =>
    fn().then(onRefresh).catch((err) => setError(err instanceof Error ? err.message : 'Operation failed'));

  async function addLine(e: FormEvent) {
    e.preventDefault();
    if (!newLine.participant_id || !newLine.vendor_id || !newLine.amount) return;
    await run(() =>
      api.post('/api/tpa/contributions', {
        batch_id: batch.id,
        participant_id: parseInt(newLine.participant_id, 10),
        vendor_id: parseInt(newLine.vendor_id, 10),
        contribution_type: newLine.contribution_type,
        amount: newLine.amount,
      }),
    );
    setNewLine({ participant_id: '', vendor_id: '', contribution_type: 'Employee Pre-Tax', amount: '' });
  }

  function exportCsv() {
    downloadCsv(
      `remittance-${batch.pay_date.slice(0, 10)}.csv`,
      ['Participant', 'Vendor', 'Type', 'Amount'],
      [
        ...batch.lines.map((l) => [
          `${l.participant_last_name}, ${l.participant_first_name}`,
          l.vendor_name,
          l.contribution_type,
          parseFloat(l.amount).toFixed(2),
        ]),
        ['Total', '', '', total.toFixed(2)],
      ],
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-sand-dark overflow-hidden">
      <div className="px-4 py-3 border-b border-sand-dark bg-sand/50 flex flex-wrap items-center justify-between gap-2">
        <div className="font-semibold text-primary-dark">
          Batch — {fmtDate(batch.pay_date)} · {batch.employer_name} — {batch.plan_name} <BatchBadge status={batch.status} />
        </div>
        <div className="flex flex-wrap gap-2">
          {isOpen && (
            <>
              <button
                onClick={() => run(() => api.post(`/api/tpa/batches/${batch.id}/prefill`))}
                className="flex items-center gap-1.5 border border-primary text-primary px-3 py-1.5 rounded-lg hover:bg-primary/5 text-xs font-medium"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Prefill from SRAs
              </button>
              <button
                onClick={() => run(() => api.patch(`/api/tpa/batches/${batch.id}`, { status: 'Posted' }))}
                className="border border-blue-600 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-50 text-xs font-medium"
              >
                Mark Posted
              </button>
              <button
                onClick={() => {
                  if (confirm('Delete this open batch and all its lines?')) {
                    api.delete(`/api/tpa/batches/${batch.id}`).then(onDeleted).catch((err) => setError(err instanceof Error ? err.message : 'Delete failed'));
                  }
                }}
                className="border border-red-300 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 text-xs font-medium"
              >
                Delete
              </button>
            </>
          )}
          {batch.status === 'Posted' && (
            <button
              onClick={() => run(() => api.patch(`/api/tpa/batches/${batch.id}`, { status: 'Reconciled' }))}
              className="border border-green-600 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-50 text-xs font-medium"
            >
              Mark Reconciled
            </button>
          )}
          <button onClick={exportCsv} className="flex items-center gap-1.5 border border-primary text-primary px-3 py-1.5 rounded-lg hover:bg-primary/5 text-xs font-medium">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
          <button onClick={onClose} className="text-xs text-gray-500 hover:text-gray-700 px-2">Close</button>
        </div>
      </div>

      {error && <div className="bg-coral-light text-coral p-3 text-sm">{error}</div>}

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-sand-dark bg-sand/30">
            <th className="text-left px-4 py-2 font-semibold text-gray-600">Participant</th>
            <th className="text-left px-4 py-2 font-semibold text-gray-600">Vendor</th>
            <th className="text-left px-4 py-2 font-semibold text-gray-600">Type</th>
            <th className="text-right px-4 py-2 font-semibold text-gray-600">Amount</th>
            <th className="px-2 py-2 w-10"></th>
          </tr>
        </thead>
        <tbody>
          {batch.lines.length === 0 && (
            <tr><td colSpan={5} className="text-center py-6 text-gray-400">No lines — prefill from SRAs or add one below</td></tr>
          )}
          {batch.lines.map((l) => (
            <tr key={l.id} className="border-b border-sand-dark/50">
              <td className="px-4 py-2 font-medium text-primary-dark">{l.participant_last_name}, {l.participant_first_name}</td>
              <td className="px-4 py-2 text-gray-600">{l.vendor_name}</td>
              <td className="px-4 py-2 text-gray-600">{l.contribution_type}</td>
              <td className="px-4 py-2 text-right tabular-nums">
                {isOpen ? (
                  <input
                    type="number"
                    step="0.01"
                    defaultValue={parseFloat(l.amount).toFixed(2)}
                    onBlur={(e) => {
                      const v = e.target.value;
                      if (v && parseFloat(v).toFixed(2) !== parseFloat(l.amount).toFixed(2)) {
                        run(() => api.patch(`/api/tpa/contributions/${l.id}`, { amount: v }));
                      }
                    }}
                    className="w-28 text-right bg-transparent px-2 py-1 rounded focus:outline-none focus:bg-sand/40 focus:ring-1 focus:ring-primary/40 tabular-nums"
                  />
                ) : (
                  formatMoney(parseFloat(l.amount))
                )}
              </td>
              <td className="px-2 py-2 text-right">
                {isOpen && (
                  <button
                    onClick={() => run(() => api.delete(`/api/tpa/contributions/${l.id}`))}
                    className="text-gray-300 hover:text-red-600"
                    title="Remove line"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </td>
            </tr>
          ))}
          {isOpen && (
            <tr className="bg-sand/20">
              <td className="px-4 py-2">
                <form id="add-line" onSubmit={addLine}>
                  <select value={newLine.participant_id} onChange={(e) => setNewLine({ ...newLine, participant_id: e.target.value })} className="w-full bg-transparent px-1 py-1 text-sm rounded focus:outline-none focus:ring-1 focus:ring-primary/40">
                    <option value="">Participant…</option>
                    {participants.map((p) => <option key={p.id} value={p.id}>{p.last_name}, {p.first_name}</option>)}
                  </select>
                </form>
              </td>
              <td className="px-4 py-2">
                <select value={newLine.vendor_id} onChange={(e) => setNewLine({ ...newLine, vendor_id: e.target.value })} className="w-full bg-transparent px-1 py-1 text-sm rounded focus:outline-none focus:ring-1 focus:ring-primary/40">
                  <option value="">Vendor…</option>
                  {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </td>
              <td className="px-4 py-2">
                <select value={newLine.contribution_type} onChange={(e) => setNewLine({ ...newLine, contribution_type: e.target.value })} className="w-full bg-transparent px-1 py-1 text-sm rounded focus:outline-none focus:ring-1 focus:ring-primary/40">
                  {CONTRIB_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </td>
              <td className="px-4 py-2 text-right">
                <input
                  form="add-line"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={newLine.amount}
                  onChange={(e) => setNewLine({ ...newLine, amount: e.target.value })}
                  className="w-28 text-right bg-transparent px-2 py-1 text-sm rounded focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary/40 tabular-nums"
                />
              </td>
              <td className="px-2 py-2 text-right">
                <button
                  type="submit"
                  form="add-line"
                  disabled={!newLine.participant_id || !newLine.vendor_id || !newLine.amount}
                  className="text-primary hover:text-primary-dark disabled:text-gray-300"
                  title="Add line"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr className="bg-sand/50 border-t border-sand-dark">
            <td colSpan={3} className="px-4 py-3 font-semibold text-primary-dark">
              {batch.lines.length} line{batch.lines.length === 1 ? '' : 's'}
            </td>
            <td className="px-4 py-3 text-right font-bold text-primary-dark tabular-nums">{formatMoney(total)}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function NewBatchDialog({ plans, onClose, onSaved }: { plans: TpaPlan[]; onClose: () => void; onSaved: (id: number) => void }) {
  const [form, setForm] = useState({
    plan_id: String(plans[0]?.id ?? ''),
    pay_date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const created = await api.post<TpaBatch>('/api/tpa/batches', {
        plan_id: parseInt(form.plan_id, 10),
        pay_date: form.pay_date,
        notes: form.notes,
      });
      onSaved(created.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create batch');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog title="New Remittance Batch" onClose={onClose}>
      {error && <div className="bg-coral-light text-coral p-3 rounded-lg text-sm mb-4">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Plan" required>
          <select required value={form.plan_id} onChange={(e) => setForm({ ...form, plan_id: e.target.value })} className={`${inputCls} bg-white`}>
            {plans.map((p) => <option key={p.id} value={p.id}>{p.employer_name} — {p.plan_name}</option>)}
          </select>
        </Field>
        <Field label="Pay Date" required>
          <input required type="date" value={form.pay_date} onChange={(e) => setForm({ ...form, pay_date: e.target.value })} className={inputCls} />
        </Field>
        <Field label="Notes">
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputCls} rows={2} />
        </Field>
        <DialogActions saving={saving} onClose={onClose} saveLabel="Create Batch" />
      </form>
    </Dialog>
  );
}
