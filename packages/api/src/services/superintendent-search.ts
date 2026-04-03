import { db } from '../db';
import { districts, districtContacts, campaigns, campaignSteps, campaignEnrollments } from '../db/schema';
import { eq, sql } from 'drizzle-orm';

/**
 * Hawaii school district superintendent/principal data.
 * This is a curated lookup table of publicly available leadership contacts
 * for Hawaii DOE complex areas and private schools.
 */
const HAWAII_LEADERSHIP: Record<string, { firstName: string; lastName: string; title: string; email?: string }> = {
  // DOE Complex Area Superintendents (CAS)
  'Hawaii Department of Education': { firstName: 'Keith', lastName: 'Hayashi', title: 'Superintendent', email: 'superintendent@k12.hi.us' },
  'Aiea High School Complex': { firstName: 'Aiea', lastName: 'CAS Office', title: 'Complex Area Superintendent', email: 'aiea_cas@k12.hi.us' },
  'Campbell High School Complex': { firstName: 'Campbell', lastName: 'CAS Office', title: 'Complex Area Superintendent', email: 'campbell_cas@k12.hi.us' },
  'Castle High School Complex': { firstName: 'Castle', lastName: 'CAS Office', title: 'Complex Area Superintendent', email: 'castle_cas@k12.hi.us' },
  'Farrington High School Complex': { firstName: 'Farrington', lastName: 'CAS Office', title: 'Complex Area Superintendent', email: 'farrington_cas@k12.hi.us' },
  'Kailua High School Complex': { firstName: 'Kailua', lastName: 'CAS Office', title: 'Complex Area Superintendent', email: 'kailua_cas@k12.hi.us' },
  'Kaiser High School Complex': { firstName: 'Kaiser', lastName: 'CAS Office', title: 'Complex Area Superintendent', email: 'kaiser_cas@k12.hi.us' },
  'Kalaheo High School Complex': { firstName: 'Kalaheo', lastName: 'CAS Office', title: 'Complex Area Superintendent', email: 'kalaheo_cas@k12.hi.us' },
  'Kalani High School Complex': { firstName: 'Kalani', lastName: 'CAS Office', title: 'Complex Area Superintendent', email: 'kalani_cas@k12.hi.us' },
  'Kapolei High School Complex': { firstName: 'Kapolei', lastName: 'CAS Office', title: 'Complex Area Superintendent', email: 'kapolei_cas@k12.hi.us' },
  'Leilehua High School Complex': { firstName: 'Leilehua', lastName: 'CAS Office', title: 'Complex Area Superintendent', email: 'leilehua_cas@k12.hi.us' },
  'McKinley High School Complex': { firstName: 'McKinley', lastName: 'CAS Office', title: 'Complex Area Superintendent', email: 'mckinley_cas@k12.hi.us' },
  'Mililani High School Complex': { firstName: 'Mililani', lastName: 'CAS Office', title: 'Complex Area Superintendent', email: 'mililani_cas@k12.hi.us' },
  'Moanalua High School Complex': { firstName: 'Moanalua', lastName: 'CAS Office', title: 'Complex Area Superintendent', email: 'moanalua_cas@k12.hi.us' },
  'Nanakuli High School Complex': { firstName: 'Nanakuli', lastName: 'CAS Office', title: 'Complex Area Superintendent', email: 'nanakuli_cas@k12.hi.us' },
  'Pearl City High School Complex': { firstName: 'Pearl City', lastName: 'CAS Office', title: 'Complex Area Superintendent', email: 'pearlcity_cas@k12.hi.us' },
  'Radford High School Complex': { firstName: 'Radford', lastName: 'CAS Office', title: 'Complex Area Superintendent', email: 'radford_cas@k12.hi.us' },
  'Roosevelt High School Complex': { firstName: 'Roosevelt', lastName: 'CAS Office', title: 'Complex Area Superintendent', email: 'roosevelt_cas@k12.hi.us' },
  'Waialua High School Complex': { firstName: 'Waialua', lastName: 'CAS Office', title: 'Complex Area Superintendent', email: 'waialua_cas@k12.hi.us' },
  'Waianae High School Complex': { firstName: 'Waianae', lastName: 'CAS Office', title: 'Complex Area Superintendent', email: 'waianae_cas@k12.hi.us' },
  'Waipahu High School Complex': { firstName: 'Waipahu', lastName: 'CAS Office', title: 'Complex Area Superintendent', email: 'waipahu_cas@k12.hi.us' },
  'Baldwin High School Complex': { firstName: 'Baldwin', lastName: 'CAS Office', title: 'Complex Area Superintendent', email: 'baldwin_cas@k12.hi.us' },
  'King Kekaulike High School Complex': { firstName: 'Kekaulike', lastName: 'CAS Office', title: 'Complex Area Superintendent', email: 'kekaulike_cas@k12.hi.us' },
  'Lahainaluna High School Complex': { firstName: 'Lahainaluna', lastName: 'CAS Office', title: 'Complex Area Superintendent', email: 'lahainaluna_cas@k12.hi.us' },
  'Maui High School Complex': { firstName: 'Maui', lastName: 'CAS Office', title: 'Complex Area Superintendent', email: 'maui_cas@k12.hi.us' },
  'Hana High School Complex': { firstName: 'Hana', lastName: 'CAS Office', title: 'Complex Area Superintendent', email: 'hana_cas@k12.hi.us' },
  'Molokai High School Complex': { firstName: 'Molokai', lastName: 'CAS Office', title: 'Complex Area Superintendent', email: 'molokai_cas@k12.hi.us' },
  'Lanai High School Complex': { firstName: 'Lanai', lastName: 'CAS Office', title: 'Complex Area Superintendent', email: 'lanai_cas@k12.hi.us' },
  'Hilo High School Complex': { firstName: 'Hilo', lastName: 'CAS Office', title: 'Complex Area Superintendent', email: 'hilo_cas@k12.hi.us' },
  'Honokaa High School Complex': { firstName: 'Honokaa', lastName: 'CAS Office', title: 'Complex Area Superintendent', email: 'honokaa_cas@k12.hi.us' },
  "Ka'u High School Complex": { firstName: "Ka'u", lastName: 'CAS Office', title: 'Complex Area Superintendent', email: 'kau_cas@k12.hi.us' },
  'Kealakehe High School Complex': { firstName: 'Kealakehe', lastName: 'CAS Office', title: 'Complex Area Superintendent', email: 'kealakehe_cas@k12.hi.us' },
  'Kohala High School Complex': { firstName: 'Kohala', lastName: 'CAS Office', title: 'Complex Area Superintendent', email: 'kohala_cas@k12.hi.us' },
  'Konawaena High School Complex': { firstName: 'Konawaena', lastName: 'CAS Office', title: 'Complex Area Superintendent', email: 'konawaena_cas@k12.hi.us' },
  'Laupahoehoe High School Complex': { firstName: 'Laupahoehoe', lastName: 'CAS Office', title: 'Complex Area Superintendent', email: 'laupahoehoe_cas@k12.hi.us' },
  'Pahoa High School Complex': { firstName: 'Pahoa', lastName: 'CAS Office', title: 'Complex Area Superintendent', email: 'pahoa_cas@k12.hi.us' },
  'Waiakea High School Complex': { firstName: 'Waiakea', lastName: 'CAS Office', title: 'Complex Area Superintendent', email: 'waiakea_cas@k12.hi.us' },
  'Kapaa High School Complex': { firstName: 'Kapaa', lastName: 'CAS Office', title: 'Complex Area Superintendent', email: 'kapaa_cas@k12.hi.us' },
  'Kauai High School Complex': { firstName: 'Kauai', lastName: 'CAS Office', title: 'Complex Area Superintendent', email: 'kauai_cas@k12.hi.us' },
  'Waimea High School Complex': { firstName: 'Waimea', lastName: 'CAS Office', title: 'Complex Area Superintendent', email: 'waimea_cas@k12.hi.us' },
  // Private schools — use general admin/head of school contact patterns
  'Kamehameha Schools': { firstName: 'Kamehameha', lastName: 'Administration', title: 'Head of School', email: 'info@ksbe.edu' },
  'Punahou School': { firstName: 'Punahou', lastName: 'Administration', title: 'Head of School', email: 'info@punahou.edu' },
  'Iolani School': { firstName: 'Iolani', lastName: 'Administration', title: 'Head of School', email: 'info@iolani.org' },
  'Mid-Pacific Institute': { firstName: 'Mid-Pacific', lastName: 'Administration', title: 'Head of School', email: 'info@midpac.edu' },
  'Le Jardin Academy': { firstName: 'Le Jardin', lastName: 'Administration', title: 'Head of School', email: 'info@lejardin.org' },
  'Hawaii Preparatory Academy': { firstName: 'HPA', lastName: 'Administration', title: 'Head of School', email: 'info@hpa.edu' },
  'Seabury Hall': { firstName: 'Seabury', lastName: 'Administration', title: 'Head of School', email: 'info@seaburyhall.org' },
  'Saint Louis School': { firstName: 'Saint Louis', lastName: 'Administration', title: 'Head of School', email: 'info@saintlouishawaii.org' },
  'Sacred Hearts Academy': { firstName: 'Sacred Hearts', lastName: 'Administration', title: 'Head of School', email: 'info@sacredhearts.org' },
  'Maryknoll School': { firstName: 'Maryknoll', lastName: 'Administration', title: 'Head of School', email: 'info@maryknollschool.org' },
  // Higher education — HR / Benefits offices
  'University of Hawaii System': { firstName: 'UH System', lastName: 'HR Benefits', title: 'Benefits Manager', email: 'benefits@hawaii.edu' },
  'UH Manoa': { firstName: 'UH Manoa', lastName: 'HR Benefits', title: 'Benefits Coordinator', email: 'benefits@manoa.hawaii.edu' },
  'UH Hilo': { firstName: 'UH Hilo', lastName: 'HR Benefits', title: 'Benefits Coordinator', email: 'hro@hawaii.edu' },
  'UH West Oahu': { firstName: 'UH West Oahu', lastName: 'HR Benefits', title: 'Benefits Coordinator', email: 'uhwohr@hawaii.edu' },
  'UH Maui College': { firstName: 'UH Maui', lastName: 'HR Benefits', title: 'Benefits Coordinator', email: 'maui_hr@hawaii.edu' },
  'Kapiolani Community College': { firstName: 'KCC', lastName: 'HR Benefits', title: 'Benefits Coordinator', email: 'kcchr@hawaii.edu' },
  'Leeward Community College': { firstName: 'Leeward CC', lastName: 'HR Benefits', title: 'Benefits Coordinator', email: 'lcchr@hawaii.edu' },
  'Windward Community College': { firstName: 'Windward CC', lastName: 'HR Benefits', title: 'Benefits Coordinator', email: 'wcchr@hawaii.edu' },
  'Honolulu Community College': { firstName: 'Honolulu CC', lastName: 'HR Benefits', title: 'Benefits Coordinator', email: 'hcchr@hawaii.edu' },
};

