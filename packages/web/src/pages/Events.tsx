import { useEffect, useState, FormEvent } from 'react';
import { api } from '@/lib/api';
import { Plus, X, Pencil, Trash2, Users as UsersIcon, Calendar, MapPin, Link as LinkIcon } from 'lucide-react';
import { format } from 'date-fns';

interface EventRecord {
  id: number;
  title: string;
  description: string;
  eventDate: string;
  endDate: string | null;
  location: string | null;
  zoomLink: string | null;
  registrationRequired: boolean;
  maxAttendees: number | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Registration {
  id: number;
  eventId: number;
  contactId: number | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  employmentType: string | null;
  employerSchool: string | null;
  registeredAt: string;
  attended: boolean | null;
}

const emptyForm = {
  title: '',
  description: '',
  eventDate: '',
  endDate: '',
  location: '',
  zoomLink: '',
  registrationRequired: true,
  maxAttendees: '',
  isPublished: true,
};

export default function Events() {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<EventRecord | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [viewingRegs, setViewingRegs] = useState<EventRecord | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [regsLoading, setRegsLoading] = useState(false);

  function load() {
    setLoading(true);
    api
      .get<EventRecord[]>('/api/events')
      .then((rows) => setEvents(rows))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(event: EventRecord) {
    setEditing(event);
    setForm({
      title: event.title,
      description: event.description,
      eventDate: toLocalInput(event.eventDate),
      endDate: event.endDate ? toLocalInput(event.endDate) : '',
      location: event.location ?? '',
      zoomLink: event.zoomLink ?? '',
      registrationRequired: event.registrationRequired,
      maxAttendees: event.maxAttendees != null ? String(event.maxAttendees) : '',
      isPublished: event.isPublished,
    });
    setShowForm(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      title: form.title,
      description: form.description,
      eventDate: new Date(form.eventDate).toISOString(),
      endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
      location: form.location || null,
      zoomLink: form.zoomLink || null,
      registrationRequired: form.registrationRequired,
      maxAttendees: form.maxAttendees ? Number(form.maxAttendees) : null,
      isPublished: form.isPublished,
    };
    try {
      if (editing) {
        await api.patch(`/api/events/${editing.id}`, payload);
      } else {
        await api.post('/api/events', payload);
      }
      setShowForm(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(event: EventRecord) {
    if (!confirm(`Delete event "${event.title}"? This cannot be undone.`)) return;
    await api.delete(`/api/events/${event.id}`);
    load();
  }

  async function viewRegistrations(event: EventRecord) {
    setViewingRegs(event);
    setRegsLoading(true);
    try {
      const rows = await api.get<Registration[]>(`/api/events/${event.id}/registrations`);
      setRegistrations(rows);
    } catch {
      setRegistrations([]);
    } finally {
      setRegsLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary-dark">Events</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition text-sm font-medium"
        >
          <Plus className="h-4 w-4" /> New Event
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading events...</p>
      ) : events.length === 0 ? (
        <div className="bg-white rounded-lg p-12 text-center border border-sand-dark">
          <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 mb-4">No events yet.</p>
          <button onClick={openCreate} className="text-primary font-medium hover:underline">
            Create your first event
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-sand-dark overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-sand text-left">
              <tr>
                <th className="px-4 py-3 font-semibold">Title</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Location</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id} className="border-t border-sand-dark hover:bg-sand/30">
                  <td className="px-4 py-3 font-medium text-primary-dark">{event.title}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {format(new Date(event.eventDate), 'MMM d, yyyy h:mm a')}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{event.location ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        event.isPublished
                          ? 'bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full'
                          : 'bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full'
                      }
                    >
                      {event.isPublished ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <button
                        onClick={() => viewRegistrations(event)}
                        title="View registrations"
                        className="p-1.5 rounded hover:bg-sand text-gray-600"
                      >
                        <UsersIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openEdit(event)}
                        title="Edit"
                        className="p-1.5 rounded hover:bg-sand text-gray-600"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(event)}
                        title="Delete"
                        className="p-1.5 rounded hover:bg-red-50 text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-sand-dark">
              <h2 className="text-xl font-bold text-primary-dark">
                {editing ? 'Edit Event' : 'New Event'}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-sand rounded">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-sand-dark rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  required
                  rows={4}
                  className="w-full px-3 py-2 border border-sand-dark rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                  <input
                    type="datetime-local"
                    value={form.eventDate}
                    onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-sand-dark rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="datetime-local"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-sand-dark rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <MapPin className="inline h-4 w-4 mr-1" />
                  Location
                </label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="e.g. Zoom Webinar, Honolulu Convention Center"
                  className="w-full px-3 py-2 border border-sand-dark rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <LinkIcon className="inline h-4 w-4 mr-1" />
                  Zoom Link
                </label>
                <input
                  type="url"
                  value={form.zoomLink}
                  onChange={(e) => setForm({ ...form, zoomLink: e.target.value })}
                  placeholder="https://zoom.us/j/..."
                  className="w-full px-3 py-2 border border-sand-dark rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Attendees</label>
                <input
                  type="number"
                  min={0}
                  value={form.maxAttendees}
                  onChange={(e) => setForm({ ...form, maxAttendees: e.target.value })}
                  placeholder="Leave blank for unlimited"
                  className="w-full px-3 py-2 border border-sand-dark rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex gap-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.registrationRequired}
                    onChange={(e) => setForm({ ...form, registrationRequired: e.target.checked })}
                    className="h-4 w-4 text-primary"
                  />
                  <span className="text-sm text-gray-700">Registration required</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.isPublished}
                    onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
                    className="h-4 w-4 text-primary"
                  />
                  <span className="text-sm text-gray-700">Published</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-sand-dark">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-sand-dark rounded-md text-sm hover:bg-sand"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-dark disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewingRegs && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-sand-dark">
              <div>
                <h2 className="text-xl font-bold text-primary-dark">Registrations</h2>
                <p className="text-sm text-gray-600">{viewingRegs.title}</p>
              </div>
              <button
                onClick={() => {
                  setViewingRegs(null);
                  setRegistrations([]);
                }}
                className="p-1 hover:bg-sand rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5">
              {regsLoading ? (
                <p className="text-gray-500">Loading...</p>
              ) : registrations.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No registrations yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-sand text-left">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Name</th>
                      <th className="px-3 py-2 font-semibold">Email</th>
                      <th className="px-3 py-2 font-semibold">Phone</th>
                      <th className="px-3 py-2 font-semibold">Employer</th>
                      <th className="px-3 py-2 font-semibold">Registered</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registrations.map((reg) => (
                      <tr key={reg.id} className="border-t border-sand-dark">
                        <td className="px-3 py-2 font-medium">{reg.firstName} {reg.lastName}</td>
                        <td className="px-3 py-2 text-gray-600">{reg.email}</td>
                        <td className="px-3 py-2 text-gray-600">{reg.phone ?? '—'}</td>
                        <td className="px-3 py-2 text-gray-600">{reg.employerSchool ?? '—'}</td>
                        <td className="px-3 py-2 text-gray-600">
                          {format(new Date(reg.registeredAt), 'MMM d, yyyy')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
