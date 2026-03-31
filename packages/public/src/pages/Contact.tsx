import { useState } from 'react';
import { api } from '../lib/api';

interface ContactForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  employmentType: string;
  message: string;
}

const initialForm: ContactForm = {
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

export default function Contact() {
  const [form, setForm] = useState<ContactForm>(initialForm);
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

  return (
    <div>
      {/* Page Header */}
      <section className="bg-primary-dark py-16 md:py-20">
        <div className="container-wide mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-heading text-4xl md:text-5xl text-white mb-4">Contact Us</h1>
          <p className="text-primary-light/80 text-xl max-w-2xl">
            We'd love to hear from you. Reach out for a free consultation.
          </p>
        </div>
      </section>

      <section className="section-padding bg-sand">
        <div className="container-wide mx-auto">
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Contact Info */}
            <div>
              <h2 className="font-heading text-2xl text-primary-dark mb-6">Get in Touch</h2>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary-light rounded-xl flex items-center justify-center shrink-0">
                    <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-primary-dark mb-1">Phone</h3>
                    <a href="tel:+18888941884" className="text-gray-600 hover:text-primary transition-colors">(888) 894-1884</a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary-light rounded-xl flex items-center justify-center shrink-0">
                    <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-primary-dark mb-1">Email</h3>
                    <a href="mailto:info@windward.financial" className="text-gray-600 hover:text-primary transition-colors">info@windward.financial</a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary-light rounded-xl flex items-center justify-center shrink-0">
                    <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-primary-dark mb-1">Office Hours</h3>
                    <p className="text-gray-600">Monday - Friday: 8:00 AM - 5:00 PM HST</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-2">
              <div className="card">
                <h2 className="font-heading text-2xl text-primary-dark mb-6">Send Us a Message</h2>

                {status === 'success' ? (
                  <div className="bg-primary-light/50 rounded-lg p-8 text-center">
                    <svg className="w-16 h-16 text-primary mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="font-heading text-2xl text-primary-dark mb-2">Mahalo!</h3>
                    <p className="text-gray-600">Your message has been sent. We'll get back to you within 1 business day.</p>
                  </div>
                ) : (
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
                )}

                <div className="mt-8 pt-6 border-t border-gray-200">
                  <p className="text-xs text-gray-500 leading-relaxed">
                    By submitting this form, you agree to be contacted by Windward Financial regarding your inquiry.
                    Your information will be kept confidential and will not be shared with third parties.
                    Windward Financial is a licensed insurance agency. Products and services are offered through
                    licensed agents. Not all products are available in all states.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
