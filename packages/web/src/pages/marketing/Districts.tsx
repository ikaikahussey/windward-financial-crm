import { useState, useEffect, useRef, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  Upload, Search, ChevronLeft, ChevronRight, UserSearch, Mail, Send,
  CheckCircle, Circle, Loader2, X, Edit2, Eye, AlertTriangle, Check,
} from 'lucide-react';

interface DistrictContact {
  id: number;
  districtId: number;
  firstName: string;
  lastName: string;
  title: string;
  email: string;
  phone: string | null;
}

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
  contact: DistrictContact | null;
}

// Pipeline step for each row
type RowStep = 'district' | 'searching' | 'contact_found' | 'contact_missing' | 'email_ready' | 'sending' | 'sent';

interface RowState {
  step: RowStep;
  contact: DistrictContact | null;
  editingContact: boolean;
  editFields: { firstName: string; lastName: string; title: string; email: string };
  showEmailPreview: boolean;
  emailContent?: EmailContent; // persists edits between modal opens
}

const STEP_CONFIG: Record<RowStep, { label: string; color: string; icon: string }> = {
  district:       { label: 'Ready',           color: 'bg-gray-100 text-gray-600',   icon: 'circle' },
  searching:      { label: 'Searching...',    color: 'bg-blue-100 text-blue-600',   icon: 'loader' },
  contact_found:  { label: 'Contact Found',   color: 'bg-emerald-100 text-emerald-700', icon: 'check' },
  contact_missing:{ label: 'No Contact',      color: 'bg-red-100 text-red-600',     icon: 'alert' },
  email_ready:    { label: 'Email Ready',     color: 'bg-amber-100 text-amber-700', icon: 'mail' },
  sending:        { label: 'Sending...',      color: 'bg-blue-100 text-blue-600',   icon: 'loader' },
  sent:           { label: 'Sent',            color: 'bg-green-100 text-green-700', icon: 'check' },
};

// ── Structured email content model ──────────────────────────────────────────
interface EmailContent {
  subject: string;
  greeting: string;
  openingLine: string;
  bullets: string[];
  closingLine: string;
  callToActionText: string;
  callToActionUrl: string;
  senderName: string;
  senderRole: string;
  senderPhone: string;
}

function defaultEmailContent(district: District, contact: DistrictContact): EmailContent {
  return {
    subject: `Section 125 Cafeteria Plans — A Tax-Free Benefit for ${district.employerName}`,
    greeting: `Dear ${contact.title} ${contact.firstName},`,
    openingLine: `I'm reaching out because ${district.employerName} may be missing out on a simple, IRS-approved benefit that can save your employees hundreds to thousands of dollars per year — at zero cost to the employer.`,
    bullets: [
      'Employees save 25-40% on their health premium costs',
      'Employers save ~7.65% on matching FICA taxes',
      'Zero cost to implement — we handle all administration',
      '100% IRS compliant — established under IRC §125',
    ],
    closingLine: `Many school districts and educational institutions are already taking advantage of this benefit. I'd love to show you how ${district.employerName} can do the same.`,
    callToActionText: 'Learn More About Section 125',
    callToActionUrl: 'https://windward.financial/section-125',
    senderName: 'Herb Hussey',
    senderRole: 'Windward Financial Group',
    senderPhone: '(808) 479-8447',
  };
}

