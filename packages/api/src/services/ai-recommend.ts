import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

const SYSTEM_PROMPT = `You are a financial planning assistant for Windward Financial Group, a firm specializing in retirement and life insurance planning for Hawaii state employees, particularly DOE teachers and staff.

Your role is to analyze a contact's profile and consultation notes, then provide a personalized recommendation covering:

1. **Retirement Readiness Assessment** — Based on years of service, ERS plan type, and salary, estimate their retirement income gap.

2. **Life Insurance Recommendation** — Based on their current coverage status, salary, and family situation, recommend appropriate coverage amounts and product types (Term Life, GUL, IUL).

3. **403(b) Strategy** — If applicable, suggest 403(b) contribution strategies (SPDA vs FPDA) based on their risk tolerance and time horizon.

4. **Action Items** — Provide 3-5 specific next steps for the agent to discuss with the client.

Keep recommendations practical, specific to Hawaii state employee benefits, and compliant. Do not provide specific investment returns or guarantees. Always recommend the client consult with their agent for final decisions.

Format your response in clean Markdown with headers and bullet points.`;

/**
 * Generate a personalized financial planning recommendation using Claude.
 */
export async function generateRecommendation(
  contact: {
    firstName?: string;
    lastName?: string;
    employmentType?: string | null;
    employerSchool?: string | null;
    yearsOfService?: number | null;
    annualSalary?: string | number | null;
    ersPlanType?: string | null;
    current403bBalance?: string | number | null;
    lifeInsuranceStatus?: string | null;
    leadSource?: string | null;
  },
  consultationNotes: string
): Promise<string> {
  const salary =
    typeof contact.annualSalary === 'string'
      ? contact.annualSalary
      : contact.annualSalary?.toString() ?? 'Not provided';

  const balance403b =
    typeof contact.current403bBalance === 'string'
      ? contact.current403bBalance
      : contact.current403bBalance?.toString() ?? 'Not provided';

  const userMessage = `Please generate a personalized recommendation for the following client:

**Client Profile:**
- Name: ${contact.firstName ?? ''} ${contact.lastName ?? ''}
- Employment Type: ${contact.employmentType ?? 'Not provided'}
- Employer/School: ${contact.employerSchool ?? 'Not provided'}
- Years of Service: ${contact.yearsOfService ?? 'Not provided'}
- Annual Salary: ${salary}
- ERS Plan Type: ${contact.ersPlanType ?? 'Not provided'}
- Current 403(b) Balance: ${balance403b}
- Life Insurance Status: ${contact.lifeInsuranceStatus ?? 'Not provided'}
- Lead Source: ${contact.leadSource ?? 'Not provided'}

**Consultation Notes:**
${consultationNotes || 'No notes provided.'}

Please provide a comprehensive, personalized recommendation.`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  // Extract text from the response
  const textBlock = message.content.find((block) => block.type === 'text');
  return textBlock?.text ?? 'Unable to generate recommendation.';
}
