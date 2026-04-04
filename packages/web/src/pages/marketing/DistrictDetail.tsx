import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  ArrowLeft, UserPlus, Edit2, Save, X, Mail, Phone, Briefcase,
  CheckCircle, Clock, Send, AlertTriangle, UserSearch, Loader2,
} from 'lucide-react';
import { format } from 'date-fns';

interface DistrictContact {
  id: number;
  districtId: number;
  firstName: string;
  lastName: string;
  title: string;
  email: string;
  phone: string | null;
  linkedinUrl: string | null;
  foundVia: string | null;
  verifiedAt: string | null;
  createdAt: string;
}

interface CampaignEnrollment {
  enrollment: {
    id: number;
    campaignId: number;
    districtId: number;
    districtContactId: number | null;
    currentStep: number;
    status: string;
    enrolledAt: string;
    completedAt: string | null;
    lastStepSentAt: string | null;
  };
  campaign: {
    id: number;
    name: string;
    type: string;
    status: string;
    subject: string;
    fromName: string;
    createdAt: string;
  };
}

interface CampaignEvent {
  id: number;
  enrollmentId: number;
  stepNumber: number;
  eventType: string;
  occurredAt: string;
  metadata: any;
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
  contacts: DistrictContact[];
  enrollments: CampaignEnrollment[];
  events: CampaignEvent[];
}

const ENROLLMENT_STATUS: Record<string, { label: string; color: string }> = {
  pending:      { label: 'Pending',      color: 'bg-gray-100 text-gray-600' },
  active:       { label: 'Active',       color: 'bg-blue-100 text-blue-700' },
  completed:    { label: 'Completed',    color: 'bg-green-100 text-green-700' },
  unsubscribed: { label: 'Unsubscribed', color: 'bg-red-100 text-red-600' },
};

const EVENT_ICONS: Record<string, { icon: typeof Send; color: string }> = {
  sent:    { icon: Send,         color: 'text-blue-500' },
  opened:  { icon: Mail,         color: 'text-green-500' },
  clicked: { icon: CheckCircle,  color: 'text-emerald-600' },
  replied: { icon: CheckCircle,  color: 'text-purple-500' },
  bounced: { icon: AlertTriangle,color: 'text-red-500' },
};