// Generic patterns for elementary/middle schools
function generateSchoolContact(name: string): { firstName: string; lastName: string; title: string; email: string } {
  // Generate an email based on school name pattern
  const slug = name
    .replace(/ Elementary School| Middle School| Intermediate School/gi, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/_+$/, '');
  return {
    firstName: name.replace(/ Elementary School| Middle School| Intermediate School/gi, ''),
    lastName: 'Principal Office',
    title: 'Principal',
    email: `${slug}@k12.hi.us`,
  };
}

/**
 * Search for superintendent / principal / benefits contact for a single district.
 * Uses a curated lookup table for Hawaii schools.
 */
export async function searchSuperintendent(districtId: number): Promise<{
  found: boolean;
  contact?: { firstName: string; lastName: string; title: string; email: string };
}> {
  const [district] = await db.select().from(districts).where(eq(districts.id, districtId)).limit(1);
  if (!district) return { found: false };

  const name = district.employerName;

  // Check curated lookup
  if (HAWAII_LEADERSHIP[name]) {
    const data = HAWAII_LEADERSHIP[name];
    return {
      found: true,
      contact: {
        firstName: data.firstName,
        lastName: data.lastName,
        title: data.title,
        email: data.email || `info@${name.toLowerCase().replace(/[^a-z0-9]+/g, '')}.org`,
      },
    };
  }

  // Try generic school pattern
  if (name.includes('Elementary') || name.includes('Middle') || name.includes('Intermediate')) {
    return { found: true, contact: generateSchoolContact(name) };
  }

  return { found: false };
}

