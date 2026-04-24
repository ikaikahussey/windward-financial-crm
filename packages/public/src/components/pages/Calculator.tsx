import { useState } from 'react';
import { apiPost } from '../../lib/api';

interface CalcInputs {
  currentAge: number;
  retirementAge: number;
  annualSalary: number;
  yearsOfService: number;
  current403b: number;
  monthlySavings: number;
  ersPlanType: string;
}

interface CalcResults {
  estimatedPension: number;
  estimated403b: number;
  estimatedSocialSecurity: number;
  totalMonthlyIncome: number;
  readinessScore: number;
}

interface LeadForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

const initialInputs: CalcInputs = {
  currentAge: 35,
  retirementAge: 62,
  annualSalary: 55000,
  yearsOfService: 10,
  current403b: 20000,
  monthlySavings: 200,
  ersPlanType: 'contributory',
};

const initialLead: LeadForm = { firstName: '', lastName: '', email: '', phone: '' };

export default function Calculator() {
  const [inputs, setInputs] = useState<CalcInputs>(initialInputs);
  const [results, setResults] = useState<CalcResults | null>(null);
  const [leadForm, setLeadForm] = useState<LeadForm>(initialLead);
  const [leadStatus, setLeadStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setInputs({ ...inputs, [name]: name === 'ersPlanType' ? value : Number(value) });
  };

  const calculate = (e: React.FormEvent) => {
    e.preventDefault();
    const yearsToRetirement = inputs.retirementAge - inputs.currentAge;
    const totalYearsOfService = inputs.yearsOfService + yearsToRetirement;

    // ERS pension estimate based on plan type
    let pensionMultiplier = 0;
    switch (inputs.ersPlanType) {
      case 'contributory':
        pensionMultiplier = 0.02; // 2% per year
        break;
      case 'noncontributory':
        pensionMultiplier = 0.0125; // 1.25% per year
        break;
      case 'hybrid':
        pensionMultiplier = 0.0175; // 1.75% per year
        break;
      default:
        pensionMultiplier = 0.02;
    }

    // Average of last 3 years salary (simplified: use current salary with modest growth)
    const avgGrowthRate = 0.02;
    const projectedSalary = inputs.annualSalary * Math.pow(1 + avgGrowthRate, yearsToRetirement);
    const highThreeAvg = projectedSalary * (1 - avgGrowthRate); // simplified
    const annualPension = highThreeAvg * pensionMultiplier * Math.min(totalYearsOfService, 35);
    const monthlyPension = annualPension / 12;

    // 403(b) projection with 6% average annual return
    const monthlyReturn = 0.06 / 12;
    const months = yearsToRetirement * 12;
    const futureValue403b =
      inputs.current403b * Math.pow(1 + monthlyReturn, months) +
      inputs.monthlySavings * ((Math.pow(1 + monthlyReturn, months) - 1) / monthlyReturn);

    // Monthly withdrawal from 403(b) over 25 years
    const withdrawalMonths = 25 * 12;
    const monthly403b = futureValue403b / withdrawalMonths;

    // Social Security estimate (simplified)
    const estimatedSS = Math.min(inputs.annualSalary * 0.35 / 12, 3200);

    const totalMonthly = monthlyPension + monthly403b + estimatedSS;

    // Readiness score (percentage of pre-retirement income replaced)
    const monthlyPreRetirement = projectedSalary / 12;
    const replacementRatio = totalMonthly / monthlyPreRetirement;
    const score = Math.min(Math.round(replacementRatio * 100), 100);

    setResults({
      estimatedPension: Math.round(monthlyPension),
      estimated403b: Math.round(monthly403b),
      estimatedSocialSecurity: Math.round(estimatedSS),
      totalMonthlyIncome: Math.round(totalMonthly),
      readinessScore: score,
    });
  };

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLeadStatus('loading');
    try {
      await apiPost('/api/public/calculator-lead', {
        ...leadForm,
        calculatorInputs: inputs,
        calculatorResults: results,
      });
      setLeadStatus('success');
    } catch {
      setLeadStatus('error');
    }
  };

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'On Track';
    if (score >= 60) return 'Getting There';
    return 'Needs Attention';
  };

  return (
    <div>
      {/* Page Header */}
      <section className="bg-primary-dark py-16 md:py-20">
        <div className="container-wide mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-heading text-4xl md:text-5xl text-white mb-4">Retirement Calculator</h1>
          <p className="text-primary-light/80 text-xl max-w-2xl">
            Estimate your retirement readiness based on your ERS pension, 403(b) savings, and Social Security.
          </p>
        </div>
      </section>

      <section className="section-padding bg-sand">
        <div className="container-wide mx-auto">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Calculator Form */}
            <div>
              <div className="card">
                <h2 className="font-heading text-2xl text-primary-dark mb-6">Your Information</h2>
                <form onSubmit={calculate} className="space-y-5">
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="currentAge" className="label-field">Current Age</label>
                      <input type="number" id="currentAge" name="currentAge" value={inputs.currentAge} onChange={handleInputChange} min={18} max={75} className="input-field" />
                    </div>
                    <div>
                      <label htmlFor="retirementAge" className="label-field">Target Retirement Age</label>
                      <input type="number" id="retirementAge" name="retirementAge" value={inputs.retirementAge} onChange={handleInputChange} min={50} max={75} className="input-field" />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="annualSalary" className="label-field">Annual Salary ($)</label>
                    <input type="number" id="annualSalary" name="annualSalary" value={inputs.annualSalary} onChange={handleInputChange} min={0} step={1000} className="input-field" />
                  </div>

                  <div>
                    <label htmlFor="yearsOfService" className="label-field">Current Years of Service</label>
                    <input type="number" id="yearsOfService" name="yearsOfService" value={inputs.yearsOfService} onChange={handleInputChange} min={0} max={50} className="input-field" />
                  </div>

                  <div>
                    <label htmlFor="ersPlanType" className="label-field">ERS Plan Type</label>
                    <select id="ersPlanType" name="ersPlanType" value={inputs.ersPlanType} onChange={handleInputChange} className="input-field">
                      <option value="contributory">Contributory Plan (2% per year)</option>
                      <option value="noncontributory">Noncontributory Plan (1.25% per year)</option>
                      <option value="hybrid">Hybrid Plan (1.75% per year)</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="current403b" className="label-field">Current 403(b) Balance ($)</label>
                    <input type="number" id="current403b" name="current403b" value={inputs.current403b} onChange={handleInputChange} min={0} step={500} className="input-field" />
                  </div>

                  <div>
                    <label htmlFor="monthlySavings" className="label-field">Monthly 403(b) Contribution ($)</label>
                    <input type="number" id="monthlySavings" name="monthlySavings" value={inputs.monthlySavings} onChange={handleInputChange} min={0} step={25} className="input-field" />
                  </div>

                  <button type="submit" className="btn-primary w-full text-lg">
                    Calculate My Retirement
                  </button>
                </form>

                <p className="text-xs text-gray-500 mt-4 leading-relaxed">
                  This calculator provides estimates only and is not financial advice. Actual results may vary.
                  Assumes 6% average annual return on 403(b), 2% salary growth, and 25-year retirement period.
                </p>
              </div>
            </div>

            {/* Results */}
            <div>
              {results ? (
                <div className="space-y-6">
                  {/* Score */}
                  <div className="card text-center">
                    <h2 className="font-heading text-2xl text-primary-dark mb-4">Retirement Readiness Score</h2>
                    <div className={`text-7xl font-heading font-bold mb-2 ${getScoreColor(results.readinessScore)}`}>
                      {results.readinessScore}%
                    </div>
                    <p className={`text-xl font-semibold ${getScoreColor(results.readinessScore)}`}>
                      {getScoreLabel(results.readinessScore)}
                    </p>
                    <p className="text-gray-500 text-sm mt-2">
                      Percentage of pre-retirement income replaced
                    </p>
                  </div>

                  {/* Breakdown */}
                  <div className="card">
                    <h3 className="font-heading text-xl text-primary-dark mb-6">Estimated Monthly Retirement Income</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center py-3 border-b border-gray-100">
                        <div>
                          <span className="font-medium text-gray-700">ERS Pension</span>
                          <p className="text-xs text-gray-500">Based on {inputs.ersPlanType} plan</p>
                        </div>
                        <span className="font-semibold text-primary-dark text-lg">{formatCurrency(results.estimatedPension)}</span>
                      </div>
                      <div className="flex justify-between items-center py-3 border-b border-gray-100">
                        <div>
                          <span className="font-medium text-gray-700">403(b) Withdrawals</span>
                          <p className="text-xs text-gray-500">Over 25-year retirement</p>
                        </div>
                        <span className="font-semibold text-primary-dark text-lg">{formatCurrency(results.estimated403b)}</span>
                      </div>
                      <div className="flex justify-between items-center py-3 border-b border-gray-100">
                        <div>
                          <span className="font-medium text-gray-700">Social Security</span>
                          <p className="text-xs text-gray-500">Estimated benefit</p>
                        </div>
                        <span className="font-semibold text-primary-dark text-lg">{formatCurrency(results.estimatedSocialSecurity)}</span>
                      </div>
                      <div className="flex justify-between items-center py-3 bg-primary-light/30 rounded-lg px-4 -mx-4">
                        <span className="font-heading text-lg text-primary-dark">Total Monthly Income</span>
                        <span className="font-heading text-2xl text-primary">{formatCurrency(results.totalMonthlyIncome)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Lead Form */}
                  <div className="card bg-primary-dark text-white">
                    <h3 className="font-heading text-xl mb-2">Get a Personalized Plan</h3>
                    <p className="text-primary-light/80 text-sm mb-6">
                      Want to improve your score? Our team can create a customized plan to maximize your retirement income.
                    </p>
                    {leadStatus === 'success' ? (
                      <div className="text-center py-4">
                        <p className="text-primary-light font-semibold">Mahalo! We'll be in touch soon.</p>
                      </div>
                    ) : (
                      <form onSubmit={handleLeadSubmit} className="space-y-4">
                        <div className="grid sm:grid-cols-2 gap-4">
                          <input type="text" name="firstName" value={leadForm.firstName} onChange={(e) => setLeadForm({ ...leadForm, firstName: e.target.value })} placeholder="First Name" required className="px-4 py-3 rounded-lg bg-primary text-white placeholder-primary-light/50 border border-primary focus:outline-none focus:ring-2 focus:ring-primary-light" />
                          <input type="text" name="lastName" value={leadForm.lastName} onChange={(e) => setLeadForm({ ...leadForm, lastName: e.target.value })} placeholder="Last Name" required className="px-4 py-3 rounded-lg bg-primary text-white placeholder-primary-light/50 border border-primary focus:outline-none focus:ring-2 focus:ring-primary-light" />
                        </div>
                        <input type="email" name="email" value={leadForm.email} onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })} placeholder="Email" required className="w-full px-4 py-3 rounded-lg bg-primary text-white placeholder-primary-light/50 border border-primary focus:outline-none focus:ring-2 focus:ring-primary-light" />
                        <input type="tel" name="phone" value={leadForm.phone} onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })} placeholder="Phone" className="w-full px-4 py-3 rounded-lg bg-primary text-white placeholder-primary-light/50 border border-primary focus:outline-none focus:ring-2 focus:ring-primary-light" />
                        <button type="submit" disabled={leadStatus === 'loading'} className="btn-sand w-full">
                          {leadStatus === 'loading' ? 'Sending...' : 'Get My Personalized Plan'}
                        </button>
                        {leadStatus === 'error' && (
                          <p className="text-red-300 text-sm">Something went wrong. Please try again.</p>
                        )}
                      </form>
                    )}
                  </div>
                </div>
              ) : (
                <div className="card text-center py-16">
                  <svg className="w-20 h-20 text-gray-300 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V18zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V13.5zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V18zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V18zm2.498-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zM8.25 6h7.5v2.25h-7.5V6zM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0012 2.25z" />
                  </svg>
                  <h3 className="font-heading text-2xl text-gray-400 mb-2">Your Results Will Appear Here</h3>
                  <p className="text-gray-400">Fill out the form and click "Calculate My Retirement" to see your projections.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
