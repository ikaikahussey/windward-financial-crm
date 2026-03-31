import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  email?: string;
  phone?: string;
  bio?: string;
  photoUrl?: string;
}

export default function About() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<TeamMember[]>('/api/public/team')
      .then(setTeam)
      .catch(() => setTeam([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      {/* Page Header */}
      <section className="bg-primary-dark py-16 md:py-20">
        <div className="container-wide mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-heading text-4xl md:text-5xl text-white mb-4">About Windward Financial</h1>
          <p className="text-primary-light/80 text-xl max-w-2xl">
            A family legacy of service to Hawaii's public employees.
          </p>
        </div>
      </section>

      {/* Our History */}
      <section className="section-padding bg-white">
        <div className="container-narrow mx-auto">
          <h2 className="font-heading text-3xl md:text-4xl text-primary-dark mb-8">Our History</h2>
          <div className="space-y-6 text-gray-700 leading-relaxed text-lg">
            <p>
              Windward Financial's story begins in 1990 when <strong>Herb Hussey</strong> started his career in financial services, dedicating himself to helping Hawaii's public employees plan for their futures. With a deep understanding of the unique benefits available to teachers, state workers, and county employees, Herb built lasting relationships based on trust and personalized service.
            </p>
            <p>
              In <strong>2005</strong>, Herb founded Windward Financial with the mission of providing honest, transparent financial guidance to the families who serve our communities. The company was built on four pillars: <em>honesty, communication, trust, and expertise</em>.
            </p>
            <p>
              When the <strong>COVID-19 pandemic</strong> disrupted traditional ways of doing business, Windward Financial pivoted quickly -- embracing virtual consultations and digital tools to continue serving clients without interruption. This adaptability strengthened the company and expanded its reach across the Hawaiian islands.
            </p>
            <p>
              The partnership with <strong>Wes Machida</strong> brought additional depth to the team. With his background in public finance and deep roots in the Hawaii community, Wes complemented Herb's insurance and retirement planning expertise, creating a comprehensive resource for public employees at every stage of their careers.
            </p>
            <p>
              Today, Windward Financial continues its mission as a family-owned company, serving thousands of public employees across Hawaii with the same personal touch and commitment to excellence that Herb established over three decades ago.
            </p>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="section-padding bg-sand">
        <div className="container-narrow mx-auto">
          <h2 className="font-heading text-3xl md:text-4xl text-primary-dark mb-12 text-center">Our Journey</h2>
          <div className="space-y-8">
            {[
              { year: '1990', text: 'Herb Hussey begins his career serving Hawaii\'s public employees' },
              { year: '2005', text: 'Windward Financial is founded with a mission of honest, personalized financial guidance' },
              { year: '2020', text: 'Successfully pivots to virtual consultations during COVID-19, expanding statewide reach' },
              { year: '2021', text: 'Wes Machida joins, bringing public finance expertise and strengthening the team' },
              { year: 'Today', text: 'Continuing to serve thousands of Hawaii public employees with trusted financial guidance' },
            ].map(({ year, text }) => (
              <div key={year} className="flex gap-6 items-start">
                <div className="shrink-0 w-20 text-right">
                  <span className="font-heading text-xl text-primary font-bold">{year}</span>
                </div>
                <div className="w-px bg-primary/30 shrink-0 self-stretch" />
                <p className="text-gray-700 text-lg pt-0.5">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Team */}
      <section className="section-padding bg-white">
        <div className="container-wide mx-auto">
          <h2 className="font-heading text-3xl md:text-4xl text-primary-dark mb-4 text-center">Our Team</h2>
          <p className="text-gray-600 text-lg text-center mb-12 max-w-2xl mx-auto">
            Meet the dedicated professionals who make Windward Financial the trusted partner for Hawaii's public employees.
          </p>

          {loading ? (
            <div className="text-center text-gray-500 py-12">Loading team...</div>
          ) : team.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {team.map((member) => (
                <div key={member.id} className="card text-center hover:shadow-xl transition-shadow">
                  <div className="w-24 h-24 bg-primary-light rounded-full flex items-center justify-center mx-auto mb-5">
                    {member.photoUrl ? (
                      <img src={member.photoUrl} alt={member.name} className="w-24 h-24 rounded-full object-cover" />
                    ) : (
                      <span className="text-primary-dark font-heading text-3xl">
                        {member.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    )}
                  </div>
                  <h3 className="font-heading text-xl text-primary-dark mb-1">{member.name}</h3>
                  <p className="text-primary font-medium mb-4">{member.role}</p>
                  {member.bio && <p className="text-gray-600 text-sm mb-4">{member.bio}</p>}
                  <div className="space-y-1 text-sm">
                    {member.email && (
                      <a href={`mailto:${member.email}`} className="block text-ocean hover:underline">
                        {member.email}
                      </a>
                    )}
                    {member.phone && (
                      <a href={`tel:${member.phone}`} className="block text-ocean hover:underline">
                        {member.phone}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">Team information is currently being updated.</p>
              <p className="text-gray-600">
                Please call us at <a href="tel:+18888941884" className="text-primary font-semibold hover:underline">(888) 894-1884</a> to speak with a team member.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