export default function MarketingDistrictDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [district, setDistrict] = useState<District | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  // Contact form state
  const [showAddContact, setShowAddContact] = useState(false);
  const [editingContactId, setEditingContactId] = useState<number | null>(null);
  const [contactForm, setContactForm] = useState({
    firstName: '', lastName: '', title: '', email: '', phone: '',
  });
  const [saving, setSaving] = useState(false);

  function load() {
    if (!id) return;
    setLoading(true);
    api.get<District>(`/api/marketing/districts/${id}`)
      .then(setDistrict)
      .catch(() => setDistrict(null))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [id]);

  async function searchContact() {
    if (!id) return;
    setSearching(true);
    try {
      const resp = await api.post<{ results: { districtId: number; found: boolean; contact?: DistrictContact }[] }>(
        '/api/marketing/districts/search-batch',
        { districtIds: [parseInt(id)] }
      );
      load(); // Reload to get updated contacts
    } catch {
      alert('Search failed');
    } finally {
      setSearching(false);
    }
  }

  function startAddContact() {
    setContactForm({ firstName: '', lastName: '', title: '', email: '', phone: '' });
    setEditingContactId(null);
    setShowAddContact(true);
  }

  function startEditContact(contact: DistrictContact) {
    setContactForm({
      firstName: contact.firstName,
      lastName: contact.lastName,
      title: contact.title,
      email: contact.email,
      phone: contact.phone || '',
    });
    setEditingContactId(contact.id);
    setShowAddContact(true);
  }

  async function saveContact() {
    if (!id) return;
    setSaving(true);
    try {
      if (editingContactId) {
        await api.patch(`/api/marketing/district-contacts/${editingContactId}`, contactForm);
      } else {
        await api.post(`/api/marketing/districts/${id}/contacts`, contactForm);
      }
      setShowAddContact(false);
      setEditingContactId(null);
      load();
    } catch {
      alert('Failed to save contact');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="animate-pulse text-primary font-medium p-8">Loading district...</div>;
  }
  if (!district) {
    return <div className="text-gray-400 p-8">District not found</div>;
  }

  const hasContacts = district.contacts.length > 0;
  const hasEnrollments = district.enrollments.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => navigate('/marketing/districts')}
          className="p-2 rounded-lg hover:bg-gray-100 transition mt-0.5"
        >
          <ArrowLeft className="h-4 w-4 text-gray-500" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-primary-dark">{district.employerName}</h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
            {district.city && <span>{district.city}</span>}
            {district.county && <span>{district.county} County</span>}
            {district.state && <span>{district.state}</span>}
            {district.productionStatus && (
              <span className={cn(
                'px-2 py-0.5 rounded-full text-xs font-medium',
                district.productionStatus === 'Dormant' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
              )}>
                {district.productionStatus}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* District Info Card */}
      <div className="bg-white rounded-xl shadow-sm border border-sand-dark p-5">
        <h2 className="font-semibold text-primary-dark mb-3">District Information</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-400 block text-xs mb-0.5">District Name</span>
            <span className="font-medium text-gray-800">{district.employerName}</span>
          </div>
          <div>
            <span className="text-gray-400 block text-xs mb-0.5">City</span>
            <span className="font-medium text-gray-800">{district.city || '—'}</span>
          </div>
          <div>
            <span className="text-gray-400 block text-xs mb-0.5">County</span>
            <span className="font-medium text-gray-800">{district.county || '—'}</span>
          </div>
          <div>
            <span className="text-gray-400 block text-xs mb-0.5">State</span>
            <span className="font-medium text-gray-800">{district.state || '—'}</span>
          </div>
          <div>
            <span className="text-gray-400 block text-xs mb-0.5">Type</span>
            <span className="font-medium text-gray-800">{district.groupType || '—'}</span>
          </div>
          <div>
            <span className="text-gray-400 block text-xs mb-0.5">Plan Admin</span>
            <span className="font-medium text-gray-800">{district.planAdminName || '—'}</span>
          </div>
          <div>
            <span className="text-gray-400 block text-xs mb-0.5">Status</span>
            <span className="font-medium text-gray-800">{district.productionStatus || '—'}</span>
          </div>
          <div>
            <span className="text-gray-400 block text-xs mb-0.5">Added</span>
            <span className="font-medium text-gray-800">{format(new Date(district.createdAt), 'MMM d, yyyy')}</span>
          </div>
        </div>
      </div>

      {/* Contacts Section */}
      <div className="bg-white rounded-xl shadow-sm border border-sand-dark p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-primary-dark">
            Contacts {hasContacts && <span className="text-gray-400 font-normal">({district.contacts.length})</span>}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={searchContact}
              disabled={searching}
              className="flex items-center gap-1.5 text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition font-medium disabled:opacity-50"
            >
              {searching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserSearch className="h-3.5 w-3.5" />}
              {searching ? 'Searching...' : 'Auto Search'}
            </button>
            <button
              onClick={startAddContact}
              className="flex items-center gap-1.5 text-xs bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-primary-dark transition font-medium"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Add Contact
            </button>
          </div>
        </div>

        {/* Add / Edit Contact Form */}
        {showAddContact && (
          <div className="bg-sand/50 border border-sand-dark rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">
                {editingContactId ? 'Edit Contact' : 'Add New Contact'}
              </h3>
              <button onClick={() => { setShowAddContact(false); setEditingContactId(null); }}>
                <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">First Name *</label>
                <input
                  value={contactForm.firstName}
                  onChange={e => setContactForm(f => ({ ...f, firstName: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="First name"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Last Name *</label>
                <input
                  value={contactForm.lastName}
                  onChange={e => setContactForm(f => ({ ...f, lastName: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="Last name"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Title</label>
                <input
                  value={contactForm.title}
                  onChange={e => setContactForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="e.g. Superintendent, Principal"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Email *</label>
                <input
                  type="email"
                  value={contactForm.email}
                  onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Phone</label>
                <input
                  type="tel"
                  value={contactForm.phone}
                  onChange={e => setContactForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="(808) 555-1234"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={saveContact}
                  disabled={saving || !contactForm.firstName || !contactForm.lastName || !contactForm.email}
                  className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" />
                  {saving ? 'Saving...' : 'Save Contact'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Contacts List */}
        {!hasContacts && !showAddContact ? (
          <div className="text-center py-8">
            <UserSearch className="h-10 w-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">No contacts found for this district</p>
            <p className="text-gray-400 text-xs mt-1">Use "Auto Search" to find contacts or "Add Contact" to enter manually</p>
          </div>
        ) : (
          <div className="space-y-3">
            {district.contacts.map(contact => (
              <div key={contact.id} className="flex items-start justify-between border border-gray-100 rounded-lg p-4 hover:bg-sand/20 transition">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-800">{contact.firstName} {contact.lastName}</span>
                    {contact.verifiedAt && (
                      <CheckCircle className="h-3.5 w-3.5 text-green-500" title="Verified" />
                    )}
                  </div>
                  {contact.title && (
                    <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-1">
                      <Briefcase className="h-3.5 w-3.5" />
                      {contact.title}
                    </div>
                  )}
                  <div className="flex items-center gap-4 mt-2">
                    {contact.email && (
                      <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline">
                        <Mail className="h-3.5 w-3.5" />
                        {contact.email}
                      </a>
                    )}
                    {contact.phone && (
                      <span className="flex items-center gap-1.5 text-sm text-gray-500">
                        <Phone className="h-3.5 w-3.5" />
                        {contact.phone}
                      </span>
                    )}
                  </div>
                  {contact.foundVia && (
                    <span className="text-xs text-gray-400 mt-1 block">Found via: {contact.foundVia}</span>
                  )}
                </div>
                <button
                  onClick={() => startEditContact(contact)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition"
                  title="Edit contact"
                >
                  <Edit2 className="h-4 w-4 text-gray-400" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Campaign Status Section */}
      <div className="bg-white rounded-xl shadow-sm border border-sand-dark p-5">
        <h2 className="font-semibold text-primary-dark mb-4">
          Campaign History {hasEnrollments && <span className="text-gray-400 font-normal">({district.enrollments.length})</span>}
        </h2>

        {!hasEnrollments ? (
          <div className="text-center py-8">
            <Mail className="h-10 w-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">No campaigns for this district yet</p>
            <p className="text-gray-400 text-xs mt-1">Enroll this district in a campaign from the Campaign Builder</p>
          </div>
        ) : (
          <div className="space-y-4">
            {district.enrollments.map(({ enrollment, campaign }) => {
              const statusConf = ENROLLMENT_STATUS[enrollment.status] || ENROLLMENT_STATUS.pending;
              const enrollmentEvents = district.events.filter(e => e.enrollmentId === enrollment.id);

              return (
                <div key={enrollment.id} className="border border-gray-100 rounded-lg overflow-hidden">
                  {/* Campaign Header */}
                  <div className="flex items-center justify-between p-4 bg-sand/30">
                    <div>
                      <button
                        onClick={() => navigate(`/marketing/campaigns/${campaign.id}`)}
                        className="font-semibold text-primary-dark hover:underline text-left"
                      >
                        {campaign.name}
                      </button>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span className="capitalize">{campaign.type}</span>
                        <span>Enrolled {format(new Date(enrollment.enrolledAt), 'MMM d, yyyy')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium', statusConf.color)}>
                        {statusConf.label}
                      </span>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                        Step {enrollment.currentStep}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="px-4 py-3 border-t border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-gray-500 font-medium">Progress</span>
                      {enrollment.completedAt && (
                        <span className="text-xs text-green-600">
                          Completed {format(new Date(enrollment.completedAt), 'MMM d')}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {[1, 2, 3].map(step => {
                        const stepEvents = enrollmentEvents.filter(e => e.stepNumber === step);
                        const sent = stepEvents.some(e => e.eventType === 'sent');
                        const opened = stepEvents.some(e => e.eventType === 'opened');
                        const clicked = stepEvents.some(e => e.eventType === 'clicked');
                        const bounced = stepEvents.some(e => e.eventType === 'bounced');

                        let barColor = 'bg-gray-200';
                        let label = `Step ${step}: Pending`;
                        if (bounced) { barColor = 'bg-red-400'; label = `Step ${step}: Bounced`; }
                        else if (clicked) { barColor = 'bg-emerald-500'; label = `Step ${step}: Clicked`; }
                        else if (opened) { barColor = 'bg-green-400'; label = `Step ${step}: Opened`; }
                        else if (sent) { barColor = 'bg-blue-400'; label = `Step ${step}: Sent`; }

                        return (
                          <div key={step} className="flex-1" title={label}>
                            <div className={cn('h-2 rounded-full', barColor)} />
                            <div className="text-[10px] text-gray-400 mt-1 text-center">{step}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Event Timeline */}
                  {enrollmentEvents.length > 0 && (
                    <div className="px-4 py-3 border-t border-gray-100">
                      <span className="text-xs text-gray-500 font-medium block mb-2">Activity</span>
                      <div className="space-y-2">
                        {enrollmentEvents.map(event => {
                          const eventConf = EVENT_ICONS[event.eventType] || EVENT_ICONS.sent;
                          const Icon = eventConf.icon;
                          return (
                            <div key={event.id} className="flex items-center gap-2 text-xs">
                              <Icon className={cn('h-3.5 w-3.5', eventConf.color)} />
                              <span className="text-gray-600 capitalize">{event.eventType}</span>
                              <span className="text-gray-400">Step {event.stepNumber}</span>
                              <span className="text-gray-400 ml-auto">
                                {format(new Date(event.occurredAt), 'MMM d, h:mm a')}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* No events yet */}
                  {enrollmentEvents.length === 0 && (
                    <div className="px-4 py-3 border-t border-gray-100">
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Clock className="h-3.5 w-3.5" />
                        No activity yet — campaign is {campaign.status === 'draft' ? 'in draft, awaiting approval' : enrollment.status}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
