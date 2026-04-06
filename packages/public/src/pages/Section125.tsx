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

      {/* FAQ Section */}
      <section className="section-padding bg-sand">
        <div className="container-narrow mx-auto">
          <h2 className="font-heading text-3xl md:text-4xl text-primary-dark text-center mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-gray-600 text-lg text-center max-w-2xl mx-auto mb-12">
            Common questions about Section 125 Cafeteria Plans and the MEC Plan.
          </p>
          <div className="space-y-6">
            <FaqItem
              question="What is Section 125?"
              answer="Section 125 Plans (known as Cafeteria Plans) are IRS-approved employee benefits plans allowing employees to pay for qualified expenses — like health insurance premiums, FSAs, and HSAs — using pre-tax income. It reduces both employee taxable income and employer payroll taxes. Many districts use the Section 125 POP and FSA plans."
            />
            <FaqItem
              question="What is Section 125 MEC?"
              answer="This more recent iteration arose from the MEC Plan (Minimum Essential Care) requirement under ACA. The MEC plan is a low-cost, preventative-focused health plan that meets the Affordable Care Act's (ACA) minimum requirement to offer coverage. The MEC Plan offers zero-net cost benefits that employees and their families can use daily. Windward Financial offers the CHAMP Plan version of Section 125 MEC Plan."
            />
            <FaqItem
              question="Is Section 125 MEC Free?"
              answer="No. There is a fee built into the Plan. Therefore, instead of the FICA savings being, say $75 per person per month, the savings are $42 per person per month. More accurately, the Plan is &quot;net zero&quot; cost."
            />
            <FaqItem
              question="What are the benefits under Section 125 MEC for the employee?"
              answer={
                <div>
                  <p className="mb-3">The CHAMP MEC plan is designed to provide daily essential coverage, focusing heavily on preventative care and limited to no net cost benefits:</p>
                  <ul className="space-y-2 ml-1">
                    <li className="flex items-start gap-2"><span className="text-primary mt-1">&#x2022;</span> <span><strong>Preventive Services:</strong> Annual check-ups, vaccinations, and screenings</span></li>
                    <li className="flex items-start gap-2"><span className="text-primary mt-1">&#x2022;</span> <span><strong>Wellness Benefits:</strong> Programs designed for preventive care</span></li>
                    <li className="flex items-start gap-2"><span className="text-primary mt-1">&#x2022;</span> <span><strong>Limited Primary Care:</strong> Access to primary care services for employees without cost</span></li>
                    <li className="flex items-start gap-2"><span className="text-primary mt-1">&#x2022;</span> <span><strong>Telehealth:</strong> Free virtual doctor visits for spouse and family members based on age</span></li>
                    <li className="flex items-start gap-2"><span className="text-primary mt-1">&#x2022;</span> <span>Some prescription drugs with zero co-pay</span></li>
                  </ul>
                </div>
              }
            />
            <FaqItem
              question="What are the benefits to the employer?"
              answer="Assuming that major medical utilization results in increased premiums, the Section 125 MEC can reduce utilization by shifting care to the zero-net cost MEC benefits. Assuming the plan benefit is 1K, the FICA savings of approximately $500 per month per full-time employee earning $14,400 per year."
            />
            <FaqItem
              question="Who can benefit from Section 125 MEC?"
              answer={
                <div>
                  <p className="mb-3">A Section 125 MEC Plan would be well received by:</p>
                  <ul className="space-y-2 ml-1">
                    <li className="flex items-start gap-2"><span className="text-primary mt-1">&#x2022;</span> <span>Employees who do not qualify for employer medical plans</span></li>
                    <li className="flex items-start gap-2"><span className="text-primary mt-1">&#x2022;</span> <span>Employees without a PCP</span></li>
                    <li className="flex items-start gap-2"><span className="text-primary mt-1">&#x2022;</span> <span>Employees and families concerned about co-pay costs</span></li>
                    <li className="flex items-start gap-2"><span className="text-primary mt-1">&#x2022;</span> <span>Employees and family who travel or live outside of the PCP coverage areas</span></li>
                  </ul>
                </div>
              }
            />
            <FaqItem
              question="Does Section 125 MEC replace the district's major medical plan?"
              answer={
                <div>
                  <p className="mb-3"><strong>No.</strong> The CHAMP Plan does not replace comprehensive medical care; the MEC plan is designed to enhance traditional employer-sponsored care. The MEC plan does not offer the following:</p>
                  <ul className="space-y-2 ml-1">
                    <li className="flex items-start gap-2"><span className="text-primary mt-1">&#x2022;</span> <span>Specialist visits</span></li>
                    <li className="flex items-start gap-2"><span className="text-primary mt-1">&#x2022;</span> <span>Elective procedures</span></li>
                    <li className="flex items-start gap-2"><span className="text-primary mt-1">&#x2022;</span> <span>Some prescription drugs (often excluded in employer-sponsored preventive-only MEC plans)</span></li>
                    <li className="flex items-start gap-2"><span className="text-primary mt-1">&#x2022;</span> <span>Hospitalization</span></li>
                  </ul>
                </div>
              }
            />
            <FaqItem
              question="Does Section 125 MEC replace the current Section 125 Plan?"
              answer="No. Many districts are familiar with Section 125 Plans such as the Premium Only Plan and Flex Savings Account. The MEC plan iteration of the Section 125 plan is designed to enhance the POP and FSA plans by providing additional health and preventative care benefits."
            />
            <FaqItem
              question="What is the impact of Section 125 on future Social Security and Medicare benefits?"
              answer={
                <div>
                  <p className="mb-3">The impact is modest for the following reasons:</p>
                  <ul className="space-y-2 ml-1">
                    <li className="flex items-start gap-2"><span className="text-primary mt-1">&#x2022;</span> <span>The percentage of FICA reduction is small compared to the full FICA tax amount</span></li>
                    <li className="flex items-start gap-2"><span className="text-primary mt-1">&#x2022;</span> <span>The "lost" FICA reduction is recaptured when salary increases occur later</span></li>
                    <li className="flex items-start gap-2"><span className="text-primary mt-1">&#x2022;</span> <span>The person usually sees an increase in take-home pay, allowing for after-tax investments (Roth), after-tax foundation savings (401A), or pre-tax 403b contributions</span></li>
                  </ul>
                </div>
              }
            />
            <FaqItem
              question="Is Section 125 mandatory participation?"
              answer="All employees are automatically enrolled in the Plan, but they can opt out if they wish."
            />
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

function FaqItem({ question, answer }: { question: string; answer: React.ReactNode }) {
  return (
    <details className="group bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <summary className="flex items-center justify-between cursor-pointer px-6 py-5 text-left hover:bg-sand/50 transition">
        <h3 className="font-heading text-lg text-primary-dark pr-4">{question}</h3>
        <svg
          className="w-5 h-5 text-primary shrink-0 transition-transform group-open:rotate-180"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </summary>
      <div className="px-6 pb-5 text-gray-600 leading-relaxed">
        {typeof answer === 'string' ? <p>{answer}</p> : answer}
      </div>
    </details>
  );
}
