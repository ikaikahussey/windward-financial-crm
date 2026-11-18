import { db } from '../db';
import { contacts, pipelineEntries, activities, newsletterSubscribers } from '../db/schema';
import { eq } from 'drizzle-orm';
import { processStageChange } from './automation';
import { assignRep } from './rep-assignment';
import { sendWelcomeText } from './welcome-text';

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

const EMPLOYMENT_TYPES = ['DOE Teacher', 'DOE Staff', 'State Employee', 'City & County', 'Other'] as const;
const EMPLOYMENT_ALIASES: Record<string, (typeof EMPLOYMENT_TYPES)[number]> = {
  'doe non-teaching': 'DOE Staff',
  'county employee': 'City & County',
  'university of hawaii': 'State Employee',
};

/**
 * Public forms send free-form values. Map them onto the DB enums so an
 * unrecognized option (e.g. "Charter School") never fails the insert and
 * drops the lead. The original wording is kept in the contact notes.
 */
export function normalizeLead(data: LeadData): LeadData {
  const out: LeadData = { ...data };
  const raw = (data.employmentType as string | undefined)?.trim();
  if (raw) {
    const exact = EMPLOYMENT_TYPES.find((t) => t.toLowerCase() === raw.toLowerCase());
    out.employmentType = exact ?? EMPLOYMENT_ALIASES[raw.toLowerCase()] ?? 'Other';
    if (!exact) {
      out.notes = [data.notes, `Employment type (as entered): ${raw}`].filter(Boolean).join('\n');
    }
  } else {
    out.employmentType = undefined;
  }

  const num = (v: unknown): number | undefined => {
    if (v === undefined || v === null || v === '') return undefined;
    const n = Number(String(v).replace(/[$,\s]/g, ''));
    return Number.isFinite(n) ? n : undefined;
  };
  const years = num(data.yearsOfService);
  out.yearsOfService = years === undefined ? undefined : Math.round(years);
  out.annualSalary = num(data.annualSalary);

  const ers = ['Contributory I', 'Contributory II', 'Noncontributory', 'Hybrid', 'Unknown'];
  if (!ers.includes(data.ersPlanType as string)) out.ersPlanType = undefined;
  const life = ['None', 'Employer Only', 'Personal', 'Both'];
  if (!life.includes(data.lifeInsuranceStatus as string)) out.lifeInsuranceStatus = undefined;

  out.email = data.email.trim().toLowerCase();
  out.phone = data.phone?.trim() || undefined;
  return out;
}

export async function createOrUpdateLead(
  input: LeadData
): Promise<{ contactId: number; isNew: boolean }> {
  const data = normalizeLead(input);
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

  // Assign a rep first so the New Lead call task lands on them.
  await assignRep(newContact.id);

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

  // Instant welcome text naming the rep. Fire-and-forget: a Quo outage must
  // never delay or fail the form submission. Outcome is logged on the contact.
  if (newContact.phone) {
    void sendWelcomeText(newContact.id).catch((err) =>
      console.error(`Welcome text error for contact ${newContact.id}:`, err),
    );
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
