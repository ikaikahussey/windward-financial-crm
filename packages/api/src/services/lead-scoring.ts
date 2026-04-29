import { db } from '../db';
import { contacts, leadScoreHistory, pipelineEntries } from '../db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import type { JobContext } from './job-runner';

/**
 * Score a contact 0–100 based on their profile data, returning both the
 * total score and the per-factor breakdown so the operations dashboard
 * can show why a lead is hot or cold.
 *
 * Factor categories (each `{ value, contribution }`):
 *   - employmentType (0–25)
 *   - yearsOfService (0–20)
 *   - lifeInsurance  (0–20)
 *   - sourceQuality  (0–15)
 *   - completeness   (0–20: 10 salary + 5 ERS plan + 2 phone + 3 email)
 */
export interface ScoreFactor {
  value: string | number | null;
  contribution: number;
}

export interface ScoreFactors {
  employmentType: ScoreFactor;
  yearsOfService: ScoreFactor;
  lifeInsurance: ScoreFactor;
  sourceQuality: ScoreFactor;
  completeness: ScoreFactor;
}

export interface ScoreResult {
  score: number;
  factors: ScoreFactors;
}

interface ScoreableContact {
  employmentType?: string | null;
  yearsOfService?: number | null;
  lifeInsuranceStatus?: string | null;
  leadSource?: string | null;
  annualSalary?: string | number | null;
  ersPlanType?: string | null;
  phone?: string | null;
  email?: string | null;
}

function employmentContribution(t?: string | null): number {
  switch (t) {
    case 'DOE Teacher':
      return 25;
    case 'DOE Staff':
      return 22;
    case 'State Employee':
      return 20;
    case 'City & County':
      return 15;
    case 'Other':
      return 5;
    default:
      return 0;
  }
}

function yearsContribution(years?: number | null): number {
  if (years == null) return 0;
  if (years >= 25) return 20;
  if (years >= 20) return 18;
  if (years >= 15) return 15;
  if (years >= 10) return 12;
  if (years >= 5) return 8;
  return 4;
}

function lifeInsuranceContribution(s?: string | null): number {
  switch (s) {
    case 'None':
      return 20;
    case 'Employer Only':
      return 18;
    case 'Personal':
      return 8;
    case 'Both':
      return 5;
    default:
      return 0;
  }
}

function sourceContribution(src?: string | null): number {
  switch (src) {
    case 'Referral':
      return 15;
    case 'School Visit':
      return 14;
    case 'Webinar':
      return 12;
    case 'Enrollment':
      return 11;
    case 'Calculator':
      return 10;
    case 'Website':
      return 7;
    case 'Social Media':
      return 5;
    case 'Other':
      return 3;
    default:
      return 0;
  }
}

function completenessContribution(c: ScoreableContact): number {
  const salary =
    typeof c.annualSalary === 'string' ? parseFloat(c.annualSalary) : c.annualSalary;
  let pts = 0;
  if (salary != null && salary > 0) pts += 10;
  if (c.ersPlanType && c.ersPlanType !== 'Unknown') pts += 5;
  if (c.phone) pts += 2;
  if (c.email) pts += 3;
  return pts;
}

function completenessLabel(c: ScoreableContact): string {
  const parts: string[] = [];
  const salary =
    typeof c.annualSalary === 'string' ? parseFloat(c.annualSalary) : c.annualSalary;
  if (salary != null && salary > 0) parts.push('salary');
  if (c.ersPlanType && c.ersPlanType !== 'Unknown') parts.push('ers');
  if (c.phone) parts.push('phone');
  if (c.email) parts.push('email');
  return parts.length ? parts.join('+') : 'none';
}

export function scoreContact(contact: ScoreableContact): ScoreResult {
  const factors: ScoreFactors = {
    employmentType: {
      value: contact.employmentType ?? null,
      contribution: employmentContribution(contact.employmentType),
    },
    yearsOfService: {
      value: contact.yearsOfService ?? null,
      contribution: yearsContribution(contact.yearsOfService),
    },
    lifeInsurance: {
      value: contact.lifeInsuranceStatus ?? null,
      contribution: lifeInsuranceContribution(contact.lifeInsuranceStatus),
    },
    sourceQuality: {
      value: contact.leadSource ?? null,
      contribution: sourceContribution(contact.leadSource),
    },
    completeness: {
      value: completenessLabel(contact),
      contribution: completenessContribution(contact),
    },
  };

  const total =
    factors.employmentType.contribution +
    factors.yearsOfService.contribution +
    factors.lifeInsurance.contribution +
    factors.sourceQuality.contribution +
    factors.completeness.contribution;

  return { score: Math.max(0, Math.min(100, total)), factors };
}