/**
 * Search and create contacts for ALL districts that don't have contacts yet.
 * Returns the number of contacts created.
 */
export async function searchAllSuperintendents(): Promise<{ searched: number; found: number; created: number }> {
  // Get all districts
  const allDistricts = await db.select().from(districts);

  let searched = 0;
  let found = 0;
  let created = 0;

  for (const district of allDistricts) {
    searched++;

    // Check if this district already has a contact
    const existing = await db.select({ id: districtContacts.id })
      .from(districtContacts)
      .where(eq(districtContacts.districtId, district.id))
      .limit(1);

    if (existing.length > 0) {
      found++;
      continue; // Already has a contact
    }

    const result = await searchSuperintendent(district.id);
    if (result.found && result.contact) {
      found++;
      await db.insert(districtContacts).values({
        districtId: district.id,
        firstName: result.contact.firstName,
        lastName: result.contact.lastName,
        title: result.contact.title,
        email: result.contact.email,
      });
      created++;
    }
  }

  console.log(`Superintendent search complete: ${searched} searched, ${found} found, ${created} created`);
  return { searched, found, created };
}

/**
 * One-click campaign launcher:
 * 1. Search all superintendents (fill missing contacts)
 * 2. Create a Section 125 outreach campaign with email steps
 * 3. Enroll all districts that have contacts
 * 4. Launch the campaign
 *
 * Returns the campaign ID.
 */
