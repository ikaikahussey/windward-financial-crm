import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [subStatus, setSubStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubStatus('loading');
    try {
      await api.post('/api/public/subscribe', { email });
      setSubStatus('success');
      setEmail('');
    } catch {
      setSubStatus('error');
    }
  };

  return (
    <footer className="bg-primary-dark text-white">
      <div className="container-wide mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-primary-light rounded-full flex items-center justify-center">
                <span className="text-primary-dark font-heading text-xl font-bold">W</span>
              </div>
              <span className="font-heading text-xl">Windward Financial</span>
            </div>
            <p className="text-primary-light/80 text-sm italic leading-relaxed">
              Honesty, communication, trust, and expertise
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="font-heading text-lg mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/about" className="text-primary-light/80 hover:text-white transition-colors">About Us</Link></li>
              <li><Link to="/expertise" className="text-primary-light/80 hover:text-white transition-colors">Expertise</Link></li>
              <li><Link to="/quality-commitment" className="text-primary-light/80 hover:text-white transition-colors">Quality Commitment</Link></li>
              <li><Link to="/calculator" className="text-primary-light/80 hover:text-white transition-colors">Retirement Calculator</Link></li>
              <li><Link to="/events" className="text-primary-light/80 hover:text-white transition-colors">Events</Link></li>
              <li><Link to="/blog" className="text-primary-light/80 hover:text-white transition-colors">Blog</Link></li>
              <li><Link to="/resources" className="text-primary-light/80 hover:text-white transition-colors">Resources</Link></li>
              <li><Link to="/schedule-an-appointment" className="text-primary-light/80 hover:text-white transition-colors">Schedule Appointment</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-heading text-lg mb-4">Contact Us</h4>
            <ul className="space-y-3 text-sm text-primary-light/80">
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
                <a href="tel:+18888941884" className="hover:text-white transition-colors">(888) 894-1884</a>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                <a href="mailto:info@windward.financial" className="hover:text-white transition-colors">info@windward.financial</a>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="font-heading text-lg mb-4">Stay Informed</h4>
            <p className="text-sm text-primary-light/80 mb-3">
              Get retirement planning tips and updates delivered to your inbox.
            </p>
            <form onSubmit={handleSubscribe} className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email"
                required
                className="flex-1 px-3 py-2 text-sm rounded-lg bg-primary text-white placeholder-primary-light/50 border border-primary focus:outline-none focus:ring-2 focus:ring-primary-light"
              />
              <button
                type="submit"
                disabled={subStatus === 'loading'}
                className="px-4 py-2 bg-sand text-primary-dark text-sm font-semibold rounded-lg hover:bg-sand-dark transition-colors disabled:opacity-50"
              >
                {subStatus === 'loading' ? '...' : 'Join'}
              </button>
            </form>
            {subStatus === 'success' && (
              <p className="text-sm text-primary-light mt-2">Mahalo! You're subscribed.</p>
            )}
            {subStatus === 'error' && (
              <p className="text-sm text-red-300 mt-2">Something went wrong. Please try again.</p>
            )}
          </div>
        </div>

        <div className="border-t border-primary/30 mt-12 pt-8 text-center text-sm text-primary-light/60">
          <p>&copy; 2026 Windward Financial | CA License # 2087268</p>
        </div>
      </div>
    </footer>
  );
}
