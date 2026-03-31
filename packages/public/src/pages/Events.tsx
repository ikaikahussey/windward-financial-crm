import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

interface Event {
  id: string;
  title: string;
  date: string;
  location: string;
  description: string;
  imageUrl?: string;
}

export default function Events() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Event[]>('/api/public/events')
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

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

  return (
    <div>
      {/* Page Header */}
      <section className="bg-primary-dark py-16 md:py-20">
        <div className="container-wide mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-heading text-4xl md:text-5xl text-white mb-4">Events</h1>
          <p className="text-primary-light/80 text-xl max-w-2xl">
            Join us for workshops, presentations, and community events across Hawaii.
          </p>
        </div>
      </section>

      <section className="section-padding bg-sand">
        <div className="container-wide mx-auto">
          {loading ? (
            <div className="text-center py-16 text-gray-500">Loading events...</div>
          ) : events.length === 0 ? (
            <div className="text-center py-16">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
              <h2 className="font-heading text-2xl text-gray-600 mb-2">No Upcoming Events</h2>
              <p className="text-gray-500 mb-6">Check back soon for new events and workshops.</p>
              <Link to="/schedule-an-appointment" className="btn-primary">
                Schedule a One-on-One Instead
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {events.map((event) => (
                <div key={event.id} className="card hover:shadow-xl transition-shadow">
                  <div className="md:flex md:items-start md:gap-8">
                    <div className="shrink-0 mb-4 md:mb-0 md:w-32 text-center">
                      <div className="bg-primary-light rounded-lg p-4 inline-block md:block">
                        <p className="text-primary-dark font-heading text-lg">
                          {new Date(event.date).toLocaleDateString('en-US', { month: 'short' })}
                        </p>
                        <p className="text-primary-dark font-heading text-3xl">
                          {new Date(event.date).getDate()}
                        </p>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-heading text-2xl text-primary-dark mb-2">{event.title}</h3>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-3">
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {formatDate(event.date)}
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                          </svg>
                          {event.location}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-4">{event.description}</p>
                      <Link to={`/events/${event.id}`} className="btn-primary text-sm">
                        Register
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
