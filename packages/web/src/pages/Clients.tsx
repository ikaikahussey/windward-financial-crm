import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { ClientRosterRow } from '@/types';
import { SheetInput } from '@/components/SheetInput';
import { downloadCsv } from '@/lib/sheet';
import { PageHelp } from '@/components/PageHelp';
import { Plus, Trash2, Download, Printer, DatabaseZap } from 'lucide-react';
import { format } from 'date-fns';

export default function Clients() {
  const [rows, setRows] = useState<ClientRosterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [newRow, setNewRow] = useState({ name: '', policy_numbers: '', notes: '' });

  function load() {
    setLoading(true);
    api
      .get<ClientRosterRow[]>('/api/client-roster')
      .then(setRows)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load clients'))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  const visible = search
    ? rows.filter((r) =>
        [r.name, r.policy_numbers, r.notes].some((v) =>
          (v || '').toLowerCase().includes(search.toLowerCase()),
        ),
      )
    : rows;

  async function patchRow(id: number, field: keyof ClientRosterRow, value: string) {
    setError(null);
    try {
      const updated = await api.patch<ClientRosterRow>(`/api/client-roster/${id}`, {
        [field]: value,
      });
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...updated } : r)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    }
  }

  async function addRow(e: FormEvent) {
    e.preventDefault();
    if (!newRow.name.trim()) return;
    setError(null);
    try {
      const created = await api.post<ClientRosterRow>('/api/client-roster', newRow);
      setRows((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setNewRow({ name: '', policy_numbers: '', notes: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add client');
    }
  }

  async function deleteRow(row: ClientRosterRow) {
    if (!confirm(`Remove ${row.name} from the client list?`)) return;
    setError(null);
    try {
      await api.delete(`/api/client-roster/${row.id}`);
      setRows((prev) => prev.filter((r) => r.id !== row.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

  async function importFromCrm() {
    setImporting(true);
    setError(null);
    try {
      const result = await api.post<{ imported: number }>('/api/client-roster/import');
      setNotice(`Imported ${result.imported} client${result.imported === 1 ? '' : 's'} from the CRM.`);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  }

  function exportCsv() {
    downloadCsv(
      `clients-${format(new Date(), 'yyyy-MM-dd')}.csv`,
      ['Client', 'Policy Numbers', 'Notes'],
      visible.map((r) => [r.name, r.policy_numbers, r.notes]),
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-primary-dark">Clients</h2>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            onClick={importFromCrm}
            disabled={importing}
            className="flex items-center gap-2 border border-primary text-primary px-3 py-2 rounded-lg hover:bg-primary/5 transition text-sm font-medium disabled:opacity-50"
            title="Add contacts that have a policy in the CRM but aren't on this list yet"
          >
            <DatabaseZap className="h-4 w-4" /> {importing ? 'Importing…' : 'Import from CRM'}
          </button>
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
          id="clients-sheet"
          title="What lives on the Clients page?"
          description="A simple roster of current clients, their policy numbers, and brief notes. Click any cell to edit it — changes save automatically."
          tips={[
            'Add a client with the row at the bottom of the sheet, or use "Import from CRM" to pull in every contact that already has a policy.',
            'Policy numbers is a free-text field — list multiple numbers separated by commas.',
            'Export CSV downloads the sheet (respecting the current search) so you can email or open it in Excel.',
            'Print gives a clean sheet without buttons or the sidebar.',
          ]}
        />
      </div>

      {error && <div className="bg-coral-light text-coral p-3 rounded-lg text-sm print:hidden">{error}</div>}
      {notice && (
        <div className="bg-primary/10 text-primary-dark p-3 rounded-lg text-sm print:hidden flex justify-between items-center">
          {notice}
          <button onClick={() => setNotice(null)} className="text-primary-dark/60 hover:text-primary-dark text-xs font-medium">
            Dismiss
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-sand-dark overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-sand-dark bg-sand/50">
              <th className="text-left px-4 py-3 font-semibold text-gray-600 w-1/4">Client</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 w-1/4">Policy Numbers</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Notes</th>
              <th className="px-2 py-3 w-10 print:hidden"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="text-center py-8 text-gray-400">Loading…</td>
              </tr>
            ) : visible.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-8 text-gray-400">
                  {search ? 'No matching clients' : 'No clients yet — add one below or import from the CRM'}
                </td>
              </tr>
            ) : (
              visible.map((row) => (
                <tr key={row.id} className="border-b border-sand-dark/50 hover:bg-sand/30">
                  <td className="px-2 py-1 font-medium text-primary-dark">
                    <SheetInput value={row.name} onCommit={(v) => patchRow(row.id, 'name', v)} />
                  </td>
                  <td className="px-2 py-1 text-gray-600">
                    <SheetInput
                      value={row.policy_numbers}
                      onCommit={(v) => patchRow(row.id, 'policy_numbers', v)}
                      placeholder="—"
                    />
                  </td>
                  <td className="px-2 py-1 text-gray-600">
                    <SheetInput
                      value={row.notes}
                      onCommit={(v) => patchRow(row.id, 'notes', v)}
                      placeholder="—"
                    />
                  </td>
                  <td className="px-2 py-1 text-right print:hidden">
                    <button
                      onClick={() => deleteRow(row)}
                      className="text-gray-300 hover:text-red-600"
                      title="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
            {/* New row */}
            <tr className="bg-sand/20 print:hidden">
              <td className="px-2 py-1">
                <form id="add-client" onSubmit={addRow}>
                  <input
                    value={newRow.name}
                    onChange={(e) => setNewRow({ ...newRow, name: e.target.value })}
                    placeholder="Add a client…"
                    className="w-full bg-transparent px-2 py-1.5 text-sm rounded focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary/40"
                  />
                </form>
              </td>
              <td className="px-2 py-1">
                <input
                  form="add-client"
                  value={newRow.policy_numbers}
                  onChange={(e) => setNewRow({ ...newRow, policy_numbers: e.target.value })}
                  placeholder="Policy numbers"
                  className="w-full bg-transparent px-2 py-1.5 text-sm rounded focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary/40"
                />
              </td>
              <td className="px-2 py-1">
                <input
                  form="add-client"
                  value={newRow.notes}
                  onChange={(e) => setNewRow({ ...newRow, notes: e.target.value })}
                  placeholder="Notes"
                  className="w-full bg-transparent px-2 py-1.5 text-sm rounded focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary/40"
                />
              </td>
              <td className="px-2 py-1 text-right">
                <button
                  type="submit"
                  form="add-client"
                  disabled={!newRow.name.trim()}
                  className="text-primary hover:text-primary-dark disabled:text-gray-300"
                  title="Add client"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="bg-sand/50 border-t border-sand-dark">
              <td colSpan={4} className="px-4 py-3 font-semibold text-primary-dark">
                {visible.length} client{visible.length === 1 ? '' : 's'}
                {search && ` (of ${rows.length})`}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
