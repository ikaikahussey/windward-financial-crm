import { useState, useEffect, FormEvent } from 'react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { SitePage } from '@/types';
import { Plus, Edit2, Trash2, X, Eye, EyeOff } from 'lucide-react';

export default function CmsPages() {
  const [pages, setPages] = useState<SitePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingPage, setEditingPage] = useState<SitePage | null>(null);

  function loadPages() {
    api.get<{ pages: SitePage[] }>('/api/cms/pages')
      .then((d) => setPages(d.pages || []))
      .catch(() => setPages([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadPages(); }, []);

  async function deletePage(id: string) {
    if (!confirm('Delete this page?')) return;
    await api.delete(`/api/cms/pages/${id}`);
    loadPages();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary-dark">CMS Pages</h1>
        <button
          onClick={() => { setEditingPage(null); setShowEditor(true); }}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition text-sm font-medium"
        >
          <Plus className="h-4 w-4" /> New Page
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-sand-dark overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : pages.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No pages yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sand-dark bg-sand/50">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Title</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Slug</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Meta Title</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((p) => (
                <tr key={p.id} className="border-b border-sand-dark/50 hover:bg-sand/30">
                  <td className="px-4 py-3 font-medium text-primary-dark">{p.title}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">/{p.slug}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{p.meta_title || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', p.is_published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                      {p.is_published ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => { setEditingPage(p); setShowEditor(true); }} className="text-gray-400 hover:text-primary"><Edit2 className="h-4 w-4 inline" /></button>
                    <button onClick={() => deletePage(p.id)} className="text-gray-400 hover:text-coral"><Trash2 className="h-4 w-4 inline" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showEditor && (
        <PageEditor
          page={editingPage}
          onClose={() => setShowEditor(false)}
          onSaved={() => { setShowEditor(false); loadPages(); }}
        />
      )}
    </div>
  );
}

function PageEditor({ page, onClose, onSaved }: { page: SitePage | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    title: page?.title || '',
    slug: page?.slug || '',
    content: page?.content || '',
    meta_title: page?.meta_title || '',
    meta_description: page?.meta_description || '',
    is_published: page?.is_published ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (page) {
        await api.patch(`/api/cms/pages/${page.id}`, form);
      } else {
        await api.post('/api/cms/pages', form);
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
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-primary-dark">{page ? 'Edit Page' : 'New Page'}</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-gray-400" /></button>
        </div>
        {error && <div className="bg-coral-light text-coral p-3 rounded-lg text-sm mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
              <input required value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Content *</label>
            <textarea required value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={12} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Meta Title</label>
              <input value={form.meta_title} onChange={(e) => setForm({ ...form, meta_title: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Meta Description</label>
              <input value={form.meta_description} onChange={(e) => setForm({ ...form, meta_description: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} className="rounded border-gray-300 text-primary" />
            <span className="text-sm text-gray-700">Published</span>
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Page'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
