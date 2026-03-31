import { useState, useEffect, FormEvent } from 'react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Testimonial } from '@/types';
import { Plus, Edit2, Trash2, X, Star, Eye, EyeOff } from 'lucide-react';

export default function CmsTestimonials() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editing, setEditing] = useState<Testimonial | null>(null);

  function load() {
    api.get<{ testimonials: Testimonial[] }>('/api/cms/testimonials')
      .then((d) => setTestimonials(d.testimonials || []))
      .catch(() => setTestimonials([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function toggle(id: string, field: 'is_featured' | 'is_published', value: boolean) {
    await api.patch(`/api/cms/testimonials/${id}`, { [field]: value });
    load();
  }

  async function remove(id: string) {
    if (!confirm('Delete this testimonial?')) return;
    await api.delete(`/api/cms/testimonials/${id}`);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary-dark">Testimonials</h1>
        <button onClick={() => { setEditing(null); setShowEditor(true); }} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition text-sm font-medium">
          <Plus className="h-4 w-4" /> Add Testimonial
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-sand-dark overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : testimonials.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No testimonials yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sand-dark bg-sand/50">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Author</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Body</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Rating</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Featured</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Published</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {testimonials.map((t) => (
                <tr key={t.id} className="border-b border-sand-dark/50 hover:bg-sand/30">
                  <td className="px-4 py-3">
                    <p className="font-medium">{t.author_name}</p>
                    {t.author_title && <p className="text-xs text-gray-500">{t.author_title}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-[300px] truncate">{t.body}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star key={i} className={cn('h-3 w-3', i < (t.rating || 0) ? 'text-amber-400 fill-amber-400' : 'text-gray-200')} />
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggle(t.id, 'is_featured', !t.is_featured)}
                      className={cn('px-2 py-0.5 rounded-full text-xs font-medium', t.is_featured ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-400')}
                    >
                      {t.is_featured ? 'Featured' : 'No'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggle(t.id, 'is_published', !t.is_published)}
                      className={cn('px-2 py-0.5 rounded-full text-xs font-medium', t.is_published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400')}
                    >
                      {t.is_published ? 'Published' : 'Draft'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => { setEditing(t); setShowEditor(true); }} className="text-gray-400 hover:text-primary"><Edit2 className="h-4 w-4 inline" /></button>
                    <button onClick={() => remove(t.id)} className="text-gray-400 hover:text-coral"><Trash2 className="h-4 w-4 inline" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showEditor && (
        <TestimonialEditor
          testimonial={editing}
          onClose={() => setShowEditor(false)}
          onSaved={() => { setShowEditor(false); load(); }}
        />
      )}
    </div>
  );
}

function TestimonialEditor({ testimonial, onClose, onSaved }: { testimonial: Testimonial | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    author_name: testimonial?.author_name || '',
    author_title: testimonial?.author_title || '',
    body: testimonial?.body || '',
    rating: testimonial?.rating?.toString() || '5',
    is_featured: testimonial?.is_featured ?? false,
    is_published: testimonial?.is_published ?? false,
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, rating: parseInt(form.rating) };
      if (testimonial) {
        await api.patch(`/api/cms/testimonials/${testimonial.id}`, payload);
      } else {
        await api.post('/api/cms/testimonials', payload);
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-primary-dark">{testimonial ? 'Edit' : 'Add'} Testimonial</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Author Name *</label>
            <input required value={form.author_name} onChange={(e) => setForm({ ...form, author_name: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Author Title</label>
            <input value={form.author_title} onChange={(e) => setForm({ ...form, author_title: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Testimonial *</label>
            <textarea required value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={4} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
            <select value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
              {[5, 4, 3, 2, 1].map((r) => <option key={r} value={r}>{r} Stars</option>)}
            </select>
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} className="rounded border-gray-300 text-primary" />
              <span className="text-sm text-gray-700">Featured</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} className="rounded border-gray-300 text-primary" />
              <span className="text-sm text-gray-700">Published</span>
            </label>
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
