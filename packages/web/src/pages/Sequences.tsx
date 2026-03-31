import { useState, useEffect, FormEvent } from 'react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { EmailSequence, EmailTemplate, Contact } from '@/types';
import { Plus, Mail, ArrowDown, Clock, Users, X, Search } from 'lucide-react';

export default function Sequences() {
  const [sequences, setSequences] = useState<EmailSequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showAssign, setShowAssign] = useState<string | null>(null);

  function loadSequences() {
    api
      .get<{ sequences: EmailSequence[] }>('/api/sequences')
      .then((d) => setSequences(d.sequences || []))
      .catch(() => setSequences([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadSequences(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary-dark">Email Sequences</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition text-sm font-medium"
        >
          <Plus className="h-4 w-4" /> New Sequence
        </button>
      </div>

      {loading ? (
        <div className="animate-pulse text-primary">Loading...</div>
      ) : sequences.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-sand-dark p-12 text-center">
          <Mail className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No sequences yet. Create your first email sequence.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sequences.map((seq) => (
            <div key={seq.id} className="bg-white rounded-xl shadow-sm border border-sand-dark p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-primary-dark">{seq.name}</h2>
                  {seq.description && <p className="text-sm text-gray-500 mt-0.5">{seq.description}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium', seq.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                    {seq.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <button
                    onClick={() => setShowAssign(seq.id)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-primary-light/30 text-primary rounded-lg text-sm hover:bg-primary-light/50 transition"
                  >
                    <Users className="h-3 w-3" /> Assign Contact
                  </button>
                </div>
              </div>

              {/* Visual Sequence */}
              <div className="flex flex-col items-center">
                {(seq.templates || [])
                  .sort((a, b) => (a.sequence_order ?? 0) - (b.sequence_order ?? 0))
                  .map((tmpl, idx) => (
                    <div key={tmpl.id} className="w-full max-w-md">
                      {idx > 0 && (
                        <div className="flex flex-col items-center py-2">
                          <ArrowDown className="h-4 w-4 text-gray-300" />
                          {tmpl.delay_days && (
                            <div className="flex items-center gap-1 text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full mt-1">
                              <Clock className="h-3 w-3" />
                              Wait {tmpl.delay_days} day{tmpl.delay_days > 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                      )}
                      <div className="border border-gray-200 rounded-lg p-4 bg-sand/30">
                        <div className="flex items-center gap-2 mb-1">
                          <Mail className="h-4 w-4 text-primary" />
                          <span className="text-xs text-gray-400">Step {idx + 1}</span>
                        </div>
                        <p className="text-sm font-medium text-gray-800">{tmpl.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Subject: {tmpl.subject}</p>
                      </div>
                    </div>
                  ))}
                {(!seq.templates || seq.templates.length === 0) && (
                  <p className="text-sm text-gray-400">No emails in this sequence yet. Add templates with sequence order.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Sequence Dialog */}
      {showCreate && (
        <CreateSequenceDialog
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); loadSequences(); }}
        />
      )}

      {/* Assign Contact Dialog */}
      {showAssign && (
        <AssignContactDialog
          sequenceId={showAssign}
          onClose={() => setShowAssign(null)}
        />
      )}
    </div>
  );
}

function CreateSequenceDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: '', description: '', is_active: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/api/sequences', form);
      onCreated();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-primary-dark">New Sequence</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-gray-400" /></button>
        </div>
        {error && <div className="bg-coral-light text-coral p-3 rounded-lg text-sm mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="rounded border-gray-300 text-primary" />
            <span className="text-sm text-gray-700">Active</span>
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50">
              {saving ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AssignContactDialog({ sequenceId, onClose }: { sequenceId: string; onClose: () => void }) {
  const [search, setSearch] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [assigning, setAssigning] = useState('');

  useEffect(() => {
    if (search.length >= 2) {
      api.get<{ contacts: Contact[] }>(`/api/contacts?search=${search}&limit=10`)
        .then((d) => setContacts(d.contacts || []))
        .catch(() => setContacts([]));
    }
  }, [search]);

  async function assign(contactId: string) {
    setAssigning(contactId);
    try {
      await api.post(`/api/sequences/${sequenceId}/assign`, { contact_id: contactId });
      onClose();
    } catch {
      setAssigning('');
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-primary-dark">Assign Contact to Sequence</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-gray-400" /></button>
        </div>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {contacts.map((c) => (
            <div key={c.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-sand/50">
              <div>
                <p className="text-sm font-medium">{c.first_name} {c.last_name}</p>
                <p className="text-xs text-gray-500">{c.email}</p>
              </div>
              <button
                onClick={() => assign(c.id)}
                disabled={assigning === c.id}
                className="px-3 py-1 bg-primary text-white rounded text-xs hover:bg-primary-dark disabled:opacity-50"
              >
                {assigning === c.id ? 'Assigning...' : 'Assign'}
              </button>
            </div>
          ))}
          {search.length >= 2 && contacts.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">No contacts found</p>
          )}
          {search.length < 2 && (
            <p className="text-sm text-gray-400 text-center py-4">Type at least 2 characters to search</p>
          )}
        </div>
      </div>
    </div>
  );
}
