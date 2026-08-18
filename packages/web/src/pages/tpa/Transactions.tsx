import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { TpaParticipant, TpaTransaction, TpaVendor } from '@/types';
import { PageHelp } from '@/components/PageHelp';
import { Plus } from 'lucide-react';
import { Dialog, Field, DialogActions, fmtDate } from '@/pages/tpa/Plans';
import { formatMoney } from '@/lib/sheet';

const TXN_TYPES = [
  'Loan', 'Hardship Withdrawal', 'Distribution', 'Contract Exchange',
  'Rollover In', 'Rollover Out', 'QDRO', 'Other',
] as const;
const STATUSES = ['Submitted', 'In Review', 'Approved', 'Denied', 'Completed', 'Cancelled'] as const;

const inputCls =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30';

export default function TpaTransactions() {
  const [rows, setRows] = useState<TpaTransaction[]>([]);
  const [participants, setParticipants] = useState<TpaParticipant[]>([]);
  const [vendors, setVendors] = useState<TpaVendor[]>([]);
  const [statusFilter, setStatusFilter] = useState('Pending Review');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [deciding, setDeciding] = useState<TpaTransaction | null>(null);

  function load() {
    setLoading(true);
    Promise.all([
      api.get<TpaTransaction[]>('/api/tpa/transactions'),
      api.get<TpaParticipant[]>('/api/tpa/participants'),
      api.get<TpaVendor[]>('/api/tpa/vendors'),
    ])
      .then(([t, p, v]) => {
        setRows(t);
        setParticipants(p);
        setVendors(v);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load transactions'))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  const visible =
    statusFilter === 'All'
      ? rows
      : statusFilter === 'Pending Review'
        ? rows.filter((r) => r.status === 'Submitted' || r.status === 'In Review')
        : rows.filter((r) => r.status === statusFilter);

  const pendingCount = rows.filter((r) => r.status === 'Submitted' || r.status === 'In Review').length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-primary-dark">
          TPA — Transactions
          {pendingCount > 0 && (
            <span className="ml-2 px-2 py-0.5 rounded-full text-sm bg-yellow-100 text-yellow-800 font-medium align-middle">
              {pendingCount} pending
            </span>
          )}
        </h1>
        <div className="flex items-center gap-2">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`${inputCls} w-auto bg-white`}>
            <option value="Pending Review">Pending review</option>
            <option value="All">All</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition text-sm font-medium"
          >
            <Plus className="h-4 w-4" /> New Request
          </button>
        </div>
      </div>

      <PageHelp
        id="tpa-transactions"
        title="What lives on the Transactions page?"
        description="The approval queue for participant requests — loans, hardships, distributions, exchanges, rollovers, QDROs."
        tips={[
          'Log a request when the paperwork comes in; it starts as Submitted.',
          'Review it, then Approve or Deny with decision notes — the decision is stamped with who decided and when.',
          'Mark Approved requests Completed once the vendor processes them.',
          'The default filter shows only requests still waiting on a decision.',
        ]}
      />

      {error && <div className="bg-coral-light text-coral p-3 rounded-lg text-sm">{error}</div>}

      <div className="bg-white rounded-xl shadow-sm border border-sand-dark overflow-x-auto">
        <table className="w-full text-sm min-w-[850px]">
          <thead>
            <tr className="border-b border-sand-dark bg-sand/50">
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Requested</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Participant</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Type</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600">Amount</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Vendor</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Decision</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-8 text-gray-400">Loading…</td></tr>
            ) : visible.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-8 text-gray-400">Nothing here</td></tr>
            ) : (
              visible.map((t) => (
                <tr key={t.id} className="border-b border-sand-dark/50 hover:bg-sand/30">
                  <td className="px-4 py-3 text-gray-600">{fmtDate(t.requested_at)}</td>
                  <td className="px-4 py-3 font-medium text-primary-dark">
                    {t.participant_last_name}, {t.participant_first_name}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{t.txn_type}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{t.amount ? formatMoney(parseFloat(t.amount)) : '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{t.vendor_name || '—'}</td>
                  <td className="px-4 py-3"><TxnBadge status={t.status} /></td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {t.decided_by_name ? (
                      <>
                        {t.decided_by_name} · {fmtDate(t.decided_at)}
                        {t.decision_notes && <div className="text-gray-400 max-w-[200px] truncate" title={t.decision_notes}>{t.decision_notes}</div>}
                      </>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setDeciding(t)}
                      className="text-xs font-medium text-primary hover:text-primary-dark border border-primary/40 rounded-lg px-2.5 py-1"
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {creating && (
        <NewTxnDialog
          participants={participants}
          vendors={vendors}
          onClose={() => setCreating(false)}
          onSaved={() => { setCreating(false); load(); }}
        />
      )}
      {deciding && (
        <DecideDialog
          txn={deciding}
          onClose={() => setDeciding(null)}
          onSaved={() => { setDeciding(null); load(); }}
        />
      )}
    </div>
  );
}

function TxnBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Submitted: 'bg-yellow-100 text-yellow-800',
    'In Review': 'bg-orange-100 text-orange-800',
    Approved: 'bg-green-100 text-green-800',
    Denied: 'bg-red-100 text-red-700',
    Completed: 'bg-blue-100 text-blue-800',
    Cancelled: 'bg-gray-200 text-gray-700',
  };
  return <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', map[status])}>{status}</span>;
}

function NewTxnDialog({
  participants, vendors, onClose, onSaved,
}: { participants: TpaParticipant[]; vendors: TpaVendor[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    participant_id: '',
    txn_type: 'Loan',
    amount: '',
    vendor_id: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/api/tpa/transactions', {
        participant_id: parseInt(form.participant_id, 10),
        txn_type: form.txn_type,
        amount: form.amount || null,
        vendor_id: form.vendor_id ? parseInt(form.vendor_id, 10) : null,
        notes: form.notes,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create request');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog title="New Transaction Request" onClose={onClose}>
      {error && <div className="bg-coral-light text-coral p-3 rounded-lg text-sm mb-4">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Participant" required>
          <select required value={form.participant_id} onChange={(e) => setForm({ ...form, participant_id: e.target.value })} className={`${inputCls} bg-white`}>
            <option value="">Select…</option>
            {participants.map((p) => (
              <option key={p.id} value={p.id}>{p.last_name}, {p.first_name} ({p.employer_name})</option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Type" required>
            <select value={form.txn_type} onChange={(e) => setForm({ ...form, txn_type: e.target.value })} className={`${inputCls} bg-white`}>
              {TXN_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Amount">
            <input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={inputCls} placeholder="Optional" />
          </Field>
        </div>
        <Field label="Vendor">
          <select value={form.vendor_id} onChange={(e) => setForm({ ...form, vendor_id: e.target.value })} className={`${inputCls} bg-white`}>
            <option value="">—</option>
            {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </Field>
        <Field label="Notes">
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputCls} rows={2} />
        </Field>
        <DialogActions saving={saving} onClose={onClose} saveLabel="Log Request" />
      </form>
    </Dialog>
  );
}

function DecideDialog({ txn, onClose, onSaved }: { txn: TpaTransaction; onClose: () => void; onSaved: () => void }) {
  const [notes, setNotes] = useState(txn.decision_notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function setStatus(status: string) {
    setSaving(true);
    setError('');
    try {
      await api.patch(`/api/tpa/transactions/${txn.id}`, { status, decision_notes: notes });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
      setSaving(false);
    }
  }

  const btn = 'px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50';

  return (
    <Dialog
      title={`${txn.txn_type} — ${txn.participant_first_name} ${txn.participant_last_name}`}
      onClose={onClose}
    >
      {error && <div className="bg-coral-light text-coral p-3 rounded-lg text-sm mb-4">{error}</div>}
      <div className="space-y-4">
        <div className="text-sm text-gray-600 space-y-1">
          <p>Requested {fmtDate(txn.requested_at)} · Amount: {txn.amount ? formatMoney(parseFloat(txn.amount)) : '—'} · Vendor: {txn.vendor_name || '—'}</p>
          {txn.notes && <p className="text-gray-500">Request notes: {txn.notes}</p>}
          <p>Current status: <TxnBadge status={txn.status} /></p>
        </div>
        <Field label="Decision notes">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} rows={2} placeholder="Why approved / denied, certificate #, etc." />
        </Field>
        <div className="flex flex-wrap justify-end gap-2 pt-2">
          {(txn.status === 'Submitted') && (
            <button disabled={saving} onClick={() => setStatus('In Review')} className={cn(btn, 'border border-orange-400 text-orange-700 hover:bg-orange-50')}>
              Mark In Review
            </button>
          )}
          {(txn.status === 'Submitted' || txn.status === 'In Review') && (
            <>
              <button disabled={saving} onClick={() => setStatus('Denied')} className={cn(btn, 'border border-red-400 text-red-600 hover:bg-red-50')}>
                Deny
              </button>
              <button disabled={saving} onClick={() => setStatus('Approved')} className={cn(btn, 'bg-primary text-white hover:bg-primary-dark')}>
                Approve
              </button>
            </>
          )}
          {txn.status === 'Approved' && (
            <button disabled={saving} onClick={() => setStatus('Completed')} className={cn(btn, 'bg-primary text-white hover:bg-primary-dark')}>
              Mark Completed
            </button>
          )}
          {(txn.status === 'Submitted' || txn.status === 'In Review' || txn.status === 'Approved') && (
            <button disabled={saving} onClick={() => setStatus('Cancelled')} className={cn(btn, 'border border-gray-300 text-gray-600 hover:bg-gray-50')}>
              Cancel Request
            </button>
          )}
        </div>
      </div>
    </Dialog>
  );
}
