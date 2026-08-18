import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Referral, User } from '@/types';
import { SheetInput } from '@/components/SheetInput';
import { downloadCsv } from '@/lib/sheet';
import { PageHelp } from '@/components/PageHelp';
import { Plus, Trash2, Download, Printer } from 'lucide-react';
import { format } from 'date-fns';

type SourceFilter = 'All' | 'DOE' | 'CHAMP';

const emptyNewRow = {
  name: '',
  phone: '',
  email: '',
  source: 'DOE' as Referral['source'],
  referral_date: format(new Date(), 'yyyy-MM-dd'),
  servicing_agent_id: '',
  notes: '',
};

export default function Referrals() {
  const [rows, setRows] = useState<Referral[]>([]);
  const [agents, setAgents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('All');
  const [newRow, setNewRow] = useState({ ...emptyNewRow });

  function load() {
    setLoading(true);
    api
      .get<Referral[]>('/api/referrals')
      .then(setRows)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load referrals'))
      .finally(() => setLoading(false));
  }
  useEffect(() => {
    load();
    api
      .get<{ users: User[] }>('/api/users')
      .then((d) => setAgents(d.users || []))
      .catch(() => setAgents([]));
  }, []);

  const visible = sourceFilter === 'All' ? rows : rows.filter((r) => r.source === sourceFilter);
  const doeCount = rows.filter((r) => r.source === 'DOE').length;
  const champCount = rows.filter((r) => r.source === 'CHAMP').length;

  async function patchRow(id: number, field: string, value: string | number | null) {
    setError(null);
    try {
      const updated = await api.patch<Referral>(`/api/referrals/${id}`, { [field]: value });
      setRows((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                ...updated,
                servicing_agent_name:
                  field === 'servicing_agent_id'
                    ? agents.find((a) => String(a.id) === String(value))?.name ?? null
                    : r.servicing_agent_name,
              }
            : r,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    }
  }

  async function addRow(e: FormEvent) {
    e.preventDefault();
    if (!newRow.name.trim()) return;
    setError(null);
    try {
      await api.post('/api/referrals', {
        ...newRow,
        servicing_agent_id: newRow.servicing_agent_id ? Number(newRow.servicing_agent_id) : null,
      });
      setNewRow({ ...emptyNewRow });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add referral');
    }
  }

  async function deleteRow(row: Referral) {
    if (!confirm(`Delete referral ${row.name}?`)) return;
    setError(null);
    try {
      await api.delete(`/api/referrals/${row.id}`);
      setRows((prev) => prev.filter((r) => r.id !== row.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

  function exportCsv() {
    downloadCsv(
      `referrals-${format(new Date(), 'yyyy-MM-dd')}.csv`,
      ['Name', 'Phone', 'Email', 'Source', 'Date', 'Servicing Agent', 'Notes'],
      visible.map((r) => [
        r.name,
        r.phone,
        r.email,
        r.source,
        r.referral_date ? format(new Date(r.referral_date), 'M/d/yyyy') : '',
        r.servicing_agent_name,
        r.notes,
      ]),
    );
  }

  const cellInput =
    'w-full bg-transparent px-2 py-1.5 text-sm rounded focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary/40';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-primary-dark">Referrals</h2>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as SourceFilter)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="All">All sources</option>
            <option value="DOE">DOE only</option>
            <option value="CHAMP">CHAMP only</option>
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
          id="referrals-sheet"
          title="What lives on the Referrals page?"
          description="Track incoming referrals: who they are, how they came in (DOE or CHAMP), when, and which agent is servicing them. Click any cell to edit."
          tips={[
            'Add a referral with the row at the bottom of the sheet — name is the only required field.',
            'Use the source dropdown in the toolbar to see just DOE or just CHAMP referrals; the tallies and CSV export follow the filter.',
            'Assign a servicing agent from the dropdown in each row.',
            'Export CSV or Print to share the list.',
          ]}
        />
      </div>

      {error && <div className="bg-coral-light text-coral p-3 rounded-lg text-sm print:hidden">{error}</div>}

      <div className="bg-white rounded-xl shadow-sm border border-sand-dark overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="border-b border-sand-dark bg-sand/50">
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Name</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Phone</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Email</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 w-28">Source</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 w-36">Date</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 w-44">Servicing Agent</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Notes</th>
              <th className="px-2 py-3 w-10 print:hidden"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-gray-400">Loading…</td>
              </tr>
            ) : visible.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-gray-400">
                  {sourceFilter !== 'All' ? `No ${sourceFilter} referrals` : 'No referrals yet — add one below'}
                </td>
              </tr>
            ) : (
              visible.map((row) => (
                <tr key={row.id} className="border-b border-sand-dark/50 hover:bg-sand/30">
                  <td className="px-2 py-1 font-medium text-primary-dark">
                    <SheetInput value={row.name} onCommit={(v) => patchRow(row.id, 'name', v)} />
                  </td>
                  <td className="px-2 py-1 text-gray-600">
                    <SheetInput value={row.phone} onCommit={(v) => patchRow(row.id, 'phone', v)} placeholder="—" />
                  </td>
                  <td className="px-2 py-1 text-gray-600">
                    <SheetInput value={row.email} onCommit={(v) => patchRow(row.id, 'email', v)} placeholder="—" />
                  </td>
                  <td className="px-2 py-1">
                    <select
                      value={row.source}
                      onChange={(e) => patchRow(row.id, 'source', e.target.value)}
                      className={cn(
                        'px-2 py-1 rounded-full text-xs font-medium border-0 focus:outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer',
                        row.source === 'DOE' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800',
                      )}
                    >
                      <option value="DOE">DOE</option>
                      <option value="CHAMP">CHAMP</option>
                    </select>
                  </td>
                  <td className="px-2 py-1 text-gray-600">
                    <SheetInput
                      type="date"
                      value={row.referral_date ? row.referral_date.slice(0, 10) : ''}
                      onCommit={(v) => patchRow(row.id, 'referral_date', v || null)}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <select
                      value={row.servicing_agent_id ?? ''}
                      onChange={(e) =>
                        patchRow(row.id, 'servicing_agent_id', e.target.value ? Number(e.target.value) : null)
                      }
                      className="w-full bg-transparent px-2 py-1.5 text-sm rounded focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary/40 cursor-pointer text-gray-600"
                    >
                      <option value="">Unassigned</option>
                      {agents.map((a) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
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
                <form id="add-referral" onSubmit={addRow}>
                  <input
                    value={newRow.name}
                    onChange={(e) => setNewRow({ ...newRow, name: e.target.value })}
                    placeholder="Add a referral…"
                    className={cellInput}
                  />
                </form>
              </td>
              <td className="px-2 py-1">
                <input
                  form="add-referral"
                  value={newRow.phone}
                  onChange={(e) => setNewRow({ ...newRow, phone: e.target.value })}
                  placeholder="Phone"
                  className={cellInput}
                />
              </td>
              <td className="px-2 py-1">
                <input
                  form="add-referral"
                  value={newRow.email}
                  onChange={(e) => setNewRow({ ...newRow, email: e.target.value })}
                  placeholder="Email"
                  className={cellInput}
                />
              </td>
              <td className="px-2 py-1">
                <select
                  form="add-referral"
                  value={newRow.source}
                  onChange={(e) => setNewRow({ ...newRow, source: e.target.value as Referral['source'] })}
                  className="bg-transparent px-2 py-1.5 text-sm rounded focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary/40 cursor-pointer"
                >
                  <option value="DOE">DOE</option>
                  <option value="CHAMP">CHAMP</option>
                </select>
              </td>
              <td className="px-2 py-1">
                <input
                  form="add-referral"
                  type="date"
                  value={newRow.referral_date}
                  onChange={(e) => setNewRow({ ...newRow, referral_date: e.target.value })}
                  className={cellInput}
                />
              </td>
              <td className="px-2 py-1">
                <select
                  form="add-referral"
                  value={newRow.servicing_agent_id}
                  onChange={(e) => setNewRow({ ...newRow, servicing_agent_id: e.target.value })}
                  className="w-full bg-transparent px-2 py-1.5 text-sm rounded focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary/40 cursor-pointer text-gray-600"
                >
                  <option value="">Unassigned</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </td>
              <td className="px-2 py-1">
                <input
                  form="add-referral"
                  value={newRow.notes}
                  onChange={(e) => setNewRow({ ...newRow, notes: e.target.value })}
                  placeholder="Notes"
                  className={cellInput}
                />
              </td>
              <td className="px-2 py-1 text-right">
                <button
                  type="submit"
                  form="add-referral"
                  disabled={!newRow.name.trim()}
                  className="text-primary hover:text-primary-dark disabled:text-gray-300"
                  title="Add referral"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="bg-sand/50 border-t border-sand-dark">
              <td colSpan={8} className="px-4 py-3 font-semibold text-primary-dark">
                {visible.length} referral{visible.length === 1 ? '' : 's'}
                {sourceFilter === 'All' && rows.length > 0 && (
                  <span className="font-normal text-gray-600"> — DOE: {doeCount} · CHAMP: {champCount}</span>
                )}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
