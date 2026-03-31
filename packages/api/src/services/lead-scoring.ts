/**
 * Score a contact 0–100 based on their profile data.
 * Higher scores indicate stronger lead quality for Hawaii state employee
 * retirement and life insurance planning.
 */
export function scoreContact(contact: {
  employmentType?: string | null;
  yearsOfService?: number | null;
  lifeInsuranceStatus?: string | null;
  leadSource?: string | null;
  annualSalary?: string | number | null;
  ersPlanType?: string | null;
  phone?: string | null;
  email?: string | null;
}): number {
  let score = 0;

  // ── Employment Type (0–25 points) ──
  // DOE Teachers and State Employees are the primary target audience
  switch (contact.employmentType) {
    case 'DOE Teacher':
      score += 25;
      break;
    case 'DOE Staff':
      score += 22;
      break;
    case 'State Employee':
      score += 20;
      break;
    case 'City & County':
      score += 15;
      break;
    case 'Other':
      score += 5;
      break;
    default:
      // No employment type provided
      score += 0;
  }

  // ── Years of Service (0–20 points) ──
  // More years = closer to retirement = more urgency
  const years = contact.yearsOfService;
  if (years != null) {
    if (years >= 25) {
      score += 20;
    } else if (years >= 20) {
      score += 18;
    } else if (years >= 15) {
      score += 15;
    } else if (years >= 10) {
      score += 12;
    } else if (years >= 5) {
      score += 8;
    } else {
      score += 4;
    }
  }

  // ── Life Insurance Status (0–20 points) ──
  // "None" or "Employer Only" signals a clear opportunity
  switch (contact.lifeInsuranceStatus) {
    case 'None':
      score += 20;
      break;
    case 'Employer Only':
      score += 18;
      break;
    case 'Personal':
      score += 8;
      break;
    case 'Both':
      score += 5;
      break;
    default:
      score += 0;
  }

  // ── Lead Source (0–15 points) ──
  // Referrals and hands-on sources convert better
  switch (contact.leadSource) {
    case 'Referral':
      score += 15;
      break;
    case 'School Visit':
      score += 14;
      break;
    case 'Webinar':
      score += 12;
      break;
    case 'Enrollment':
      score += 11;
      break;
    case 'Calculator':
      score += 10;
      break;
    case 'Website':
      score += 7;
      break;
    case 'Social Media':
      score += 5;
      break;
    case 'Other':
      score += 3;
      break;
    default:
      score += 0;
  }

  // ── Salary Data Presence (0–10 points) ──
  // Having salary info means the lead is engaged enough to share financials
  const salary =
    typeof contact.annualSalary === 'string'
      ? parseFloat(contact.annualSalary)
      : contact.annualSalary;

  if (salary != null && salary > 0) {
    score += 10;
  }

  // ── ERS Plan Type Known (0–5 points) ──
  if (contact.ersPlanType && contact.ersPlanType !== 'Unknown') {
    score += 5;
  }

  // ── Contact Completeness (0–5 points) ──
  // Having both phone and email shows higher engagement
  if (contact.phone) score += 2;
  if (contact.email) score += 3;

  // Clamp to 0–100
  return Math.max(0, Math.min(100, score));
}