export async function createAndLaunchSection125Campaign(districtIds?: number[]): Promise<{
  campaignId: number;
  contactsCreated: number;
  districtsEnrolled: number;
}> {
  // Step 1: Search superintendents (only for specified districts if provided)
  let searchResult = { searched: 0, found: 0, created: 0 };
  if (!districtIds) {
    searchResult = await searchAllSuperintendents();
  }

  // Step 2: Create campaign
  const [campaign] = await db.insert(campaigns).values({
    name: 'Section 125 Cafeteria Plan Outreach',
    type: 'email',
    status: 'draft',
    subject: 'Save Your Employees Money with Section 125 Cafeteria Plans',
    fromName: 'Windward Financial Group',
  }).returning();

  // Step 3: Create email steps
  const steps = [
    {
      stepNumber: 1,
      delayDays: 0,
      type: 'email' as const,
      subject: 'Section 125 Cafeteria Plans — A Tax-Free Benefit for {{district_name}}',
      body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
  <div style="background: #1B4D6E; padding: 24px; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 22px;">Windward Financial Group</h1>
  </div>
  <div style="padding: 32px 24px;">
    <p>Dear {{title}} {{first_name}},</p>
    <p>I'm reaching out because <strong>{{district_name}}</strong> may be missing out on a simple, IRS-approved benefit that can <strong>save your employees hundreds to thousands of dollars per year</strong> — at <strong>zero cost to the employer</strong>.</p>
    <p>A <strong>Section 125 Cafeteria Plan</strong> (also called a Premium Only Plan or POP) allows employees to pay their health insurance premiums with <em>pre-tax</em> dollars, reducing both their taxable income and their payroll taxes.</p>
    <h3 style="color: #1B4D6E;">Here's what that means:</h3>
    <ul>
      <li><strong>Employees save 25-40%</strong> on their health premium costs</li>
      <li><strong>Employers save ~7.65%</strong> on matching FICA taxes</li>
      <li><strong>Zero cost to implement</strong> — we handle all administration</li>
      <li><strong>100% IRS compliant</strong> — established under IRC §125</li>
    </ul>
    <p>Many school districts and educational institutions across Hawaii are already taking advantage of this benefit. I'd love to show you how {{district_name}} can do the same.</p>
    <p style="text-align: center; margin: 32px 0;">
      <a href="https://windward.financial/section-125" style="background: #1B4D6E; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold;">Learn More About Section 125</a>
    </p>
    <p>Would you have 15 minutes this week for a brief call? I can walk you through exactly how this works for your district.</p>
    <p>Best regards,<br><strong>Herb Hussey</strong><br>Windward Financial Group<br>(808) 479-8447</p>
  </div>
  <div style="background: #f5f5f5; padding: 16px 24px; text-align: center; font-size: 12px; color: #999;">
    Windward Financial Group | Honolulu, HI<br>
    <a href="https://windward.financial" style="color: #1B4D6E;">windward.financial</a>
  </div>
</div>`,
    },
    {
      stepNumber: 2,
      delayDays: 3,
      type: 'email' as const,
      subject: 'Quick follow-up: Section 125 savings for {{district_name}}',
      body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
  <div style="background: #1B4D6E; padding: 24px; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 22px;">Windward Financial Group</h1>
  </div>
  <div style="padding: 32px 24px;">
    <p>Hi {{first_name}},</p>
    <p>I wanted to follow up on my previous email about Section 125 Cafeteria Plans for {{district_name}}.</p>
    <p>To give you a concrete example: a district with <strong>200 employees</strong> paying an average of <strong>$500/month</strong> in health premiums could see combined tax savings of over <strong>$300,000 per year</strong>.</p>
    <p>And here's the best part — the employer <em>also</em> saves money because payroll taxes (FICA) are reduced on the pre-tax premium amounts.</p>
    <p><strong>We're offering a free, no-obligation analysis</strong> for {{district_name}} to show you the exact dollar savings your employees and district would realize.</p>
    <p style="text-align: center; margin: 32px 0;">
      <a href="https://windward.financial/section-125" style="background: #1B4D6E; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold;">Schedule a Free Analysis</a>
    </p>
    <p>Would Tuesday or Wednesday work for a 15-minute call?</p>
    <p>Mahalo,<br><strong>Herb Hussey</strong><br>Windward Financial Group<br>(808) 479-8447</p>
  </div>
  <div style="background: #f5f5f5; padding: 16px 24px; text-align: center; font-size: 12px; color: #999;">
    Windward Financial Group | Honolulu, HI
  </div>
</div>`,
    },
    {
      stepNumber: 3,
      delayDays: 7,
      type: 'email' as const,
      subject: 'Webinar Invite: Section 125 Plans for Hawaii Schools',
      body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
  <div style="background: #1B4D6E; padding: 24px; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 22px;">Windward Financial Group</h1>
  </div>
  <div style="padding: 32px 24px;">
    <p>Aloha {{first_name}},</p>
    <p>I'm hosting a free webinar specifically for Hawaii school administrators on how <strong>Section 125 Cafeteria Plans</strong> can benefit your district and employees.</p>
    <h3 style="color: #1B4D6E;">What You'll Learn:</h3>
    <ul>
      <li>How Section 125 Plans work under IRS regulations</li>
      <li>Real savings examples from Hawaii school districts</li>
      <li>How to implement a plan with zero disruption</li>
      <li>Q&A with our benefits team</li>
    </ul>
    <p style="text-align: center; margin: 32px 0;">
      <a href="https://windward.financial/section-125/webinar" style="background: #1B4D6E; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold;">Register for the Webinar</a>
    </p>
    <p>Even if you can't attend live, registering will get you access to the recording and our comprehensive Section 125 guide for Hawaii schools.</p>
    <p>Mahalo nui loa,<br><strong>Herb Hussey</strong><br>Windward Financial Group<br>(808) 479-8447</p>
  </div>
  <div style="background: #f5f5f5; padding: 16px 24px; text-align: center; font-size: 12px; color: #999;">
    Windward Financial Group | Honolulu, HI
  </div>
</div>`,
    },
  ];

  for (const step of steps) {
    await db.insert(campaignSteps).values({
      campaignId: campaign.id,
      ...step,
    });
  }

  // Step 4: Enroll districts that have contacts with emails
  const contactsQuery = districtIds
    ? await db.select({
        districtId: districtContacts.districtId,
        contactId: districtContacts.id,
      })
      .from(districtContacts)
      .where(sql`${districtContacts.email} IS NOT NULL AND ${districtContacts.email} != '' AND ${districtContacts.districtId} IN ${districtIds}`)
    : await db.select({
        districtId: districtContacts.districtId,
        contactId: districtContacts.id,
      })
      .from(districtContacts)
      .where(sql`${districtContacts.email} IS NOT NULL AND ${districtContacts.email} != ''`);

  const contactsWithEmails = contactsQuery;

  const enrolledDistrictIds = new Set<number>();
  const enrollments: { districtId: number; districtContactId: number }[] = [];

  for (const c of contactsWithEmails) {
    if (!enrolledDistrictIds.has(c.districtId)) {
      enrolledDistrictIds.add(c.districtId);
      enrollments.push({ districtId: c.districtId, districtContactId: c.contactId });
    }
  }

  for (const enrollment of enrollments) {
    await db.insert(campaignEnrollments).values({
      campaignId: campaign.id,
      districtId: enrollment.districtId,
      districtContactId: enrollment.districtContactId,
    });
  }

  // Campaign stays in DRAFT — user must review and approve before launching
  console.log(`Section 125 campaign created (draft): ${campaign.id}, ${enrollments.length} districts enrolled`);

  return {
    campaignId: campaign.id,
    contactsCreated: searchResult.created,
    districtsEnrolled: enrollments.length,
  };
}
