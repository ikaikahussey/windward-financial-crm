import { useState, useEffect, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Contact, Activity, Policy, Task, Appointment, User, PipelineStage } from '@/types';
import {
  Phone,
  Mail,
  MapPin,
  Calendar,
  CheckSquare,
  Plus,
  ArrowLeft,
  Clock,
  PhoneCall,
  Send,
  FileText,
  Edit2,
  Save,
  X,
} from 'lucide-react';
import { format } from 'date-fns';

const STAGES: { value: PipelineStage; label: string; color: string }[] = [
  { value: 'New Lead', label: 'New Lead', color: 'bg-blue-100 text-blue-800' },
  { value: 'Contacted', label: 'Contacted', color: 'bg-sky-100 text-sky-800' },
  { value: 'Consultation Scheduled', label: 'Consult Scheduled', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'Consultation Completed', label: 'Consult Completed', color: 'bg-violet-100 text-violet-800' },
  { value: 'Proposal Sent', label: 'Proposal Sent', color: 'bg-amber-100 text-amber-800' },
  { value: 'Application Submitted', label: 'Application Sent', color: 'bg-orange-100 text-orange-800' },
  { value: 'Policy Issued', label: 'Policy Issued', color: 'bg-emerald-100 text-emerald-800' },
  { value: 'Active Client', label: 'Active Client', color: 'bg-green-100 text-green-800' },
  { value: 'Lost / Not Now', label: 'Lost / Not Now', color: 'bg-gray-100 text-gray-800' },
];

