import { Link } from 'react-router-dom';

const NLG_LOGIN_URL = import.meta.env.VITE_NLG_LOGIN_URL || 'https://www.nationallife.com/login';

interface Resource {
  title: string;
  description: string;
  url: string;
  external: boolean;
  icon: React.ReactNode;
}

const resources: Resource[] = [
  {
    title: 'Check My Account',
    description: 'Log in to the National Life Group portal to view your policy details, statements, and account information.',
    url: NLG_LOGIN_URL,
    external: true,
    icon: (
      <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
      </svg>
    ),
  },
  {
    title: 'Employees\' Retirement System (ERS)',
    description: 'Access information about your Hawaii state pension plan, including plan details, forms, and retirement calculators.',
    url: 'https://ers.ehawaii.gov',
    external: true,
    icon: (
      <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
      </svg>
    ),
  },
  {
    title: 'Hawaii Employer-Union Health Benefits Trust Fund (EUTF)',
    description: 'Learn about your health, dental, vision, and life insurance benefits as a Hawaii public employee.',
    url: 'https://eutf.hawaii.gov',
    external: true,
    icon: (
      <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
      </svg>
    ),
  },
  {
    title: 'Social Security Administration',
    description: 'Estimate your Social Security benefits, apply for benefits, and manage your account online.',
    url: 'https://www.ssa.gov',
    external: true,
    icon: (
      <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
  {
    title: 'Retirement Readiness Calculator',
    description: 'Use our free calculator to estimate your retirement income from ERS, 403(b), and Social Security combined.',
    url: '/calculator',
    external: false,
    icon: (
      <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V18zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V13.5zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V18zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V18zm2.498-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zM8.25 6h7.5v2.25h-7.5V6zM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0012 2.25z" />
      </svg>
    ),
  },
];

export default function Resources() {
  return (
    <div>
      {/* Page Header */}
      <section className="bg-primary-dark py-16 md:py-20">
        <div className="container-wide mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-heading text-4xl md:text-5xl text-white mb-4">Resources</h1>
          <p className="text-primary-light/80 text-xl max-w-2xl">
            Helpful links and tools for Hawaii's public employees.
          </p>
        </div>
      </section>

      <section className="section-padding bg-sand">
        <div className="container-wide mx-auto">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {resources.map((resource) => {
              const CardWrapper = resource.external
                ? ({ children, className }: { children: React.ReactNode; className: string }) => (
                    <a href={resource.url} target="_blank" rel="noopener noreferrer" className={className}>
                      {children}
                    </a>
                  )
                : ({ children, className }: { children: React.ReactNode; className: string }) => (
                    <Link to={resource.url} className={className}>
                      {children}
                    </Link>
                  );

              return (
                <CardWrapper key={resource.title} className="card group hover:shadow-xl transition-shadow flex flex-col">
                  <div className="w-14 h-14 bg-primary-light rounded-xl flex items-center justify-center mb-5">
                    {resource.icon}
                  </div>
                  <h3 className="font-heading text-xl text-primary-dark mb-3 group-hover:text-primary transition-colors">
                    {resource.title}
                  </h3>
                  <p className="text-gray-600 text-sm flex-1 mb-4">{resource.description}</p>
                  <span className="text-primary font-semibold text-sm group-hover:underline inline-flex items-center gap-1">
                    {resource.external ? (
                      <>
                        Visit Site
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                        </svg>
                      </>
                    ) : (
                      <>Open &rarr;</>
                    )}
                  </span>
                </CardWrapper>
              );
            })}
          </div>

          {/* Contact CTA */}
          <div className="mt-16 card bg-primary-dark text-white text-center">
            <h2 className="font-heading text-2xl mb-4">Need Help Finding Something?</h2>
            <p className="text-primary-light/80 mb-6 max-w-xl mx-auto">
              Our team is available to help you navigate your benefits and find the resources you need.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a href="tel:+18888941884" className="btn-sand">
                Call (888) 894-1884
              </a>
              <Link to="/contact" className="inline-block border-2 border-primary-light/40 text-primary-light font-semibold px-6 py-3 rounded-lg hover:bg-primary-light/10 transition-colors">
                Send a Message
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