const HOT_THRESHOLD = 70;

/**
 * Re-score every contact, write a `lead_score_history` row per contact,
 * update `contacts.leadScore` / `leadScoreUpdatedAt`, and auto-book any
 * hot leads (score ≥ 70) that aren't already past New Lead / Contacted.
 *
 * Auto-book = move the contact's pipeline stage to "Consultation Scheduled"
 * by appending a pipeline_entries row. Contacts already past Contacted are
 * left alone (they're already further down the funnel).
 *
 * Returns the count of contacts auto-booked so callers/cron can log it.
 */
export async function rescoreAllLeads(
  runId: number | null,
  ctx?: JobContext,
): Promise<{ scored: number; autoBooked: number; averageScore: number; hotCount: number }> {
  const allContacts = await db.select().from(contacts);

  let scored = 0;
  let autoBooked = 0;
  let totalScore = 0;
  let hotCount = 0;

  for (const c of allContacts) {
    try {
      const [prev] = await db
        .select({ score: leadScoreHistory.score })
        .from(leadScoreHistory)
        .where(eq(leadScoreHistory.contactId, c.id))
        .orderBy(desc(leadScoreHistory.scoredAt))
        .limit(1);

      const { score, factors } = scoreContact(c);

      await db.insert(leadScoreHistory).values({
        contactId: c.id,
        score,
        previousScore: prev?.score ?? null,
        factors,
        runId: runId ?? null,
      });

      await db
        .update(contacts)
        .set({ leadScore: score, leadScoreUpdatedAt: new Date() })
        .where(eq(contacts.id, c.id));

      totalScore += score;
      if (score >= HOT_THRESHOLD) {
        hotCount++;
        const [latestStage] = await db
          .select({ pipelineStage: pipelineEntries.pipelineStage })
          .from(pipelineEntries)
          .where(eq(pipelineEntries.contactId, c.id))
          .orderBy(desc(pipelineEntries.movedAt))
          .limit(1);

        const earlyStages = new Set(['New Lead', 'Contacted']);
        if (latestStage && earlyStages.has(latestStage.pipelineStage)) {
          await db.insert(pipelineEntries).values({
            contactId: c.id,
            pipelineStage: 'Consultation Scheduled',
          });
          autoBooked++;
          ctx?.appendLog(`auto-booked contact ${c.id} (score=${score})`);
        }
      }

      scored++;
      ctx?.incrementProcessed();
    } catch (err) {
      ctx?.incrementFailed();
      ctx?.appendLog(
        `score failed for contact ${c.id}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  const averageScore = scored > 0 ? Math.round(totalScore / scored) : 0;
  return { scored, autoBooked, averageScore, hotCount };
}

/**
 * Count of "auto-booked" hot leads today. Used by the dashboard summary.
 * A row counts as auto-booked if a Consultation Scheduled entry was created
 * within the same minute as a lead_score_history row whose score >= 70.
 */
export async function autoBookedToday(): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startIso = startOfDay.toISOString();
  const rows = await db.execute<{ count: number }>(sql`
    SELECT COUNT(DISTINCT pe.contact_id)::int AS count
    FROM pipeline_entries pe
    JOIN lead_score_history lsh
      ON lsh.contact_id = pe.contact_id
     AND lsh.score >= ${HOT_THRESHOLD}
     AND ABS(EXTRACT(EPOCH FROM (pe.moved_at - lsh.scored_at))) < 60
    WHERE pe.pipeline_stage = 'Consultation Scheduled'
      AND pe.moved_at >= ${startIso}::timestamp
  `);
  // postgres-js returns rows as an array
  const row = (rows as unknown as Array<{ count: number }>)[0];
  return row?.count ?? 0;
}
