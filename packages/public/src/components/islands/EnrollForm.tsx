import { useState } from 'react';
import { api } from '../../lib/api';

interface EnrollFormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  employmentType: string;
  employer: string;
  wantsRetirementPlanning: boolean;
}

const initialForm: EnrollFormState = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  employmentType: '',
  employer: '',
  wantsRetirementPlanning: false,
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

export default function EnrollForm() {
  const [form, setForm] = useState<EnrollFormState>(initialForm);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = e.target;
    if (target instanceof HTMLInputElement && target.type === 'checkbox') {
      setForm({ ...form, [target.name]: target.checked });
    } else {
      setForm({ ...form, [target.name]: target.value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    try {
      await api.post('/api/public/enroll', form);
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
        <p className="text-gray-600 text-lg">Your enrollment request has been submitted.</p>
        <p className="text-gray-500 mt-2">A licensed agent will contact you within 1 business day to complete your enrollment.</p>
      </div>
    );
  }

  return (
    <>
      <h2 className="font-heading text-2xl text-primary-dark mb-6">Enrollment Form</h2>
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
            <label htmlFor="employer" className="label-field">Employer / School *</label>
            <input type="text" id="employer" name="employer" value={form.employer} onChange={handleChange} required className="input-field" />
          </div>
        </div>

        <div className="flex items-start gap-3 pt-2">
          <input
            type="checkbox"
            id="wantsRetirementPlanning"
            name="wantsRetirementPlanning"
            checked={form.wantsRetirementPlanning}
            onChange={handleChange}
            className="mt-1 h-5 w-5 text-primary border-gray-300 rounded focus:ring-primary"
          />
          <label htmlFor="wantsRetirementPlanning" className="text-gray-700">
            I'd like to speak with an agent about retirement planning
          </label>
        </div>

        <button type="submit" disabled={status === 'loading'} className="btn-primary w-full sm:w-auto text-lg">
          {status === 'loading' ? 'Submitting...' : 'Submit Enrollment'}
        </button>

        {status === 'error' && (
          <p className="text-red-600 text-sm">Something went wrong. Please try again or call (888) 894-1884.</p>
        )}
      </form>
    </>
  );
}