export default function ContactDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [contact, setContact] = useState<Contact | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [noteText, setNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Contact>>({});
  const [showAddPolicy, setShowAddPolicy] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddAppt, setShowAddAppt] = useState(false);

  function loadAll() {
    if (!id) return;
    Promise.all([
      api.get<{ contact: Contact }>(`/api/contacts/${id}`),
      api.get<{ activities: Activity[] }>(`/api/contacts/${id}/activities`).catch(() => ({ activities: [] })),
      api.get<{ policies: Policy[] }>(`/api/contacts/${id}/policies`).catch(() => ({ policies: [] })),
      api.get<{ tasks: Task[] }>(`/api/contacts/${id}/tasks`).catch(() => ({ tasks: [] })),
      api.get<{ appointments: Appointment[] }>(`/api/contacts/${id}/appointments`).catch(() => ({ appointments: [] })),
    ]).then(([c, a, p, t, ap]) => {
      setContact(c.contact);
      setEditForm(c.contact);
      setActivities(a.activities);
      setPolicies(p.policies);
      setTasks(t.tasks);
      setAppointments(ap.appointments);
      setLoading(false);
    }).catch(() => setLoading(false));
  }

  useEffect(() => { loadAll(); }, [id]);

  async function changeStage(stage: PipelineStage) {
    if (!id) return;
    await api.patch(`/api/contacts/${id}/stage`, { pipeline_stage: stage });
    loadAll();
  }

  async function addNote(e: FormEvent) {
    e.preventDefault();
    if (!noteText.trim() || !id) return;
    setAddingNote(true);
    try {
      await api.post(`/api/contacts/${id}/activities`, {
        type: 'note',
        title: 'Note added',
        description: noteText,
      });
      setNoteText('');
      loadAll();
    } finally {
      setAddingNote(false);
    }
  }

  async function saveContact() {
    if (!id) return;
    await api.patch(`/api/contacts/${id}`, editForm);
    setEditing(false);
    loadAll();
  }

  async function toggleTask(taskId: string, completed: boolean) {
    await api.patch(`/api/tasks/${taskId}`, { status: completed ? 'completed' : 'pending' });
    loadAll();
  }

  if (loading) return <div className="animate-pulse text-primary">Loading...</div>;
  if (!contact) return <div className="text-gray-500">Contact not found</div>;

  const currentStage = STAGES.find((s) => s.value === contact.pipeline_stage);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/contacts')} className="text-gray-400 hover:text-primary-dark">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-primary-dark">
              {contact.first_name} {contact.last_name}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium', currentStage?.color)}>
                {currentStage?.label}
              </span>
              {contact.assigned_agent && (
                <span className="text-sm text-gray-500">Agent: {contact.assigned_agent.name}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {contact.phone && (
            <a href={`tel:${contact.phone}`} className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary-dark transition">
              <Phone className="h-4 w-4" /> Call
            </a>
          )}
          {contact.email && (
            <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-primary text-primary rounded-lg text-sm hover:bg-primary-light transition">
              <Mail className="h-4 w-4" /> Email
            </a>
          )}
        </div>
      </div>

      {/* Stage Selector */}
      <div className="bg-white rounded-xl shadow-sm border border-sand-dark p-3">
        <div className="flex gap-1 overflow-x-auto">
          {STAGES.map((s) => (
            <button
              key={s.value}
              onClick={() => changeStage(s.value)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition',
                contact.pipeline_stage === s.value
                  ? s.color + ' ring-2 ring-offset-1 ring-gray-300'
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Column - 60% */}
        <div className="lg:col-span-3 space-y-6">
          {/* Activity Timeline */}
          <div className="bg-white rounded-xl shadow-sm border border-sand-dark p-4">
            <h2 className="text-lg font-semibold text-primary-dark mb-4">Activity Timeline</h2>
            {/* Add Note */}
            <form onSubmit={addNote} className="mb-4">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add a note..."
                rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 mb-2"
              />
              <button
                type="submit"
                disabled={addingNote || !noteText.trim()}
                className="px-4 py-1.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50 transition"
              >
                {addingNote ? 'Saving...' : 'Add Note'}
              </button>
            </form>

            <div className="space-y-4 max-h-[500px] overflow-y-auto">
              {activities.length === 0 && <p className="text-sm text-gray-400">No activity yet</p>}
              {activities.map((a) => (
                <div key={a.id} className="flex gap-3 items-start border-l-2 border-primary-light pl-4 py-1">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium uppercase text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
                        {a.type}
                      </span>
                      <span className="text-xs text-gray-400">
                        {format(new Date(a.created_at), 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-800 mt-1">{a.title}</p>
                    {a.description && <p className="text-sm text-gray-600 mt-0.5">{a.description}</p>}
                    {a.user && <p className="text-xs text-gray-400 mt-0.5">by {a.user.name}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Policies */}
          <div className="bg-white rounded-xl shadow-sm border border-sand-dark p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-primary-dark">Policies</h2>
              <button onClick={() => setShowAddPolicy(true)} className="flex items-center gap-1 text-sm text-primary hover:text-primary-dark">
                <Plus className="h-4 w-4" /> Add Policy
              </button>
            </div>
            {policies.length === 0 ? (
              <p className="text-sm text-gray-400">No policies</p>
            ) : (
              <div className="space-y-2">
                {policies.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-sand/50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{p.carrier} - {p.type}</p>
                      <p className="text-xs text-gray-500">#{p.policy_number || 'Pending'} | {p.status}</p>
                    </div>
                    <div className="text-right">
                      {p.premium_monthly && <p className="text-sm font-medium">${p.premium_monthly}/mo</p>}
                      {p.face_amount && <p className="text-xs text-gray-500">${p.face_amount.toLocaleString()} face</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - 40% */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Info Card */}
          <div className="bg-white rounded-xl shadow-sm border border-sand-dark p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-primary-dark">Contact Info</h3>
              {editing ? (
                <div className="flex gap-1">
                  <button onClick={saveContact} className="text-primary hover:text-primary-dark"><Save className="h-4 w-4" /></button>
                  <button onClick={() => { setEditing(false); setEditForm(contact); }} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
                </div>
              ) : (
                <button onClick={() => setEditing(true)} className="text-gray-400 hover:text-primary"><Edit2 className="h-4 w-4" /></button>
              )}
            </div>
            <div className="space-y-3 text-sm">
              {editing ? (
                <>
                  <EditField label="Email" value={editForm.email || ''} onChange={(v) => setEditForm({ ...editForm, email: v })} />
                  <EditField label="Phone" value={editForm.phone || ''} onChange={(v) => setEditForm({ ...editForm, phone: v })} />
                  <EditField label="Employer" value={editForm.employer || ''} onChange={(v) => setEditForm({ ...editForm, employer: v })} />
                  <EditField label="Occupation" value={editForm.occupation || ''} onChange={(v) => setEditForm({ ...editForm, occupation: v })} />
                  <EditField label="City" value={editForm.city || ''} onChange={(v) => setEditForm({ ...editForm, city: v })} />
                  <EditField label="Address" value={editForm.address || ''} onChange={(v) => setEditForm({ ...editForm, address: v })} />
                </>
              ) : (
                <>
                  <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={contact.email} />
                  <InfoRow icon={<Phone className="h-4 w-4" />} label="Phone" value={contact.phone} />
                  <InfoRow icon={<FileText className="h-4 w-4" />} label="Employer" value={contact.employer} />
                  <InfoRow icon={<FileText className="h-4 w-4" />} label="Occupation" value={contact.occupation} />
                  <InfoRow icon={<MapPin className="h-4 w-4" />} label="Island" value={contact.island?.replace('_', ' ')} />
                  <InfoRow icon={<MapPin className="h-4 w-4" />} label="City" value={contact.city} />
                  <InfoRow icon={<FileText className="h-4 w-4" />} label="Lead Source" value={contact.lead_source} />
                  {contact.annual_income && (
                    <InfoRow icon={<FileText className="h-4 w-4" />} label="Income" value={`$${contact.annual_income.toLocaleString()}`} />
                  )}
                </>
              )}
            </div>
          </div>

          {/* Tasks Card */}
          <div className="bg-white rounded-xl shadow-sm border border-sand-dark p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-primary-dark">Tasks</h3>
              <button onClick={() => setShowAddTask(true)} className="text-primary hover:text-primary-dark">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {tasks.length === 0 ? (
              <p className="text-sm text-gray-400">No tasks</p>
            ) : (
              <div className="space-y-2">
                {tasks.map((t) => (
                  <div key={t.id} className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={t.status === 'completed'}
                      onChange={(e) => toggleTask(t.id, e.target.checked)}
                      className="mt-1 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm', t.status === 'completed' && 'line-through text-gray-400')}>{t.title}</p>
                      {t.due_date && (
                        <p className="text-xs text-gray-400">{format(new Date(t.due_date), 'MMM d')}</p>
                      )}
                    </div>
                    <span className={cn('text-xs px-1.5 py-0.5 rounded', {
                      'bg-red-50 text-red-600': t.priority === 'urgent',
                      'bg-orange-50 text-orange-600': t.priority === 'high',
                      'bg-yellow-50 text-yellow-700': t.priority === 'medium',
                      'bg-gray-50 text-gray-500': t.priority === 'low',
                    })}>
                      {t.priority}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Appointments Card */}
          <div className="bg-white rounded-xl shadow-sm border border-sand-dark p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-primary-dark">Appointments</h3>
              <button onClick={() => setShowAddAppt(true)} className="text-primary hover:text-primary-dark">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {appointments.length === 0 ? (
              <p className="text-sm text-gray-400">No appointments</p>
            ) : (
              <div className="space-y-2">
                {appointments.map((a) => (
                  <div key={a.id} className="p-2 bg-sand/50 rounded-lg">
                    <p className="text-sm font-medium">{a.title}</p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(a.start_time), 'MMM d, h:mm a')}
                      {a.location && ` - ${a.location}`}
                    </p>
                    <span className={cn('text-xs px-1.5 py-0.5 rounded mt-1 inline-block', {
                      'bg-blue-50 text-blue-600': a.status === 'scheduled',
                      'bg-green-50 text-green-600': a.status === 'completed',
                      'bg-red-50 text-red-600': a.status === 'cancelled',
                      'bg-orange-50 text-orange-600': a.status === 'no_show',
                    })}>
                      {a.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-sand-dark p-4">
            <h3 className="font-semibold text-primary-dark mb-3">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              <QuickAction icon={<PhoneCall className="h-4 w-4" />} label="Log Call" onClick={() => {
                api.post(`/api/contacts/${id}/activities`, { type: 'call', title: 'Phone call logged' }).then(() => loadAll());
              }} />
              <QuickAction icon={<Send className="h-4 w-4" />} label="Send Email" onClick={() => {
                if (contact.email) window.location.href = `mailto:${contact.email}`;
              }} />
              <QuickAction icon={<Calendar className="h-4 w-4" />} label="Schedule Appt" onClick={() => setShowAddAppt(true)} />
              <QuickAction icon={<CheckSquare className="h-4 w-4" />} label="Add Task" onClick={() => setShowAddTask(true)} />
            </div>
          </div>
        </div>
      </div>

      {/* Add Policy Dialog */}
      {showAddPolicy && (
        <FormDialog title="Add Policy" onClose={() => setShowAddPolicy(false)} onSubmit={async (data) => {
          await api.post(`/api/contacts/${id}/policies`, data);
          setShowAddPolicy(false);
          loadAll();
        }} fields={[
          { name: 'carrier', label: 'Carrier', required: true },
          { name: 'type', label: 'Type', required: true },
          { name: 'policy_number', label: 'Policy Number' },
          { name: 'status', label: 'Status', type: 'select', options: ['active', 'pending', 'lapsed', 'cancelled'] },
          { name: 'premium_monthly', label: 'Monthly Premium', type: 'number' },
          { name: 'face_amount', label: 'Face Amount', type: 'number' },
        ]} />
      )}

      {/* Add Task Dialog */}
      {showAddTask && (
        <FormDialog title="Add Task" onClose={() => setShowAddTask(false)} onSubmit={async (data) => {
          await api.post('/api/tasks', { ...data, contact_id: id });
          setShowAddTask(false);
          loadAll();
        }} fields={[
          { name: 'title', label: 'Title', required: true },
          { name: 'description', label: 'Description' },
          { name: 'type', label: 'Type', type: 'select', options: ['follow_up', 'call', 'email', 'meeting', 'review', 'other'] },
          { name: 'priority', label: 'Priority', type: 'select', options: ['low', 'medium', 'high', 'urgent'] },
          { name: 'due_date', label: 'Due Date', type: 'date' },
        ]} />
      )}

      {/* Add Appointment Dialog */}
      {showAddAppt && (
        <FormDialog title="Schedule Appointment" onClose={() => setShowAddAppt(false)} onSubmit={async (data) => {
          await api.post('/api/appointments', { ...data, contact_id: id });
          setShowAddAppt(false);
          loadAll();
        }} fields={[
          { name: 'title', label: 'Title', required: true },
          { name: 'start_time', label: 'Start Time', type: 'datetime-local', required: true },
          { name: 'end_time', label: 'End Time', type: 'datetime-local', required: true },
          { name: 'location', label: 'Location' },
          { name: 'description', label: 'Notes' },
        ]} />
      )}
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-gray-400">{icon}</span>
      <span className="text-gray-500 min-w-[70px]">{label}:</span>
      <span className="text-gray-800 capitalize">{value || '-'}</span>
    </div>
  );
}

function EditField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-0.5">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30" />
    </div>
  );
}

function QuickAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 bg-sand/50 rounded-lg text-sm text-gray-700 hover:bg-primary-light/30 hover:text-primary-dark transition"
    >
      {icon} {label}
    </button>
  );
}

interface FormField {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  options?: string[];
}

function FormDialog({
  title,
  onClose,
  onSubmit,
  fields,
}: {
  title: string;
  onClose: () => void;
  onSubmit: (data: Record<string, string>) => Promise<void>;
  fields: FormField[];
}) {
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit(form);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-primary-dark">{title}</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          {fields.map((f) => (
            <div key={f.name}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}{f.required && ' *'}</label>
              {f.type === 'select' ? (
                <select
                  required={f.required}
                  value={form[f.name] || ''}
                  onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                >
                  <option value="">Select...</option>
                  {f.options?.map((o) => <option key={o} value={o}>{o.replace('_', ' ')}</option>)}
                </select>
              ) : (
                <input
                  type={f.type || 'text'}
                  required={f.required}
                  value={form[f.name] || ''}
                  onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              )}
            </div>
          ))}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
