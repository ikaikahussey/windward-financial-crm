import { db } from '../db';
import { activities, contacts, leadScoreHistory } from '../db/schema';
import { eq } from 'drizzle-orm';
import { scoreContact } from './lead-scoring';

/**
 * Self-serve intake: the fact-finding a rep used to do on the first call.
 * Answers go straight onto the contact and the lead is re-scored at once.
 */

export const INTAKE_OPTIONS = {
  employmentType: ['DOE Teacher', 'DOE Staff', 'State Employee', 'City & County', 'Other'],
  ersPlanType: ['Contributory I', 'Contributory II', 'Noncontributory', 'Hybrid', 'Unknown'],
  lifeInsuranceStatus: ['None', 'Employer Only', 'Personal', 'Both'],
  goals: [
    'Understand my pension',
    'Start or review a 403(b)',
    'Life insurance for my family',
    'Income I cannot outlive',
    'Retiring in the next 5 years',
    'Not sure yet',
  ],
} as const;

export interface IntakeAnswers {
  employmentType?: string;
  employerSchool?: string;
  yearsOfService?: number | string;
  ersPlanType?: string;
  lifeInsuranceStatus?: string;
  annualSalary?: number | string;
  current403bBalance?: number | string;
  goals?: string[];
  notes?: string;
}

const num = (v: unknown, max: number): number | undefined => {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(String(v).replace(/[$,\s]/g, ''));
  return Number.isFinite(n) && n >= 0 && n <= max ? n : undefined;
};
const pick = <T extends readonly string[]>(v: unknown, allowed: T): T[number] | undefined =>
  typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T[number]) : undefined;

export async function saveIntake(contactId: number, answers: IntakeAnswers) {
  const [contact] = await db.select().from(contacts).where(eq(contacts.id, contactId)).limit(1);
  if (!contact) return null;

  const update: Partial<typeof contacts.$inferInsert> = { intakeCompletedAt: new Date(), updatedAt: new Date() };
  const employmentType = pick(answers.employmentType, INTAKE_OPTIONS.employmentType);
  const ersPlanType = pick(answers.ersPlanType, INTAKE_OPTIONS.ersPlanType);
  const lifeInsuranceStatus = pick(answers.lifeInsuranceStatus, INTAKE_OPTIONS.lifeInsuranceStatus);
  const years = num(answers.yearsOfService, 60);
  const salary = num(answers.annualSalary, 10_000_000);
  const balance = num(answers.current403bBalance, 100_000_000);

  if (employmentType) update.employmentType = employmentType;
  if (ersPlanType) update.ersPlanType = ersPlanType;
  if (lifeInsuranceStatus) update.lifeInsuranceStatus = lifeInsuranceStatus;
  if (typeof answers.employerSchool === 'string' && answers.employerSchool.trim()) {
    update.employerSchool = answers.employerSchool.trim().slice(0, 255);
  }
  if (years !== undefined) update.yearsOfService = Math.round(years);
  if (salary !== undefined) update.annualSalary = String(salary);
  if (balance !== undefined) update.current403bBalance = String(balance);

  const goals = Array.isArray(answers.goals)
    ? answers.goals.filter((g) => (INTAKE_OPTIONS.goals as readonly string[]).includes(g))
    : [];
  const note = typeof answers.notes === 'string' ? answers.notes.trim().slice(0, 2000) : '';
  if (goals.length || note) update.goals = [goals.join('; '), note].filter(Boolean).join('\n');

  const [saved] = await db.update(contacts).set(update).where(eq(contacts.id, contactId)).returning();

  // Re-score now instead of waiting for the daily job.
  const { score, factors } = scoreContact(saved);
  await db.insert(leadScoreHistory).values({
    contactId,
    score,
    previousScore: contact.leadScore ?? null,
    factors,
    runId: null,
  });
  await db.update(contacts).set({ leadScore: score, leadScoreUpdatedAt: new Date() }).where(eq(contacts.id, contactId));

  await db.insert(activities).values({
    contactId,
    activityType: 'Note',
    subject: `Intake completed online (lead score ${score})`,
    body: update.goals ?? null,
  });
  return { score };
}
