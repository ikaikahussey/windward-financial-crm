import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Subscriber } from '@/types';
import { Search, Download, Mail } from 'lucide-react';
import { format } from 'date-fns';

export default function CmsSubscribers() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  function load() {
    const params = new URLSearchParams();
    if (search) params.set('search', search);

    api.get<{ subscribers: Subscriber[] }>(`/api/cms/subscribers?${params}`)
      .then((d) => setSubscribers(d.subscribers || []))
      .catch(() => setSubscribers([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [search]);

  function exportCsv() {
    const headers = ['Email', 'Name', 'Source', 'Status', 'Subscribed At'];
    const rows = subscribers.map((s) => [
      s.email,
      s.name || '',
      s.source || '',
      s.is_active ? 'Active' : 'Unsubscribed',
      format(new Date(s.subscribed_at), 'yyyy-MM-dd'),
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subscribers-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary-dark">Subscribers</h1>
        <button
          onClick={exportCsv}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition text-sm font-medium"
        >
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-sand-dark p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search subscribers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-sand-dark overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : subscribers.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <Mail className="h-12 w-12 text-gray-300 mx-auto mb-2" />
            No subscribers found
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sand-dark bg-sand/50">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Source</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Subscribed</th>
              </tr>
            </thead>
            <tbody>
              {subscribers.map((s) => (
                <tr key={s.id} className="border-b border-sand-dark/50 hover:bg-sand/30">
                  <td className="px-4 py-3 font-medium text-primary-dark">{s.email}</td>
                  <td className="px-4 py-3 text-gray-600">{s.name || '-'}</td>
                  <td className="px-4 py-3 text-gray-500 capitalize">{s.source || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', s.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600')}>
                      {s.is_active ? 'Active' : 'Unsubscribed'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {format(new Date(s.subscribed_at), 'MMM d, yyyy')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="text-sm text-gray-500">
        {subscribers.length} subscriber{subscribers.length !== 1 ? 's' : ''} total
      </div>
    </div>
  );
}
