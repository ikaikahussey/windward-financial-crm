import { useState } from 'react';
import { api } from '../../lib/api';

interface RegFormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  employmentType: string;
  employer: string;
}

const initialForm: RegFormState = {
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

interface Props {
  eventId: number;
}

export default function EventRegistrationForm({ eventId }: Props) {
  const [form, setForm] = useState<RegFormState>(initialForm);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    try {
      await api.post(`/api/public/events/${eventId}/register`, form);
      setStatus('success');
      setForm(initialForm);
    } catch {
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="text-center py-6">
        <svg className="w-16 h-16 text-primary mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="font-heading text-xl text-primary-dark mb-2">You're Registered!</h3>
        <p className="text-gray-600 text-sm">We'll send a confirmation to your email.</p>
      </div>
    );
  }

  return (
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
  );
}
