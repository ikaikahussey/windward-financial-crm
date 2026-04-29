import { useState } from 'react';
import { api } from '../../lib/api';

interface ContactFormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  employmentType: string;
  message: string;
}

const initialForm: ContactFormState = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  employmentType: '',
  message: '',
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

export default function ContactForm() {
  const [form, setForm] = useState<ContactFormState>(initialForm);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    try {
      await api.post('/api/public/contact', form);
      setStatus('success');
      setForm(initialForm);
    } catch {
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="bg-primary-light/50 rounded-lg p-8 text-center">
        <svg className="w-16 h-16 text-primary mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="font-heading text-2xl text-primary-dark mb-2">Mahalo!</h3>
        <p className="text-gray-600">Your message has been sent. We'll get back to you within 1 business day.</p>
      </div>
    );
  }

  return (
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
          <label htmlFor="phone" className="label-field">Phone</label>
          <input type="tel" id="phone" name="phone" value={form.phone} onChange={handleChange} className="input-field" />
        </div>
      </div>

      <div>
        <label htmlFor="employmentType" className="label-field">Employment Type</label>
        <select id="employmentType" name="employmentType" value={form.employmentType} onChange={handleChange} className="input-field">
          <option value="">Select your employment type</option>
          {employmentTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="message" className="label-field">Message *</label>
        <textarea id="message" name="message" rows={5} value={form.message} onChange={handleChange} required className="input-field resize-none" placeholder="How can we help you?" />
      </div>

      <button type="submit" disabled={status === 'loading'} className="btn-primary w-full sm:w-auto">
        {status === 'loading' ? 'Sending...' : 'Send Message'}
      </button>

      {status === 'error' && (
        <p className="text-red-600 text-sm">Something went wrong. Please try again or call us directly.</p>
      )}
    </form>
  );
}
