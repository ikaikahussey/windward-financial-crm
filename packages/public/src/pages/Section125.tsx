import { Link } from 'react-router-dom';

const benefits = [
  {
    title: 'Zero Cost to the District',
    description:
      'Section 125 plans are funded entirely through employee pre-tax payroll deductions. There is no cost to the district to implement or maintain.',
    icon: (
      <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: 'Tax Savings for Employees',
    description:
      'Employees save 25-40% on eligible expenses including health insurance premiums, dental, vision, and dependent care through pre-tax deductions.',
    icon: (
      <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
      </svg>
    ),
  },
  {
    title: 'Simple Implementation',
    description:
      'We handle everything from plan document preparation to employee enrollment, ongoing compliance, and annual non-discrimination testing.',
    icon: (
      <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

const steps = [
  {
    number: '1',
    title: 'Schedule a Consultation',
    description: 'Meet with our team to discuss your district\'s needs and answer any questions.',
  },
  {
    number: '2',
    title: 'Plan Document & Setup',
    description: 'We prepare the Section 125 plan document and handle all IRS compliance requirements.',
  },
  {
    number: '3',
    title: 'Employee Enrollment',
    description: 'We conduct enrollment meetings and provide one-on-one support to your employees.',
  },
  {
    number: '4',
    title: 'Ongoing Administration',
    description: 'Continuous compliance monitoring, non-discrimination testing, and employee support.',
  },
];

const eligibleBenefits = [
  'Health insurance premiums',
  'Dental and vision insurance',
  'Health Savings Account (HSA) contributions',
  'Flexible Spending Accounts (FSA)',
  'Dependent Care Assistance',
];

export default function Section125() {
  return (
    <div>
      {/* Hero Section */}
      <section className="bg-primary-dark py-20 md:py-28">
        <div className="container-wide mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl text-white mb-6 max-w-4xl mx-auto">
            Section 125 Cafeteria Plans for School Districts
          </h1>
          <p className="text-primary-light/80 text-xl md:text-2xl max-w-3xl mx-auto mb-10">
            Help your employees save on taxes while providing valuable pre-tax benefits. Zero cost to the district.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/section-125/webinar" className="btn-sand text-lg">
              Join Our Free Webinar
            </Link>
            <Link
              to="/section-125/download"
              className="bg-white/10 text-white text-lg font-semibold px-6 py-3 rounded-lg hover:bg-white/20 transition-colors border border-white/20"
            >
              Download the Guide
            </Link>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="section-padding bg-white">
        <div className="container-wide mx-auto">
          <h2 className="font-heading text-3xl md:text-4xl text-primary-dark text-center mb-4">
            Why School Districts Choose Section 125
          </h2>
          <p className="text-gray-600 text-lg text-center max-w-2xl mx-auto mb-12">
            A win-win for districts and employees alike.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {benefits.map((benefit) => (
              <div key={benefit.title} className="card flex flex-col items-center text-center hover:shadow-xl transition-shadow">
                <div className="w-16 h-16 bg-primary-light rounded-xl flex items-center justify-center mb-5">
                  {benefit.icon}
                </div>
                <h3 className="font-heading text-xl text-primary-dark mb-3">{benefit.title}</h3>
                <p className="text-gray-600">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="section-padding bg-sand">
        <div className="container-wide mx-auto">
          <h2 className="font-heading text-3xl md:text-4xl text-primary-dark text-center mb-12">
            How It Works
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step) => (
              <div key={step.number} className="relative">
                <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center text-xl font-bold mb-4">
                  {step.number}
                </div>
                <h3 className="font-heading text-lg text-primary-dark mb-2">{step.title}</h3>
                <p className="text-gray-600 text-sm">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What is a Section 125 Plan? */}
      <section className="section-padding bg-white">
        <div className="container-narrow mx-auto">
          <h2 className="font-heading text-3xl md:text-4xl text-primary-dark mb-6">
            What is a Section 125 Plan?
          </h2>
          <p className="text-gray-600 text-lg mb-8">
            A Section 125 Cafeteria Plan, authorized by the IRS, allows employees to pay for certain
            qualified benefits on a pre-tax basis. This reduces their taxable income, resulting in
            significant savings on federal income tax, state income tax, and FICA taxes.
          </p>
          <div className="bg-sand rounded-xl p-8">
            <h3 className="font-heading text-xl text-primary-dark mb-4">Eligible Benefits Include:</h3>
            <ul className="space-y-3">
              {eligibleBenefits.map((benefit) => (
                <li key={benefit} className="flex items-center gap-3 text-gray-700">
                  <svg className="w-5 h-5 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-padding bg-primary-dark">
        <div className="container-narrow mx-auto text-center">
          <h2 className="font-heading text-3xl md:text-4xl text-white mb-6">
            Ready to bring tax savings to your district?
          </h2>
          <p className="text-primary-light/80 text-lg mb-8 max-w-2xl mx-auto">
            Schedule a free consultation to learn how a Section 125 plan can benefit your employees at zero cost to the district.
          </p>
          <Link to="/schedule-an-appointment" className="btn-sand text-lg">
            Schedule a Free Consultation
          </Link>
          <p className="text-primary-light/60 mt-6">
            Or call us at{' '}
            <a href="tel:+18888941884" className="text-white hover:underline font-semibold">
              (888) 894-1884
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
