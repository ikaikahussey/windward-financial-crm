import { useState, useEffect, FormEvent } from 'react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { EmailTemplate } from '@/types';
import { Plus, Edit2, Eye, X, Mail } from 'lucide-react';
import { PageHelp } from '@/components/PageHelp';

export default function Templates() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);

  function loadTemplates() {
    api
      .get<{ templates: EmailTemplate[] }>('/api/templates')
      .then((d) => setTemplates(d.templates || []))
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadTemplates(); }, []);

  function openCreate() {
    setEditingTemplate(null);
    setShowEditor(true);
  }

  function openEdit(t: EmailTemplate) {
    setEditingTemplate(t);
    setShowEditor(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary-dark">Email Templates</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition text-sm font-medium"
        >
          <Plus className="h-4 w-4" /> New Template
        </button>
      </div>

      <PageHelp
        id="templates"
        title="What are Email Templates?"
        description="Reusable email bodies sent by stage automations, sequences, and one-off sends. Templates are referenced by name from the automation engine."
        tips={[
          'Create a template with a name, subject, and body. Use {{first_name}}, {{last_name}}, etc. as merge fields.',
          'Sequence-position controls where the template falls inside a multi-step drip; delay-days controls when it sends after the previous step.',
          'Templates named with patterns like "Renewal Reminder", "Annual Review", "Re-engagement 90" are picked up by built-in cron jobs.',
          'Edit in place; saves are immediate. The automation engine picks up the new content on the next send.',
        ]}
      />

      <div className="bg-white rounded-xl shadow-sm border border-sand-dark overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : templates.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No templates yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sand-dark bg-sand/50">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Subject</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Sequence</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Order</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Delay</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t.id} className="border-b border-sand-dark/50 hover:bg-sand/30 transition">
                  <td className="px-4 py-3 font-medium text-primary-dark">{t.name}</td>
                  <td className="px-4 py-3 text-gray-600">{t.subject}</td>
                  <td className="px-4 py-3 text-gray-500">{t.sequence_id ? 'Yes' : '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{t.sequence_order ?? '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{t.delay_days ? `${t.delay_days}d` : '-'}</td>
                  <td className="px-4 py-3">
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', t.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                      {t.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setPreviewTemplate(t)} className="text-gray-400 hover:text-primary mr-2"><Eye className="h-4 w-4 inline" /></button>
                    <button onClick={() => openEdit(t)} className="text-gray-400 hover:text-primary"><Edit2 className="h-4 w-4 inline" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Editor Dialog */}
      {showEditor && (
        <TemplateEditor
          template={editingTemplate}
          onClose={() => setShowEditor(false)}
          onSaved={() => { setShowEditor(false); loadTemplates(); }}
        />
      )}

      {/* Preview Dialog */}
      {previewTemplate && (
        <TemplatePreview
          template={previewTemplate}
          onClose={() => setPreviewTemplate(null)}
        />
      )}
    </div>
  );
}

function TemplateEditor({
  template,
  onClose,
  onSaved,
}: {
  template: EmailTemplate | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: template?.name || '',
    subject: template?.subject || '',
    body: template?.body || '',
    sequence_order: template?.sequence_order?.toString() || '',
    delay_days: template?.delay_days?.toString() || '',
    is_active: template?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        sequence_order: form.sequence_order ? parseInt(form.sequence_order) : undefined,
        delay_days: form.delay_days ? parseInt(form.delay_days) : undefined,
      };
      if (template) {
        await api.patch(`/api/templates/${template.id}`, payload);
      } else {
        await api.post('/api/templates', payload);
      }
      onSaved();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-primary-dark">{template ? 'Edit Template' : 'New Template'}</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-gray-400" /></button>
        </div>
        {error && <div className="bg-coral-light text-coral p-3 rounded-lg text-sm mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Template Name *</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
            <input required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="Use {{first_name}}, {{agent_name}} etc." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Body *</label>
            <textarea
              required
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              rows={12}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="HTML or plain text. Use {{first_name}}, {{last_name}}, {{agent_name}}, {{agent_phone}} for merge fields."
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sequence Order</label>
              <input type="number" value={form.sequence_order} onChange={(e) => setForm({ ...form, sequence_order: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Delay (days)</label>
              <input type="number" value={form.delay_days} onChange={(e) => setForm({ ...form, delay_days: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 pb-2">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="rounded border-gray-300 text-primary" />
                <span className="text-sm text-gray-700">Active</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TemplatePreview({ template, onClose }: { template: EmailTemplate; onClose: () => void }) {
  const rendered = template.body
    .replace(/\{\{first_name\}\}/g, 'John')
    .replace(/\{\{last_name\}\}/g, 'Smith')
    .replace(/\{\{agent_name\}\}/g, 'Sarah Johnson')
    .replace(/\{\{agent_phone\}\}/g, '(808) 555-0123')
    .replace(/\{\{agent_email\}\}/g, 'sarah@windwardfinancial.com');

  const renderedSubject = template.subject
    .replace(/\{\{first_name\}\}/g, 'John')
    .replace(/\{\{last_name\}\}/g, 'Smith')
    .replace(/\{\{agent_name\}\}/g, 'Sarah Johnson');

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-primary-dark">Preview: {template.name}</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-gray-400" /></button>
        </div>
        <div className="space-y-4">
          <div className="bg-sand p-3 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Subject</p>
            <p className="text-sm font-medium">{renderedSubject}</p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: rendered }} />
          </div>
          <p className="text-xs text-gray-400">Preview rendered with sample data: John Smith, Agent: Sarah Johnson</p>
        </div>
      </div>
    </div>
  );
}
