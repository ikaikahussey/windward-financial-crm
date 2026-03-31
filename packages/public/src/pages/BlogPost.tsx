import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';

interface Post {
  id: string;
  slug: string;
  title: string;
  body: string;
  author: string;
  date: string;
  tags: string[];
  imageUrl?: string;
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [nlEmail, setNlEmail] = useState('');
  const [nlStatus, setNlStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (!slug) return;
    api.get<Post>(`/api/public/blog/${slug}`)
      .then(setPost)
      .catch(() => setPost(null))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nlEmail) return;
    setNlStatus('loading');
    try {
      await api.post('/api/public/subscribe', { email: nlEmail });
      setNlStatus('success');
      setNlEmail('');
    } catch {
      setNlStatus('error');
    }
  };

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

  if (loading) {
    return (
      <div className="section-padding bg-sand">
        <div className="container-narrow mx-auto text-center text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="section-padding bg-sand">
        <div className="container-narrow mx-auto text-center">
          <h2 className="font-heading text-2xl text-gray-600 mb-4">Post Not Found</h2>
          <Link to="/blog" className="btn-primary">Back to Blog</Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <section className="bg-primary-dark py-16 md:py-20">
        <div className="container-wide mx-auto px-4 sm:px-6 lg:px-8">
          <Link to="/blog" className="text-primary-light/60 hover:text-primary-light text-sm mb-4 inline-block">&larr; Back to Blog</Link>
          <div className="flex flex-wrap gap-2 mb-4">
            {post.tags?.map((tag) => (
              <span key={tag} className="text-xs bg-primary/50 text-primary-light px-3 py-1 rounded-full">
                {tag}
              </span>
            ))}
          </div>
          <h1 className="font-heading text-3xl md:text-4xl lg:text-5xl text-white mb-4 leading-tight">
            {post.title}
          </h1>
          <div className="flex items-center gap-4 text-primary-light/70">
            <span>{post.author}</span>
            <span>&middot;</span>
            <span>{formatDate(post.date)}</span>
          </div>
        </div>
      </section>

      <section className="section-padding bg-sand">
        <div className="container-wide mx-auto">
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Article */}
            <article className="lg:col-span-2">
              <div className="card">
                {post.imageUrl && (
                  <img src={post.imageUrl} alt={post.title} className="w-full rounded-lg mb-8" />
                )}
                <div
                  className="prose prose-lg max-w-none prose-headings:font-heading prose-headings:text-primary-dark prose-a:text-primary prose-a:no-underline hover:prose-a:underline"
                  dangerouslySetInnerHTML={{ __html: post.body }}
                />
              </div>
            </article>

            {/* Sidebar */}
            <aside className="space-y-6">
              {/* Newsletter */}
              <div className="card bg-primary-dark text-white">
                <h3 className="font-heading text-xl mb-3">Stay Informed</h3>
                <p className="text-primary-light/80 text-sm mb-4">
                  Get retirement tips and financial insights delivered to your inbox.
                </p>
                {nlStatus === 'success' ? (
                  <p className="text-primary-light text-sm font-medium">Mahalo! You're subscribed.</p>
                ) : (
                  <form onSubmit={handleSubscribe} className="space-y-3">
                    <input
                      type="email"
                      value={nlEmail}
                      onChange={(e) => setNlEmail(e.target.value)}
                      placeholder="Your email"
                      required
                      className="w-full px-4 py-3 rounded-lg bg-primary text-white placeholder-primary-light/50 border border-primary focus:outline-none focus:ring-2 focus:ring-primary-light"
                    />
                    <button type="submit" disabled={nlStatus === 'loading'} className="btn-sand w-full">
                      {nlStatus === 'loading' ? 'Subscribing...' : 'Subscribe'}
                    </button>
                    {nlStatus === 'error' && (
                      <p className="text-red-300 text-xs">Something went wrong.</p>
                    )}
                  </form>
                )}
              </div>

              {/* Consultation CTA */}
              <div className="card">
                <h3 className="font-heading text-xl text-primary-dark mb-3">Need Help Planning?</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Schedule a free consultation to discuss your retirement goals with our team.
                </p>
                <Link to="/schedule-an-appointment" className="btn-primary w-full text-center block">
                  Schedule a Consultation
                </Link>
                <p className="text-center mt-3">
                  <a href="tel:+18888941884" className="text-sm text-primary hover:underline">
                    Or call (888) 894-1884
                  </a>
                </p>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
}
