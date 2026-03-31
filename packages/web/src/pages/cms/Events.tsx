import { useState, useEffect, FormEvent } from 'react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Event, EventRegistration } from '@/types';
import { Plus, Edit2, Trash2, X, Users, Calendar, MapPin } from 'lucide-react';
import { format } from 'date-fns';

export default function CmsEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editing, setEditing] = useState<Event | null>(null);
  const [viewingRegs, setViewingRegs] = useState<string | null>(null);

  function load() {
    api.get<{ events: Event[] }>('/api/cms/events')
      .then((d) => setEvents(d.events || []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function remove(id: string) {
    if (!confirm('Delete this event?')) return;
    await api.delete(`/api/cms/events/${id}`);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary-dark">Events</h1>
        <button onClick={() => { setEditing(null); setShowEditor(true); }} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition text-sm font-medium">
          <Plus className="h-4 w-4" /> New Event
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-sand-dark overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : events.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No events yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sand-dark bg-sand/50">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Event</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Date</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Location</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Registrations</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr key={ev.id} className="border-b border-sand-dark/50 hover:bg-sand/30">
                  <td className="px-4 py-3">
                    <p className="font-medium text-primary-dark">{ev.title}</p>
                    {ev.description && <p className="text-xs text-gray-500 truncate max-w-[200px]">{ev.description}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {format(new Date(ev.start_date), 'MMM d, yyyy h:mm a')}
                    {ev.end_date && <><br />{format(new Date(ev.end_date), 'MMM d, yyyy h:mm a')}</>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{ev.location || '-'}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setViewingRegs(ev.id)}
                      className="flex items-center gap-1 text-primary hover:text-primary-dark text-sm"
                    >
                      <Users className="h-3 w-3" />
                      {ev.registration_count || 0}
                      {ev.max_attendees && <span className="text-gray-400">/ {ev.max_attendees}</span>}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', ev.is_published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                      {ev.is_published ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => { setEditing(ev); setShowEditor(true); }} className="text-gray-400 hover:text-primary"><Edit2 className="h-4 w-4 inline" /></button>
                    <button onClick={() => remove(ev.id)} className="text-gray-400 hover:text-coral"><Trash2 className="h-4 w-4 inline" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showEditor && (
        <EventEditor event={editing} onClose={() => setShowEditor(false)} onSaved={() => { setShowEditor(false); load(); }} />
      )}

      {viewingRegs && (
        <RegistrationsDialog eventId={viewingRegs} onClose={() => setViewingRegs(null)} />
      )}
    </div>
  );
}

function EventEditor({ event, onClose, onSaved }: { event: Event | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    title: event?.title || '',
    description: event?.description || '',
    location: event?.location || '',
    start_date: event?.start_date ? event.start_date.slice(0, 16) : '',
    end_date: event?.end_date ? event.end_date.slice(0, 16) : '',
    max_attendees: event?.max_attendees?.toString() || '',
    is_published: event?.is_published ?? false,
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        max_attendees: form.max_attendees ? parseInt(form.max_attendees) : undefined,
      };
      if (event) {
        await api.patch(`/api/cms/events/${event.id}`, payload);
      } else {
        await api.post('/api/cms/events', payload);
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-primary-dark">{event ? 'Edit' : 'New'} Event</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
              <input required type="datetime-local" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input type="datetime-local" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Attendees</label>
              <input type="number" value={form.max_attendees} onChange={(e) => setForm({ ...form, max_attendees: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} className="rounded border-gray-300 text-primary" />
                <span className="text-sm text-gray-700">Published</span>
              </label>
            </div>
          </div>
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

function RegistrationsDialog({ eventId, onClose }: { eventId: string; onClose: () => void }) {
  const [regs, setRegs] = useState<EventRegistration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ registrations: EventRegistration[] }>(`/api/cms/events/${eventId}/registrations`)
      .then((d) => setRegs(d.registrations || []))
      .catch(() => setRegs([]))
      .finally(() => setLoading(false));
  }, [eventId]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-primary-dark">Registrations</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-gray-400" /></button>
        </div>
        {loading ? (
          <p className="text-gray-400">Loading...</p>
        ) : regs.length === 0 ? (
          <p className="text-gray-400">No registrations yet</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sand-dark">
                <th className="text-left py-2 font-semibold text-gray-600">Name</th>
                <th className="text-left py-2 font-semibold text-gray-600">Email</th>
                <th className="text-left py-2 font-semibold text-gray-600">Phone</th>
                <th className="text-left py-2 font-semibold text-gray-600">Date</th>
              </tr>
            </thead>
            <tbody>
              {regs.map((r) => (
                <tr key={r.id} className="border-b border-sand-dark/50">
                  <td className="py-2">{r.name}</td>
                  <td className="py-2 text-gray-600">{r.email}</td>
                  <td className="py-2 text-gray-500">{r.phone || '-'}</td>
                  <td className="py-2 text-gray-500 text-xs">{format(new Date(r.created_at), 'MMM d')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
