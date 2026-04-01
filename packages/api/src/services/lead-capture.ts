import { db } from '../db';
import { contacts, pipelineEntries, activities, newsletterSubscribers } from '../db/schema';
import { eq } from 'drizzle-orm';
import { processStageChange } from './automation';

interface LeadData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  employmentType?: 'DOE Teacher' | 'DOE Staff' | 'State Employee' | 'City & County' | 'Other';
  employerSchool?: string;
  leadSource: 'Webinar' | 'Calculator' | 'Referral' | 'School Visit' | 'Website' | 'Social Media' | 'Enrollment' | 'Other';
  notes?: string;
  yearsOfService?: number;
  annualSalary?: number;
  ersPlanType?: 'Contributory I' | 'Contributory II' | 'Noncontributory' | 'Hybrid' | 'Unknown';
  lifeInsuranceStatus?: 'None' | 'Employer Only' | 'Personal' | 'Both';
  referralSource?: string;
  subscribeNewsletter?: boolean;
}

export async function createOrUpdateLead(
  data: LeadData
): Promise<{ contactId: number; isNew: boolean }> {
  // 1. Check if contact exists by email
  const existing = await db
    .select()
    .from(contacts)
    .where(eq(contacts.email, data.email))
    .limit(1);

  if (existing.length > 0) {
    // 2. Existing contact — update fields and log activity
    const contact = existing[0];

    await db
      .update(contacts)
      .set({
        phone: data.phone ?? contact.phone,
        employmentType: data.employmentType ?? contact.employmentType,
        employerSchool: data.employerSchool ?? contact.employerSchool,
        yearsOfService: data.yearsOfService ?? contact.yearsOfService,
        annualSalary: data.annualSalary?.toString() ?? contact.annualSalary,
        ersPlanType: data.ersPlanType ?? contact.ersPlanType,
        lifeInsuranceStatus: data.lifeInsuranceStatus ?? contact.lifeInsuranceStatus,
        referralSource: data.referralSource ?? contact.referralSource,
        notes: data.notes
          ? contact.notes
            ? `${contact.notes}\n\n---\n${data.notes}`
            : data.notes
          : contact.notes,
        updatedAt: new Date(),
      })
      .where(eq(contacts.id, contact.id));

    // Log returning-lead activity
    await db.insert(activities).values({
      contactId: contact.id,
      activityType: 'Note',
      subject: `Returning lead from ${data.leadSource}`,
      body: data.notes ?? null,
    });

    // Subscribe to newsletter if requested
    if (data.subscribeNewsletter) {
      await upsertNewsletterSubscriber(data.email, data.firstName, contact.id);
    }

    return { contactId: contact.id, isNew: false };
  }

  // 3. New contact — create contact, pipeline entry, and activity
  const [newContact] = await db
    .insert(contacts)
    .values({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      employmentType: data.employmentType,
      employerSchool: data.employerSchool,
      leadSource: data.leadSource,
      notes: data.notes,
      yearsOfService: data.yearsOfService,
      annualSalary: data.annualSalary?.toString(),
      ersPlanType: data.ersPlanType,
      lifeInsuranceStatus: data.lifeInsuranceStatus,
      referralSource: data.referralSource,
    })
    .returning();

  // Process stage change — creates pipeline entry, logs activity, and fires automations
  // (drip sequence enrollment, task creation, etc.)
  await processStageChange(newContact.id, null, 'New Lead', 1); // userId 1 = system/default agent

  // Log lead source activity
  await db.insert(activities).values({
    contactId: newContact.id,
    activityType: 'Note',
    subject: `New lead captured from ${data.leadSource}`,
    body: data.notes ?? null,
  });

  // Subscribe to newsletter if requested
  if (data.subscribeNewsletter) {
    await upsertNewsletterSubscriber(data.email, data.firstName, newContact.id);
  }

  return { contactId: newContact.id, isNew: true };
}

async function upsertNewsletterSubscriber(
  email: string,
  firstName: string,
  contactId: number
): Promise<void> {
  const existing = await db
    .select()
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.email, email))
    .limit(1);

  if (existing.length > 0) {
    // Re-subscribe if previously unsubscribed
    if (existing[0].unsubscribedAt) {
      await db
        .update(newsletterSubscribers)
        .set({ unsubscribedAt: null, contactId })
        .where(eq(newsletterSubscribers.id, existing[0].id));
    }
  } else {
    await db.insert(newsletterSubscribers).values({
      email,
      firstName,
      contactId,
      source: 'lead_capture',
    });
  }
}
