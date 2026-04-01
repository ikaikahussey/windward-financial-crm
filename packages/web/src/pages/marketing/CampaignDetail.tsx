import { useState, useEffect, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { ArrowLeft, Play, Pause, Plus, Edit2, Trash2, X } from 'lucide-react';
import { format } from 'date-fns';

interface Campaign {
  id: string;
  name: string;
  type: string;
  status: string;
  subject: string;
  from_name: string;
  created_at: string;
}

interface Step {
  id: string;
  step_number: number;
  delay_days: number;
  subject: string;
  body: string;
  type: string;
}

interface Enrollment {
  id: string;
  district_id: string;
  district_name: string;
  contact_name: string;
  contact_email: string;
  current_step: number;
  status: string;
  enrolled_at: string;
}

interface Metrics {
  total_enrolled: number;
  emails_sent: number;
  opened: number;
  clicked: number;
  replied: number;
  bounced: number;
}

interface DistrictOption {
  id: string;
  name: string;
  contact_name: string;
}

type Tab = 'overview' | 'steps' | 'enrollments' | 'metrics';

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  active: 'bg-green-100 text-green-700',
  paused: 'bg-amber-100 text-amber-700',
  completed: 'bg-blue-100 text-blue-700',
};

export default function MarketingCampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  function loadCampaign() {
    if (!id) return;
    api.get<{ campaign: Campaign }>(`/api/marketing/campaigns/${id}`)
      .then((d) => setCampaign(d.campaign))
      .catch(() => setCampaign(null))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadCampaign(); }, [id]);

  if (loading) {
    return <div className="animate-pulse text-primary font-medium">Loading campaign...</div>;
  }

  if (!campaign) {
    return <div className="text-gray-400">Campaign not found</div>;
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'steps', label: 'Steps' },
    { key: 'enrollments', label: 'Enrollments' },
    { key: 'metrics', label: 'Metrics' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/marketing/campaigns')}
          className="p-2 rounded-lg hover:bg-gray-100 transition"
        >
          <ArrowLeft className="h-4 w-4 text-gray-500" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-primary-dark">{campaign.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-gray-500 capitalize">{campaign.type}</span>
            <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', STATUS_STYLES[campaign.status] || 'bg-gray-100 text-gray-500')}>
              {campaign.status}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'pb-3 text-sm font-medium border-b-2 transition',
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'overview' && (
        <OverviewTab campaign={campaign} onUpdated={loadCampaign} />
      )}
      {activeTab === 'steps' && <StepsTab campaignId={id!} />}
      {activeTab === 'enrollments' && <EnrollmentsTab campaignId={id!} />}
      {activeTab === 'metrics' && <MetricsTab campaignId={id!} />}
    </div>
  );
}

