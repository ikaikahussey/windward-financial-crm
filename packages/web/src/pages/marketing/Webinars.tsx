import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { format } from 'date-fns';
import { PageHelp } from '@/components/PageHelp';

interface WebinarRegistration {
  id: string;
  name: string;
  email: string;
  district_name: string;
  topic: string;
  registered_at: string;
  attended: boolean;
}

export default function MarketingWebinars() {
  const [registrations, setRegistrations] = useState<WebinarRegistration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ registrations: WebinarRegistration[] }>('/api/marketing/webinars')
      .then((d) => setRegistrations(d.registrations || []))
      .catch(() => setRegistrations([]))
      .finally(() => setLoading(false));
  }, []);

  async function toggleAttended(reg: WebinarRegistration) {
    try {
      await api.patch(`/api/marketing/webinars/${reg.id}`, { attended: !reg.attended });
      setRegistrations((prev) =>
        prev.map((r) => (r.id === reg.id ? { ...r, attended: !r.attended } : r))
      );
    } catch {
      // silently fail
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-primary-dark">Webinar Registrations</h1>

      <PageHelp
        id="marketing-webinars"
        title="What are Webinar Registrations?"
        description="Read-only roll-up of everyone who registered for a webinar via the marketing site."
        tips={[
          'New registrations land here automatically when someone fills out the public webinar form.',
          'For new webinar listings, use Events — that page publishes to the public site and tracks registrations the same way.',
          'Use the names + emails here to follow up manually or import them into a Campaign.',
        ]}
      />

      <div className="bg-white rounded-xl shadow-sm border border-sand-dark overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : registrations.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No webinar registrations yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sand-dark bg-sand/50">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">District</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Topic</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Registered</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Attended</th>
              </tr>
            </thead>
            <tbody>
              {registrations.map((reg) => (
                <tr key={reg.id} className="border-b border-sand-dark/50 hover:bg-sand/30">
                  <td className="px-4 py-3 font-medium text-primary-dark">{reg.name}</td>
                  <td className="px-4 py-3 text-gray-600">{reg.email}</td>
                  <td className="px-4 py-3 text-gray-600">{reg.district_name || '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{reg.topic || '-'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {reg.registered_at ? format(new Date(reg.registered_at), 'MMM d, yyyy') : '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleAttended(reg)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                        reg.attended
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {reg.attended ? 'Yes' : 'No'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
