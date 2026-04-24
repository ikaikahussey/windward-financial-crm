import { useEffect, useState } from 'react';
import { apiPost } from '../../lib/api';

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  quote: string;
}

interface HomeProps {
  testimonials?: Testimonial[];
  nlgLoginUrl?: string;
}

export default function Home({ testimonials = [], nlgLoginUrl = 'https://www.nationallife.com/login' }: HomeProps) {
  const NLG_LOGIN_URL = nlgLoginUrl;
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [nlEmail, setNlEmail] = useState('');
  const [nlStatus, setNlStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (testimonials.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [testimonials.length]);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nlEmail) return;
    setNlStatus('loading');
    try {
      await apiPost('/api/public/subscribe', { email: nlEmail });
      setNlStatus('success');
      setNlEmail('');
    } catch {
      setNlStatus('error');
    }
  };

  return (
    <div>
      {/* Hero */}
      <section className="relative bg-primary-dark overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-dark via-primary to-ocean opacity-90" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 right-20 w-96 h-96 bg-primary-light rounded-full blur-3xl" />
          <div className="absolute bottom-10 left-10 w-64 h-64 bg-ocean-light rounded-full blur-3xl" />
        </div>
        <div className="relative container-wide mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-36">
          <div className="max-w-3xl">
            <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl text-white mb-6 leading-tight">
              Windward Financial
            </h1>
            <p className="text-xl md:text-2xl text-primary-light/90 mb-4 font-light leading-relaxed">
              A family-owned financial services company serving educators, public school employees, and state and county workers across Hawaii, California, Oregon, and Washington since 1990.
            </p>
            <p className="text-lg text-primary-light/70 mb-10">
              Retirement planning, insurance, annuities, and 403(b) plans tailored to your needs.
            </p>
            <div className="flex flex-wrap gap-4">
              <a href="/schedule-an-appointment" className="btn-sand text-lg">
                Schedule a Consultation
              </a>
              <a
                href={NLG_LOGIN_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block border-2 border-primary-light/40 text-primary-light font-semibold px-6 py-3 rounded-lg hover:bg-primary-light/10 transition-colors text-lg"
              >
                Check My Account
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="section-padding bg-sand">
        <div className="container-wide mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-heading text-3xl md:text-4xl text-primary-dark mb-4">How We Help You</h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-lg">
              We specialize in financial solutions designed for public employees — from the ERS and TRS to PERS and STRS — giving you personalized guidance wherever you teach or serve.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <a href="/expertise" className="card group hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 bg-primary-light rounded-xl flex items-center justify-center mb-5">
                <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
              <h3 className="font-heading text-2xl text-primary-dark mb-3">Our Expertise</h3>
              <p className="text-gray-600 mb-4">
                Insurance, annuities, and 403(b) savings plans designed specifically for public employees. We help you protect your family and build your retirement.
              </p>
              <span className="text-primary font-semibold group-hover:underline">Learn More &rarr;</span>
            </a>

            <a href="/quality-commitment" className="card group hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 bg-primary-light rounded-xl flex items-center justify-center mb-5">
                <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>
              </div>
              <h3 className="font-heading text-2xl text-primary-dark mb-3">Quality Commitment</h3>
              <p className="text-gray-600 mb-4">
                Over 30 years of dedicated service built on honesty, communication, trust, and expertise. Your financial future is our priority.
              </p>
              <span className="text-primary font-semibold group-hover:underline">Learn More &rarr;</span>
            </a>
          </div>
        </div>
      </section>

      {/* Get in Touch */}
      <section className="section-padding bg-white">
        <div className="container-narrow mx-auto text-center">
          <h2 className="font-heading text-3xl md:text-4xl text-primary-dark mb-6">Get in Touch</h2>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            We offer free, no-obligation consultations to help you understand your options. Whether you're just starting your career or planning for retirement, we're here to help.
          </p>
          <div className="flex flex-wrap justify-center gap-8 mb-10">
            <a href="tel:+18888941884" className="flex items-center gap-3 text-primary-dark hover:text-primary transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
              </svg>
              <span className="text-lg font-semibold">(888) 894-1884</span>
            </a>
            <a href="mailto:info@windward.financial" className="flex items-center gap-3 text-primary-dark hover:text-primary transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
              <span className="text-lg font-semibold">info@windward.financial</span>
            </a>
          </div>
          <a href="/schedule-an-appointment" className="btn-primary text-lg">
            Schedule a Free Consultation
          </a>
        </div>
      </section>

      {/* Testimonials */}
      {testimonials.length > 0 && (
        <section className="section-padding bg-primary-dark">
          <div className="container-narrow mx-auto text-center">
            <h2 className="font-heading text-3xl md:text-4xl text-white mb-12">What Our Clients Say</h2>
            <div className="relative min-h-[200px]">
              <div className="max-w-2xl mx-auto">
                <svg className="w-10 h-10 text-primary-light/30 mx-auto mb-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H14.017zM0 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151C7.546 6.068 5.983 8.789 5.983 11H10v10H0z" />
                </svg>
                <p className="text-xl md:text-2xl text-primary-light/90 italic leading-relaxed mb-8">
                  "{testimonials[currentTestimonial]?.quote}"
                </p>
                <div>
                  <p className="text-white font-semibold text-lg">{testimonials[currentTestimonial]?.name}</p>
                  <p className="text-primary-light/60">{testimonials[currentTestimonial]?.role}</p>
                </div>
              </div>
              {/* Dots */}
              <div className="flex justify-center gap-2 mt-8">
                {testimonials.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentTestimonial(i)}
                    className={`w-2.5 h-2.5 rounded-full transition-colors ${
                      i === currentTestimonial ? 'bg-primary-light' : 'bg-primary-light/30'
                    }`}
                    aria-label={`Testimonial ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Newsletter */}
      <section className="section-padding bg-sand">
        <div className="container-narrow mx-auto text-center">
          <h2 className="font-heading text-3xl md:text-4xl text-primary-dark mb-4">Stay Informed</h2>
          <p className="text-gray-600 mb-8 text-lg">
            Subscribe to our newsletter for retirement planning tips, benefit updates, and financial insights for public employees across the states we serve.
          </p>
          <form onSubmit={handleNewsletterSubmit} className="max-w-md mx-auto flex gap-3">
            <input
              type="email"
              value={nlEmail}
              onChange={(e) => setNlEmail(e.target.value)}
              placeholder="Enter your email"
              required
              className="input-field flex-1"
            />
            <button type="submit" disabled={nlStatus === 'loading'} className="btn-primary whitespace-nowrap">
              {nlStatus === 'loading' ? 'Subscribing...' : 'Subscribe'}
            </button>
          </form>
          {nlStatus === 'success' && (
            <p className="text-primary mt-4 font-medium">Mahalo! You're subscribed.</p>
          )}
          {nlStatus === 'error' && (
            <p className="text-red-600 mt-4">Something went wrong. Please try again.</p>
          )}
        </div>
      </section>
    </div>
  );
}