/* ===================== OVERVIEW TAB ===================== */
function OverviewTab({ campaign, onUpdated }: { campaign: Campaign; onUpdated: () => void }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: campaign.name,
    type: campaign.type,
    subject: campaign.subject || '',
    from_name: campaign.from_name || '',
  });
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  async function handleLaunch() {
    setActionLoading(true);
    try {
      await api.post(`/api/marketing/campaigns/${campaign.id}/launch`);
      onUpdated();
    } catch {
      alert('Failed to launch campaign');
    } finally {
      setActionLoading(false);
    }
  }

  async function handlePause() {
    setActionLoading(true);
    try {
      await api.post(`/api/marketing/campaigns/${campaign.id}/pause`);
      onUpdated();
    } catch {
      alert('Failed to pause campaign');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch(`/api/marketing/campaigns/${campaign.id}`, form);
      setEditing(false);
      onUpdated();
    } catch {
      alert('Failed to update campaign');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Action buttons */}
      <div className="flex items-center gap-3">
        {(campaign.status === 'draft' || campaign.status === 'paused') && (
          <button
            onClick={handleLaunch}
            disabled={actionLoading}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm font-medium disabled:opacity-50"
          >
            <Play className="h-4 w-4" /> Launch Campaign
          </button>
        )}
        {campaign.status === 'active' && (
          <button
            onClick={handlePause}
            disabled={actionLoading}
            className="flex items-center gap-2 bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600 transition text-sm font-medium disabled:opacity-50"
          >
            <Pause className="h-4 w-4" /> Pause Campaign
          </button>
        )}
        {!editing && campaign.status !== 'completed' && (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition text-sm font-medium"
          >
            <Edit2 className="h-4 w-4" /> Edit
          </button>
        )}
      </div>

      {/* Details */}
      <div className="bg-white rounded-xl shadow-sm border border-sand-dark p-6">
        {editing ? (
          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="email">Email</option>
                <option value="webinar">Webinar</option>
                <option value="pdf">PDF</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <input
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Name</label>
              <input
                value={form.from_name}
                onChange={(e) => setForm({ ...form, from_name: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setEditing(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-500">Name:</span> <span className="font-medium">{campaign.name}</span></div>
            <div><span className="text-gray-500">Type:</span> <span className="font-medium capitalize">{campaign.type}</span></div>
            <div><span className="text-gray-500">Status:</span> <span className="font-medium capitalize">{campaign.status}</span></div>
            <div><span className="text-gray-500">Subject:</span> <span className="font-medium">{campaign.subject || '-'}</span></div>
            <div><span className="text-gray-500">From Name:</span> <span className="font-medium">{campaign.from_name || '-'}</span></div>
            <div><span className="text-gray-500">Created:</span> <span className="font-medium">{campaign.created_at ? format(new Date(campaign.created_at), 'MMM d, yyyy') : '-'}</span></div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ===================== STEPS TAB ===================== */
function StepsTab({ campaignId }: { campaignId: string }) {
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingStep, setEditingStep] = useState<Step | null>(null);

  function loadSteps() {
    api.get<{ steps: Step[] }>(`/api/marketing/campaigns/${campaignId}`)
      .then((d) => setSteps(d.steps || []))
      .catch(() => setSteps([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadSteps(); }, [campaignId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-primary-dark">Campaign Steps</h2>
        <button
          onClick={() => { setEditingStep(null); setShowAdd(true); }}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition text-sm font-medium"
        >
          <Plus className="h-4 w-4" /> Add Step
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-400">Loading steps...</div>
      ) : steps.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-sand-dark p-8 text-center text-gray-400">
          No steps yet. Add your first step to define the campaign sequence.
        </div>
      ) : (
        <div className="space-y-3">
          {steps.sort((a, b) => a.step_number - b.step_number).map((step) => (
            <div key={step.id} className="bg-white rounded-xl shadow-sm border border-sand-dark p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded">
                      Step {step.step_number}
                    </span>
                    <span className="text-xs text-gray-400">
                      Delay: {step.delay_days} day{step.delay_days !== 1 ? 's' : ''}
                    </span>
                    <span className="text-xs text-gray-400 capitalize">
                      ({step.type || 'email'})
                    </span>
                  </div>
                  <p className="font-medium text-primary-dark">{step.subject}</p>
                  {step.body && (
                    <p className="text-xs text-gray-500 mt-1 truncate max-w-xl">{step.body.replace(/<[^>]*>/g, '').slice(0, 150)}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => { setEditingStep(step); setShowAdd(true); }}
                    className="text-gray-400 hover:text-primary"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm('Delete this step?')) return;
                      await api.delete(`/api/marketing/campaigns/${campaignId}/steps/${step.id}`);
                      loadSteps();
                    }}
                    className="text-gray-400 hover:text-coral"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <StepEditor
          campaignId={campaignId}
          step={editingStep}
          stepCount={steps.length}
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); loadSteps(); }}
        />
      )}
    </div>
  );
}

function StepEditor({
  campaignId,
  step,
  stepCount,
  onClose,
  onSaved,
}: {
  campaignId: string;
  step: Step | null;
  stepCount: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    step_number: step?.step_number?.toString() || String(stepCount + 1),
    delay_days: step?.delay_days?.toString() || '0',
    subject: step?.subject || '',
    body: step?.body || '',
    type: step?.type || 'email',
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        step_number: parseInt(form.step_number),
        delay_days: parseInt(form.delay_days),
      };
      if (step) {
        await api.patch(`/api/marketing/campaigns/${campaignId}/steps/${step.id}`, payload);
      } else {
        await api.post(`/api/marketing/campaigns/${campaignId}/steps`, payload);
      }
      onSaved();
    } catch {
      alert('Failed to save step');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-primary-dark">{step ? 'Edit' : 'Add'} Step</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Step #</label>
              <input
                type="number"
                required
                min="1"
                value={form.step_number}
                onChange={(e) => setForm({ ...form, step_number: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Delay (days)</label>
              <input
                type="number"
                required
                min="0"
                value={form.delay_days}
                onChange={(e) => setForm({ ...form, delay_days: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="email">Email</option>
                <option value="sms">SMS</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
            <input
              required
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Body (HTML)</label>
            <textarea
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              rows={8}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Step'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ===================== ENROLLMENTS TAB ===================== */
function EnrollmentsTab({ campaignId }: { campaignId: string }) {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEnroll, setShowEnroll] = useState(false);

  function loadEnrollments() {
    api.get<{ enrollments: Enrollment[] }>(`/api/marketing/campaigns/${campaignId}/enrollments`)
      .then((d) => setEnrollments(d.enrollments || []))
      .catch(() => setEnrollments([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadEnrollments(); }, [campaignId]);

  const enrollmentStatusStyles: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-600',
    active: 'bg-green-100 text-green-700',
    completed: 'bg-blue-100 text-blue-700',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-primary-dark">Enrollments</h2>
        <button
          onClick={() => setShowEnroll(true)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition text-sm font-medium"
        >
          <Plus className="h-4 w-4" /> Enroll Districts
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-sand-dark overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : enrollments.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No districts enrolled yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sand-dark bg-sand/50">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">District</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Contact</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Current Step</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Enrolled</th>
              </tr>
            </thead>
            <tbody>
              {enrollments.map((e) => (
                <tr key={e.id} className="border-b border-sand-dark/50 hover:bg-sand/30">
                  <td className="px-4 py-3 font-medium text-primary-dark">{e.district_name}</td>
                  <td className="px-4 py-3 text-gray-600">{e.contact_name || '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{e.contact_email || '-'}</td>
                  <td className="px-4 py-3 text-gray-600">Step {e.current_step || 1}</td>
                  <td className="px-4 py-3">
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', enrollmentStatusStyles[e.status] || 'bg-gray-100 text-gray-500')}>
                      {e.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {e.enrolled_at ? format(new Date(e.enrolled_at), 'MMM d, yyyy') : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showEnroll && (
        <EnrollDistrictsModal
          campaignId={campaignId}
          onClose={() => setShowEnroll(false)}
          onEnrolled={() => { setShowEnroll(false); loadEnrollments(); }}
        />
      )}
    </div>
  );
}

function EnrollDistrictsModal({
  campaignId,
  onClose,
  onEnrolled,
}: {
  campaignId: string;
  onClose: () => void;
  onEnrolled: () => void;
}) {
  const [districts, setDistricts] = useState<DistrictOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get<{ districts: DistrictOption[] }>('/api/marketing/districts?limit=500')
      .then((d) => setDistricts(d.districts || []))
      .catch(() => setDistricts([]))
      .finally(() => setLoading(false));
  }, []);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleEnroll() {
    if (selected.size === 0) return;
    setSaving(true);
    try {
      await api.post(`/api/marketing/campaigns/${campaignId}/enrollments`, {
        district_ids: Array.from(selected),
      });
      onEnrolled();
    } catch {
      alert('Failed to enroll districts');
    } finally {
      setSaving(false);
    }
  }

  const filtered = districts.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 pb-3">
          <h2 className="text-lg font-bold text-primary-dark">Enroll Districts</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-gray-400" /></button>
        </div>

        <div className="px-6 pb-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search districts..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-6">
          {loading ? (
            <p className="text-gray-400 py-4">Loading districts...</p>
          ) : filtered.length === 0 ? (
            <p className="text-gray-400 py-4">No districts found</p>
          ) : (
            <div className="space-y-1">
              {filtered.map((d) => (
                <label key={d.id} className="flex items-center gap-3 py-2 px-2 rounded hover:bg-sand/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.has(d.id)}
                    onChange={() => toggle(d.id)}
                    className="rounded border-gray-300 text-primary"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{d.name}</p>
                    {d.contact_name && <p className="text-xs text-gray-500">{d.contact_name}</p>}
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 pt-3 border-t border-gray-100 flex items-center justify-between">
          <span className="text-sm text-gray-500">{selected.size} selected</span>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
            <button
              onClick={handleEnroll}
              disabled={selected.size === 0 || saving}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50"
            >
              {saving ? 'Enrolling...' : 'Enroll Selected'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===================== METRICS TAB ===================== */
function MetricsTab({ campaignId }: { campaignId: string }) {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Metrics>(`/api/marketing/campaigns/${campaignId}/metrics`)
      .then((d) => setMetrics(d))
      .catch(() => setMetrics(null))
      .finally(() => setLoading(false));
  }, [campaignId]);

  if (loading) {
    return <div className="p-8 text-center text-gray-400">Loading metrics...</div>;
  }

  if (!metrics) {
    return <div className="p-8 text-center text-gray-400">No metrics available</div>;
  }

  const openRate = metrics.emails_sent > 0 ? ((metrics.opened / metrics.emails_sent) * 100).toFixed(1) : '0.0';
  const clickRate = metrics.emails_sent > 0 ? ((metrics.clicked / metrics.emails_sent) * 100).toFixed(1) : '0.0';
  const replyRate = metrics.emails_sent > 0 ? ((metrics.replied / metrics.emails_sent) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-primary-dark">Campaign Metrics</h2>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard label="Total Enrolled" value={metrics.total_enrolled} />
        <MetricCard label="Emails Sent" value={metrics.emails_sent} />
        <MetricCard label="Opened" value={metrics.opened} />
        <MetricCard label="Clicked" value={metrics.clicked} />
        <MetricCard label="Replied" value={metrics.replied} />
        <MetricCard label="Bounced" value={metrics.bounced} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <RateCard label="Open Rate" value={`${openRate}%`} />
        <RateCard label="Click Rate" value={`${clickRate}%`} />
        <RateCard label="Reply Rate" value={`${replyRate}%`} />
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-sand-dark p-4">
      <p className="text-2xl font-bold text-primary-dark">{value?.toLocaleString() ?? 0}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

function RateCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-sand-dark p-4 text-center">
      <p className="text-3xl font-bold text-primary">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
    </div>
  );
}
