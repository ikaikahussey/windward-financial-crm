import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import type { Payment } from '@/types';
import { SheetInput } from '@/components/SheetInput';
import { downloadCsv, formatMoney } from '@/lib/sheet';
import { PageHelp } from '@/components/PageHelp';
import { Plus, Trash2, Download, Printer } from 'lucide-react';
import { format } from 'date-fns';

const emptyNewRow = {
  payee_name: '',
  payment_date: format(new Date(), 'yyyy-MM-dd'),
  amount: '',
  account: 'Checking',
  notes: '',
};

export default function Payments() {
  const [rows, setRows] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [monthFilter, setMonthFilter] = useState('All');
  const [newRow, setNewRow] = useState({ ...emptyNewRow });

  function load() {
    setLoading(true);
    api
      .get<Payment[]>('/api/payments')
      .then(setRows)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load payments'))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  const monthKey = (p: Payment) => p.payment_date.slice(0, 7); // YYYY-MM

  const months = useMemo(
    () => Array.from(new Set(rows.map(monthKey))).sort().reverse(),
    [rows],
  );

  const monthlyTotals = useMemo(() => {
    const totals = new Map<string, { sum: number; count: number }>();
    for (const p of rows) {
      const key = monthKey(p);
      const entry = totals.get(key) || { sum: 0, count: 0 };
      entry.sum += parseFloat(p.amount) || 0;
      entry.count += 1;
      totals.set(key, entry);
    }
    return Array.from(totals.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [rows]);

  const visible = monthFilter === 'All' ? rows : rows.filter((p) => monthKey(p) === monthFilter);
  const visibleTotal = visible.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

  const monthLabel = (key: string) => format(new Date(`${key}-15`), 'MMMM yyyy');

  async function patchRow(id: number, field: string, value: string) {
    setError(null);
    try {
      const updated = await api.patch<Payment>(`/api/payments/${id}`, { [field]: value });
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...updated } : r)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    }
  }

  async function addRow(e: FormEvent) {
    e.preventDefault();
    if (!newRow.payee_name.trim() || !newRow.amount) return;
    setError(null);
    try {
      await api.post('/api/payments', newRow);
      setNewRow({ ...emptyNewRow, payment_date: newRow.payment_date });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add payment');
    }
  }

  async function deleteRow(row: Payment) {
    if (!confirm(`Delete the ${formatMoney(parseFloat(row.amount))} payment to ${row.payee_name}?`)) return;
    setError(null);
    try {
      await api.delete(`/api/payments/${row.id}`);
      setRows((prev) => prev.filter((r) => r.id !== row.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

  function exportCsv() {
    const label = monthFilter === 'All' ? 'all' : monthFilter;
    downloadCsv(
      `payments-${label}.csv`,
      ['Payee', 'Date', 'Amount', 'Account', 'Notes'],
      [
        ...visible.map((r) => [
          r.payee_name,
          format(new Date(r.payment_date), 'M/d/yyyy'),
          parseFloat(r.amount).toFixed(2),
          r.account,
          r.notes,
        ]),
        ['Total', '', visibleTotal.toFixed(2), '', ''],
      ],
    );
  }

  const cellInput =
    'w-full bg-transparent px-2 py-1.5 text-sm rounded focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary/40';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-primary-dark">
          Payments
          {monthFilter !== 'All' && (
            <span className="text-lg font-normal text-gray-500"> — {monthLabel(monthFilter)}</span>
          )}
        </h2>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="All">All months</option>
            {months.map((m) => (
              <option key={m} value={m}>{monthLabel(m)}</option>
            ))}
          </select>
          <button
            onClick={exportCsv}
            className="flex items-center gap-2 border border-primary text-primary px-3 py-2 rounded-lg hover:bg-primary/5 transition text-sm font-medium"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 border border-primary text-primary px-3 py-2 rounded-lg hover:bg-primary/5 transition text-sm font-medium"
          >
            <Printer className="h-4 w-4" /> Print
          </button>
        </div>
      </div>

      <div className="print:hidden">
        <PageHelp
          id="payments-sheet"
          title="What lives on the Payments page?"
          description="Admin-only ledger of the monthly payments the agency makes from checking: who was paid, when, and how much. Click any cell to edit."
          tips={[
            'Only admins can see this page — agents don\'t get access, in the sidebar or via the API.',
            'Record a payment with the row at the bottom; the date defaults to today.',
            'Filter to a single month to see that month\'s total; the CSV export includes a total row.',
            'Monthly totals for every month are summarized below the sheet.',
          ]}
        />
      </div>

      {error && <div className="bg-coral-light text-coral p-3 rounded-lg text-sm print:hidden">{error}</div>}

      <div className="bg-white rounded-xl shadow-sm border border-sand-dark overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="border-b border-sand-dark bg-sand/50">
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Payee</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 w-36">Date</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600 w-32">Amount</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 w-32">Account</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Notes</th>
              <th className="px-2 py-3 w-10 print:hidden"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-400">Loading…</td>
              </tr>
            ) : visible.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-400">
                  {monthFilter !== 'All' ? 'No payments this month' : 'No payments recorded yet — add one below'}
                </td>
              </tr>
            ) : (
              visible.map((row) => (
                <tr key={row.id} className="border-b border-sand-dark/50 hover:bg-sand/30">
                  <td className="px-2 py-1 font-medium text-primary-dark">
                    <SheetInput value={row.payee_name} onCommit={(v) => patchRow(row.id, 'payee_name', v)} />
                  </td>
                  <td className="px-2 py-1 text-gray-600">
                    <SheetInput
                      type="date"
                      value={row.payment_date.slice(0, 10)}
                      onCommit={(v) => v && patchRow(row.id, 'payment_date', v)}
                    />
                  </td>
                  <td className="px-2 py-1 text-gray-700">
                    <SheetInput
                      type="number"
                      value={parseFloat(row.amount).toFixed(2)}
                      onCommit={(v) => v && patchRow(row.id, 'amount', v)}
                      className="text-right tabular-nums"
                    />
                  </td>
                  <td className="px-2 py-1 text-gray-600">
                    <SheetInput value={row.account} onCommit={(v) => patchRow(row.id, 'account', v)} />
                  </td>
                  <td className="px-2 py-1 text-gray-600">
                    <SheetInput value={row.notes} onCommit={(v) => patchRow(row.id, 'notes', v)} placeholder="—" />
                  </td>
                  <td className="px-2 py-1 text-right print:hidden">
                    <button onClick={() => deleteRow(row)} className="text-gray-300 hover:text-red-600" title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
            {/* New row */}
            <tr className="bg-sand/20 print:hidden">
              <td className="px-2 py-1">
                <form id="add-payment" onSubmit={addRow}>
                  <input
                    value={newRow.payee_name}
                    onChange={(e) => setNewRow({ ...newRow, payee_name: e.target.value })}
                    placeholder="Add a payment…"
                    className={cellInput}
                  />
                </form>
              </td>
              <td className="px-2 py-1">
                <input
                  form="add-payment"
                  type="date"
                  required
                  value={newRow.payment_date}
                  onChange={(e) => setNewRow({ ...newRow, payment_date: e.target.value })}
                  className={cellInput}
                />
              </td>
              <td className="px-2 py-1">
                <input
                  form="add-payment"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={newRow.amount}
                  onChange={(e) => setNewRow({ ...newRow, amount: e.target.value })}
                  placeholder="0.00"
                  className={`${cellInput} text-right tabular-nums`}
                />
              </td>
              <td className="px-2 py-1">
                <input
                  form="add-payment"
                  value={newRow.account}
                  onChange={(e) => setNewRow({ ...newRow, account: e.target.value })}
                  className={cellInput}
                />
              </td>
              <td className="px-2 py-1">
                <input
                  form="add-payment"
                  value={newRow.notes}
                  onChange={(e) => setNewRow({ ...newRow, notes: e.target.value })}
                  placeholder="Notes"
                  className={cellInput}
                />
              </td>
              <td className="px-2 py-1 text-right">
                <button
                  type="submit"
                  form="add-payment"
                  disabled={!newRow.payee_name.trim() || !newRow.amount}
                  className="text-primary hover:text-primary-dark disabled:text-gray-300"
                  title="Add payment"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="bg-sand/50 border-t border-sand-dark">
              <td className="px-4 py-3 font-semibold text-primary-dark">
                {visible.length} payment{visible.length === 1 ? '' : 's'}
              </td>
              <td className="px-4 py-3 text-right font-semibold text-gray-600">Total</td>
              <td className="px-4 py-3 text-right font-bold text-primary-dark tabular-nums">
                {formatMoney(visibleTotal)}
              </td>
              <td colSpan={3}></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Monthly tallies */}
      {monthlyTotals.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-sand-dark overflow-hidden max-w-md">
          <div className="px-4 py-3 border-b border-sand-dark bg-sand/50 font-semibold text-gray-600 text-sm">
            Monthly Totals
          </div>
          <table className="w-full text-sm">
            <tbody>
              {monthlyTotals.map(([month, { sum, count }]) => (
                <tr key={month} className="border-b border-sand-dark/50 last:border-0">
                  <td className="px-4 py-2 text-primary-dark font-medium">{monthLabel(month)}</td>
                  <td className="px-4 py-2 text-gray-500 text-xs">{count} payment{count === 1 ? '' : 's'}</td>
                  <td className="px-4 py-2 text-right font-semibold tabular-nums">{formatMoney(sum)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
