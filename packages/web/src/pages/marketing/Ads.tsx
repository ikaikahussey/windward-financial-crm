import { useState, useEffect, FormEvent } from 'react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import { format } from 'date-fns';

interface Ad {
  id: string;
  district_name: string;
  district_id: string;
  platform: string;
  status: string;
  geo_target: string;
  daily_budget: number;
  impressions: number;
  clicks: number;
  start_date: string;
  end_date: string;
}

interface DistrictOption {
  id: string;
  name: string;
}

export default function MarketingAds() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editing, setEditing] = useState<Ad | null>(null);

  function load() {
    api.get<{ ads: Ad[] }>('/api/marketing/ads')
      .then((d) => setAds(d.ads || []))
      .catch(() => setAds([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function remove(id: string) {
    if (!confirm('Delete this ad campaign?')) return;
    await api.delete(`/api/marketing/ads/${id}`);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary-dark">Ad Campaigns</h1>
        <button
          onClick={() => { setEditing(null); setShowEditor(true); }}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition text-sm font-medium"
        >
          <Plus className="h-4 w-4" /> New Ad Campaign
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-sand-dark overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : ads.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No ad campaigns yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sand-dark bg-sand/50">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">District</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Platform</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Geo Target</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Daily Budget</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Impressions</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Clicks</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Dates</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {ads.map((ad) => (
                  <tr key={ad.id} className="border-b border-sand-dark/50 hover:bg-sand/30">
                    <td className="px-4 py-3 font-medium text-primary-dark">{ad.district_name || '-'}</td>
                    <td className="px-4 py-3 text-gray-600 capitalize">{ad.platform}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'px-2 py-0.5 rounded-full text-xs font-medium',
                        ad.status === 'active' ? 'bg-green-100 text-green-700' :
                        ad.status === 'paused' ? 'bg-amber-100 text-amber-700' :
                        ad.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-500'
                      )}>
                        {ad.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{ad.geo_target || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">${ad.daily_budget?.toFixed(2) ?? '0.00'}</td>
                    <td className="px-4 py-3 text-gray-600">{ad.impressions?.toLocaleString() ?? 0}</td>
                    <td className="px-4 py-3 text-gray-600">{ad.clicks?.toLocaleString() ?? 0}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {ad.start_date ? format(new Date(ad.start_date), 'MMM d') : '-'}
                      {ad.end_date ? ` - ${format(new Date(ad.end_date), 'MMM d')}` : ''}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button onClick={() => { setEditing(ad); setShowEditor(true); }} className="text-gray-400 hover:text-primary">
                        <Edit2 className="h-4 w-4 inline" />
                      </button>
                      <button onClick={() => remove(ad.id)} className="text-gray-400 hover:text-coral">
                        <Trash2 className="h-4 w-4 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showEditor && (
        <AdEditor
          ad={editing}
          onClose={() => setShowEditor(false)}
          onSaved={() => { setShowEditor(false); load(); }}
        />
      )}
    </div>
  );
}

function AdEditor({ ad, onClose, onSaved }: { ad: Ad | null; onClose: () => void; onSaved: () => void }) {
  const [districts, setDistricts] = useState<DistrictOption[]>([]);
  const [form, setForm] = useState({
    district_id: ad?.district_id || '',
    platform: ad?.platform || 'google',
    geo_target: ad?.geo_target || '',
    daily_budget: ad?.daily_budget?.toString() || '',
    start_date: ad?.start_date ? ad.start_date.slice(0, 10) : '',
    end_date: ad?.end_date ? ad.end_date.slice(0, 10) : '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<{ districts: DistrictOption[] }>('/api/marketing/districts?limit=500')
      .then((d) => setDistricts(d.districts || []))
      .catch(() => setDistricts([]));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        daily_budget: form.daily_budget ? parseFloat(form.daily_budget) : undefined,
      };
      if (ad) {
        await api.patch(`/api/marketing/ads/${ad.id}`, payload);
      } else {
        await api.post('/api/marketing/ads', payload);
      }
      onSaved();
    } catch {
      alert('Failed to save ad campaign');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-primary-dark">{ad ? 'Edit' : 'New'} Ad Campaign</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">District *</label>
            <select
              required
              value={form.district_id}
              onChange={(e) => setForm({ ...form, district_id: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Select district...</option>
              {districts.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Platform *</label>
            <select
              value={form.platform}
              onChange={(e) => setForm({ ...form, platform: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="google">Google</option>
              <option value="meta">Meta</option>
              <option value="linkedin">LinkedIn</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Geo Target</label>
            <input
              value={form.geo_target}
              onChange={(e) => setForm({ ...form, geo_target: e.target.value })}
              placeholder="e.g. Portland, OR 25mi radius"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Daily Budget ($)</label>
            <input
              type="number"
              step="0.01"
              value={form.daily_budget}
              onChange={(e) => setForm({ ...form, daily_budget: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
