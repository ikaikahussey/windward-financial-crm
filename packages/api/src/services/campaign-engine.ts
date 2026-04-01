import { Resend } from 'resend';
import { db } from '../db';
import {
  campaigns, campaignSteps, campaignEnrollments, campaignEvents,
  districtContacts, districts,
} from '../db/schema';
import { eq, and, lte, asc } from 'drizzle-orm';

const resendApiKey = process.env.SMTP_PASS || process.env.RESEND_API_KEY || '';
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const FROM_ADDRESS = process.env.EMAIL_FROM || 'info@windward.financial';
const FROM_NAME = process.env.EMAIL_FROM_NAME || 'Windward Financial Group';

/**
 * Replace merge tags in text: {{district_name}}, {{first_name}}, {{last_name}}, {{title}}
 */
function renderMergeTags(text: string, data: Record<string, string>): string {
  let result = text;
  for (const [tag, value] of Object.entries(data)) {
    result = result.replace(new RegExp(`\\{\\{${tag}\\}\\}`, 'g'), value || '');
  }
  return result;
}

/**
 * Launch a campaign: set status to active and schedule first step
 */
export async function launchCampaign(campaignId: number): Promise<void> {
  await db.update(campaigns)
    .set({ status: 'active', updatedAt: new Date() })
    .where(eq(campaigns.id, campaignId));

  // Set all pending enrollments to active
  await db.update(campaignEnrollments)
    .set({ status: 'active', lastStepSentAt: new Date() })
    .where(and(
      eq(campaignEnrollments.campaignId, campaignId),
      eq(campaignEnrollments.status, 'pending')
    ));

  console.log(`Campaign ${campaignId} launched`);
}

/**
 * Pause a campaign
 */
export async function pauseCampaign(campaignId: number): Promise<void> {
  await db.update(campaigns)
    .set({ status: 'paused', updatedAt: new Date() })
    .where(eq(campaigns.id, campaignId));
  console.log(`Campaign ${campaignId} paused`);
}

/**
 * Process all active campaign enrollments — called by cron every 5 minutes.
 * For each active enrollment, check if the delay for the next step has elapsed,
 * and if so, send the email and advance the step.
 */
export async function processCampaignQueue(): Promise<number> {
  const now = new Date();
  let sentCount = 0;

  // Get all active campaigns
  const activeCampaigns = await db
    .select({ id: campaigns.id })
    .from(campaigns)
    .where(eq(campaigns.status, 'active'));

  for (const campaign of activeCampaigns) {
    // Get all steps for this campaign ordered by step number
    const steps = await db
      .select()
      .from(campaignSteps)
      .where(eq(campaignSteps.campaignId, campaign.id))
      .orderBy(asc(campaignSteps.stepNumber));

    if (steps.length === 0) continue;

    // Get active enrollments
    const enrollments = await db
      .select()
      .from(campaignEnrollments)
      .where(and(
        eq(campaignEnrollments.campaignId, campaign.id),
        eq(campaignEnrollments.status, 'active')
      ));

    for (const enrollment of enrollments) {
      const nextStepIndex = enrollment.currentStep; // 0-based index into steps array
      if (nextStepIndex >= steps.length) {
        // All steps completed
        await db.update(campaignEnrollments)
          .set({ status: 'completed', completedAt: new Date() })
          .where(eq(campaignEnrollments.id, enrollment.id));
        continue;
      }

      const step = steps[nextStepIndex];

      // Check if delay has elapsed
      const referenceTime = enrollment.lastStepSentAt || enrollment.enrolledAt;
      const sendAfter = new Date(referenceTime.getTime() + step.delayDays * 24 * 60 * 60 * 1000);

      if (now < sendAfter) continue; // Not time yet

      // Get district contact info for merge tags
      let contactEmail: string | null = null;
      let mergeData: Record<string, string> = {};

      if (enrollment.districtContactId) {
        const [contact] = await db.select().from(districtContacts)
          .where(eq(districtContacts.id, enrollment.districtContactId)).limit(1);
        if (contact) {
          contactEmail = contact.email;
          mergeData = {
            first_name: contact.firstName || '',
            last_name: contact.lastName || '',
            title: contact.title || '',
          };
        }
      }

      // Get district info
      const [district] = await db.select().from(districts)
        .where(eq(districts.id, enrollment.districtId)).limit(1);
      if (district) {
        mergeData.district_name = district.employerName;
        mergeData.city = district.city || '';
        mergeData.state = district.state || '';
      }

      if (!contactEmail) {
        console.warn(`No email for enrollment ${enrollment.id}, skipping`);
        continue;
      }

      // Render and send
      const subject = renderMergeTags(step.subject, mergeData);
      const body = renderMergeTags(step.body, mergeData);

      try {
        if (!resend) {
          console.warn(`Resend not configured, skipping campaign email "${subject}" to ${contactEmail}`);
          continue;
        }

        const { error } = await resend.emails.send({
          from: `${FROM_NAME} <${FROM_ADDRESS}>`,
          to: [contactEmail],
          subject,
          html: body,
        });

        if (error) throw new Error(`Resend error: ${error.message}`);

        // Record event
        await db.insert(campaignEvents).values({
          enrollmentId: enrollment.id,
          stepNumber: step.stepNumber,
          eventType: 'sent',
        });

        // Advance step
        await db.update(campaignEnrollments)
          .set({
            currentStep: enrollment.currentStep + 1,
            lastStepSentAt: new Date(),
          })
          .where(eq(campaignEnrollments.id, enrollment.id));

        sentCount++;
        console.log(`Campaign email sent: step ${step.stepNumber} to ${contactEmail}`);
      } catch (err) {
        console.error(`Campaign email failed for enrollment ${enrollment.id}:`, err);
        await db.insert(campaignEvents).values({
          enrollmentId: enrollment.id,
          stepNumber: step.stepNumber,
          eventType: 'bounced',
          metadata: { error: String(err) },
        });
      }
    }
  }

  if (sentCount > 0) {
    console.log(`Campaign queue processed: ${sentCount} emails sent`);
  }

  return sentCount;
}

/**
 * Get campaign metrics
 */
export async function getCampaignMetrics(campaignId: number) {
  const allEvents = await db.select()
    .from(campaignEvents)
    .innerJoin(campaignEnrollments, eq(campaignEvents.enrollmentId, campaignEnrollments.id))
    .where(eq(campaignEnrollments.campaignId, campaignId));

  const allEnrollments = await db.select()
    .from(campaignEnrollments)
    .where(eq(campaignEnrollments.campaignId, campaignId));

  const eventCounts = { sent: 0, opened: 0, clicked: 0, replied: 0, bounced: 0 };
  for (const row of allEvents) {
    const eventType = row.campaign_events.eventType;
    if (eventType in eventCounts) {
      eventCounts[eventType as keyof typeof eventCounts]++;
    }
  }

  return {
    totalEnrollments: allEnrollments.length,
    activeEnrollments: allEnrollments.filter(e => e.status === 'active').length,
    completedEnrollments: allEnrollments.filter(e => e.status === 'completed').length,
    ...eventCounts,
    openRate: eventCounts.sent > 0 ? (eventCounts.opened / eventCounts.sent * 100).toFixed(1) : '0',
    clickRate: eventCounts.sent > 0 ? (eventCounts.clicked / eventCounts.sent * 100).toFixed(1) : '0',
    replyRate: eventCounts.sent > 0 ? (eventCounts.replied / eventCounts.sent * 100).toFixed(1) : '0',
  };
}
