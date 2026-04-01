import { useState } from 'react';
import { api } from '../lib/api';

interface WebinarForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  title: string;
  districtName: string;
  preferredDate: string;
  webinarTopic: string;
}

const initialForm: WebinarForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  title: '',
  districtName: '',
  preferredDate: '',
  webinarTopic: 'Section 125 Cafeteria Plans',
};

const learningPoints = [
  'How Section 125 plans work and IRS requirements',
  'Implementation timeline and process',
  'Real savings examples for employees at different salary levels',
  'How to handle non-discrimination testing',
  'Q&A with our compliance team',
];

export default function Section125Webinar() {
  const [form, setForm] = useState<WebinarForm>(initialForm);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    try {
      await api.post('/api/public/section-125/register-webinar', form);
      setStatus('success');
      setForm(initialForm);
    } catch {
      setStatus('error');
    }
  };

  return (
    <div>
      {/* Page Header */}
      <section className="bg-primary-dark py-16 md:py-20">
        <div className="container-wide mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-heading text-4xl md:text-5xl text-white mb-4">
            Section 125 Cafeteria Plan Webinar
          </h1>
          <p className="text-primary-light/80 text-xl max-w-2xl">
            Register for our free informational webinar for school district administrators.
          </p>
        </div>
      </section>

      <section className="section-padding bg-sand">
        <div className="container-wide mx-auto">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Left Side - Webinar Info */}
            <div>
              <h2 className="font-heading text-2xl md:text-3xl text-primary-dark mb-4">
                Free Informational Webinar
              </h2>
              <p className="text-gray-600 text-lg mb-8">
                Join our free informational webinar to learn how your district can offer pre-tax
                benefit savings to employees at zero cost.
              </p>

              <div className="bg-white rounded-xl p-6 shadow-sm mb-8">
                <h3 className="font-heading text-xl text-primary-dark mb-4">What You Will Learn</h3>
                <ul className="space-y-3">
                  {learningPoints.map((point) => (
                    <li key={point} className="flex items-start gap-3 text-gray-700">
                      <svg className="w-5 h-5 text-primary shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex items-center gap-4 text-gray-600">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Duration: 45 minutes</span>
                </div>
                <span className="text-gray-300">|</span>
                <span className="font-semibold text-primary-dark">Free of charge</span>
              </div>
            </div>

            {/* Right Side - Form */}
            <div className="card">
              {status === 'success' ? (
                <div className="text-center py-8">
                  <svg className="w-20 h-20 text-primary mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h2 className="font-heading text-3xl text-primary-dark mb-4">You're Registered!</h2>
                  <p className="text-gray-600 text-lg">
                    We'll send you the webinar details and a calendar invite shortly.
                  </p>
                </div>
              ) : (
                <>
                  <h2 className="font-heading text-2xl text-primary-dark mb-2">Register for Webinar</h2>
                  <p className="text-gray-500 mb-8">Fill out the form below to reserve your spot.</p>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid sm:grid-cols-2 gap-5">
                      <div>
                        <label htmlFor="firstName" className="label-field">First Name *</label>
                        <input type="text" id="firstName" name="firstName" value={form.firstName} onChange={handleChange} required className="input-field" />
                      </div>
                      <div>
                        <label htmlFor="lastName" className="label-field">Last Name *</label>
                        <input type="text" id="lastName" name="lastName" value={form.lastName} onChange={handleChange} required className="input-field" />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-5">
                      <div>
                        <label htmlFor="email" className="label-field">Email *</label>
                        <input type="email" id="email" name="email" value={form.email} onChange={handleChange} required className="input-field" />
                      </div>
                      <div>
                        <label htmlFor="phone" className="label-field">Phone *</label>
                        <input type="tel" id="phone" name="phone" value={form.phone} onChange={handleChange} required className="input-field" />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-5">
                      <div>
                        <label htmlFor="title" className="label-field">Title *</label>
                        <input type="text" id="title" name="title" value={form.title} onChange={handleChange} required className="input-field" placeholder="e.g., Superintendent" />
                      </div>
                      <div>
                        <label htmlFor="districtName" className="label-field">District Name *</label>
                        <input type="text" id="districtName" name="districtName" value={form.districtName} onChange={handleChange} required className="input-field" />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="preferredDate" className="label-field">Preferred Date (Optional)</label>
                      <input type="date" id="preferredDate" name="preferredDate" value={form.preferredDate} onChange={handleChange} className="input-field" />
                    </div>

                    <input type="hidden" name="webinarTopic" value={form.webinarTopic} />

                    <button type="submit" disabled={status === 'loading'} className="btn-primary w-full text-lg">
                      {status === 'loading' ? 'Registering...' : 'Register for Webinar'}
                    </button>

                    {status === 'error' && (
                      <p className="text-red-600 text-sm">Something went wrong. Please try again or call us at (888) 894-1884.</p>
                    )}
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
