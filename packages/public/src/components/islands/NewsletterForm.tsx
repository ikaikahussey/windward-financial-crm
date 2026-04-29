import { useState } from 'react';
import { api } from '../../lib/api';

interface Props {
  variant?: 'footer' | 'page';
}

export default function NewsletterForm({ variant = 'footer' }: Props) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus('loading');
    try {
      await api.post('/api/public/subscribe', { email });
      setStatus('success');
      setEmail('');
    } catch {
      setStatus('error');
    }
  };

  if (variant === 'page') {
    return (
      <>
        <form onSubmit={handleSubmit} className="max-w-md mx-auto flex gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
            className="input-field flex-1"
          />
          <button type="submit" disabled={status === 'loading'} className="btn-primary whitespace-nowrap">
            {status === 'loading' ? 'Subscribing...' : 'Subscribe'}
          </button>
        </form>
        {status === 'success' && (
          <p className="text-primary mt-4 font-medium">Mahalo! You're subscribed.</p>
        )}
        {status === 'error' && (
          <p className="text-red-600 mt-4">Something went wrong. Please try again.</p>
        )}
      </>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="flex gap-2">
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
          disabled={status === 'loading'}
          className="px-4 py-2 bg-sand text-primary-dark text-sm font-semibold rounded-lg hover:bg-sand-dark transition-colors disabled:opacity-50"
        >
          {status === 'loading' ? '...' : 'Join'}
        </button>
      </form>
      {status === 'success' && (
        <p className="text-sm text-primary-light mt-2">Mahalo! You're subscribed.</p>
      )}
      {status === 'error' && (
        <p className="text-sm text-red-300 mt-2">Something went wrong. Please try again.</p>
      )}
    </>
  );
}
