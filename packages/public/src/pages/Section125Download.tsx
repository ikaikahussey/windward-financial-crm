import { useState } from 'react';
import { api } from '../lib/api';

interface DownloadForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  title: string;
  districtName: string;
}

const initialForm: DownloadForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  title: '',
  districtName: '',
};

const guideContents = [
  'Complete overview of Section 125 plans',
  'Step-by-step implementation guide',
  'Sample employee savings calculations',
  'Compliance requirements checklist',
  'FAQ for district administrators',
];

export default function Section125Download() {
  const [form, setForm] = useState<DownloadForm>(initialForm);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [pdfUrl, setPdfUrl] = useState<string>('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    try {
      const result = await api.post<{ pdfUrl: string }>('/api/public/section-125/download-pdf', form);
      setPdfUrl(result.pdfUrl);
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
            Section 125 Cafeteria Plan Guide
          </h1>
          <p className="text-primary-light/80 text-xl max-w-2xl">
            Everything you need to know about implementing a Section 125 plan in your school district.
          </p>
        </div>
      </section>

      <section className="section-padding bg-sand">
        <div className="container-narrow mx-auto">
          <div className="card max-w-2xl mx-auto">
            {status === 'success' ? (
              <div className="text-center py-8">
                <svg className="w-20 h-20 text-primary mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h2 className="font-heading text-3xl text-primary-dark mb-4">Your Guide is Ready!</h2>
                <p className="text-gray-600 text-lg mb-8">
                  Click the button below to download your free Section 125 guide.
                </p>
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary text-lg inline-flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download PDF Guide
                </a>
              </div>
            ) : (
              <>
                {/* PDF Preview Mockup */}
                <div className="bg-primary-dark rounded-xl p-8 mb-8 text-center">
                  <div className="bg-white/10 rounded-lg p-6 max-w-xs mx-auto border border-white/20">
                    <svg className="w-12 h-12 text-white/60 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                    <p className="text-white font-heading text-sm">Section 125</p>
                    <p className="text-white font-heading text-sm">Cafeteria Plan Guide</p>
                    <p className="text-white/50 text-xs mt-2">Windward Financial</p>
                  </div>
                </div>

                {/* What's Inside */}
                <div className="mb-8">
                  <h3 className="font-heading text-xl text-primary-dark mb-4">What's Inside</h3>
                  <ul className="space-y-3">
                    {guideContents.map((item) => (
                      <li key={item} className="flex items-center gap-3 text-gray-700">
                        <svg className="w-5 h-5 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Form */}
                <div className="border-t border-gray-200 pt-8">
                  <h3 className="font-heading text-xl text-primary-dark mb-2">Get Your Free Copy</h3>
                  <p className="text-gray-500 mb-6">Fill out the form below to download the guide.</p>

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

                    <button type="submit" disabled={status === 'loading'} className="btn-primary w-full text-lg">
                      {status === 'loading' ? 'Processing...' : 'Download Free Guide'}
                    </button>

                    {status === 'error' && (
                      <p className="text-red-600 text-sm">Something went wrong. Please try again or call us at (888) 894-1884.</p>
                    )}
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
