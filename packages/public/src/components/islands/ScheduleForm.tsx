import { useState } from 'react';
import { api } from '../../lib/api';

interface ScheduleFormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  employmentType: string;
  employer: string;
  preferredDate: string;
  preferredTime: string;
  consultationType: string;
  message: string;
}

const initialForm: ScheduleFormState = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  employmentType: '',
  employer: '',
  preferredDate: '',
  preferredTime: '',
  consultationType: '',
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

const consultationTypes = [
  'Retirement Planning',
  'Life Insurance',
  'Annuities',
  '403(b) Savings Plan',
  'Benefits Review',
  'General Inquiry',
];

export default function ScheduleForm() {
  const [form, setForm] = useState<ScheduleFormState>(initialForm);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    try {
      await api.post('/api/public/schedule', form);
      setStatus('success');
      setForm(initialForm);
    } catch {
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="text-center py-8">
        <svg className="w-20 h-20 text-primary mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h2 className="font-heading text-3xl text-primary-dark mb-4">Mahalo!</h2>
        <p className="text-gray-600 text-lg">We'll confirm your appointment within 1 business day.</p>
        <p className="text-gray-500 mt-2">
          If you need immediate assistance, please call{' '}
          <a href="tel:+18888941884" className="text-primary font-semibold hover:underline">(888) 894-1884</a>.
        </p>
      </div>
    );
  }

  return (
    <>
      <h2 className="font-heading text-2xl text-primary-dark mb-2">Request an Appointment</h2>
      <p className="text-gray-500 mb-8">All consultations are free and confidential.</p>

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
            <label htmlFor="employmentType" className="label-field">Employment Type *</label>
            <select id="employmentType" name="employmentType" value={form.employmentType} onChange={handleChange} required className="input-field">
              <option value="">Select type</option>
              {employmentTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="employer" className="label-field">Employer / School</label>
            <input type="text" id="employer" name="employer" value={form.employer} onChange={handleChange} className="input-field" placeholder="e.g., Kailua High School" />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label htmlFor="preferredDate" className="label-field">Preferred Date *</label>
            <input type="date" id="preferredDate" name="preferredDate" value={form.preferredDate} onChange={handleChange} required className="input-field" />
          </div>
          <div>
            <label htmlFor="preferredTime" className="label-field">Preferred Time *</label>
            <select id="preferredTime" name="preferredTime" value={form.preferredTime} onChange={handleChange} required className="input-field">
              <option value="">Select time</option>
              <option value="morning">Morning (8 AM - 12 PM)</option>
              <option value="afternoon">Afternoon (12 PM - 4 PM)</option>
              <option value="evening">Evening (4 PM - 6 PM)</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="consultationType" className="label-field">Consultation Type *</label>
          <select id="consultationType" name="consultationType" value={form.consultationType} onChange={handleChange} required className="input-field">
            <option value="">What would you like to discuss?</option>
            {consultationTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="message" className="label-field">Additional Notes</label>
          <textarea id="message" name="message" rows={4} value={form.message} onChange={handleChange} className="input-field resize-none" placeholder="Anything else you'd like us to know?" />
        </div>

        <button type="submit" disabled={status === 'loading'} className="btn-primary w-full sm:w-auto text-lg">
          {status === 'loading' ? 'Submitting...' : 'Request Appointment'}
        </button>

        {status === 'error' && (
          <p className="text-red-600 text-sm">Something went wrong. Please try again or call us at (888) 894-1884.</p>
        )}
      </form>
    </>
  );
}
