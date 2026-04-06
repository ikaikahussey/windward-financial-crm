import { useState, useEffect, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { ArrowLeft, Play, Pause, Plus, Edit2, Trash2, X, Eye, Send, CheckCircle, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

interface Campaign {
  id: number;
  name: string;
  type: string;
  status: string;
  subject: string;
  fromName: string;
  createdAt: string;
  steps?: Step[];
  enrollmentCount?: number;
}

interface Step {
  id: number;
  stepNumber: number;
  delayDays: number;
  subject: string;
  body: string;
  type: string;
}

interface EnrollmentRow {
  enrollment: {
    id: number;
    districtId: number;
    districtContactId: number | null;
    currentStep: number;
    status: string;
    enrolledAt: string;
  };
  district: {
    id: number;
    employerName: string;
    city: string;
    state: string;
  };
  contact: {
    firstName: string;
    lastName: string;
    email: string;
    title: string;
  } | null;
}

interface Metrics {
  totalEnrollments: number;
  activeEnrollments: number;
  completedEnrollments: number;
  sent: number;
  opened: number;
  clicked: number;
  replied: number;
  bounced: number;
  openRate: string;
  clickRate: string;
  replyRate: string;
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
    api.get<any>(`/api/marketing/campaigns/${id}`)
      .then((d) => {
        // API returns the campaign fields directly with steps and enrollmentCount
        setCampaign(d);
      })
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
    { key: 'steps', label: `Email Preview (${campaign.steps?.length || 0})` },
    { key: 'enrollments', label: `Recipients (${campaign.enrollmentCount || 0})` },
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

      {/* Draft approval banner */}
      {campaign.status === 'draft' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-amber-800">Campaign is in Draft mode</p>
            <p className="text-sm text-amber-700 mt-1">
              Review each email step below, edit if needed, then click <strong>"Approve &amp; Launch"</strong> when ready. No emails will be sent until you approve.
            </p>
          </div>
        </div>
      )}

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
      {activeTab === 'steps' && <StepsTab campaignId={id!} campaign={campaign} onUpdated={loadCampaign} />}
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
    fromName: campaign.fromName || '',
  });
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  async function handleLaunch() {
    if (!confirm('You are about to launch this campaign. Emails will start sending to all enrolled districts.\n\nAre you sure?')) return;
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
            className="flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-lg hover:bg-green-700 transition text-sm font-semibold disabled:opacity-50 shadow-sm"
          >
            <Send className="h-4 w-4" /> Approve &amp; Launch Campaign
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
        {campaign.status === 'active' && (
          <span className="flex items-center gap-1.5 text-sm text-green-700">
            <CheckCircle className="h-4 w-4" /> Campaign is live — emails are being sent
          </span>
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
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Name</label>
              <input value={form.fromName} onChange={(e) => setForm({ ...form, fromName: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
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
            <div><span className="text-gray-500">From Name:</span> <span className="font-medium">{campaign.fromName || '-'}</span></div>
            <div><span className="text-gray-500">Created:</span> <span className="font-medium">{campaign.createdAt ? format(new Date(campaign.createdAt), 'MMM d, yyyy') : '-'}</span></div>
            <div><span className="text-gray-500">Email Steps:</span> <span className="font-medium">{campaign.steps?.length || 0}</span></div>
            <div><span className="text-gray-500">Districts Enrolled:</span> <span className="font-medium">{campaign.enrollmentCount || 0}</span></div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ===================== STEPS TAB (with email preview) ===================== */
function StepsTab({ campaignId, campaign, onUpdated }: { campaignId: string; campaign: Campaign; onUpdated: () => void }) {
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingStep, setEditingStep] = useState<Step | null>(null);
  const [previewStep, setPreviewStep] = useState<Step | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  function loadSteps() {
    api.get<any>(`/api/marketing/campaigns/${campaignId}`)
      .then((d) => setSteps(d.steps || []))
      .catch(() => setSteps([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadSteps(); }, [campaignId]);

  async function handleApproveAndLaunch() {
    if (!confirm('You have reviewed all email steps.\n\nLaunch this campaign now? Emails will begin sending to all enrolled districts.')) return;
    setActionLoading(true);
    try {
      await api.post(`/api/marketing/campaigns/${campaignId}/launch`);
      onUpdated();
    } catch {
      alert('Failed to launch campaign');
    } finally {
      setActionLoading(false);
    }
  }

  // Fill in sample merge tags for preview
  function renderPreview(html: string): string {
    return html
      .replace(/\{\{district_name\}\}/g, 'Castle High School Complex')
      .replace(/\{\{first_name\}\}/g, 'Castle')
      .replace(/\{\{last_name\}\}/g, 'CAS Office')
      .replace(/\{\{title\}\}/g, 'Complex Area Superintendent')
      .replace(/\{\{city\}\}/g, 'Kaneohe')
      .replace(/\{\{state\}\}/g, 'HI');
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-primary-dark">Email Sequence</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setEditingStep(null); setShowAdd(true); }}
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition text-sm font-medium"
          >
            <Plus className="h-4 w-4" /> Add Step
          </button>
          {campaign.status === 'draft' && steps.length > 0 && (
            <button
              onClick={handleApproveAndLaunch}
              disabled={actionLoading}
              className="flex items-center gap-2 bg-green-600 text-white px-5 py-2 rounded-lg hover:bg-green-700 transition text-sm font-semibold disabled:opacity-50 shadow-sm"
            >
              <Send className="h-4 w-4" />
              {actionLoading ? 'Launching...' : 'Approve & Launch'}
            </button>
          )}
        </div>
      </div>

      <p className="text-sm text-gray-500">
        Review each email below. Click <strong>Preview</strong> to see the full rendered email, or <strong>Edit</strong> to modify the content. When satisfied, click <strong>Approve &amp; Launch</strong>.
      </p>

      {loading ? (
        <div className="p-8 text-center text-gray-400">Loading steps...</div>
      ) : steps.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-sand-dark p-8 text-center text-gray-400">
          No steps yet. Add your first step to define the campaign sequence.
        </div>
      ) : (
        <div className="space-y-4">
          {steps.sort((a, b) => a.stepNumber - b.stepNumber).map((step) => (
            <div key={step.id} className="bg-white rounded-xl shadow-sm border border-sand-dark overflow-hidden">
              {/* Step header */}
              <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-sand-dark">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold bg-primary text-white px-2.5 py-1 rounded-full">
                    Step {step.stepNumber}
                  </span>
                  <span className="text-sm text-gray-500">
                    {step.delayDays === 0 ? 'Sent immediately' : `Sent ${step.delayDays} day${step.delayDays !== 1 ? 's' : ''} after previous`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPreviewStep(step)}
                    className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition font-medium"
                  >
                    <Eye className="h-3 w-3" /> Preview
                  </button>
                  <button
                    onClick={() => { setEditingStep(step); setShowAdd(true); }}
                    className="flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition font-medium"
                  >
                    <Edit2 className="h-3 w-3" /> Edit
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm('Delete this step?')) return;
                      await api.delete(`/api/marketing/campaigns/${campaignId}/steps/${step.id}`);
                      loadSteps();
                    }}
                    className="text-gray-400 hover:text-red-500 p-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Subject line */}
              <div className="px-5 py-2 border-b border-sand-dark/50 bg-white">
                <span className="text-xs text-gray-400">Subject: </span>
                <span className="text-sm font-medium text-gray-800">
                  {renderPreview(step.subject)}
                </span>
              </div>

              {/* Email body preview (rendered HTML, max height) */}
              <div className="p-4">
                <div
                  className="border border-gray-100 rounded-lg overflow-hidden max-h-[300px] overflow-y-auto"
                  style={{ transform: 'scale(0.85)', transformOrigin: 'top left', width: '117.6%' }}
                >
                  <div dangerouslySetInnerHTML={{ __html: renderPreview(step.body) }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full-screen email preview modal */}
      {previewStep && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setPreviewStep(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div>
                <span className="text-xs font-bold bg-primary text-white px-2.5 py-1 rounded-full mr-2">
                  Step {previewStep.stepNumber}
                </span>
                <span className="text-sm text-gray-500">Email Preview</span>
              </div>
              <button onClick={() => setPreviewStep(null)}>
                <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 text-sm">
              <div><span className="text-gray-400">From:</span> <span className="font-medium">Windward Financial Group &lt;info@windward.financial&gt;</span></div>
              <div><span className="text-gray-400">Subject:</span> <span className="font-medium">{renderPreview(previewStep.subject)}</span></div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div dangerouslySetInnerHTML={{ __html: renderPreview(previewStep.body) }} />
            </div>
            <div className="p-4 border-t border-gray-200 flex items-center justify-between">
              <button
                onClick={() => { setPreviewStep(null); setEditingStep(previewStep); setShowAdd(true); }}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary"
              >
                <Edit2 className="h-4 w-4" /> Edit This Email
              </button>
              <button
                onClick={() => setPreviewStep(null)}
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark"
              >
                Looks Good
              </button>
            </div>
          </div>
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
  campaignId, step, stepCount, onClose, onSaved,
}: {
  campaignId: string; step: Step | null; stepCount: number; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({
    stepNumber: step?.stepNumber?.toString() || String(stepCount + 1),
    delayDays: step?.delayDays?.toString() || '0',
    subject: step?.subject || '',
    body: step?.body || '',
    type: step?.type || 'email',
  });
  const [saving, setSaving] = useState(false);

  function renderPreview(html: string): string {
    return html
      .replace(/\{\{district_name\}\}/g, 'Castle High School Complex')
      .replace(/\{\{first_name\}\}/g, 'Castle')
      .replace(/\{\{last_name\}\}/g, 'CAS Office')
      .replace(/\{\{title\}\}/g, 'Complex Area Superintendent')
      .replace(/\{\{city\}\}/g, 'Kaneohe')
      .replace(/\{\{state\}\}/g, 'HI');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        stepNumber: parseInt(form.stepNumber),
        delayDays: parseInt(form.delayDays),
        subject: form.subject,
        body: form.body,
        type: form.type,
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
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-5xl h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 shrink-0">
          <h2 className="text-lg font-bold text-primary-dark">{step ? 'Edit' : 'Add'} Email Step</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-gray-400 hover:text-gray-600" /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          {/* Meta fields row */}
          <div className="px-5 py-3 border-b border-gray-100 grid grid-cols-4 gap-3 shrink-0">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Step #</label>
              <input type="number" required min="1" value={form.stepNumber}
                onChange={(e) => setForm({ ...form, stepNumber: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Delay (days)</label>
              <input type="number" required min="0" value={form.delayDays}
                onChange={(e) => setForm({ ...form, delayDays: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="email">Email</option>
                <option value="sms">SMS</option>
              </select>
            </div>
            <div className="col-span-1">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Subject line</label>
              <input required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>

          {/* Split pane: HTML editor | live preview */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left: HTML editor */}
            <div className="w-1/2 border-r border-gray-200 flex flex-col">
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between shrink-0">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">HTML Body</span>
                <span className="text-xs text-gray-400">
                  Merge tags: {'{{district_name}}'} {'{{first_name}}'} {'{{title}}'}
                </span>
              </div>
              <textarea
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                className="flex-1 px-4 py-3 text-xs font-mono resize-none focus:outline-none"
                placeholder="Paste or write your email HTML here..."
              />
            </div>

            {/* Right: live preview */}
            <div className="w-1/2 flex flex-col overflow-hidden">
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 shrink-0">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Live Preview</span>
                <span className="text-xs text-gray-400 ml-2">Sample merge tags filled in</span>
              </div>
              <div className="flex-1 overflow-y-auto p-3 bg-gray-50">
                <div className="mb-2 text-xs text-gray-500 bg-white rounded border border-gray-100 px-3 py-1.5 space-y-0.5">
                  <div><span className="text-gray-400">Subject:</span> <span className="font-medium">{renderPreview(form.subject)}</span></div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div dangerouslySetInnerHTML={{ __html: renderPreview(form.body) }} />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-5 py-3 border-t border-gray-200 shrink-0">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-5 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-dark disabled:opacity-50 transition">
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
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [loading, setLoading] = useState(true);

  function loadEnrollments() {
    api.get<any>(`/api/marketing/campaigns/${campaignId}/enrollments`)
      .then((d) => {
        // API returns array of { enrollment, district, contact }
        const rows = Array.isArray(d) ? d : (d.enrollments || d.data || []);
        setEnrollments(rows);
      })
      .catch(() => setEnrollments([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadEnrollments(); }, [campaignId]);

  const statusStyles: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-600',
    active: 'bg-green-100 text-green-700',
    completed: 'bg-blue-100 text-blue-700',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-primary-dark">Enrolled Districts ({enrollments.length})</h2>
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
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Step</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {enrollments.map((row) => (
                <tr key={row.enrollment.id} className="border-b border-sand-dark/50 hover:bg-sand/30">
                  <td className="px-4 py-3 font-medium text-primary-dark">{row.district?.employerName || '-'}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {row.contact ? `${row.contact.firstName} ${row.contact.lastName}` : '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{row.contact?.email || '-'}</td>
                  <td className="px-4 py-3 text-gray-600">Step {row.enrollment.currentStep || 0}</td>
                  <td className="px-4 py-3">
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', statusStyles[row.enrollment.status] || 'bg-gray-100 text-gray-500')}>
                      {row.enrollment.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ===================== METRICS TAB ===================== */
function MetricsTab({ campaignId }: { campaignId: string }) {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<any>(`/api/marketing/campaigns/${campaignId}/metrics`)
      .then((d) => setMetrics(d))
      .catch(() => setMetrics(null))
      .finally(() => setLoading(false));
  }, [campaignId]);

  if (loading) return <div className="p-8 text-center text-gray-400">Loading metrics...</div>;
  if (!metrics) return <div className="p-8 text-center text-gray-400">No metrics available</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-primary-dark">Campaign Metrics</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard label="Total Enrolled" value={metrics.totalEnrollments} />
        <MetricCard label="Emails Sent" value={metrics.sent} />
        <MetricCard label="Opened" value={metrics.opened} />
        <MetricCard label="Clicked" value={metrics.clicked} />
        <MetricCard label="Replied" value={metrics.replied} />
        <MetricCard label="Bounced" value={metrics.bounced} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <RateCard label="Open Rate" value={`${metrics.openRate}%`} />
        <RateCard label="Click Rate" value={`${metrics.clickRate}%`} />
        <RateCard label="Reply Rate" value={`${metrics.replyRate}%`} />
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
