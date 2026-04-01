import { useState, useEffect, useRef, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Plus, Upload, Search, X, ChevronLeft, ChevronRight, Rocket, Users, Zap } from 'lucide-react';

interface District {
  id: number;
  employerName: string;
  city: string;
  county: string;
  state: string;
  groupType: string;
  classificationSource: string;
  productionStatus: string;
  planAdminName: string;
  createdAt: string;
  updatedAt: string;
}

interface DistrictContact {
  id: string;
  name: string;
  title: string;
  email: string;
  phone: string;
}

const BASE_URL = import.meta.env.VITE_API_URL || '';

export default function MarketingDistricts() {
  const [districts, setDistricts] = useState<District[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [selectedDistrict, setSelectedDistrict] = useState<District | null>(null);
  const [searchingContact, setSearchingContact] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);
  const [launchResult, setLaunchResult] = useState<{ campaignId: number; contactsCreated: number; districtsEnrolled: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  function load() {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', String(page));
    if (search) params.set('search', search);
    if (stateFilter) params.set('state', stateFilter);
    if (statusFilter) params.set('production_status', statusFilter);

    api.get<{ data: District[]; pagination: { totalPages: number } }>(`/api/marketing/districts?${params}`)
      .then((d) => {
        setDistricts(d.data || []);
        setTotalPages(d.pagination?.totalPages || 1);
      })
      .catch(() => setDistricts([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [page, stateFilter, statusFilter]);

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    setPage(1);
    load();
  }

  async function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await fetch(BASE_URL + '/api/marketing/districts/upload-csv', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      load();
    } catch {
      alert('Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function searchContact(districtId: string) {
    setSearchingContact(districtId);
    try {
      await api.post(`/api/marketing/districts/${districtId}/search-contact`);
      load();
    } catch {
      alert('Search failed');
    } finally {
      setSearchingContact(null);
    }
  }

  async function handleLaunchCampaign() {
    if (!confirm('This will:\n\n1. Search for superintendent/principal contacts for all districts\n2. Create a 3-step Section 125 email campaign\n3. Enroll all districts with contacts\n4. Launch the campaign immediately\n\nProceed?')) return;
    setLaunching(true);
    try {
      const result = await api.post<{ campaignId: number; contactsCreated: number; districtsEnrolled: number }>('/api/marketing/launch-section125');
      setLaunchResult(result);
      load();
    } catch (err) {
      alert('Failed to launch campaign');
    } finally {
      setLaunching(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Launch Result Banner */}
      {launchResult && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-green-800">Section 125 Campaign Launched!</p>
            <p className="text-sm text-green-700 mt-1">
              {launchResult.contactsCreated} new contacts found &bull; {launchResult.districtsEnrolled} districts enrolled &bull; 3-step email sequence active
            </p>
          </div>
          <button
            onClick={() => navigate(`/marketing/campaigns/${launchResult.campaignId}`)}
            className="bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-800 transition"
          >
            View Campaign
          </button>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-primary-dark">Districts</h1>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleCsvUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition text-sm font-medium disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            {uploading ? 'Uploading...' : 'Upload CSV'}
          </button>
          <button
            onClick={handleLaunchCampaign}
            disabled={launching}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition text-sm font-medium disabled:opacity-50"
          >
            <Rocket className="h-4 w-4" />
            {launching ? 'Launching...' : 'Launch Section 125 Campaign'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search districts..."
              className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 w-64"
            />
          </div>
          <button type="submit" className="bg-primary text-white px-3 py-2 rounded-lg text-sm hover:bg-primary-dark transition">
            Search
          </button>
        </form>

        <select
          value={stateFilter}
          onChange={(e) => { setStateFilter(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">All States</option>
          <option value="HI">Hawaii</option>
          <option value="OR">Oregon</option>
          <option value="WA">Washington</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">All Statuses</option>
          <option value="Dormant">Dormant</option>
          <option value="Low Prod">Low Prod</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-sand-dark overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : districts.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No districts found</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sand-dark bg-sand/50">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">District Name</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">City</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">County</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">State</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Plan Admin</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Type</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {districts.map((d) => (
                <tr
                  key={d.id}
                  className="border-b border-sand-dark/50 hover:bg-sand/30 cursor-pointer"
                  onClick={() => setSelectedDistrict(d)}
                >
                  <td className="px-4 py-3 font-medium text-primary-dark">{d.employerName}</td>
                  <td className="px-4 py-3 text-gray-600">{d.city || '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{d.county || '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{d.state || '-'}</td>
                  <td className="px-4 py-3">
                    {d.productionStatus && (
                      <span className={cn(
                        'px-2 py-0.5 rounded-full text-xs font-medium',
                        d.productionStatus === 'Dormant'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                      )}>
                        {d.productionStatus}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{d.planAdminName || '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{d.groupType || '-'}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={(e) => { e.stopPropagation(); searchContact(String(d.id)); }}
                      disabled={searchingContact === String(d.id)}
                      className="text-xs bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary/20 transition disabled:opacity-50"
                    >
                      {searchingContact === String(d.id) ? 'Searching...' : 'Search Superintendent'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* District Detail Modal */}
      {selectedDistrict && (
        <DistrictDetailModal
          district={selectedDistrict}
          onClose={() => setSelectedDistrict(null)}
        />
      )}
    </div>
  );
}

function DistrictDetailModal({ district, onClose }: { district: District; onClose: () => void }) {
  const [contacts, setContacts] = useState<DistrictContact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ contacts: DistrictContact[] }>(`/api/marketing/districts/${district.id}`)
      .then((d) => setContacts(d.contacts || []))
      .catch(() => setContacts([]))
      .finally(() => setLoading(false));
  }, [district.id]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-primary-dark">{district.employerName}</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-gray-400" /></button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
          <div><span className="text-gray-500">City:</span> <span className="font-medium">{district.city || '-'}</span></div>
          <div><span className="text-gray-500">County:</span> <span className="font-medium">{district.county || '-'}</span></div>
          <div><span className="text-gray-500">State:</span> <span className="font-medium">{district.state || '-'}</span></div>
          <div><span className="text-gray-500">Status:</span> <span className="font-medium">{district.productionStatus || '-'}</span></div>
          <div><span className="text-gray-500">Type:</span> <span className="font-medium">{district.groupType || '-'}</span></div>
          <div><span className="text-gray-500">Plan Admin:</span> <span className="font-medium">{district.planAdminName || '-'}</span></div>
        </div>

        <h3 className="font-semibold text-primary-dark mb-2">Contacts</h3>
        {loading ? (
          <p className="text-gray-400 text-sm">Loading contacts...</p>
        ) : contacts.length === 0 ? (
          <p className="text-gray-400 text-sm">No contacts found</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sand-dark">
                <th className="text-left py-2 font-semibold text-gray-600">Name</th>
                <th className="text-left py-2 font-semibold text-gray-600">Title</th>
                <th className="text-left py-2 font-semibold text-gray-600">Email</th>
                <th className="text-left py-2 font-semibold text-gray-600">Phone</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id} className="border-b border-sand-dark/50">
                  <td className="py-2 font-medium">{c.name}</td>
                  <td className="py-2 text-gray-600">{c.title || '-'}</td>
                  <td className="py-2 text-gray-600">{c.email || '-'}</td>
                  <td className="py-2 text-gray-500">{c.phone || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
