import { db } from '../db';
import {
  emailQueue,
  emailTemplates,
  tasks,
  activities,
  contacts,
  pipelineEntries,
} from '../db/schema';
import { eq, and, like } from 'drizzle-orm';

/**
 * Helper: find a template by name pattern, returning its ID or null.
 */
async function findTemplateId(namePattern: string): Promise<number | null> {
  const [template] = await db
    .select({ id: emailTemplates.id })
    .from(emailTemplates)
    .where(like(emailTemplates.name, namePattern))
    .limit(1);

  return template?.id ?? null;
}

/**
 * Helper: queue an email for a contact with a delay in days from now.
 */
async function queueEmailWithDelay(
  contactId: number,
  templateId: number,
  delayDays: number
): Promise<void> {
  const scheduledFor = new Date();
  scheduledFor.setDate(scheduledFor.getDate() + delayDays);

  await db.insert(emailQueue).values({
    contactId,
    templateId,
    scheduledFor,
    status: 'Pending',
  });
}

/**
 * Helper: create a task assigned to a user.
 */
async function createTask(opts: {
  contactId: number;
  assignedTo: number;
  createdBy: number;
  title: string;
  description?: string;
  dueInDays?: number;
  priority?: 'Low' | 'Normal' | 'High' | 'Urgent';
  taskType?: 'Call' | 'Email' | 'Follow Up' | 'Review' | 'Meeting' | 'Other';
}): Promise<void> {
  const dueDate = new Date();
  if (opts.dueInDays) {
    dueDate.setDate(dueDate.getDate() + opts.dueInDays);
  }

  await db.insert(tasks).values({
    contactId: opts.contactId,
    assignedTo: opts.assignedTo,
    createdBy: opts.createdBy,
    title: opts.title,
    description: opts.description,
    dueDate,
    priority: opts.priority || 'Normal',
    taskType: opts.taskType || 'Other',
  });
}

/**
 * Enroll a contact in the 6-email nurture drip sequence.
 * Looks for templates named "Drip 1" through "Drip 6".
 * Standard delay schedule: 0, 2, 5, 9, 14, 21 days.
 */
export async function enrollInDripSequence(contactId: number): Promise<void> {
  const delaySchedule = [0, 2, 5, 9, 14, 21];

  // Find all drip templates ordered by sequence position
  const dripTemplates = await db
    .select({ id: emailTemplates.id, sequencePosition: emailTemplates.sequencePosition })
    .from(emailTemplates)
    .where(like(emailTemplates.name, 'Drip %'))
    .orderBy(emailTemplates.sequencePosition);

  // Use found templates, fall back to creating queue entries for templates
  // that will exist by name convention
  for (let i = 0; i < 6; i++) {
    const template = dripTemplates[i];
    if (template) {
      await queueEmailWithDelay(contactId, template.id, delaySchedule[i]);
    } else {
      // Try to find by exact name
      const templateId = await findTemplateId(`Drip ${i + 1}%`);
      if (templateId) {
        await queueEmailWithDelay(contactId, templateId, delaySchedule[i]);
      } else {
        console.warn(
          `Drip template ${i + 1} not found; skipping for contact ${contactId}`
        );
      }
    }
  }

  console.log(`Enrolled contact ${contactId} in drip sequence`);
}

/**
 * Core automation engine. Fires automations when a contact moves between
 * pipeline stages.
 */
export async function processStageChange(
  contactId: number,
  oldStage: string | null,
  newStage: string,
  userId: number
): Promise<void> {
  // Log the stage change as an activity
  await db.insert(activities).values({
    contactId,
    userId,
    activityType: 'Stage Change',
    subject: `Stage changed from "${oldStage || 'None'}" to "${newStage}"`,
  });

  // Create the new pipeline entry
  await db.insert(pipelineEntries).values({
    contactId,
    pipelineStage: newStage as any,
    movedBy: userId,
  });

  switch (newStage) {
    case 'New Lead':
      await handleNewLead(contactId, userId);
      break;
    case 'Consultation Scheduled':
      await handleConsultationScheduled(contactId, userId);
      break;
    case 'Consultation Completed':
      await handleConsultationCompleted(contactId, userId);
      break;
    case 'Proposal Sent':
      await handleProposalSent(contactId, userId);
      break;
    case 'Application Submitted':
      await handleApplicationSubmitted(contactId, userId);
      break;
    case 'Policy Issued':
      await handlePolicyIssued(contactId, userId);
      break;
    case 'Lost / Not Now':
      await handleLostNotNow(contactId, userId);
      break;
    default:
      // Contacted, Active Client — no automations
      break;
  }
}

// ── Stage Handlers ──

async function handleNewLead(
  contactId: number,
  userId: number
): Promise<void> {
  // Cancel any existing drip emails (in case of re-entry)
  await db
    .update(emailQueue)
    .set({ status: 'Cancelled' })
    .where(
      and(eq(emailQueue.contactId, contactId), eq(emailQueue.status, 'Pending'))
    );

  // Enroll in drip sequence
  await enrollInDripSequence(contactId);

  // Create follow-up task for the agent
  await createTask({
    contactId,
    assignedTo: userId,
    createdBy: userId,
    title: 'Initial outreach to new lead',
    description: 'Make first contact with the new lead within 24 hours.',
    dueInDays: 1,
    priority: 'High',
    taskType: 'Call',
  });
}

