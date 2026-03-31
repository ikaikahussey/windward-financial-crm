import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Contact, User, PipelineStage, EmploymentType, Island } from '@/types';
import { Search, Plus, ChevronUp, ChevronDown, X } from 'lucide-react';
import { format } from 'date-fns';

const STAGES: { value: PipelineStage; label: string }[] = [
  { value: 'new_lead', label: 'New Lead' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'discovery_scheduled', label: 'Discovery Scheduled' },
  { value: 'discovery_completed', label: 'Discovery Completed' },
  { value: 'proposal_sent', label: 'Proposal Sent' },
  { value: 'follow_up', label: 'Follow Up' },
  { value: 'closed_won', label: 'Closed Won' },
  { value: 'closed_lost', label: 'Closed Lost' },
  { value: 'nurture', label: 'Nurture' },
];

const EMPLOYMENT_TYPES: { value: EmploymentType; label: string }[] = [
  { value: 'w2', label: 'W-2' },
  { value: 'self_employed', label: 'Self Employed' },
  { value: 'business_owner', label: 'Business Owner' },
  { value: 'retired', label: 'Retired' },
  { value: 'other', label: 'Other' },
];

const ISLANDS: { value: Island; label: string }[] = [
  { value: 'oahu', label: 'Oahu' },
  { value: 'maui', label: 'Maui' },
  { value: 'big_island', label: 'Big Island' },
  { value: 'kauai', label: 'Kauai' },
  { value: 'molokai', label: 'Molokai' },
  { value: 'lanai', label: 'Lanai' },
  { value: 'out_of_state', label: 'Out of State' },
];

const stageBadge: Record<PipelineStage, string> = {
  new_lead: 'bg-blue-100 text-blue-800',
  contacted: 'bg-sky-100 text-sky-800',
  discovery_scheduled: 'bg-indigo-100 text-indigo-800',
  discovery_completed: 'bg-violet-100 text-violet-800',
  proposal_sent: 'bg-amber-100 text-amber-800',
  follow_up: 'bg-orange-100 text-orange-800',
  closed_won: 'bg-green-100 text-green-800',
  closed_lost: 'bg-red-100 text-red-800',
  nurture: 'bg-gray-100 text-gray-800',
};

export default function Contacts() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [agents, setAgents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [filterEmployment, setFilterEmployment] = useState('');
  const [filterIsland, setFilterIsland] = useState('');
  const [filterAgent, setFilterAgent] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [sortField, setSortField] = useState<string>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [showCreate, setShowCreate] = useState(false);

  function loadContacts() {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (filterStage) params.set('stage', filterStage);
    if (filterEmployment) params.set('employment_type', filterEmployment);
    if (filterIsland) params.set('island', filterIsland);
    if (filterAgent) params.set('agent_id', filterAgent);
    if (filterSource) params.set('lead_source', filterSource);
    params.set('sort', sortField);
    params.set('order', sortDir);

    api
      .get<{ contacts: Contact[] }>(`/api/contacts?${params}`)
      .then((d) => setContacts(d.contacts || []))
      .catch(() => setContacts([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadContacts();
    api.get<{ users: User[] }>('/api/users').then((d) => setAgents(d.users || [])).catch(() => {});
  }, [search, filterStage, filterEmployment, filterIsland, filterAgent, filterSource, sortField, sortDir]);

  function toggleSort(field: string) {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }

  function SortIcon({ field }: { field: string }) {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? <ChevronUp className="h-3 w-3 inline" /> : <ChevronDown className="h-3 w-3 inline" />;
  }

  function stageLabel(s: PipelineStage) {
    return STAGES.find((st) => st.value === s)?.label || s;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary-dark">Contacts</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition text-sm font-medium"
        >
          <Plus className="h-4 w-4" /> Add Contact
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-sand-dark p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <select value={filterStage} onChange={(e) => setFilterStage(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
            <option value="">All Stages</option>
            {STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select value={filterEmployment} onChange={(e) => setFilterEmployment(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
            <option value="">All Employment</option>
            {EMPLOYMENT_TYPES.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
          </select>
          <select value={filterIsland} onChange={(e) => setFilterIsland(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
            <option value="">All Islands</option>
            {ISLANDS.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
          </select>
          <select value={filterAgent} onChange={(e) => setFilterAgent(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
            <option value="">All Agents</option>
            {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-sand-dark overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sand-dark bg-sand/50">
                <th className="text-left px-4 py-3 font-semibold text-gray-600 cursor-pointer" onClick={() => toggleSort('last_name')}>
                  Name <SortIcon field="last_name" />
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 cursor-pointer" onClick={() => toggleSort('email')}>
                  Email <SortIcon field="email" />
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Phone</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 cursor-pointer" onClick={() => toggleSort('pipeline_stage')}>
                  Stage <SortIcon field="pipeline_stage" />
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Employment</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Island</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Agent</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 cursor-pointer" onClick={() => toggleSort('last_contacted_at')}>
                  Last Contact <SortIcon field="last_contacted_at" />
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
              ) : contacts.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No contacts found</td></tr>
              ) : (
                contacts.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/contacts/${c.id}`)}
                    className="border-b border-sand-dark/50 hover:bg-sand/30 cursor-pointer transition"
                  >
                    <td className="px-4 py-3 font-medium text-primary-dark">{c.first_name} {c.last_name}</td>
                    <td className="px-4 py-3 text-gray-600">{c.email || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{c.phone || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', stageBadge[c.pipeline_stage])}>
                        {stageLabel(c.pipeline_stage)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 capitalize">{c.employment_type?.replace('_', ' ') || '-'}</td>
                    <td className="px-4 py-3 text-gray-600 capitalize">{c.island?.replace('_', ' ') || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{c.assigned_agent?.name || '-'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {c.last_contacted_at ? format(new Date(c.last_contacted_at), 'MMM d, yyyy') : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Dialog */}
      {showCreate && (
        <CreateContactDialog
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); loadContacts(); }}
          agents={agents}
        />
      )}
    </div>
  );
}

function CreateContactDialog({
  onClose,
  onCreated,
  agents,
}: {
  onClose: () => void;
  onCreated: () => void;
  agents: User[];
}) {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    employment_type: '',
    island: '',
    lead_source: '',
    assigned_agent_id: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/api/contacts', form);
      onCreated();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-primary-dark">Add Contact</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>

        {error && <div className="bg-coral-light text-coral p-3 rounded-lg text-sm mb-4">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
              <input required value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
              <input required value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Employment Type</label>
              <select value={form.employment_type} onChange={(e) => setForm({ ...form, employment_type: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
                <option value="">Select...</option>
                <option value="w2">W-2</option>
                <option value="self_employed">Self Employed</option>
                <option value="business_owner">Business Owner</option>
                <option value="retired">Retired</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Island</label>
              <select value={form.island} onChange={(e) => setForm({ ...form, island: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
                <option value="">Select...</option>
                <option value="oahu">Oahu</option>
                <option value="maui">Maui</option>
                <option value="big_island">Big Island</option>
                <option value="kauai">Kauai</option>
                <option value="molokai">Molokai</option>
                <option value="lanai">Lanai</option>
                <option value="out_of_state">Out of State</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lead Source</label>
              <input value={form.lead_source} onChange={(e) => setForm({ ...form, lead_source: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Agent</label>
              <select value={form.assigned_agent_id} onChange={(e) => setForm({ ...form, assigned_agent_id: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
                <option value="">Select...</option>
                {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50">
              {saving ? 'Saving...' : 'Create Contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
