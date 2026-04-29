import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Appointment, User, Contact } from '@/types';
import { Plus, Calendar, List, X, Search, Clock, MapPin } from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { PageHelp } from '@/components/PageHelp';

const STATUS_BADGE: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
  no_show: 'bg-orange-100 text-orange-700',
};

export default function Appointments() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'week' | 'list'>('list');
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [showCreate, setShowCreate] = useState(false);

  function loadAppointments() {
    api
      .get<{ appointments: Appointment[] }>('/api/appointments')
      .then((d) => setAppointments(d.appointments || []))
      .catch(() => setAppointments([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadAppointments(); }, []);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary-dark">Appointments</h1>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-white rounded-lg p-1 shadow-sm border border-sand-dark">
            <button
              onClick={() => setView('list')}
              className={cn('px-3 py-1.5 rounded-md text-sm font-medium transition', view === 'list' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-sand')}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView('week')}
              className={cn('px-3 py-1.5 rounded-md text-sm font-medium transition', view === 'week' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-sand')}
            >
              <Calendar className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition text-sm font-medium"
          >
            <Plus className="h-4 w-4" /> New Appointment
          </button>
        </div>
      </div>

      <PageHelp
        id="appointments"
        title="What are Appointments?"
        description="Schedule and track agent meetings with contacts. Drives the consultation step in the sales pipeline."
        tips={[
          'Toggle between List view and Week view in the top-right.',
          'Add an appointment with start/end times, location, and an optional contact link.',
          'Status badges show scheduled / completed / cancelled / no-show — update them as the meeting progresses.',
          'You can also schedule from a contact detail page using the "Schedule Appt" quick action.',
        ]}
      />

      {loading ? (
        <div className="animate-pulse text-primary">Loading...</div>
      ) : view === 'list' ? (
        /* List View */
        <div className="bg-white rounded-xl shadow-sm border border-sand-dark overflow-hidden">
          {appointments.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No appointments</div>
          ) : (
            <div className="divide-y divide-sand-dark/50">
              {appointments.map((appt) => (
                <div key={appt.id} className="flex items-center gap-4 px-4 py-3 hover:bg-sand/30 transition">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary-dark">{appt.title}</p>
                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                      {appt.contact && (
                        <button
                          onClick={() => navigate(`/contacts/${appt.contact_id}`)}
                          className="text-primary hover:underline"
                        >
                          {appt.contact.first_name} {appt.contact.last_name}
                        </button>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(appt.start_time), 'MMM d, h:mm a')} - {format(new Date(appt.end_time), 'h:mm a')}
                      </span>
                      {appt.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {appt.location}
                        </span>
                      )}
                      {appt.agent && <span>Agent: {appt.agent.name}</span>}
                    </div>
                  </div>
                  <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium capitalize', STATUS_BADGE[appt.status])}>
                    {appt.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Week View */
        <div className="bg-white rounded-xl shadow-sm border border-sand-dark p-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setWeekStart(addDays(weekStart, -7))}
              className="text-sm text-primary hover:text-primary-dark"
            >
              Previous
            </button>
            <span className="text-sm font-medium text-gray-700">
              {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
            </span>
            <button
              onClick={() => setWeekStart(addDays(weekStart, 7))}
              className="text-sm text-primary hover:text-primary-dark"
            >
              Next
            </button>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day) => {
              const dayAppts = appointments.filter((a) =>
                isSameDay(parseISO(a.start_time), day)
              );
              return (
                <div key={day.toISOString()} className="min-h-[150px]">
                  <div className={cn('text-xs font-medium text-center p-1 rounded-t-lg', isSameDay(day, new Date()) ? 'bg-primary text-white' : 'bg-sand text-gray-600')}>
                    {format(day, 'EEE d')}
                  </div>
                  <div className="border border-t-0 border-gray-200 rounded-b-lg p-1 space-y-1">
                    {dayAppts.map((a) => (
                      <div
                        key={a.id}
                        className={cn('p-1.5 rounded text-xs cursor-pointer hover:opacity-80', STATUS_BADGE[a.status])}
                        onClick={() => a.contact_id && navigate(`/contacts/${a.contact_id}`)}
                      >
                        <p className="font-medium truncate">{a.title}</p>
                        <p className="opacity-75">{format(new Date(a.start_time), 'h:mm a')}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create Appointment Dialog */}
      {showCreate && (
        <CreateAppointmentDialog
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); loadAppointments(); }}
        />
      )}
    </div>
  );
}

function CreateAppointmentDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    title: '',
    contact_id: '',
    agent_id: '',
    start_time: '',
    end_time: '',
    location: '',
    description: '',
  });
  const [agents, setAgents] = useState<User[]>([]);
  const [contactSearch, setContactSearch] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<{ users: User[] }>('/api/users').then((d) => setAgents(d.users || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (contactSearch.length >= 2) {
      api.get<{ contacts: Contact[] }>(`/api/contacts?search=${contactSearch}&limit=5`)
        .then((d) => setContacts(d.contacts || []))
        .catch(() => {});
    } else {
      setContacts([]);
    }
  }, [contactSearch]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/api/appointments', form);
      onCreated();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-primary-dark">New Appointment</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-gray-400" /></button>
        </div>
        {error && <div className="bg-coral-light text-coral p-3 rounded-lg text-sm mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contact *</label>
            {selectedContact ? (
              <div className="flex items-center justify-between p-2 bg-sand rounded-lg">
                <span className="text-sm">{selectedContact.first_name} {selectedContact.last_name}</span>
                <button type="button" onClick={() => { setSelectedContact(null); setForm({ ...form, contact_id: '' }); }} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
              </div>
            ) : (
              <div className="relative">
                <input
                  placeholder="Search contacts..."
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                {contacts.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
                    {contacts.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => { setSelectedContact(c); setForm({ ...form, contact_id: c.id }); setContacts([]); setContactSearch(''); }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-sand transition"
                      >
                        {c.first_name} {c.last_name} {c.email && `(${c.email})`}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Agent</label>
            <select value={form.agent_id} onChange={(e) => setForm({ ...form, agent_id: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
              <option value="">Select agent...</option>
              {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time *</label>
              <input required type="datetime-local" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time *</label>
              <input required type="datetime-local" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50">
              {saving ? 'Creating...' : 'Create Appointment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
