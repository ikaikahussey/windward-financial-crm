import { useState, useEffect, FormEvent } from 'react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { BlogPost } from '@/types';
import { Plus, Edit2, Trash2, X, Tag } from 'lucide-react';
import { format } from 'date-fns';

export default function CmsBlog() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editing, setEditing] = useState<BlogPost | null>(null);

  function load() {
    api.get<{ posts: BlogPost[] }>('/api/cms/blog')
      .then((d) => setPosts(d.posts || []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function remove(id: string) {
    if (!confirm('Delete this post?')) return;
    await api.delete(`/api/cms/blog/${id}`);
    load();
  }

  async function togglePublish(post: BlogPost) {
    await api.patch(`/api/cms/blog/${post.id}`, { is_published: !post.is_published });
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary-dark">Blog Posts</h1>
        <button onClick={() => { setEditing(null); setShowEditor(true); }} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition text-sm font-medium">
          <Plus className="h-4 w-4" /> New Post
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-sand-dark overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : posts.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No blog posts yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sand-dark bg-sand/50">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Title</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Slug</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Tags</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Author</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Date</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id} className="border-b border-sand-dark/50 hover:bg-sand/30">
                  <td className="px-4 py-3 font-medium text-primary-dark">{p.title}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">/{p.slug}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(p.tags || []).map((tag) => (
                        <span key={tag} className="px-1.5 py-0.5 bg-primary-light/50 text-primary-dark text-xs rounded">{tag}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{p.author?.name || '-'}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => togglePublish(p)}
                      className={cn('px-2 py-0.5 rounded-full text-xs font-medium', p.is_published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}
                    >
                      {p.is_published ? 'Published' : 'Draft'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {p.published_at ? format(new Date(p.published_at), 'MMM d, yyyy') : format(new Date(p.created_at), 'MMM d, yyyy')}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => { setEditing(p); setShowEditor(true); }} className="text-gray-400 hover:text-primary"><Edit2 className="h-4 w-4 inline" /></button>
                    <button onClick={() => remove(p.id)} className="text-gray-400 hover:text-coral"><Trash2 className="h-4 w-4 inline" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showEditor && (
        <BlogEditor post={editing} onClose={() => setShowEditor(false)} onSaved={() => { setShowEditor(false); load(); }} />
      )}
    </div>
  );
}

function BlogEditor({ post, onClose, onSaved }: { post: BlogPost | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    title: post?.title || '',
    slug: post?.slug || '',
    excerpt: post?.excerpt || '',
    body: post?.body || '',
    featured_image_url: post?.featured_image_url || '',
    is_published: post?.is_published ?? false,
  });
  const [tags, setTags] = useState<string[]>(post?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function addTag() {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
    }
    setTagInput('');
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = { ...form, tags };
      if (post) {
        await api.patch(`/api/cms/blog/${post.id}`, payload);
      } else {
        await api.post('/api/cms/blog', payload);
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
          <h2 className="text-lg font-bold text-primary-dark">{post ? 'Edit' : 'New'} Blog Post</h2>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Excerpt</label>
            <textarea value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Body *</label>
            <textarea required value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={14} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Featured Image URL</label>
            <input value={form.featured_image_url} onChange={(e) => setForm({ ...form, featured_image_url: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
            <div className="flex flex-wrap gap-1 mb-2">
              {tags.map((tag) => (
                <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-primary-light/50 text-primary-dark text-xs rounded">
                  <Tag className="h-3 w-3" />
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} className="hover:text-coral"><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                placeholder="Add tag..."
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button type="button" onClick={addTag} className="px-3 py-2 bg-sand text-gray-600 rounded-lg text-sm hover:bg-sand-dark">Add</button>
            </div>
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} className="rounded border-gray-300 text-primary" />
            <span className="text-sm text-gray-700">Publish</span>
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