function contentToHtml(c: EmailContent): string {
  const bulletItems = c.bullets
    .filter(b => b.trim())
    .map(b => `<li style="margin-bottom:8px"><strong>${b}</strong></li>`)
    .join('\n      ');
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333">
  <div style="background:#1B4D6E;padding:24px;text-align:center">
    <h1 style="color:white;margin:0;font-size:22px">Windward Financial Group</h1>
  </div>
  <div style="padding:32px 24px">
    <p>${c.greeting}</p>
    <p>${c.openingLine}</p>
    <p>A <strong>Section 125 Cafeteria Plan</strong> (also called a Premium Only Plan or POP) allows employees to pay their health insurance premiums with <em>pre-tax</em> dollars, reducing both their taxable income and their payroll taxes.</p>
    <h3 style="color:#1B4D6E">Here's what that means:</h3>
    <ul>${bulletItems}</ul>
    <p>${c.closingLine}</p>
    <p style="text-align:center;margin:32px 0">
      <a href="${c.callToActionUrl}" style="background:#1B4D6E;color:white;padding:14px 32px;text-decoration:none;border-radius:6px;font-weight:bold">${c.callToActionText}</a>
    </p>
    <p>Would you have 15 minutes this week for a brief call? I can walk you through exactly how this works for your district.</p>
    <p>Best regards,<br><strong>${c.senderName}</strong><br>${c.senderRole}<br>${c.senderPhone}</p>
  </div>
  <div style="background:#f5f5f5;padding:16px 24px;text-align:center;font-size:12px;color:#999">
    Windward Financial Group | Honolulu, HI<br>
    <a href="https://windward.financial" style="color:#1B4D6E">windward.financial</a>
  </div>
</div>`;
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Row state management
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [rowStates, setRowStates] = useState<Record<number, RowState>>({});
  const [emailEditorModal, setEmailEditorModal] = useState<{ district: District; contact: DistrictContact } | null>(null);
  const [activeEmailContent, setActiveEmailContent] = useState<EmailContent | null>(null);

  // Campaign creation state
  const [campaignResult, setCampaignResult] = useState<{ campaignId: number; districtsEnrolled: number } | null>(null);

  function getRowState(districtId: number): RowState {
    return rowStates[districtId] || {
      step: 'district',
      contact: null,
      editingContact: false,
      editFields: { firstName: '', lastName: '', title: '', email: '' },
      showEmailPreview: false,
    };
  }

  function updateRowState(districtId: number, updates: Partial<RowState>) {
    setRowStates(prev => ({
      ...prev,
      [districtId]: { ...getRowState(districtId), ...updates },
    }));
  }

  function load() {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', String(page));
    if (search) params.set('search', search);
    if (stateFilter) params.set('state', stateFilter);
    if (statusFilter) params.set('production_status', statusFilter);

    api.get<{ data: District[]; pagination: { totalPages: number } }>(`/api/marketing/districts?${params}`)
      .then((d) => {
        const rows = d.data || [];
        setDistricts(rows);
        setTotalPages(d.pagination?.totalPages || 1);

        // Initialize row states from loaded data (preserve existing states)
        setRowStates(prev => {
          const next = { ...prev };
          for (const district of rows) {
            if (!next[district.id]) {
              next[district.id] = {
                step: district.contact ? 'contact_found' : 'district',
                contact: district.contact,
                editingContact: false,
                editFields: {
                  firstName: district.contact?.firstName || '',
                  lastName: district.contact?.lastName || '',
                  title: district.contact?.title || '',
                  email: district.contact?.email || '',
                },
                showEmailPreview: false,
              };
            } else if (district.contact && next[district.id].step === 'district') {
              // Contact was found between loads
              next[district.id].step = 'contact_found';
              next[district.id].contact = district.contact;
              next[district.id].editFields = {
                firstName: district.contact.firstName,
                lastName: district.contact.lastName,
                title: district.contact.title,
                email: district.contact.email,
              };
            }
          }
          return next;
        });
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

  // ── Selection ──
  const allOnPageSelected = districts.length > 0 && districts.every(d => selected.has(d.id));
  function toggleSelectAll() {
    if (allOnPageSelected) {
      setSelected(prev => {
        const next = new Set(prev);
        districts.forEach(d => next.delete(d.id));
        return next;
      });
    } else {
      setSelected(prev => {
        const next = new Set(prev);
        districts.forEach(d => next.add(d.id));
        return next;
      });
    }
  }
  function toggleSelect(id: number) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // ── Step 2: Search Contacts ──
  async function searchContacts() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;

    // Mark all selected as searching
    for (const id of ids) {
      updateRowState(id, { step: 'searching' });
    }

    try {
      const resp = await api.post<{ results: { districtId: number; found: boolean; contact?: DistrictContact }[] }>(
        '/api/marketing/districts/search-batch',
        { districtIds: ids }
      );

      for (const r of resp.results) {
        if (r.found && r.contact) {
          updateRowState(r.districtId, {
            step: 'contact_found',
            contact: r.contact,
            editFields: {
              firstName: r.contact.firstName,
              lastName: r.contact.lastName,
              title: r.contact.title,
              email: r.contact.email,
            },
          });
        } else {
          updateRowState(r.districtId, { step: 'contact_missing' });
        }
      }
    } catch {
      for (const id of ids) {
        if (getRowState(id).step === 'searching') {
          updateRowState(id, { step: 'district' });
        }
      }
      alert('Search failed');
    }
  }

  // ── Step 3: Save edited contact ──
  async function saveContact(districtId: number) {
    const state = getRowState(districtId);
    if (!state.contact) return;
    try {
      const updated = await api.patch<DistrictContact>(
        `/api/marketing/district-contacts/${state.contact.id}`,
        state.editFields
      );
      updateRowState(districtId, {
        contact: updated,
        editingContact: false,
        editFields: {
          firstName: updated.firstName,
          lastName: updated.lastName,
          title: updated.title,
          email: updated.email,
        },
      });
    } catch {
      alert('Failed to save contact');
    }
  }

  // ── Step 4: Prepare Emails (mark as email_ready) ──
  function prepareEmails() {
    const ids = Array.from(selected);
    for (const id of ids) {
      const state = getRowState(id);
      if (state.step === 'contact_found' && state.contact) {
        updateRowState(id, { step: 'email_ready' });
      }
    }
  }

  // ── Step 5: Open email editor modal ──
  function openEmailPreview(district: District) {
    const state = getRowState(district.id);
    if (!state.contact) return;
    // Use previously saved edits or generate defaults
    const content = state.emailContent || defaultEmailContent(district, state.contact);
    setActiveEmailContent(content);
    setEmailEditorModal({ district, contact: state.contact });
  }

  function saveEmailContent(districtId: number, content: EmailContent) {
    updateRowState(districtId, { emailContent: content });
    setActiveEmailContent(content);
  }

  // ── Step 6: Send (create campaign for selected email_ready rows) ──
  async function sendEmails() {
    const readyIds = Array.from(selected).filter(id => {
      const s = getRowState(id);
      return s.step === 'email_ready' && s.contact;
    });

    if (readyIds.length === 0) return;
    if (!confirm(`Create and launch Section 125 campaign for ${readyIds.length} district(s)?\n\nThis will create a 3-step email sequence and begin sending.`)) return;

    for (const id of readyIds) {
      updateRowState(id, { step: 'sending' });
    }

    try {
      const result = await api.post<{ campaignId: number; districtsEnrolled: number }>(
        '/api/marketing/launch-section125',
        { districtIds: readyIds }
      );
      setCampaignResult(result);

      for (const id of readyIds) {
        updateRowState(id, { step: 'sent' });
      }
    } catch {
      for (const id of readyIds) {
        updateRowState(id, { step: 'email_ready' });
      }
      alert('Failed to send campaign');
    }
  }

  // ── Counts for action buttons ──
  const selectedIds = Array.from(selected);
  const readyToSearch = selectedIds.filter(id => ['district', 'contact_missing'].includes(getRowState(id).step));
  const withContacts = selectedIds.filter(id => getRowState(id).step === 'contact_found');
  const emailReady = selectedIds.filter(id => getRowState(id).step === 'email_ready');

  // ── Step progress bar ──
  const totalSelected = selectedIds.length;
  const stepCounts = {
    district: selectedIds.filter(id => getRowState(id).step === 'district').length,
    contact_found: withContacts.length,
    email_ready: emailReady.length,
    sent: selectedIds.filter(id => getRowState(id).step === 'sent').length,
  };

  function StepIcon({ step }: { step: RowStep }) {
    switch (STEP_CONFIG[step].icon) {
      case 'loader': return <Loader2 className="h-3.5 w-3.5 animate-spin" />;
      case 'check': return <CheckCircle className="h-3.5 w-3.5" />;
      case 'alert': return <AlertTriangle className="h-3.5 w-3.5" />;
      case 'mail': return <Mail className="h-3.5 w-3.5" />;
      default: return <Circle className="h-3.5 w-3.5" />;
    }
  }

  return (
    <div className="space-y-4">
      {/* Campaign Created Banner */}
      {campaignResult && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-green-800">Campaign Created Successfully</p>
            <p className="text-sm text-green-700 mt-1">
              {campaignResult.districtsEnrolled} districts enrolled in 3-step email sequence
            </p>
          </div>
          <button
            onClick={() => navigate(`/marketing/campaigns/${campaignResult.campaignId}`)}
            className="bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-800 transition"
          >
            View Campaign
          </button>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-primary-dark">Section 125 Campaign Builder</h1>
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" accept=".csv" onChange={handleCsvUpload} className="hidden" />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 transition text-sm font-medium disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            {uploading ? 'Uploading...' : 'Upload CSV'}
          </button>
        </div>
      </div>

      {/* Pipeline Steps Indicator */}
      <div className="bg-white rounded-xl shadow-sm border border-sand-dark p-4">
        <div className="flex items-center gap-1 text-xs font-medium text-gray-500 mb-3">
          WORKFLOW: Select districts → Search contacts → Review contacts → Preview emails → Send
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[
            { num: 1, label: 'Select & Search', desc: `${readyToSearch.length} ready to search`, action: readyToSearch.length > 0 ? searchContacts : undefined, btnLabel: 'Search Contacts', btnIcon: <UserSearch className="h-4 w-4" />, color: 'bg-blue-600 hover:bg-blue-700' },
            { num: 2, label: 'Review Contacts', desc: `${withContacts.length} contacts found`, action: undefined, btnLabel: undefined, btnIcon: undefined, color: '' },
            { num: 3, label: 'Prepare Emails', desc: `${withContacts.length} ready to prepare`, action: withContacts.length > 0 ? prepareEmails : undefined, btnLabel: 'Prepare Emails', btnIcon: <Mail className="h-4 w-4" />, color: 'bg-amber-600 hover:bg-amber-700' },
            { num: 4, label: 'Send', desc: `${emailReady.length} ready to send`, action: emailReady.length > 0 ? sendEmails : undefined, btnLabel: 'Send Campaign', btnIcon: <Send className="h-4 w-4" />, color: 'bg-green-600 hover:bg-green-700' },
          ].map((s, i) => (
            <div key={i} className="flex flex-col items-center text-center gap-2">
              <div className="flex items-center gap-2">
                <span className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">{s.num}</span>
                <span className="text-sm font-semibold text-gray-700">{s.label}</span>
              </div>
              <span className="text-xs text-gray-500">{s.desc}</span>
              {s.action && (
                <button
                  onClick={s.action}
                  className={cn('flex items-center gap-1.5 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition', s.color)}
                >
                  {s.btnIcon} {s.btnLabel}
                </button>
              )}
            </div>
          ))}
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

        {selected.size > 0 && (
          <span className="text-sm font-medium text-primary bg-primary/10 px-3 py-1.5 rounded-full">
            {selected.size} selected
          </span>
        )}
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
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 text-primary focus:ring-primary/30"
                  />
                </th>
                <th className="text-left px-3 py-3 font-semibold text-gray-600">District</th>
                <th className="text-left px-3 py-3 font-semibold text-gray-600">City</th>
                <th className="text-left px-3 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-left px-3 py-3 font-semibold text-gray-600">Pipeline</th>
                <th className="text-left px-3 py-3 font-semibold text-gray-600">Contact</th>
                <th className="text-right px-3 py-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {districts.map((d) => {
                const rs = getRowState(d.id);
                const stepConf = STEP_CONFIG[rs.step];

                return (
                  <tr
                    key={d.id}
                    className={cn(
                      'border-b border-sand-dark/50 transition',
                      selected.has(d.id) ? 'bg-primary/5' : 'hover:bg-sand/30',
                    )}
                  >
                    {/* Checkbox */}
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(d.id)}
                        onChange={() => toggleSelect(d.id)}
                        className="rounded border-gray-300 text-primary focus:ring-primary/30"
                      />
                    </td>

                    {/* District */}
                    <td className="px-3 py-3">
                      <Link to={`/marketing/districts/${d.id}`} className="font-medium text-primary-dark hover:underline" onClick={e => e.stopPropagation()}>
                        {d.employerName}
                      </Link>
                      <div className="text-xs text-gray-400">{d.groupType || d.state}</div>
                    </td>

                    {/* City */}
                    <td className="px-3 py-3 text-gray-600">{d.city || '-'}</td>

                    {/* Production Status */}
                    <td className="px-3 py-3">
                      {d.productionStatus && (
                        <span className={cn(
                          'px-2 py-0.5 rounded-full text-xs font-medium',
                          d.productionStatus === 'Dormant' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                        )}>
                          {d.productionStatus}
                        </span>
                      )}
                    </td>

                    {/* Pipeline Status */}
                    <td className="px-3 py-3">
                      <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', stepConf.color)}>
                        <StepIcon step={rs.step} />
                        {stepConf.label}
                      </span>
                    </td>

                    {/* Contact Info */}
                    <td className="px-3 py-3">
                      {rs.step === 'searching' && (
                        <span className="text-xs text-blue-500 italic">Searching...</span>
                      )}
                      {(rs.step === 'contact_found' || rs.step === 'email_ready' || rs.step === 'sent') && rs.contact && (
                        rs.editingContact ? (
                          <div className="space-y-1">
                            <input
                              value={rs.editFields.firstName}
                              onChange={e => updateRowState(d.id, { editFields: { ...rs.editFields, firstName: e.target.value } })}
                              placeholder="First name"
                              className="w-full text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary/30"
                            />
                            <input
                              value={rs.editFields.lastName}
                              onChange={e => updateRowState(d.id, { editFields: { ...rs.editFields, lastName: e.target.value } })}
                              placeholder="Last name"
                              className="w-full text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary/30"
                            />
                            <input
                              value={rs.editFields.title}
                              onChange={e => updateRowState(d.id, { editFields: { ...rs.editFields, title: e.target.value } })}
                              placeholder="Title"
                              className="w-full text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary/30"
                            />
                            <input
                              value={rs.editFields.email}
                              onChange={e => updateRowState(d.id, { editFields: { ...rs.editFields, email: e.target.value } })}
                              placeholder="Email"
                              className="w-full text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary/30"
                            />
                            <div className="flex gap-1">
                              <button
                                onClick={() => saveContact(d.id)}
                                className="text-xs bg-green-600 text-white px-2 py-0.5 rounded hover:bg-green-700 transition"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => updateRowState(d.id, {
                                  editingContact: false,
                                  editFields: {
                                    firstName: rs.contact!.firstName,
                                    lastName: rs.contact!.lastName,
                                    title: rs.contact!.title,
                                    email: rs.contact!.email,
                                  },
                                })}
                                className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded hover:bg-gray-300 transition"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="font-medium text-gray-800 text-xs">{rs.contact.firstName} {rs.contact.lastName}</div>
                            <div className="text-xs text-gray-500">{rs.contact.title}</div>
                            <div className="text-xs text-blue-600">{rs.contact.email}</div>
                          </div>
                        )
                      )}
                      {rs.step === 'contact_missing' && (
                        <span className="text-xs text-red-500">Not found</span>
                      )}
                      {rs.step === 'district' && (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Edit contact button */}
                        {(rs.step === 'contact_found' || rs.step === 'email_ready') && rs.contact && !rs.editingContact && (
                          <button
                            onClick={() => updateRowState(d.id, { editingContact: true })}
                            className="text-xs bg-gray-100 text-gray-600 p-1.5 rounded hover:bg-gray-200 transition"
                            title="Edit contact"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {/* Preview email button */}
                        {(rs.step === 'email_ready' || rs.step === 'sent') && rs.contact && (
                          <button
                            onClick={() => openEmailPreview(d)}
                            className="text-xs bg-amber-100 text-amber-700 p-1.5 rounded hover:bg-amber-200 transition"
                            title="Preview email"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {/* Search single contact */}
                        {(rs.step === 'district' || rs.step === 'contact_missing') && (
                          <button
                            onClick={() => {
                              updateRowState(d.id, { step: 'searching' });
                              api.post<{ results: { districtId: number; found: boolean; contact?: DistrictContact }[] }>(
                                '/api/marketing/districts/search-batch',
                                { districtIds: [d.id] }
                              ).then(resp => {
                                const r = resp.results[0];
                                if (r?.found && r.contact) {
                                  updateRowState(d.id, {
                                    step: 'contact_found',
                                    contact: r.contact,
                                    editFields: {
                                      firstName: r.contact.firstName,
                                      lastName: r.contact.lastName,
                                      title: r.contact.title,
                                      email: r.contact.email,
                                    },
                                  });
                                } else {
                                  updateRowState(d.id, { step: 'contact_missing' });
                                }
                              }).catch(() => updateRowState(d.id, { step: 'district' }));
                            }}
                            className="text-xs bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary/20 transition"
                          >
                            <UserSearch className="h-3.5 w-3.5 inline mr-1" />
                            Search
                          </button>
                        )}
                        {rs.step === 'sent' && (
                          <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                            <Check className="h-3.5 w-3.5" /> Done
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
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
          <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Email Editor Modal */}
      {emailEditorModal && activeEmailContent && (
        <EmailEditorModal
          district={emailEditorModal.district}
          contact={emailEditorModal.contact}
          content={activeEmailContent}
          onChange={(c) => saveEmailContent(emailEditorModal.district.id, c)}
          onClose={() => setEmailEditorModal(null)}
        />
      )}
    </div>
  );
}

// ── Email Editor Modal ────────────────────────────────────────────────────────
function EmailEditorModal({
  district, contact, content, onChange, onClose,
}: {
  district: District;
  contact: DistrictContact;
  content: EmailContent;
  onChange: (c: EmailContent) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<EmailContent>(content);
  const [bulletsText, setBulletsText] = useState(content.bullets.join('\n'));
  const [activeTab, setActiveTab] = useState<'edit' | 'html'>('edit');

  function update(field: keyof EmailContent, value: string) {
    setDraft(prev => ({ ...prev, [field]: value }));
  }

  function handleBulletsChange(val: string) {
    setBulletsText(val);
    setDraft(prev => ({ ...prev, bullets: val.split('\n').filter(l => l.trim()) }));
  }

  const previewHtml = contentToHtml(draft);

  function handleSave() {
    onChange(draft);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 shrink-0">
          <div>
            <h2 className="font-bold text-primary-dark">Edit Email</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              To: {contact.firstName} {contact.lastName} &lt;{contact.email}&gt; · {district.employerName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
              <button
                onClick={() => setActiveTab('edit')}
                className={cn('px-3 py-1.5 transition', activeTab === 'edit' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50')}
              >
                Edit
              </button>
              <button
                onClick={() => setActiveTab('html')}
                className={cn('px-3 py-1.5 transition', activeTab === 'html' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50')}
              >
                HTML
              </button>
            </div>
            <button onClick={onClose}><X className="h-5 w-5 text-gray-400 hover:text-gray-600" /></button>
          </div>
        </div>

        {/* Body: split pane */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Editor */}
          <div className="w-[45%] border-r border-gray-200 overflow-y-auto p-4 space-y-4">
            {activeTab === 'edit' ? (
              <>
                <Field label="Subject line">
                  <input
                    value={draft.subject}
                    onChange={e => update('subject', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </Field>
                <Field label="Greeting">
                  <input
                    value={draft.greeting}
                    onChange={e => update('greeting', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </Field>
                <Field label="Opening paragraph">
                  <textarea
                    value={draft.openingLine}
                    onChange={e => update('openingLine', e.target.value)}
                    rows={4}
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
                  />
                </Field>
                <Field label="Key benefits (one per line)">
                  <textarea
                    value={bulletsText}
                    onChange={e => handleBulletsChange(e.target.value)}
                    rows={5}
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
                    placeholder="Employees save 25-40% on health costs&#10;Employers save ~7.65% on FICA&#10;..."
                  />
                  <p className="text-xs text-gray-400 mt-1">Each line becomes a bullet point.</p>
                </Field>
                <Field label="Closing paragraph">
                  <textarea
                    value={draft.closingLine}
                    onChange={e => update('closingLine', e.target.value)}
                    rows={3}
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="CTA button text">
                    <input
                      value={draft.callToActionText}
                      onChange={e => update('callToActionText', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </Field>
                  <Field label="CTA URL">
                    <input
                      value={draft.callToActionUrl}
                      onChange={e => update('callToActionUrl', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Sender name">
                    <input
                      value={draft.senderName}
                      onChange={e => update('senderName', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </Field>
                  <Field label="Sender role">
                    <input
                      value={draft.senderRole}
                      onChange={e => update('senderRole', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </Field>
                  <Field label="Phone">
                    <input
                      value={draft.senderPhone}
                      onChange={e => update('senderPhone', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </Field>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-gray-500">Edit raw HTML — changes here override the structured editor.</p>
                <textarea
                  value={previewHtml}
                  onChange={e => {
                    // When editing raw HTML, just update the preview directly
                    // Store as a note: we switch back to the structured fields for saving
                  }}
                  rows={30}
                  className="w-full text-xs font-mono border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  readOnly
                />
                <p className="text-xs text-amber-600">HTML is auto-generated from the structured fields. Switch to Edit tab to make changes.</p>
              </div>
            )}
          </div>

          {/* Right: Live preview */}
          <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Live Preview</span>
              <span className="text-xs text-gray-400">Updates as you type</span>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 text-xs space-y-0.5">
                <div><span className="text-gray-400">From:</span> <span className="font-medium">Windward Financial Group &lt;info@windward.financial&gt;</span></div>
                <div><span className="text-gray-400">To:</span> <span className="font-medium">{contact.firstName} {contact.lastName} &lt;{contact.email}&gt;</span></div>
                <div><span className="text-gray-400">Subject:</span> <span className="font-medium">{draft.subject}</span></div>
              </div>
              <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-gray-200 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
            Cancel
          </button>
          <button onClick={handleSave} className="px-5 py-2 text-sm text-white bg-primary rounded-lg hover:bg-primary-dark transition font-semibold">
            Save &amp; Close
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}
