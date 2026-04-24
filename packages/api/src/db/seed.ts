import 'dotenv/config';
import bcrypt from 'bcrypt';
import { db } from './index';
import {
  users,
  contacts,
  pipelineEntries,
  policies,
  tasks,
  activities,
  emailTemplates,
  emailQueue,
  appointments,
  quoPhoneNumbers,
  callLogs,
  smsMessages,
  events,
  eventRegistrations,
  newsletterSubscribers,
} from './schema';

async function seed() {
  console.log('🌱 Seeding Windward Financial CRM...\n');

  const hash = (pw: string) => bcrypt.hashSync(pw, 10);

  // ── Clear tables in reverse dependency order ──
  console.log('Clearing existing data...');
  await db.delete(eventRegistrations);
  await db.delete(emailQueue);
  await db.delete(newsletterSubscribers);
  await db.delete(callLogs);
  await db.delete(smsMessages);
  await db.delete(quoPhoneNumbers);
  await db.delete(activities);
  await db.delete(tasks);
  await db.delete(policies);
  await db.delete(appointments);
  await db.delete(pipelineEntries);
  await db.delete(contacts);
  await db.delete(users);
  await db.delete(emailTemplates);
  await db.delete(events);
  console.log('  Done.\n');

  // ══════════════════════════════════════════════
  //  USERS
  // ══════════════════════════════════════════════
  console.log('Seeding users...');
  const [herbUser, kealakaiUser, adminUser, tiffUser, mayUser, brittanyUser, ikaikaUser] = await db
    .insert(users)
    .values([
      {
        name: 'Herb Hussey',
        email: 'herb@windwardfinancial.net',
        passwordHash: hash('windward2024'),
        role: 'admin',
        phone: '(808) 479-8447',
      },
      {
        name: "Kealaka'i Hussey",
        email: 'kealakai@windwardfinancial.net',
        passwordHash: hash('windward2024'),
        role: 'agent',
        phone: '(808) 341-7589',
      },
      {
        name: 'Admin User',
        email: 'admin@windwardfinancial.net',
        passwordHash: hash('admin123'),
        role: 'admin',
      },
      {
        name: 'Tiff',
        email: 'tiff@windwardfinancial.net',
        passwordHash: hash('windward2024'),
        role: 'admin',
      },
      {
        name: 'May',
        email: 'may@windwardfinancial.net',
        passwordHash: hash('windward2024'),
        role: 'admin',
      },
      {
        name: 'Brittany',
        email: 'brittany@windwardfinancial.net',
        passwordHash: hash('windward2024'),
        role: 'admin',
      },
      {
        name: 'Ikaika',
        email: 'ikaika@windwardfinancial.net',
        passwordHash: hash('windward2024'),
        role: 'admin',
      },
    ])
    .returning();

  console.log(`  Created ${7} users.\n`);

  // ══════════════════════════════════════════════
  //  TEAM MEMBERS
  // ══════════════════════════════════════════════
  // Note: team members and testimonials are now managed as Markdown files
  // in packages/public/src/content/ (Astro Content Collections) and are no
  // longer seeded into Postgres.

  // ══════════════════════════════════════════════
  //  CONTACTS (30)
  // ══════════════════════════════════════════════
  console.log('Seeding contacts...');

  const contactsData = [
    // ── New Lead (5) ──
    { firstName: 'Leilani', lastName: 'Kamaka', email: 'leilani.kamaka@gmail.com', phone: '(808) 555-0101', city: 'Honolulu', island: 'Oahu' as const, employmentType: 'DOE Teacher' as const, employerSchool: 'Kailua High School', yearsOfService: 5, annualSalary: '52000', ersPlanType: 'Hybrid' as const, leadSource: 'Website' as const, stage: 'New Lead' as const },
    { firstName: 'Kalani', lastName: 'Medeiros', email: 'kalani.m@yahoo.com', phone: '(808) 555-0102', city: 'Kaneohe', island: 'Oahu' as const, employmentType: 'DOE Staff' as const, employerSchool: 'Castle High School', yearsOfService: 3, annualSalary: '38000', ersPlanType: 'Hybrid' as const, leadSource: 'Webinar' as const, stage: 'New Lead' as const },
    { firstName: 'Noelani', lastName: 'Akana', email: 'noelani.akana@hotmail.com', phone: '(808) 555-0103', city: 'Kahului', island: 'Maui' as const, employmentType: 'DOE Teacher' as const, employerSchool: 'Maui High School', yearsOfService: 12, annualSalary: '62000', ersPlanType: 'Contributory II' as const, leadSource: 'School Visit' as const, stage: 'New Lead' as const },
    { firstName: 'Keanu', lastName: 'Pukahi', email: 'keanu.pukahi@gmail.com', phone: '(808) 555-0104', city: 'Hilo', island: 'Big Island' as const, employmentType: 'State Employee' as const, yearsOfService: 8, annualSalary: '55000', ersPlanType: 'Contributory II' as const, leadSource: 'Referral' as const, stage: 'New Lead' as const },
    { firstName: 'Malia', lastName: 'Ikaika', email: 'malia.ikaika@outlook.com', phone: '(808) 555-0105', city: 'Lihue', island: 'Kauai' as const, employmentType: 'DOE Teacher' as const, employerSchool: 'Kauai High School', yearsOfService: 2, annualSalary: '48000', ersPlanType: 'Hybrid' as const, leadSource: 'Social Media' as const, stage: 'New Lead' as const },

    // ── Contacted (4) ──
    { firstName: 'Kai', lastName: 'Nakamura', email: 'kai.nakamura@gmail.com', phone: '(808) 555-0201', city: 'Pearl City', island: 'Oahu' as const, employmentType: 'DOE Teacher' as const, employerSchool: 'Pearl City High School', yearsOfService: 15, annualSalary: '68000', ersPlanType: 'Contributory II' as const, leadSource: 'Referral' as const, stage: 'Contacted' as const },
    { firstName: 'Mahina', lastName: 'Wong', email: 'mahina.wong@yahoo.com', phone: '(808) 555-0202', city: 'Waipahu', island: 'Oahu' as const, employmentType: 'City & County' as const, yearsOfService: 10, annualSalary: '58000', ersPlanType: 'Contributory I' as const, leadSource: 'Calculator' as const, stage: 'Contacted' as const },
    { firstName: 'Ikaika', lastName: 'Lau', email: 'ikaika.lau@gmail.com', phone: '(808) 555-0203', city: 'Wailuku', island: 'Maui' as const, employmentType: 'DOE Staff' as const, employerSchool: 'Iao Intermediate', yearsOfService: 7, annualSalary: '42000', ersPlanType: 'Hybrid' as const, leadSource: 'Webinar' as const, stage: 'Contacted' as const },
    { firstName: 'Kailani', lastName: 'Tavares', email: 'kailani.tavares@outlook.com', phone: '(808) 555-0204', city: 'Kailua-Kona', island: 'Big Island' as const, employmentType: 'DOE Teacher' as const, employerSchool: 'Kealakehe High School', yearsOfService: 20, annualSalary: '72000', ersPlanType: 'Contributory I' as const, leadSource: 'School Visit' as const, stage: 'Contacted' as const },

    // ── Consultation Scheduled (3) ──
    { firstName: 'Kaleo', lastName: 'Fernandez', email: 'kaleo.f@gmail.com', phone: '(808) 555-0301', city: 'Mililani', island: 'Oahu' as const, employmentType: 'DOE Teacher' as const, employerSchool: 'Mililani High School', yearsOfService: 18, annualSalary: '70000', ersPlanType: 'Contributory I' as const, current403bBalance: '45000', leadSource: 'Referral' as const, stage: 'Consultation Scheduled' as const },
    { firstName: 'Pua', lastName: 'Chang', email: 'pua.chang@yahoo.com', phone: '(808) 555-0302', city: 'Ewa Beach', island: 'Oahu' as const, employmentType: 'State Employee' as const, yearsOfService: 14, annualSalary: '65000', ersPlanType: 'Contributory II' as const, current403bBalance: '32000', leadSource: 'Website' as const, stage: 'Consultation Scheduled' as const },
    { firstName: 'Nohea', lastName: 'Rodrigues', email: 'nohea.r@gmail.com', phone: '(808) 555-0303', city: 'Kapaa', island: 'Kauai' as const, employmentType: 'DOE Teacher' as const, employerSchool: 'Kapaa High School', yearsOfService: 22, annualSalary: '75000', ersPlanType: 'Contributory I' as const, current403bBalance: '85000', leadSource: 'Webinar' as const, stage: 'Consultation Scheduled' as const },

    // ── Consultation Completed (3) ──
    { firstName: 'Kekoa', lastName: 'Shimizu', email: 'kekoa.shimizu@gmail.com', phone: '(808) 555-0401', city: 'Aiea', island: 'Oahu' as const, employmentType: 'DOE Teacher' as const, employerSchool: 'Aiea High School', yearsOfService: 25, annualSalary: '78000', ersPlanType: 'Contributory I' as const, current403bBalance: '120000', lifeInsuranceStatus: 'Employer Only' as const, leadSource: 'Referral' as const, stage: 'Consultation Completed' as const },
    { firstName: 'Haunani', lastName: 'Kim', email: 'haunani.kim@yahoo.com', phone: '(808) 555-0402', city: 'Lahaina', island: 'Maui' as const, employmentType: 'DOE Teacher' as const, employerSchool: 'Lahainaluna High School', yearsOfService: 19, annualSalary: '71000', ersPlanType: 'Contributory I' as const, current403bBalance: '67000', lifeInsuranceStatus: 'Personal' as const, leadSource: 'School Visit' as const, stage: 'Consultation Completed' as const },
    { firstName: 'Makoa', lastName: 'Tanaka', email: 'makoa.tanaka@gmail.com', phone: '(808) 555-0403', city: 'Kailua', island: 'Oahu' as const, employmentType: 'State Employee' as const, yearsOfService: 16, annualSalary: '64000', ersPlanType: 'Contributory II' as const, current403bBalance: '53000', lifeInsuranceStatus: 'None' as const, leadSource: 'Calculator' as const, stage: 'Consultation Completed' as const },

    // ── Proposal Sent (3) ──
    { firstName: 'Nalani', lastName: 'Apana', email: 'nalani.apana@gmail.com', phone: '(808) 555-0501', city: 'Waianae', island: 'Oahu' as const, employmentType: 'DOE Teacher' as const, employerSchool: 'Waianae High School', yearsOfService: 21, annualSalary: '74000', ersPlanType: 'Contributory I' as const, current403bBalance: '95000', lifeInsuranceStatus: 'Employer Only' as const, leadSource: 'Referral' as const, stage: 'Proposal Sent' as const },
    { firstName: 'Kawika', lastName: 'Chung', email: 'kawika.chung@outlook.com', phone: '(808) 555-0502', city: 'Honolulu', island: 'Oahu' as const, employmentType: 'City & County' as const, yearsOfService: 12, annualSalary: '56000', ersPlanType: 'Contributory II' as const, current403bBalance: '28000', lifeInsuranceStatus: 'None' as const, leadSource: 'Website' as const, stage: 'Proposal Sent' as const },
    { firstName: 'Lani', lastName: 'Dela Cruz', email: 'lani.delacruz@gmail.com', phone: '(808) 555-0503', city: 'Kahului', island: 'Maui' as const, employmentType: 'DOE Staff' as const, employerSchool: 'Maui Waena Intermediate', yearsOfService: 9, annualSalary: '44000', ersPlanType: 'Hybrid' as const, current403bBalance: '15000', lifeInsuranceStatus: 'None' as const, leadSource: 'Enrollment' as const, stage: 'Proposal Sent' as const },

    // ── Application Submitted (2) ──
    { firstName: 'Keoni', lastName: 'Yamamoto', email: 'keoni.y@gmail.com', phone: '(808) 555-0601', city: 'Kaneohe', island: 'Oahu' as const, employmentType: 'DOE Teacher' as const, employerSchool: 'Castle High School', yearsOfService: 27, annualSalary: '82000', ersPlanType: 'Contributory I' as const, current403bBalance: '145000', lifeInsuranceStatus: 'Employer Only' as const, leadSource: 'Referral' as const, stage: 'Application Submitted' as const },
    { firstName: 'Puanani', lastName: 'Santos', email: 'puanani.santos@yahoo.com', phone: '(808) 555-0602', city: 'Waipahu', island: 'Oahu' as const, employmentType: 'DOE Teacher' as const, employerSchool: 'Waipahu High School', yearsOfService: 23, annualSalary: '76000', ersPlanType: 'Contributory I' as const, current403bBalance: '110000', lifeInsuranceStatus: 'Both' as const, leadSource: 'School Visit' as const, stage: 'Application Submitted' as const },

    // ── Policy Issued (4) ──
    { firstName: 'Alana', lastName: 'Ogata', email: 'alana.ogata@gmail.com', phone: '(808) 555-0701', city: 'Honolulu', island: 'Oahu' as const, employmentType: 'DOE Teacher' as const, employerSchool: 'McKinley High School', yearsOfService: 28, annualSalary: '84000', ersPlanType: 'Contributory I' as const, current403bBalance: '160000', lifeInsuranceStatus: 'Both' as const, leadSource: 'Referral' as const, stage: 'Policy Issued' as const },
    { firstName: 'Kimo', lastName: 'Pahia', email: 'kimo.pahia@outlook.com', phone: '(808) 555-0702', city: 'Hilo', island: 'Big Island' as const, employmentType: 'State Employee' as const, yearsOfService: 20, annualSalary: '68000', ersPlanType: 'Contributory I' as const, current403bBalance: '88000', lifeInsuranceStatus: 'Employer Only' as const, leadSource: 'Webinar' as const, stage: 'Policy Issued' as const },
    { firstName: 'Moana', lastName: 'Souza', email: 'moana.souza@gmail.com', phone: '(808) 555-0703', city: 'Kihei', island: 'Maui' as const, employmentType: 'DOE Teacher' as const, employerSchool: 'Kihei Charter School', yearsOfService: 15, annualSalary: '67000', ersPlanType: 'Contributory II' as const, current403bBalance: '72000', lifeInsuranceStatus: 'Personal' as const, leadSource: 'Referral' as const, stage: 'Policy Issued' as const },
    { firstName: 'Kahale', lastName: 'Ito', email: 'kahale.ito@yahoo.com', phone: '(808) 555-0704', city: 'Pearl City', island: 'Oahu' as const, employmentType: 'DOE Staff' as const, employerSchool: 'Highlands Intermediate', yearsOfService: 11, annualSalary: '46000', ersPlanType: 'Hybrid' as const, current403bBalance: '24000', lifeInsuranceStatus: 'None' as const, leadSource: 'Enrollment' as const, stage: 'Policy Issued' as const },

    // ── Active Client (4) ──
    { firstName: 'Mele', lastName: 'Kanahele', email: 'mele.kanahele@gmail.com', phone: '(808) 555-0801', city: 'Kailua', island: 'Oahu' as const, employmentType: 'DOE Teacher' as const, employerSchool: 'Kailua High School', yearsOfService: 30, annualSalary: '88000', ersPlanType: 'Contributory I' as const, current403bBalance: '210000', lifeInsuranceStatus: 'Both' as const, leadSource: 'Referral' as const, stage: 'Active Client' as const },
    { firstName: 'Kapono', lastName: 'Lee', email: 'kapono.lee@yahoo.com', phone: '(808) 555-0802', city: 'Honolulu', island: 'Oahu' as const, employmentType: 'State Employee' as const, yearsOfService: 26, annualSalary: '80000', ersPlanType: 'Contributory I' as const, current403bBalance: '185000', lifeInsuranceStatus: 'Both' as const, leadSource: 'Referral' as const, stage: 'Active Client' as const },
    { firstName: 'Hina', lastName: 'Watanabe', email: 'hina.watanabe@gmail.com', phone: '(808) 555-0803', city: 'Waimea', island: 'Big Island' as const, employmentType: 'DOE Teacher' as const, employerSchool: 'Waimea Canyon Middle School', yearsOfService: 24, annualSalary: '77000', ersPlanType: 'Contributory I' as const, current403bBalance: '155000', lifeInsuranceStatus: 'Personal' as const, leadSource: 'Webinar' as const, stage: 'Active Client' as const },
    { firstName: 'Lopaka', lastName: 'Reyes', email: 'lopaka.reyes@outlook.com', phone: '(808) 555-0804', city: 'Kaunakakai', island: 'Molokai' as const, employmentType: 'DOE Teacher' as const, employerSchool: 'Molokai High School', yearsOfService: 18, annualSalary: '70000', ersPlanType: 'Contributory I' as const, current403bBalance: '98000', lifeInsuranceStatus: 'Employer Only' as const, leadSource: 'School Visit' as const, stage: 'Active Client' as const },

    // ── Lost / Not Now (2) ──
    { firstName: 'Wikolia', lastName: 'Park', email: 'wikolia.park@gmail.com', phone: '(808) 555-0901', city: 'Honolulu', island: 'Oahu' as const, employmentType: 'Other' as const, yearsOfService: 4, annualSalary: '45000', ersPlanType: 'Unknown' as const, leadSource: 'Website' as const, stage: 'Lost / Not Now' as const },
    { firstName: 'Akoni', lastName: 'Silva', email: 'akoni.silva@yahoo.com', phone: '(808) 555-0902', city: 'Lihue', island: 'Kauai' as const, employmentType: 'DOE Teacher' as const, employerSchool: 'Waimea High School', yearsOfService: 6, annualSalary: '50000', ersPlanType: 'Hybrid' as const, leadSource: 'Social Media' as const, stage: 'Lost / Not Now' as const },
  ];

  const insertedContacts = await db
    .insert(contacts)
    .values(
      contactsData.map(({ stage, ...c }) => ({
        ...c,
        assignedAgentId: Math.random() > 0.5 ? herbUser.id : kealakaiUser.id,
      })),
    )
    .returning();

  console.log(`  Created ${insertedContacts.length} contacts.\n`);

  // ══════════════════════════════════════════════
  //  PIPELINE ENTRIES
  // ══════════════════════════════════════════════
  console.log('Seeding pipeline entries...');
  await db.insert(pipelineEntries).values(
    insertedContacts.map((c, i) => ({
      contactId: c.id,
      pipelineStage: contactsData[i].stage,
      movedBy: herbUser.id,
    })),
  );
  console.log(`  Created ${insertedContacts.length} pipeline entries.\n`);

  // ══════════════════════════════════════════════
  //  EMAIL TEMPLATES (6-part nurture sequence)
  // ══════════════════════════════════════════════
  console.log('Seeding email templates...');
  await db.insert(emailTemplates).values([
    {
      name: 'Welcome to Windward Financial',
      subject: 'Welcome to Windward Financial, {{first_name}}!',
      body: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Georgia, serif; color: #2d3748; line-height: 1.7; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #2b6cb0;">
    <h1 style="color: #2b6cb0; margin: 0;">Windward Financial</h1>
  </div>
  <div style="padding: 30px 0;">
    <p>Aloha {{first_name}},</p>
    <p>Welcome to the Windward Financial ohana! We are so glad you connected with us. As a family-owned retirement planning firm based in Hawaii, we specialize in helping public employees and educators like you navigate the path to a secure and fulfilling retirement.</p>
    <p>Here is what you can expect from us:</p>
    <ul>
      <li><strong>Personalized Guidance</strong> — We take the time to understand your unique situation, whether you are a first-year teacher or approaching retirement.</li>
      <li><strong>ERS & 403(b) Expertise</strong> — Our team knows the Hawaii Employees' Retirement System inside and out.</li>
      <li><strong>No Pressure, Ever</strong> — We believe in education first. Our goal is to help you make informed decisions.</li>
    </ul>
    <p>Over the coming weeks, we will share valuable information about your retirement benefits, savings strategies, and planning tips tailored specifically for Hawaii public employees.</p>
    <p>In the meantime, if you have any questions, do not hesitate to reach out.</p>
    <p>Mahalo,<br><strong>{{agent_name}}</strong><br>Windward Financial</p>
    <div style="text-align: center; padding-top: 20px;">
      <a href="{{scheduling_link}}" style="background-color: #2b6cb0; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Schedule a Free Consultation</a>
    </div>
  </div>
  <div style="border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 12px; color: #a0aec0; text-align: center;">
    <p>Windward Financial | Honolulu, HI | (808) 479-8447</p>
  </div>
</body>
</html>`,
      sequencePosition: 1,
      delayDays: 0,
    },
    {
      name: 'How Your ERS Pension Actually Works',
      subject: '{{first_name}}, do you know how your ERS pension really works?',
      body: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Georgia, serif; color: #2d3748; line-height: 1.7; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #2b6cb0;">
    <h1 style="color: #2b6cb0; margin: 0;">Windward Financial</h1>
  </div>
  <div style="padding: 30px 0;">
    <p>Aloha {{first_name}},</p>
    <p>One of the most common questions we hear is: <em>"How does my ERS pension actually work?"</em> It is a great question — and the answer might surprise you.</p>
    <h2 style="color: #2b6cb0;">The Basics of Your ERS Pension</h2>
    <p>The Hawaii Employees' Retirement System (ERS) provides a defined benefit pension to eligible public employees. Your benefit is calculated using a formula based on three factors:</p>
    <ol>
      <li><strong>Years of credited service</strong> — Every year you work counts.</li>
      <li><strong>Average final compensation (AFC)</strong> — Typically the average of your three highest-paid years.</li>
      <li><strong>Benefit multiplier</strong> — This depends on your plan type (Contributory I, Contributory II, Hybrid, or Noncontributory).</li>
    </ol>
    <h2 style="color: #2b6cb0;">Plan Types at a Glance</h2>
    <ul>
      <li><strong>Contributory Plan I</strong> (pre-7/1/2006) — 2% multiplier, employee contributes 7.8% of salary</li>
      <li><strong>Contributory Plan II</strong> (7/1/2006–6/30/2012) — 1.75% multiplier, employee contributes 8% of salary</li>
      <li><strong>Hybrid Plan</strong> (after 7/1/2012) — 1.75% multiplier with a defined contribution component</li>
    </ul>
    <p>For example, a Contributory I member with 30 years of service and an AFC of $70,000 would receive: <strong>30 x 2% x $70,000 = $42,000/year</strong> in pension benefits.</p>
    <p>Understanding your plan type is the first step to estimating your retirement income — and identifying any gaps.</p>
    <p>Want to know exactly where you stand? We can walk you through a personalized retirement analysis at no cost.</p>
    <p>Mahalo,<br><strong>{{agent_name}}</strong><br>Windward Financial</p>
    <div style="text-align: center; padding-top: 20px;">
      <a href="{{scheduling_link}}" style="background-color: #2b6cb0; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Get Your Free Analysis</a>
    </div>
  </div>
  <div style="border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 12px; color: #a0aec0; text-align: center;">
    <p>Windward Financial | Honolulu, HI | (808) 479-8447</p>
  </div>
</body>
</html>`,
      sequencePosition: 2,
      delayDays: 2,
    },
    {
      name: "The 403(b) Plan: Your Pension's Best Supplement",
      subject: '{{first_name}}, are you making the most of your 403(b)?',
      body: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Georgia, serif; color: #2d3748; line-height: 1.7; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #2b6cb0;">
    <h1 style="color: #2b6cb0; margin: 0;">Windward Financial</h1>
  </div>
  <div style="padding: 30px 0;">
    <p>Aloha {{first_name}},</p>
    <p>Your ERS pension is a valuable benefit, but for most educators it will only replace about 50-60% of your working income. That is where the <strong>403(b) plan</strong> comes in — it is one of the most powerful tools available to bridge that gap.</p>
    <h2 style="color: #2b6cb0;">What is a 403(b)?</h2>
    <p>A 403(b) is a tax-advantaged retirement savings plan available to employees of public schools and certain non-profit organizations. Think of it as the educator's version of a 401(k).</p>
    <h2 style="color: #2b6cb0;">Key Benefits</h2>
    <ul>
      <li><strong>Tax-Deferred Growth</strong> — Your contributions and earnings grow tax-deferred until withdrawal.</li>
      <li><strong>Payroll Deduction</strong> — Contributions come directly from your paycheck, making saving automatic.</li>
      <li><strong>Generous Limits</strong> — In 2024, you can contribute up to $23,000 (or $30,500 if you are 50+).</li>
      <li><strong>Catch-Up Provisions</strong> — Special 15-year catch-up rules may allow even higher contributions.</li>
    </ul>
    <h2 style="color: #2b6cb0;">403(b) Options for Hawaii Educators</h2>
    <p>Hawaii DOE employees can choose from several 403(b) product types:</p>
    <ul>
      <li><strong>Fixed Annuity (FPDA/SPDA)</strong> — Guaranteed interest rates, principal protection</li>
      <li><strong>Fixed Indexed Annuity</strong> — Upside potential linked to market indexes with downside protection</li>
      <li><strong>Variable Annuity</strong> — Direct market participation with higher risk/reward</li>
    </ul>
    <p>The right choice depends on your risk tolerance, time horizon, and overall retirement plan. We help educators evaluate these options every day.</p>
    <p>Mahalo,<br><strong>{{agent_name}}</strong><br>Windward Financial</p>
    <div style="text-align: center; padding-top: 20px;">
      <a href="{{scheduling_link}}" style="background-color: #2b6cb0; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Let Us Review Your 403(b)</a>
    </div>
  </div>
  <div style="border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 12px; color: #a0aec0; text-align: center;">
    <p>Windward Financial | Honolulu, HI | (808) 479-8447</p>
  </div>
</body>
</html>`,
      sequencePosition: 3,
      delayDays: 5,
    },
    {
      name: 'Life Insurance: More Than a Death Benefit',
      subject: '{{first_name}}, life insurance can do more than you think',
      body: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Georgia, serif; color: #2d3748; line-height: 1.7; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #2b6cb0;">
    <h1 style="color: #2b6cb0; margin: 0;">Windward Financial</h1>
  </div>
  <div style="padding: 30px 0;">
    <p>Aloha {{first_name}},</p>
    <p>When most people think of life insurance, they think of it as something for their beneficiaries. But modern life insurance products can play a much bigger role in your overall retirement strategy.</p>
    <h2 style="color: #2b6cb0;">Your Employer Coverage May Not Be Enough</h2>
    <p>As a public employee, you likely have some life insurance through your employer — typically 1x your annual salary through the EUTF. But is that really enough to protect your family if something happened to you? Financial experts generally recommend 10-15x your income in coverage.</p>
    <h2 style="color: #2b6cb0;">Accelerated Benefit Riders (ABR)</h2>
    <p>One of the most valuable features of modern life insurance policies is the <strong>Accelerated Benefit Rider</strong>. An ABR allows you to access a portion of your death benefit while you are still alive if you experience:</p>
    <ul>
      <li><strong>Chronic illness</strong> — requiring assistance with daily living activities</li>
      <li><strong>Critical illness</strong> — such as heart attack, stroke, or cancer</li>
      <li><strong>Terminal illness</strong> — a diagnosis with limited life expectancy</li>
    </ul>
    <p>This means your life insurance can double as a safety net for long-term care expenses — which Medicare does not cover and which can cost $8,000-$12,000 per month in Hawaii.</p>
    <h2 style="color: #2b6cb0;">Types of Coverage to Consider</h2>
    <ul>
      <li><strong>Term Life</strong> — Affordable coverage for a set period (10, 20, or 30 years)</li>
      <li><strong>Guaranteed Universal Life (GUL)</strong> — Permanent coverage with fixed premiums</li>
      <li><strong>Indexed Universal Life (IUL)</strong> — Permanent coverage with cash value growth potential</li>
    </ul>
    <p>We can help you determine the right type and amount of coverage based on your family situation and retirement goals.</p>
    <p>Mahalo,<br><strong>{{agent_name}}</strong><br>Windward Financial</p>
    <div style="text-align: center; padding-top: 20px;">
      <a href="{{scheduling_link}}" style="background-color: #2b6cb0; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Explore Your Options</a>
    </div>
  </div>
  <div style="border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 12px; color: #a0aec0; text-align: center;">
    <p>Windward Financial | Honolulu, HI | (808) 479-8447</p>
  </div>
</body>
</html>`,
      sequencePosition: 4,
      delayDays: 9,
    },
    {
      name: 'Health Insurance in Retirement',
      subject: '{{first_name}}, what happens to your health insurance when you retire?',
      body: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Georgia, serif; color: #2d3748; line-height: 1.7; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #2b6cb0;">
    <h1 style="color: #2b6cb0; margin: 0;">Windward Financial</h1>
  </div>
  <div style="padding: 30px 0;">
    <p>Aloha {{first_name}},</p>
    <p>One of the biggest concerns for retiring educators is health insurance. The good news is that as a Hawaii public employee, you have access to retiree health benefits through the <strong>EUTF (Hawaii Employer-Union Health Benefits Trust Fund)</strong> — but the details matter.</p>
    <h2 style="color: #2b6cb0;">EUTF Retiree Health Benefits</h2>
    <p>If you have 10 or more years of service, you are eligible for a state contribution toward your health insurance premiums in retirement. The contribution amount depends on your years of service:</p>
    <ul>
      <li><strong>10-14 years:</strong> 50% of the premium</li>
      <li><strong>15-24 years:</strong> 75% of the premium</li>
      <li><strong>25+ years:</strong> 100% of the premium</li>
    </ul>
    <h2 style="color: #2b6cb0;">The Medicare Transition</h2>
    <p>When you turn 65, Medicare becomes your primary insurance. At that point, your EUTF plan transitions to a supplemental role. It is important to:</p>
    <ul>
      <li>Enroll in Medicare Parts A and B when you become eligible</li>
      <li>Understand how your EUTF plan coordinates with Medicare</li>
      <li>Know what costs are covered by each plan</li>
    </ul>
    <h2 style="color: #2b6cb0;">Gaps to Watch For</h2>
    <p>Even with EUTF and Medicare, there are potential gaps:</p>
    <ul>
      <li><strong>Long-term care</strong> — Neither Medicare nor EUTF covers extended long-term care</li>
      <li><strong>Dental and vision</strong> — Coverage may change in retirement</li>
      <li><strong>Pre-65 retirees</strong> — If you retire before 65, you will need to bridge the gap until Medicare eligibility</li>
    </ul>
    <p>Planning ahead for these gaps is essential. Let us help you build a comprehensive plan that accounts for all your healthcare needs in retirement.</p>
    <p>Mahalo,<br><strong>{{agent_name}}</strong><br>Windward Financial</p>
    <div style="text-align: center; padding-top: 20px;">
      <a href="{{scheduling_link}}" style="background-color: #2b6cb0; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Plan for Healthcare in Retirement</a>
    </div>
  </div>
  <div style="border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 12px; color: #a0aec0; text-align: center;">
    <p>Windward Financial | Honolulu, HI | (808) 479-8447</p>
  </div>
</body>
</html>`,
      sequencePosition: 5,
      delayDays: 14,
    },
    {
      name: 'Your Retirement Readiness Checklist',
      subject: '{{first_name}}, are you retirement-ready? Here is your checklist',
      body: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Georgia, serif; color: #2d3748; line-height: 1.7; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #2b6cb0;">
    <h1 style="color: #2b6cb0; margin: 0;">Windward Financial</h1>
  </div>
  <div style="padding: 30px 0;">
    <p>Aloha {{first_name}},</p>
    <p>Over the past few weeks, we have covered a lot of ground — your ERS pension, 403(b) savings, life insurance, and health benefits. Now it is time to bring it all together with your <strong>Retirement Readiness Checklist</strong>.</p>
    <h2 style="color: #2b6cb0;">Your Retirement Readiness Checklist</h2>
    <table style="width: 100%; border-collapse: collapse;">
      <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">&#9744;</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">Know your ERS plan type and estimated pension benefit</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">&#9744;</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">Review your 403(b) contributions and investment allocation</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">&#9744;</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">Calculate your retirement income gap (pension vs. expenses)</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">&#9744;</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">Evaluate your life insurance coverage and beneficiary designations</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">&#9744;</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">Understand your EUTF retiree health insurance eligibility</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">&#9744;</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">Plan for Medicare enrollment (if within 5 years of 65)</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">&#9744;</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">Consider long-term care planning</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">&#9744;</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">Review your estate plan (will, trust, power of attorney)</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">&#9744;</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">Set a target retirement date and income goal</td></tr>
      <tr><td style="padding: 8px;">&#9744;</td><td style="padding: 8px;">Schedule a comprehensive retirement review</td></tr>
    </table>
    <h2 style="color: #2b6cb0;">Let Us Help You Check Every Box</h2>
    <p>If you have unchecked items on this list, you are not alone — and that is exactly why we are here. A one-on-one consultation with our team can help you address every item and build a clear roadmap to retirement.</p>
    <p>Our consultations are free, no-obligation, and typically take about 45 minutes. We will review your current benefits, identify any gaps, and provide personalized recommendations.</p>
    <p>Ready to take the next step?</p>
    <div style="text-align: center; padding: 20px 0;">
      <a href="{{scheduling_link}}" style="background-color: #2b6cb0; color: white; padding: 14px 35px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Schedule Your Free Consultation</a>
    </div>
    <p>We look forward to helping you plan the retirement you deserve.</p>
    <p>Mahalo,<br><strong>{{agent_name}}</strong><br>Windward Financial</p>
  </div>
  <div style="border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 12px; color: #a0aec0; text-align: center;">
    <p>Windward Financial | Honolulu, HI | (808) 479-8447</p>
  </div>
</body>
</html>`,
      sequencePosition: 6,
      delayDays: 21,
    },
  ]);
  console.log('  Created 6 email templates.\n');

  // ══════════════════════════════════════════════
  //  POLICIES (8)
  // ══════════════════════════════════════════════
  console.log('Seeding policies...');

  // Policy Issued contacts: indices 22-25 (Alana Ogata, Kimo Pahia, Moana Souza, Kahale Ito)
  // Active Client contacts: indices 26-29 (Mele Kanahele, Kapono Lee, Hina Watanabe, Lopaka Reyes)
  const policyContacts = [
    insertedContacts[22], // Alana Ogata
    insertedContacts[23], // Kimo Pahia
    insertedContacts[24], // Moana Souza
    insertedContacts[25], // Kahale Ito
    insertedContacts[26], // Mele Kanahele
    insertedContacts[27], // Kapono Lee
    insertedContacts[28], // Hina Watanabe
    insertedContacts[29], // Lopaka Reyes
  ];

  await db.insert(policies).values([
    {
      contactId: policyContacts[0].id,
      productType: 'Guaranteed Universal Life',
      carrier: 'National Life Group',
      policyNumber: 'NLG-2024-00147',
      annualPremium: '2400',
      status: 'Issued',
      issueDate: new Date('2024-11-15'),
      notes: '$250,000 GUL with chronic illness ABR',
    },
    {
      contactId: policyContacts[1].id,
      productType: '403b SPDA',
      carrier: 'National Life Group',
      policyNumber: 'NLG-403B-00892',
      annualPremium: '6000',
      status: 'Issued',
      issueDate: new Date('2024-10-01'),
      notes: 'Single Premium Deferred Annuity, 4.15% guaranteed rate',
    },
    {
      contactId: policyContacts[2].id,
      productType: 'Term Life',
      carrier: 'Pacific Guardian Life',
      policyNumber: 'PGL-2024-55231',
      annualPremium: '780',
      status: 'Issued',
      issueDate: new Date('2024-12-01'),
      notes: '20-year term, $500,000 face amount',
    },
    {
      contactId: policyContacts[3].id,
      productType: '403b FPDA',
      carrier: 'National Life Group',
      policyNumber: 'NLG-403B-01204',
      annualPremium: '3600',
      status: 'Issued',
      issueDate: new Date('2025-01-15'),
      notes: 'Flexible Premium Deferred Annuity, payroll deduction $300/mo',
    },
    {
      contactId: policyContacts[4].id,
      productType: 'Indexed Universal Life',
      carrier: 'National Life Group',
      policyNumber: 'NLG-IUL-00433',
      annualPremium: '4800',
      status: 'Active',
      issueDate: new Date('2023-06-01'),
      notes: '$350,000 IUL with living benefits, S&P 500 index allocation',
    },
    {
      contactId: policyContacts[5].id,
      productType: 'Fixed Indexed Annuity',
      carrier: 'National Life Group',
      policyNumber: 'NLG-FIA-00219',
      annualPremium: '12000',
      status: 'Active',
      issueDate: new Date('2022-09-15'),
      notes: '$120,000 rollover from previous 403(b), 10-year surrender period',
    },
    {
      contactId: policyContacts[6].id,
      productType: 'Guaranteed Universal Life',
      carrier: 'Pacific Guardian Life',
      policyNumber: 'PGL-GUL-78442',
      annualPremium: '1920',
      status: 'Active',
      issueDate: new Date('2021-03-01'),
      notes: '$200,000 GUL, guaranteed to age 100',
    },
    {
      contactId: policyContacts[7].id,
      productType: '403b FPDA',
      carrier: 'National Life Group',
      policyNumber: 'NLG-403B-00667',
      annualPremium: '4200',
      status: 'Active',
      issueDate: new Date('2023-01-15'),
      notes: 'Flexible Premium Deferred Annuity, $350/mo payroll deduction',
    },
  ]);
  console.log('  Created 8 policies.\n');

  // ══════════════════════════════════════════════
  //  TASKS (10)
  // ══════════════════════════════════════════════
  console.log('Seeding tasks...');

  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000);
  const daysFromNow = (d: number) => new Date(now.getTime() + d * 86400000);

  await db.insert(tasks).values([
    {
      contactId: insertedContacts[0].id,
      assignedTo: kealakaiUser.id,
      createdBy: herbUser.id,
      title: 'Call new lead Leilani Kamaka',
      description: 'New lead from website. Follow up to schedule initial consultation.',
      dueDate: daysAgo(1),
      priority: 'High',
      taskType: 'Call',
    },
    {
      contactId: insertedContacts[5].id,
      assignedTo: herbUser.id,
      createdBy: herbUser.id,
      title: 'Send ERS overview to Kai Nakamura',
      description: 'Kai requested information about Contributory II benefits. Send overview packet.',
      dueDate: daysAgo(3),
      priority: 'Normal',
      taskType: 'Email',
    },
    {
      contactId: insertedContacts[10].id,
      assignedTo: herbUser.id,
      createdBy: herbUser.id,
      title: 'Prepare consultation materials for Kaleo Fernandez',
      description: 'Consultation scheduled for next week. Prepare ERS estimate and 403(b) analysis.',
      dueDate: daysFromNow(2),
      priority: 'High',
      taskType: 'Review',
    },
    {
      contactId: insertedContacts[15].id,
      assignedTo: kealakaiUser.id,
      createdBy: herbUser.id,
      title: 'Follow up on proposal — Nalani Apana',
      description: 'Proposal sent last week for GUL policy. Follow up to answer questions.',
      dueDate: now,
      priority: 'High',
      taskType: 'Follow Up',
    },
    {
      contactId: insertedContacts[18].id,
      assignedTo: herbUser.id,
      createdBy: herbUser.id,
      title: 'Check underwriting status for Keoni Yamamoto',
      description: 'Application submitted 2 weeks ago. Check with National Life on underwriting status.',
      dueDate: daysFromNow(1),
      priority: 'Normal',
      taskType: 'Follow Up',
    },
    {
      contactId: insertedContacts[26].id,
      assignedTo: herbUser.id,
      createdBy: herbUser.id,
      title: 'Annual review — Mele Kanahele',
      description: 'Schedule annual policy and retirement plan review. Last review was 11 months ago.',
      dueDate: daysFromNow(14),
      priority: 'Normal',
      taskType: 'Meeting',
    },
    {
      assignedTo: kealakaiUser.id,
      createdBy: kealakaiUser.id,
      title: 'Prepare webinar slides for DOE presentation',
      description: 'Update retirement planning 101 slides for upcoming school visit at Mililani High.',
      dueDate: daysFromNow(7),
      priority: 'Normal',
      taskType: 'Other',
    },
    {
      contactId: insertedContacts[2].id,
      assignedTo: kealakaiUser.id,
      createdBy: kealakaiUser.id,
      title: 'Call Noelani Akana — school visit follow-up',
      description: 'Met at Maui High school visit. Expressed interest in 403(b) enrollment.',
      dueDate: daysAgo(2),
      priority: 'Normal',
      taskType: 'Call',
    },
    {
      contactId: insertedContacts[13].id,
      assignedTo: herbUser.id,
      createdBy: herbUser.id,
      title: 'Send Haunani Kim consultation summary',
      description: 'Consultation completed. Send summary with recommended coverage options.',
      dueDate: now,
      priority: 'Urgent',
      taskType: 'Email',
    },
    {
      assignedTo: herbUser.id,
      createdBy: herbUser.id,
      title: 'Review quarterly commission statements',
      description: 'National Life Group Q1 statements received. Review and reconcile.',
      dueDate: daysFromNow(5),
      priority: 'Low',
      taskType: 'Review',
    },
  ]);
  console.log('  Created 10 tasks.\n');

  // ══════════════════════════════════════════════
  //  ACTIVITIES (15)
  // ══════════════════════════════════════════════
  console.log('Seeding activities...');
  await db.insert(activities).values([
    {
      contactId: insertedContacts[0].id,
      userId: kealakaiUser.id,
      activityType: 'Note',
      subject: 'New lead from website',
      body: 'Leilani submitted interest form on website. Teaching at Kailua High, 5 years in. Interested in learning about 403(b) options.',
      createdAt: daysAgo(2),
    },
    {
      contactId: insertedContacts[5].id,
      userId: herbUser.id,
      activityType: 'Call',
      subject: 'Initial outreach call',
      body: 'Spoke with Kai for 15 minutes. He is a 15-year teacher at Pearl City High, Contributory II plan. Currently has no 403(b). Very interested in learning more. Scheduled follow-up email.',
      createdAt: daysAgo(5),
    },
    {
      contactId: insertedContacts[5].id,
      userId: herbUser.id,
      activityType: 'Email Sent',
      subject: 'Sent ERS overview materials',
      body: 'Emailed Kai the ERS Contributory II fact sheet and 403(b) comparison guide.',
      createdAt: daysAgo(4),
    },
    {
      contactId: insertedContacts[10].id,
      userId: herbUser.id,
      activityType: 'Stage Change',
      subject: 'Moved to Consultation Scheduled',
      body: 'Kaleo confirmed consultation for next Thursday at 4pm via Zoom.',
      createdAt: daysAgo(3),
    },
    {
      contactId: insertedContacts[13].id,
      userId: herbUser.id,
      activityType: 'Meeting',
      subject: 'Consultation completed',
      body: 'Met with Haunani for 1 hour via Zoom. Reviewed her ERS pension estimate ($3,200/mo at 55 with 19 years). Discussed 403(b) contribution increase and GUL with ABR. She is very interested in the living benefits rider. Will prepare proposal.',
      createdAt: daysAgo(1),
    },
    {
      contactId: insertedContacts[13].id,
      userId: herbUser.id,
      activityType: 'Stage Change',
      subject: 'Moved to Consultation Completed',
      body: 'Consultation completed. Moving to proposal preparation.',
      createdAt: daysAgo(1),
    },
    {
      contactId: insertedContacts[15].id,
      userId: kealakaiUser.id,
      activityType: 'Email Sent',
      subject: 'Proposal sent — GUL with ABR',
      body: 'Sent Nalani a proposal for $300,000 GUL with chronic/critical/terminal illness ABR. Annual premium $2,100. Also included 403(b) FPDA recommendation.',
      createdAt: daysAgo(7),
    },
    {
      contactId: insertedContacts[15].id,
      userId: kealakaiUser.id,
      activityType: 'Stage Change',
      subject: 'Moved to Proposal Sent',
      body: 'Proposal delivered via email. Follow-up scheduled for next week.',
      createdAt: daysAgo(7),
    },
    {
      contactId: insertedContacts[18].id,
      userId: herbUser.id,
      activityType: 'Note',
      subject: 'Application submitted to NLG',
      body: 'Keoni signed application for $400,000 IUL with living benefits. Application sent to National Life Group for underwriting. Standard health class expected.',
      createdAt: daysAgo(14),
    },
    {
      contactId: insertedContacts[22].id,
      userId: herbUser.id,
      activityType: 'Policy Added',
      subject: 'GUL policy issued',
      body: 'National Life Group issued policy NLG-2024-00147. $250,000 GUL with chronic illness ABR. Alana notified and delivery appointment scheduled.',
      createdAt: daysAgo(30),
    },
    {
      contactId: insertedContacts[26].id,
      userId: herbUser.id,
      activityType: 'Call',
      subject: 'Quarterly check-in call',
      body: 'Spoke with Mele for 20 minutes. She is happy with her IUL policy performance. Discussed increasing 403(b) contribution by $100/mo. Will send updated payroll deduction form.',
      createdAt: daysAgo(45),
    },
    {
      contactId: insertedContacts[27].id,
      userId: herbUser.id,
      activityType: 'Meeting',
      subject: 'Annual review completed',
      body: 'Completed annual review with Kapono. FIA performing well — current account value $138,000. Discussed retirement timeline (targeting age 60, 4 years out). Reviewed health insurance transition plan.',
      createdAt: daysAgo(60),
    },
    {
      contactId: insertedContacts[28].id,
      userId: kealakaiUser.id,
      activityType: 'Email Sent',
      subject: 'Sent updated beneficiary form',
      body: 'Hina requested beneficiary update after recent marriage. Sent Pacific Guardian Life change of beneficiary form.',
      createdAt: daysAgo(10),
    },
    {
      contactId: insertedContacts[3].id,
      userId: kealakaiUser.id,
      activityType: 'Call',
      subject: 'Attempted contact — voicemail',
      body: 'Called Keanu regarding his inquiry. Left voicemail with callback number. Will try again tomorrow.',
      createdAt: daysAgo(1),
    },
    {
      contactId: insertedContacts[29].id,
      userId: herbUser.id,
      activityType: 'Note',
      subject: 'School visit follow-up',
      body: 'Lopaka attended the Molokai High presentation. Very engaged, asked multiple questions about 403(b) catch-up contributions. Already a client with FPDA — may want to increase contributions.',
      createdAt: daysAgo(20),
    },
  ]);
  console.log('  Created 15 activities.\n');

  // ══════════════════════════════════════════════
  //  EVENTS (2)
  // ══════════════════════════════════════════════
  console.log('Seeding events...');
  await db.insert(events).values([
    {
      title: 'Retirement Planning 101 for DOE Employees',
      description: 'Join Windward Financial for a free, no-obligation webinar designed specifically for Hawaii Department of Education employees. We will cover the basics of your ERS pension, 403(b) savings options, life insurance considerations, and health insurance in retirement. Whether you are just starting your career or counting down the years to retirement, this session will provide valuable insights to help you plan with confidence. There will be a live Q&A session at the end where you can ask our advisors your specific questions.',
      eventDate: daysFromNow(30),
      endDate: daysFromNow(30),
      location: 'Zoom Webinar',
      zoomLink: 'https://zoom.us/j/1234567890',
      registrationRequired: true,
      maxAttendees: 100,
      isPublished: true,
    },
    {
      title: 'Understanding Your ERS Pension',
      description: 'This in-depth webinar will take a deep dive into the Hawaii Employees\' Retirement System. We will explain the differences between Contributory I, Contributory II, Hybrid, and Noncontributory plans, show you how to calculate your estimated pension benefit, and discuss strategies to maximize your retirement income. You will learn about the Average Final Compensation calculation, the benefit multipliers for each plan type, and important considerations for timing your retirement. Bring your most recent ERS annual statement for the most personalized experience.',
      eventDate: daysFromNow(60),
      endDate: daysFromNow(60),
      location: 'Zoom Webinar',
      zoomLink: 'https://zoom.us/j/0987654321',
      registrationRequired: true,
      maxAttendees: 100,
      isPublished: true,
    },
  ]);
  console.log('  Created 2 events.\n');

  // ══════════════════════════════════════════════
  //  DONE
  // ══════════════════════════════════════════════
  console.log('✅ Seed complete!');
  console.log('   Users:          7');
  console.log('   Contacts:       30');
  console.log('   Pipeline:       30');
  console.log('   Email Templates: 6');
  console.log('   Policies:       8');
  console.log('   Tasks:          10');
  console.log('   Activities:     15');
  console.log('   Events:         2');
  console.log('');

  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
