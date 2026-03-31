import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  tags: string[];
  imageUrl?: string;
}

interface BlogResponse {
  posts: BlogPost[];
  total: number;
  page: number;
  totalPages: number;
}

export default function Blog() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [allTags, setAllTags] = useState<string[]>([]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '9' });
    if (selectedTag) params.set('tag', selectedTag);

    api.get<BlogResponse>(`/api/public/blog?${params}`)
      .then((data) => {
        setPosts(data.posts);
        setTotalPages(data.totalPages);
        // Collect unique tags
        const tags = new Set<string>();
        data.posts.forEach((p) => p.tags?.forEach((t) => tags.add(t)));
        if (allTags.length === 0) setAllTags(Array.from(tags));
      })
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, [page, selectedTag]);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div>
      {/* Page Header */}
      <section className="bg-primary-dark py-16 md:py-20">
        <div className="container-wide mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-heading text-4xl md:text-5xl text-white mb-4">Blog</h1>
          <p className="text-primary-light/80 text-xl max-w-2xl">
            Financial tips, retirement insights, and news for Hawaii's public employees.
          </p>
        </div>
      </section>

      <section className="section-padding bg-sand">
        <div className="container-wide mx-auto">
          {/* Tag Filters */}
          {allTags.length > 0 && (
            <div className="mb-10 flex flex-wrap gap-2">
              <button
                onClick={() => { setSelectedTag(null); setPage(1); }}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  !selectedTag
                    ? 'bg-primary text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                All
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => { setSelectedTag(tag); setPage(1); }}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedTag === tag
                      ? 'bg-primary text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <div className="text-center py-16 text-gray-500">Loading posts...</div>
          ) : posts.length === 0 ? (
            <div className="text-center py-16">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
              </svg>
              <h2 className="font-heading text-2xl text-gray-600 mb-2">No Posts Yet</h2>
              <p className="text-gray-500">Check back soon for financial tips and insights.</p>
            </div>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {posts.map((post) => (
                  <Link key={post.id} to={`/blog/${post.slug}`} className="card group hover:shadow-xl transition-shadow flex flex-col">
                    {post.imageUrl && (
                      <div className="h-48 -mx-6 -mt-6 md:-mx-8 md:-mt-8 mb-5 rounded-t-xl overflow-hidden">
                        <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {post.tags?.map((tag) => (
                        <span key={tag} className="text-xs bg-primary-light text-primary-dark px-2 py-1 rounded-full font-medium">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <h3 className="font-heading text-xl text-primary-dark mb-2 group-hover:text-primary transition-colors">
                      {post.title}
                    </h3>
                    <p className="text-gray-500 text-sm mb-3">{formatDate(post.date)}</p>
                    <p className="text-gray-600 text-sm flex-1">{post.excerpt}</p>
                    <span className="text-primary font-semibold text-sm mt-4 group-hover:underline">Read More &rarr;</span>
                  </Link>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-12">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                        p === page
                          ? 'bg-primary text-white'
                          : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
