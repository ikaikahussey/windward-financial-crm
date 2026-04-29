import { useEffect, useState, FormEvent } from 'react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  Plus,
  X,
  Pencil,
  Trash2,
  Users as UsersIcon,
  Calendar,
  MapPin,
  Link as LinkIcon,
  Globe,
  AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';
import { PageHelp } from '@/components/PageHelp';

// Field names below are snake_case because the api client transforms every
// response to snake_case (see packages/web/src/lib/api.ts). The form state
// is also snake_case and is converted back to camelCase on the way out.
interface EventRecord {
  id: number;
  title: string;
  description: string;
  event_date: string;
  end_date: string | null;
  location: string | null;
  zoom_link: string | null;
  registration_required: boolean;
  max_attendees: number | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

interface Registration {
  id: number;
  event_id: number;
  contact_id: number | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  employment_type: string | null;
  employer_school: string | null;
  registered_at: string;
  attended: boolean | null;
}

const emptyForm = {
  title: '',
  description: '',
  event_date: '',
  end_date: '',
  location: '',
  zoom_link: '',
  registration_required: true,
  max_attendees: '',
  is_published: true,
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
  const [rebuildConfigured, setRebuildConfigured] = useState<boolean | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishMsg, setPublishMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  function loadRebuildStatus() {
    api
      .get<{ configured: boolean }>('/api/events/rebuild-status')
      .then((d) => setRebuildConfigured(Boolean(d?.configured)))
      .catch(() => setRebuildConfigured(false));
  }

  async function publishToPublic() {
    setPublishing(true);
    setPublishMsg(null);
    try {
      await api.post('/api/events/rebuild', { reason: 'manual: events page' });
      setPublishMsg({ kind: 'ok', text: 'Rebuild triggered. The public site will refresh in a few minutes.' });
    } catch (err) {
      setPublishMsg({
        kind: 'err',
        text: err instanceof Error ? err.message : 'Failed to trigger rebuild',
      });
    } finally {
      setPublishing(false);
    }
  }

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
    loadRebuildStatus();
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
      event_date: toLocalInput(event.event_date),
      end_date: event.end_date ? toLocalInput(event.end_date) : '',
      location: event.location ?? '',
      zoom_link: event.zoom_link ?? '',
      registration_required: event.registration_required,
      max_attendees: event.max_attendees != null ? String(event.max_attendees) : '',
      is_published: event.is_published,
    });
    setShowForm(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    // Send snake_case; the api client converts to camelCase for the backend.
    const payload = {
      title: form.title,
      description: form.description,
      event_date: new Date(form.event_date).toISOString(),
      end_date: form.end_date ? new Date(form.end_date).toISOString() : null,
      location: form.location || null,
      zoom_link: form.zoom_link || null,
      registration_required: form.registration_required,
      max_attendees: form.max_attendees ? Number(form.max_attendees) : null,
      is_published: form.is_published,
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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-primary-dark">Events</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={publishToPublic}
            disabled={publishing || rebuildConfigured === false}
            title={
              rebuildConfigured === false
                ? 'Disabled: REBUILD_WEBHOOK_URL is not set on the API'
                : 'Trigger a rebuild of the public website now'
            }
            className="flex items-center gap-2 bg-white border border-primary text-primary px-3 py-2 rounded-lg text-sm font-medium hover:bg-primary-light/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Globe className="h-4 w-4" />
            {publishing ? 'Publishing…' : 'Publish to public site'}
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition text-sm font-medium"
          >
            <Plus className="h-4 w-4" /> New Event
          </button>
        </div>
      </div>

      {rebuildConfigured === false && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3 flex items-start gap-2 text-sm">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" />
          <div>
            <strong>Public-site rebuilds are disabled.</strong> The API has no{' '}
            <code className="font-mono text-xs">REBUILD_WEBHOOK_URL</code> set, so creating, editing,
            or deleting an event here will not update windward.financial/events. Set the env var to
            the public site's deploy-hook URL (Railway → public service → Settings → Deploy Hook)
            and restart the API.
          </div>
        </div>
      )}

      {publishMsg && (
        <div
          className={cn(
            'border rounded-xl p-3 text-sm',
            publishMsg.kind === 'ok'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-coral-light border-coral/30 text-coral',
          )}
        >
          {publishMsg.text}
        </div>
      )}

      <PageHelp
        id="events"
        title="What are Events?"
        description="Public-facing webinars, seminars, and workshops listed on the marketing website. Mutations here publish to the public site."
        tips={[
          'Create an event with a title, date, location, and description. Publishing fires REBUILD_WEBHOOK_URL so the static site rebuilds.',
          'Set max attendees to enforce a cap on the public registration form.',
          'Registrations from the website are listed under the event; click through to see who signed up.',
          'Unpublishing an event hides it from the website without deleting the data.',
        ]}
      />

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
                    {format(new Date(event.event_date), 'MMM d, yyyy h:mm a')}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{event.location ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        event.is_published
                          ? 'bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full'
                          : 'bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full'
                      }
                    >
                      {event.is_published ? 'Published' : 'Draft'}
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
                    value={form.event_date}
                    onChange={(e) => setForm({ ...form, event_date: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-sand-dark rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="datetime-local"
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
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
                  value={form.zoom_link}
                  onChange={(e) => setForm({ ...form, zoom_link: e.target.value })}
                  placeholder="https://zoom.us/j/..."
                  className="w-full px-3 py-2 border border-sand-dark rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Attendees</label>
                <input
                  type="number"
                  min={0}
                  value={form.max_attendees}
                  onChange={(e) => setForm({ ...form, max_attendees: e.target.value })}
                  placeholder="Leave blank for unlimited"
                  className="w-full px-3 py-2 border border-sand-dark rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex gap-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.registration_required}
                    onChange={(e) => setForm({ ...form, registration_required: e.target.checked })}
                    className="h-4 w-4 text-primary"
                  />
                  <span className="text-sm text-gray-700">Registration required</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.is_published}
                    onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
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
                        <td className="px-3 py-2 font-medium">{reg.first_name} {reg.last_name}</td>
                        <td className="px-3 py-2 text-gray-600">{reg.email}</td>
                        <td className="px-3 py-2 text-gray-600">{reg.phone ?? '—'}</td>
                        <td className="px-3 py-2 text-gray-600">{reg.employer_school ?? '—'}</td>
                        <td className="px-3 py-2 text-gray-600">
                          {format(new Date(reg.registered_at), 'MMM d, yyyy')}
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
