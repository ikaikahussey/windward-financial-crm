import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';

interface Event {
  id: string;
  title: string;
  date: string;
  time?: string;
  location: string;
  address?: string;
  description: string;
  details?: string;
  imageUrl?: string;
}

interface RegForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  employmentType: string;
  employer: string;
}

const initialRegForm: RegForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  employmentType: '',
  employer: '',
};

const employmentTypes = [
  'DOE Teacher',
  'DOE Non-Teaching',
  'State Employee',
  'County Employee',
  'University of Hawaii',
  'Charter School',
  'Other',
];

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<RegForm>(initialRegForm);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (!id) return;
    api.get<Event>(`/api/public/events/${id}`)
      .then(setEvent)
      .catch(() => setEvent(null))
      .finally(() => setLoading(false));
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setStatus('loading');
    try {
      await api.post(`/api/public/events/${id}/register`, form);
      setStatus('success');
      setForm(initialRegForm);
    } catch {
      setStatus('error');
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        weekday: 'long',
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
        <div className="container-narrow mx-auto text-center text-gray-500">Loading event...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="section-padding bg-sand">
        <div className="container-narrow mx-auto text-center">
          <h2 className="font-heading text-2xl text-gray-600 mb-4">Event Not Found</h2>
          <Link to="/events" className="btn-primary">Back to Events</Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <section className="bg-primary-dark py-16 md:py-20">
        <div className="container-wide mx-auto px-4 sm:px-6 lg:px-8">
          <Link to="/events" className="text-primary-light/60 hover:text-primary-light text-sm mb-4 inline-block">&larr; Back to Events</Link>
          <h1 className="font-heading text-4xl md:text-5xl text-white mb-4">{event.title}</h1>
          <div className="flex flex-wrap gap-6 text-primary-light/80">
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
              {formatDate(event.date)}
            </span>
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              {event.location}
            </span>
          </div>
        </div>
      </section>

      <section className="section-padding bg-sand">
        <div className="container-wide mx-auto">
          <div className="grid lg:grid-cols-5 gap-12">
            {/* Event Details */}
            <div className="lg:col-span-3">
              <div className="card">
                <h2 className="font-heading text-2xl text-primary-dark mb-4">Event Details</h2>
                <p className="text-gray-700 leading-relaxed text-lg mb-4">{event.description}</p>
                {event.details && (
                  <div className="text-gray-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: event.details }} />
                )}
                {event.address && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h3 className="font-semibold text-primary-dark mb-2">Location</h3>
                    <p className="text-gray-600">{event.location}</p>
                    <p className="text-gray-500 text-sm">{event.address}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Registration Form */}
            <div className="lg:col-span-2">
              <div className="card sticky top-24">
                <h2 className="font-heading text-2xl text-primary-dark mb-6">Register</h2>

                {status === 'success' ? (
                  <div className="text-center py-6">
                    <svg className="w-16 h-16 text-primary mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="font-heading text-xl text-primary-dark mb-2">You're Registered!</h3>
                    <p className="text-gray-600 text-sm">We'll send a confirmation to your email.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label htmlFor="firstName" className="label-field">First Name *</label>
                      <input type="text" id="firstName" name="firstName" value={form.firstName} onChange={handleChange} required className="input-field" />
                    </div>
                    <div>
                      <label htmlFor="lastName" className="label-field">Last Name *</label>
                      <input type="text" id="lastName" name="lastName" value={form.lastName} onChange={handleChange} required className="input-field" />
                    </div>
                    <div>
                      <label htmlFor="email" className="label-field">Email *</label>
                      <input type="email" id="email" name="email" value={form.email} onChange={handleChange} required className="input-field" />
                    </div>
                    <div>
                      <label htmlFor="phone" className="label-field">Phone</label>
                      <input type="tel" id="phone" name="phone" value={form.phone} onChange={handleChange} className="input-field" />
                    </div>
                    <div>
                      <label htmlFor="employmentType" className="label-field">Employment Type</label>
                      <select id="employmentType" name="employmentType" value={form.employmentType} onChange={handleChange} className="input-field">
                        <option value="">Select type</option>
                        {employmentTypes.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="employer" className="label-field">Employer / School</label>
                      <input type="text" id="employer" name="employer" value={form.employer} onChange={handleChange} className="input-field" />
                    </div>
                    <button type="submit" disabled={status === 'loading'} className="btn-primary w-full">
                      {status === 'loading' ? 'Registering...' : 'Register for Event'}
                    </button>
                    {status === 'error' && (
                      <p className="text-red-600 text-sm">Registration failed. Please try again.</p>
                    )}
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
