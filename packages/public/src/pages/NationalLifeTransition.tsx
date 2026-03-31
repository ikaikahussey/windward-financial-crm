const NLG_LOGIN_URL = import.meta.env.VITE_NLG_LOGIN_URL || 'https://www.nationallife.com/login';

export default function NationalLifeTransition() {
  return (
    <div>
      {/* Page Header */}
      <section className="bg-primary-dark py-16 md:py-20">
        <div className="container-wide mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-heading text-4xl md:text-5xl text-white mb-4">National Life Group Transition</h1>
          <p className="text-primary-light/80 text-xl max-w-2xl">
            Your policies are in good hands. We're here to help.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="section-padding bg-sand">
        <div className="container-narrow mx-auto">
          <div className="card">
            <div className="prose max-w-none">
              <h2 className="font-heading text-3xl text-primary-dark mb-6">Welcome, National Life Group Customers</h2>

              <div className="bg-primary-light/30 rounded-xl p-6 md:p-8 mb-8 border-l-4 border-primary">
                <p className="text-lg text-gray-700 leading-relaxed">
                  Windward Financial is now your dedicated servicing agent for National Life Group (NLG) policies in Hawaii.
                  Whether you have life insurance, annuities, or other NLG products, our team is here to provide
                  the same excellent service you've always received -- and more.
                </p>
              </div>

              <h3 className="font-heading text-2xl text-primary-dark mb-4">What This Means for You</h3>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-primary shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700"><strong>Your policies are unchanged.</strong> All terms, benefits, and coverage remain exactly the same.</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-primary shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700"><strong>Local, personal service.</strong> You now have a dedicated Hawaii-based team to assist with questions, claims, and policy changes.</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-primary shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700"><strong>Free policy review.</strong> We offer complimentary reviews to ensure your coverage still meets your needs.</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-primary shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-700"><strong>No action required.</strong> The transition is seamless. You don't need to do anything to continue your coverage.</span>
                </li>
              </ul>

              <h3 className="font-heading text-2xl text-primary-dark mb-4">Access Your Account</h3>
              <p className="text-gray-700 mb-6">
                View your policy details, statements, and account information through the National Life Group portal.
              </p>
              <a
                href={NLG_LOGIN_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary inline-flex items-center gap-2 text-lg mb-10"
              >
                Get My Account Statement
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
              </a>

              <div className="bg-white rounded-xl p-6 md:p-8 border border-gray-200">
                <h3 className="font-heading text-2xl text-primary-dark mb-4">Questions About the Transition?</h3>
                <p className="text-gray-700 mb-4">
                  Our dedicated transition support line is available to answer any questions you may have.
                </p>
                <div className="flex flex-wrap gap-6">
                  <a href="tel:+18888502026" className="flex items-center gap-3 text-primary-dark hover:text-primary transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                    </svg>
                    <span className="text-lg font-semibold">(888) 850-2026</span>
                  </a>
                  <a href="mailto:info@windward.financial" className="flex items-center gap-3 text-primary-dark hover:text-primary transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                    <span className="text-lg font-semibold">info@windward.financial</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