async function handleConsultationScheduled(
  contactId: number,
  userId: number
): Promise<void> {
  // Cancel drip sequence — they are engaged
  await db
    .update(emailQueue)
    .set({ status: 'Cancelled' })
    .where(
      and(eq(emailQueue.contactId, contactId), eq(emailQueue.status, 'Pending'))
    );

  // Send confirmation email
  const templateId = await findTemplateId('Consultation Confirmation%');
  if (templateId) {
    await queueEmailWithDelay(contactId, templateId, 0);
  }

  // Create prep task
  await createTask({
    contactId,
    assignedTo: userId,
    createdBy: userId,
    title: 'Prepare for consultation',
    description:
      'Review contact profile, employment details, and ERS plan info before the consultation.',
    dueInDays: 1,
    priority: 'High',
    taskType: 'Meeting',
  });
}

async function handleConsultationCompleted(
  contactId: number,
  userId: number
): Promise<void> {
  // Create review/follow-up task
  await createTask({
    contactId,
    assignedTo: userId,
    createdBy: userId,
    title: 'Post-consultation review & proposal preparation',
    description:
      'Review consultation notes, prepare personalized recommendation and proposal for the contact.',
    dueInDays: 2,
    priority: 'High',
    taskType: 'Review',
  });

  // Send thank-you email
  const templateId = await findTemplateId('Consultation Thank You%');
  if (templateId) {
    await queueEmailWithDelay(contactId, templateId, 0);
  }
}

async function handleProposalSent(
  contactId: number,
  userId: number
): Promise<void> {
  // Queue follow-up emails at 3, 5, and 10 days
  const followUpNames = [
    'Proposal Follow Up 1%',
    'Proposal Follow Up 2%',
    'Proposal Follow Up 3%',
  ];
  const followUpDays = [3, 5, 10];

  for (let i = 0; i < followUpNames.length; i++) {
    const templateId = await findTemplateId(followUpNames[i]);
    if (templateId) {
      await queueEmailWithDelay(contactId, templateId, followUpDays[i]);
    }
  }

  // Create follow-up task
  await createTask({
    contactId,
    assignedTo: userId,
    createdBy: userId,
    title: 'Follow up on proposal',
    description: 'Check in with the contact about the proposal. Answer any questions.',
    dueInDays: 3,
    priority: 'Normal',
    taskType: 'Follow Up',
  });
}

async function handleApplicationSubmitted(
  contactId: number,
  userId: number
): Promise<void> {
  // Cancel proposal follow-up emails
  await db
    .update(emailQueue)
    .set({ status: 'Cancelled' })
    .where(
      and(eq(emailQueue.contactId, contactId), eq(emailQueue.status, 'Pending'))
    );

  // Send confirmation email
  const templateId = await findTemplateId('Application Confirmation%');
  if (templateId) {
    await queueEmailWithDelay(contactId, templateId, 0);
  }

  // Create tracking task
  await createTask({
    contactId,
    assignedTo: userId,
    createdBy: userId,
    title: 'Monitor application status',
    description: 'Track the application with the carrier and keep the client updated.',
    dueInDays: 7,
    priority: 'Normal',
    taskType: 'Follow Up',
  });
}

async function handlePolicyIssued(
  contactId: number,
  userId: number
): Promise<void> {
  // Cancel any remaining pending emails
  await db
    .update(emailQueue)
    .set({ status: 'Cancelled' })
    .where(
      and(eq(emailQueue.contactId, contactId), eq(emailQueue.status, 'Pending'))
    );

  // Send congratulations email
  const congratsId = await findTemplateId('Policy Congratulations%');
  if (congratsId) {
    await queueEmailWithDelay(contactId, congratsId, 0);
  }

  // Queue 30-day referral request
  const referralId = await findTemplateId('Referral Request%');
  if (referralId) {
    await queueEmailWithDelay(contactId, referralId, 30);
  }

  // Queue 90-day check-in
  const checkInId = await findTemplateId('90 Day Check In%');
  if (checkInId) {
    await queueEmailWithDelay(contactId, checkInId, 90);
  }

  // Queue 365-day annual review
  const annualReviewId = await findTemplateId('Annual Review%');
  if (annualReviewId) {
    await queueEmailWithDelay(contactId, annualReviewId, 365);
  }

  // Create 90-day check-in task
  await createTask({
    contactId,
    assignedTo: userId,
    createdBy: userId,
    title: '90-day policy check-in',
    description: 'Check in with the client to ensure satisfaction and answer questions.',
    dueInDays: 90,
    priority: 'Normal',
    taskType: 'Call',
  });

  // Create annual review task
  await createTask({
    contactId,
    assignedTo: userId,
    createdBy: userId,
    title: 'Annual policy review',
    description:
      'Conduct annual review of the policy and overall financial plan.',
    dueInDays: 365,
    priority: 'Normal',
    taskType: 'Review',
  });
}

async function handleLostNotNow(
  contactId: number,
  userId: number
): Promise<void> {
  // Cancel all pending emails
  await db
    .update(emailQueue)
    .set({ status: 'Cancelled' })
    .where(
      and(eq(emailQueue.contactId, contactId), eq(emailQueue.status, 'Pending'))
    );

  // Queue re-engagement emails at 90 and 180 days
  const reEngagement90 = await findTemplateId('Re-engagement 90%');
  if (reEngagement90) {
    await queueEmailWithDelay(contactId, reEngagement90, 90);
  }

  const reEngagement180 = await findTemplateId('Re-engagement 180%');
  if (reEngagement180) {
    await queueEmailWithDelay(contactId, reEngagement180, 180);
  }
}
