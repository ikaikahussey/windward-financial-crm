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
  sitePages,
  testimonials,
  teamMembers,
  events,
  eventRegistrations,
  blogPosts,
  newsletterSubscribers,
} from './schema';
import type { ContentBlock } from './schema';

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
  await db.delete(blogPosts);
  await db.delete(contacts);
  await db.delete(users);
  await db.delete(emailTemplates);
  await db.delete(testimonials);
  await db.delete(teamMembers);
  await db.delete(events);
  await db.delete(sitePages);
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
  console.log('Seeding team members...');
  await db.insert(teamMembers).values([
    {
      name: 'Herb Hussey',
      role: 'Founder & Financial Advisor',
      email: 'herb@windwardfinancial.net',
      phone: '(808) 479-8447',
      bio: 'With over 30 years of experience in financial planning and retirement services, Herb Hussey founded Windward Financial to serve the unique needs of Hawaii\'s public employees. A trusted advisor to hundreds of DOE teachers, state workers, and their families, Herb is known for his deep understanding of the Employees\' Retirement System (ERS), 403(b) plans, and life insurance strategies tailored for educators. His hands-on approach and genuine care for each client have made Windward Financial a cornerstone of retirement planning across the Hawaiian islands.',
      sortOrder: 1,
      isPublished: true,
    },
    {
      name: "Kealaka'i Hussey",
      role: 'Financial Advisor & Agent',
      email: 'kealakai@windwardfinancial.net',
      phone: '(808) 341-7589',
      bio: "Representing the next generation of Windward Financial, Kealaka'i Hussey brings a fresh perspective to retirement planning while upholding the family tradition of personalized service. With a deep understanding of the challenges facing today's educators and public servants, Kealaka'i specializes in helping younger professionals start planning early for a secure retirement. His approachable style and modern strategies make complex financial topics accessible and actionable for clients at every stage of their careers.",
      sortOrder: 2,
      isPublished: true,
    },
    {
      name: 'Brittany Davis',
      role: 'Client Service Representative',
      bio: 'Brittany ensures every client interaction is smooth and professional. She manages scheduling, follow-ups, and account maintenance so our advisors can focus on providing the best financial guidance. Her attention to detail and warm personality make her an invaluable part of the Windward Financial team.',
      sortOrder: 3,
      isPublished: true,
    },
    {
      name: 'Tiffany Byrne',
      role: 'Client Service Representative',
      bio: 'Tiffany brings organizational excellence to the team, coordinating client communications and ensuring paperwork moves seamlessly through every stage of the process. Her dedication to client satisfaction is evident in every interaction.',
      sortOrder: 4,
      isPublished: true,
    },
    {
      name: 'May Apple Ang',
      role: 'Client Service Representative',
      bio: 'May Apple supports our clients with enthusiasm and care, handling inquiries, appointment scheduling, and documentation. Her multilingual abilities and cultural sensitivity help Windward Financial serve Hawaii\'s diverse communities with excellence.',
      sortOrder: 5,
      isPublished: true,
    },
  ]);
  console.log('  Created 5 team members.\n');

  // ══════════════════════════════════════════════
  //  TESTIMONIALS
  // ══════════════════════════════════════════════
  console.log('Seeding testimonials...');
  await db.insert(testimonials).values([
    {
      clientName: 'Toyoko Barcase',
      clientTitle: 'Beneficiary of DOE retiree',
      body: 'Herb Hussey has been our financial advisor for the past 15 years and has always been available for questions and concerns. His knowledge and professionalism have given us peace of mind knowing our retirement is in good hands.',
      isFeatured: true,
      sortOrder: 1,
      isPublished: true,
    },
    {
      clientName: 'Doug and Linda Holt',
      clientTitle: 'Long time Maui DOE teachers, served for 30+ years',
      body: 'Taking the leap of faith with Windward Financial was one of the best decisions we made for our retirement. Herb took the time to understand our unique situation as educators and crafted a plan that truly works for us.',
      isFeatured: true,
      sortOrder: 2,
      isPublished: true,
    },
    {
      clientName: 'Angie Hashimoto',
      clientTitle: 'Educational Assistant — King Intermediate School, serving for 20+ years',
      body: "Retirement planning is more than just filling out a form. Herb and his team helped me understand my options and made the entire process stress-free. I feel confident about my future thanks to Windward Financial.",
      isFeatured: true,
      sortOrder: 3,
      isPublished: true,
    },
  ]);
  console.log('  Created 3 testimonials.\n');

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
  //  BLOG POSTS (3)
  // ══════════════════════════════════════════════
  console.log('Seeding blog posts...');
  await db.insert(blogPosts).values([
    {
      slug: 'hawaii-teacher-retirement-checklist',
      title: 'Hawaii Teacher Retirement Checklist',
      excerpt: 'A comprehensive checklist to help Hawaii DOE teachers prepare for a confident and secure retirement.',
      body: `<h2>Your Complete Hawaii Teacher Retirement Checklist</h2>

<p>Retiring from the Hawaii Department of Education is a significant milestone. After years of dedicated service to the keiki of Hawaii, you deserve a retirement that is financially secure and personally fulfilling. But getting there requires careful planning. This comprehensive checklist will help you make sure you have covered all the bases.</p>

<h3>5+ Years Before Retirement</h3>

<p>The earlier you start planning, the more options you have. Five or more years before your target retirement date, you should be focusing on building your financial foundation.</p>

<p><strong>Understand your ERS plan type.</strong> Whether you are in Contributory I, Contributory II, or the Hybrid plan makes a significant difference in your pension calculation. Request your most recent annual statement from the ERS and review it carefully. If you do not know your plan type, call the ERS office at (808) 586-1735.</p>

<p><strong>Estimate your pension benefit.</strong> Use the ERS pension calculator or work with a financial advisor to estimate your monthly pension based on your years of service and projected Average Final Compensation (AFC). Remember, your AFC is typically the average of your three highest-paid years.</p>

<p><strong>Maximize your 403(b) contributions.</strong> If you are not already contributing to a 403(b), now is the time to start. If you are contributing, consider increasing your contributions. In 2024, the maximum contribution is $23,000, with an additional $7,500 catch-up contribution for those 50 and older. Some long-tenured employees may also qualify for the special 15-year catch-up provision.</p>

<p><strong>Review your life insurance coverage.</strong> Assess whether your current coverage is adequate. Your EUTF employer-provided life insurance (typically 1x salary) may not be enough. Consider personal coverage, especially policies with Accelerated Benefit Riders that can provide living benefits for chronic, critical, or terminal illness.</p>

<h3>2-3 Years Before Retirement</h3>

<p>As retirement approaches, it is time to get specific about your plans and start making concrete preparations.</p>

<p><strong>Calculate your retirement income gap.</strong> Compare your estimated pension and 403(b) income to your projected expenses in retirement. Do not forget to account for inflation, healthcare costs, and any planned lifestyle changes. Many retirees find they need 70-80% of their pre-retirement income.</p>

<p><strong>Review your EUTF health insurance eligibility.</strong> Confirm your years of service and the employer contribution percentage you will receive for retiree health insurance. With 25+ years, you receive 100% of the employer contribution. Understand how your coverage will change in retirement.</p>

<p><strong>Plan for the Medicare transition.</strong> If you are approaching 65, learn how Medicare coordinates with your EUTF retiree health plan. You must enroll in Medicare Parts A and B when eligible, or you may face penalties and coverage gaps.</p>

<p><strong>Update your estate plan.</strong> Review your will, trust, power of attorney, and healthcare directive. Update beneficiary designations on all retirement accounts, life insurance policies, and other financial accounts. Major life events (marriage, divorce, births, deaths) often require updates.</p>

<h3>1 Year Before Retirement</h3>

<p><strong>Attend an ERS pre-retirement seminar.</strong> The ERS offers free seminars for employees within a few years of retirement. These sessions cover pension calculations, application procedures, and important deadlines.</p>

<p><strong>Submit your retirement application.</strong> The ERS recommends submitting your application at least 90 days before your planned retirement date. You can choose from several benefit options that affect your monthly payment and survivor benefits.</p>

<p><strong>Coordinate with your school administration.</strong> Give your principal adequate notice and work with HR to ensure a smooth transition. Confirm your last day of service and any accrued leave payouts.</p>

<p><strong>Finalize your 403(b) distribution strategy.</strong> Decide how you will access your 403(b) savings. Options include systematic withdrawals, annuitization, or a combination. Consider the tax implications of each approach.</p>

<h3>At Retirement</h3>

<p><strong>Verify your first pension payment.</strong> Your first ERS pension payment typically arrives within 45-60 days of your retirement date. Verify the amount matches your estimate and set up direct deposit if you have not already.</p>

<p><strong>Transition your health insurance.</strong> Complete the EUTF retiree health insurance enrollment process. Your coverage should transition seamlessly, but confirm everything is in order.</p>

<p><strong>Celebrate your achievement.</strong> You have dedicated your career to educating Hawaii's children. Take time to celebrate this incredible accomplishment and enjoy the retirement you have earned.</p>

<h3>Need Help With Your Checklist?</h3>

<p>If you have unchecked items or questions about any of these steps, Windward Financial is here to help. Our team specializes in retirement planning for Hawaii educators, and we offer free, no-obligation consultations. Contact us today to schedule your personalized retirement review.</p>`,
      authorId: herbUser.id,
      tags: ['retirement', 'teachers', 'checklist'],
      isPublished: true,
      publishedAt: daysAgo(14),
      metaDescription: 'Complete retirement planning checklist for Hawaii DOE teachers — covering ERS pension, 403(b), health insurance, and more.',
    },
    {
      slug: 'how-the-ers-pension-system-works',
      title: 'How the ERS Pension System Works',
      excerpt: 'A detailed guide to understanding the Hawaii Employees\' Retirement System and how your pension benefit is calculated.',
      body: `<h2>Understanding the Hawaii Employees' Retirement System (ERS)</h2>

<p>The Hawaii Employees' Retirement System is one of the most valuable benefits available to public employees in the state. Established in 1926, the ERS provides retirement, disability, and survivor benefits to state and county employees, including teachers, police officers, firefighters, and other public servants. Understanding how the system works is essential to planning a secure retirement.</p>

<h3>The Four ERS Plan Types</h3>

<p>The ERS offers different plan types depending on when you were hired. Each plan has its own contribution rate, benefit multiplier, and retirement eligibility requirements.</p>

<p><strong>Contributory Plan I</strong> applies to employees hired before July 1, 2006. This is generally considered the most generous plan. Members contribute 7.8% of their gross salary, and the benefit multiplier is 2% per year of credited service. With 30 years of service and an Average Final Compensation of $70,000, a Contributory I member would receive $42,000 per year (30 x 2% x $70,000) in pension benefits.</p>

<p><strong>Contributory Plan II</strong> covers employees hired between July 1, 2006 and June 30, 2012. Members contribute 8% of their gross salary, and the benefit multiplier is 1.75% per year. Using the same example of 30 years and $70,000 AFC, the annual pension would be $36,750 (30 x 1.75% x $70,000). While the multiplier is lower, the difference can be offset through additional savings.</p>

<p><strong>The Hybrid Plan</strong> is for employees hired on or after July 1, 2012. This plan combines a defined benefit component with a defined contribution component. The defined benefit portion uses a 1.75% multiplier with an 8% employee contribution. Additionally, members contribute to a defined contribution account that provides supplemental retirement income.</p>

<p><strong>The Noncontributory Plan</strong> was available to employees hired before July 1, 1984 who elected not to contribute. Members do not pay into the system, but the benefit multiplier is lower at 1.25% per year. Few active employees remain on this plan today.</p>

<h3>How Your Benefit Is Calculated</h3>

<p>Your ERS pension benefit is calculated using a straightforward formula with three components:</p>

<p><strong>Years of Credited Service</strong> includes all full-time service with a participating employer. Part-time service is prorated. You can also purchase service credit for certain periods, such as military service, unused sick leave, or leaves of absence.</p>

<p><strong>Average Final Compensation (AFC)</strong> is typically the average of your three highest-paid consecutive years of service. For most employees, this is their last three years before retirement, since salaries tend to increase over time. The AFC includes your base salary and certain allowances but excludes overtime, bonuses, and lump-sum payments.</p>

<p><strong>Benefit Multiplier</strong> is the percentage applied per year of service, as described above for each plan type.</p>

<p>The formula is simple: <em>Years of Service x Benefit Multiplier x AFC = Annual Pension</em></p>

<h3>Retirement Eligibility</h3>

<p>When you can retire depends on your plan type and years of service:</p>

<p>For Contributory I and Noncontributory members: age 55 with 5 years of service for a reduced benefit, or age 55 with 30 years for a full benefit, or any age with 30 years of service.</p>

<p>For Contributory II members: age 60 with 10 years of service, or age 55 with 30 years of service.</p>

<p>For Hybrid Plan members: age 65 with 10 years of service, or age 60 with 30 years of service.</p>

<h3>Benefit Payment Options</h3>

<p>When you retire, you will choose from several benefit payment options that determine your monthly benefit amount and whether your spouse or beneficiary continues to receive benefits after your death.</p>

<p><strong>Maximum Allowance</strong> provides the highest monthly payment but benefits stop when you die. This option provides no survivor benefit.</p>

<p><strong>Option A (100% Joint and Survivor)</strong> provides a reduced monthly benefit during your lifetime, but your designated beneficiary receives the same monthly amount after your death.</p>

<p><strong>Option B (50% Joint and Survivor)</strong> provides a slightly higher monthly benefit than Option A, with your beneficiary receiving 50% of your benefit after your death.</p>

<p><strong>Option C (Certain and Life)</strong> guarantees payments for a specified period (5, 10, 15, or 20 years). If you die before the period ends, your beneficiary receives the remaining payments.</p>

<h3>Important Considerations</h3>

<p>Your ERS pension does not include Social Security benefits if you spent your entire career in Hawaii public service, since Hawaii public employees do not participate in Social Security. This makes your ERS pension and supplemental savings even more important.</p>

<p>Your pension is subject to federal income tax but exempt from Hawaii state income tax. This is a significant advantage for retirees who remain in Hawaii.</p>

<p>The ERS provides annual cost-of-living adjustments (COLA) for some plan types, but these are not automatic and depend on the plan's funded status. Do not count on significant COLA increases when planning your retirement budget.</p>

<h3>Getting Help</h3>

<p>Understanding your ERS benefits is the foundation of your retirement plan. At Windward Financial, we help Hawaii public employees navigate the complexities of the ERS and build comprehensive retirement strategies. Contact us for a free pension analysis and retirement consultation.</p>`,
      authorId: herbUser.id,
      tags: ['ers', 'pension', 'retirement'],
      isPublished: true,
      publishedAt: daysAgo(30),
      metaDescription: 'Complete guide to the Hawaii Employees\' Retirement System — plan types, benefit calculations, eligibility, and payment options explained.',
    },
    {
      slug: '403b-vs-457-for-state-employees',
      title: '403(b) vs 457 for State Employees',
      excerpt: 'Comparing the 403(b) and 457 deferred compensation plans available to Hawaii state employees and educators.',
      body: `<h2>403(b) vs 457: Which Plan Is Right for You?</h2>

<p>As a Hawaii public employee, you may have access to both a 403(b) plan and a 457 deferred compensation plan in addition to your ERS pension. While both plans offer tax-advantaged retirement savings, they have important differences that can affect your retirement strategy. Understanding these differences will help you make the best choice — or determine if using both makes sense for your situation.</p>

<h3>The 403(b) Plan: Built for Educators</h3>

<p>The 403(b) plan, sometimes called a Tax-Sheltered Annuity (TSA), is specifically designed for employees of public schools and certain non-profit organizations. For Hawaii DOE employees, the 403(b) is one of the most accessible supplemental retirement savings vehicles available.</p>

<p><strong>Key features of the 403(b):</strong></p>

<p>Contributions are made through payroll deduction on a pre-tax basis, reducing your current taxable income. In 2024, you can contribute up to $23,000 per year, with an additional $7,500 catch-up contribution if you are 50 or older. There is also a special 15-year catch-up provision that allows eligible employees with 15+ years of service to contribute an additional $3,000 per year, up to a lifetime maximum of $15,000.</p>

<p>Investment options typically include fixed annuities (SPDA and FPDA), fixed indexed annuities, and variable annuities. For Hawaii DOE employees, approved vendors include National Life Group, Pacific Guardian Life, and several other carriers on the state-approved vendor list.</p>

<p>Withdrawals before age 59 and a half are subject to a 10% early withdrawal penalty in addition to regular income tax, with some exceptions. Required Minimum Distributions (RMDs) begin at age 73 under current rules.</p>

<h3>The 457 Deferred Compensation Plan</h3>

<p>The 457 plan is a deferred compensation plan available to state and local government employees. Hawaii offers the Island $avings Plan, a 457(b) deferred compensation plan administered by Voya Financial.</p>

<p><strong>Key features of the 457:</strong></p>

<p>Like the 403(b), contributions are made pre-tax through payroll deduction. The 2024 contribution limit is also $23,000, with a $7,500 catch-up for those 50 and older. However, the 457 has its own special catch-up provision: in the three years before your plan's normal retirement age, you may be able to contribute up to double the regular limit ($46,000 in 2024).</p>

<p>Investment options in the Island $avings Plan include target-date funds, index funds, bond funds, and a stable value fund. The investment menu is different from 403(b) options and generally follows a mutual fund format rather than annuity products.</p>

<p>One of the most significant advantages of the 457 plan is that there is no 10% early withdrawal penalty for distributions taken before age 59 and a half after separation from service. This makes the 457 particularly attractive for employees who plan to retire before 59 and a half and need access to their savings.</p>

<h3>Head-to-Head Comparison</h3>

<p><strong>Contribution limits:</strong> Both plans share the same base contribution limit ($23,000 in 2024). However, because they are separate plans, you can contribute the maximum to both — effectively doubling your tax-advantaged savings to $46,000 per year (or more with catch-up contributions).</p>

<p><strong>Early access:</strong> The 457 wins here. If you retire or leave public employment before age 59 and a half, you can access your 457 funds without the 10% early withdrawal penalty. With a 403(b), you would face the penalty unless you meet specific exceptions.</p>

<p><strong>Investment options:</strong> This depends on your preferences. The 403(b) offers annuity-based products with features like guaranteed minimum interest rates and principal protection. The 457 offers a more traditional mutual fund lineup with potentially lower fees and broader diversification.</p>

<p><strong>Catch-up provisions:</strong> The 403(b) offers the 15-year catch-up for long-tenured employees. The 457 offers the three-year catch-up before normal retirement age. Depending on your situation, one may be more beneficial than the other.</p>

<p><strong>Loan provisions:</strong> Both plans may allow loans, but the terms and availability differ. Check with your specific plan administrator for details.</p>

<h3>Using Both Plans Together</h3>

<p>For many Hawaii public employees, the optimal strategy is to contribute to both plans. Here is why:</p>

<p>By maxing out both a 403(b) and a 457, a 50+ year-old employee could save up to $61,000 per year in tax-advantaged accounts ($30,500 + $30,500). Combined with your ERS pension, this creates a powerful three-legged retirement income strategy.</p>

<p>A common approach is to prioritize the 457 if you plan to retire before 59 and a half (for penalty-free access), and the 403(b) if you prefer guaranteed products with principal protection. If you can afford to save in both, do so.</p>

<h3>The Role of Your ERS Pension</h3>

<p>Remember that your ERS pension provides a guaranteed income floor in retirement. Your 403(b) and 457 savings supplement this base. The key question is: how much supplemental income do you need to maintain your desired lifestyle in retirement?</p>

<p>Many financial planners recommend replacing 70-80% of your pre-retirement income. If your ERS pension covers 50-60%, your 403(b) and 457 savings need to fill the remaining 10-30% gap. The exact amount depends on your years of service, plan type, salary, and retirement goals.</p>

<h3>Getting Personalized Advice</h3>

<p>Choosing between a 403(b), a 457, or both is a decision that depends on your unique situation — your age, years of service, retirement timeline, risk tolerance, and financial goals. At Windward Financial, we specialize in helping Hawaii public employees make these decisions with confidence. Schedule a free consultation to discuss your options and build a personalized retirement savings strategy.</p>`,
      authorId: herbUser.id,
      tags: ['403b', '457', 'savings'],
      isPublished: true,
      publishedAt: daysAgo(7),
      metaDescription: 'Compare the 403(b) and 457 deferred compensation plans for Hawaii state employees — contribution limits, early access, investments, and strategies.',
    },
  ]);
  console.log('  Created 3 blog posts.\n');

  // ══════════════════════════════════════════════
  //  SITE PAGES (9)
  // ══════════════════════════════════════════════
  console.log('Seeding site pages...');

  const homeContent: ContentBlock[] = [
    { type: 'heading', data: { text: 'Windward Financial', level: 1 } },
    { type: 'text', data: { text: 'We are a family-owned retirement planning and financial services company focused on the unique needs of public employees and teachers across the Hawaiian islands.' } },
    { type: 'cta', data: { text: 'Schedule a Consultation', href: '/schedule-an-appointment', variant: 'primary' } },
    { type: 'heading', data: { text: 'Trusted by Hawaii Educators for Over 30 Years', level: 2 } },
    { type: 'text', data: { text: 'Since 1993, Windward Financial has helped hundreds of Hawaii DOE teachers, state employees, and their families navigate the path to retirement with confidence. We understand the ERS pension system, 403(b) plans, and the unique challenges facing public servants in our state.' } },
    { type: 'heading', data: { text: 'Our Services', level: 2 } },
    { type: 'product_card', data: { title: 'Retirement Planning', description: 'Comprehensive retirement analysis including ERS pension estimates, income gap analysis, and personalized strategies for public employees.', icon: 'chart-line' } },
    { type: 'product_card', data: { title: '403(b) Enrollment & Management', description: 'Expert guidance on selecting the right 403(b) product, contribution strategies, and ongoing management of your supplemental retirement savings.', icon: 'piggy-bank' } },
    { type: 'product_card', data: { title: 'Life Insurance & Living Benefits', description: 'Term life, universal life, and indexed universal life insurance with Accelerated Benefit Riders for chronic, critical, and terminal illness protection.', icon: 'shield-check' } },
    { type: 'product_card', data: { title: 'Annuities & Fixed Income', description: 'Fixed annuities and fixed indexed annuities for guaranteed income in retirement, with principal protection and competitive interest rates.', icon: 'lock' } },
    { type: 'testimonial', data: { quote: 'Herb Hussey has been our financial advisor for the past 15 years and has always been available for questions and concerns.', author: 'Toyoko Barcase', title: 'Beneficiary of DOE retiree' } },
    { type: 'cta', data: { text: 'Meet Our Team', href: '/about', variant: 'secondary' } },
  ];

  const aboutContent: ContentBlock[] = [
    { type: 'heading', data: { text: 'About Windward Financial', level: 1 } },
    { type: 'text', data: { text: 'Windward Financial was founded by Herb Hussey with a simple mission: to provide honest, personalized financial guidance to the hardworking public employees of Hawaii. As a family-owned firm, we treat every client like ohana.' } },
    { type: 'heading', data: { text: 'Our Story', level: 2 } },
    { type: 'text', data: { text: 'For over three decades, Herb has worked closely with DOE teachers, state employees, and city and county workers across every island. He has seen firsthand how proper retirement planning can transform lives — and how a lack of planning can leave dedicated public servants struggling in their golden years.' } },
    { type: 'text', data: { text: "Today, Windward Financial is growing with the next generation. Kealaka'i Hussey has joined the team, bringing fresh energy and modern strategies while maintaining the personal touch that has always defined our firm. Together with our dedicated client service representatives, we are committed to serving the retirement planning needs of Hawaii's public employees for decades to come." } },
    { type: 'heading', data: { text: 'Our Values', level: 2 } },
    { type: 'text', data: { text: 'Education First — We believe informed clients make the best decisions. We take the time to explain every option clearly and thoroughly.' } },
    { type: 'text', data: { text: 'No Pressure — We never push products or rush decisions. Your financial future is too important for high-pressure sales tactics.' } },
    { type: 'text', data: { text: 'Island-Wide Service — Whether you are on Oahu, Maui, the Big Island, Kauai, Molokai, or Lanai, we come to you — in person or via video conference.' } },
    { type: 'team_member', data: { name: 'Herb Hussey', role: 'Founder & Financial Advisor' } },
    { type: 'team_member', data: { name: "Kealaka'i Hussey", role: 'Financial Advisor & Agent' } },
    { type: 'team_member', data: { name: 'Brittany Davis', role: 'Client Service Representative' } },
    { type: 'team_member', data: { name: 'Tiffany Byrne', role: 'Client Service Representative' } },
    { type: 'team_member', data: { name: 'May Apple Ang', role: 'Client Service Representative' } },
  ];

  const expertiseContent: ContentBlock[] = [
    { type: 'heading', data: { text: 'Our Expertise', level: 1 } },
    { type: 'text', data: { text: 'Windward Financial specializes in retirement planning and financial services for Hawaii public employees. Our deep expertise in state benefit programs sets us apart from general financial advisors.' } },
    { type: 'heading', data: { text: 'ERS Pension Planning', level: 2 } },
    { type: 'text', data: { text: 'We know the Hawaii Employees\' Retirement System inside and out — Contributory I, Contributory II, Hybrid, and Noncontributory plans. We help you understand your benefit calculation, choose the right payment option, and plan for the income gap between your pension and your retirement needs.' } },
    { type: 'heading', data: { text: '403(b) Plans for Educators', level: 2 } },
    { type: 'text', data: { text: 'As a DOE-approved vendor representative, we help educators select, enroll in, and manage their 403(b) supplemental retirement savings plans. We offer fixed annuities (SPDA/FPDA), fixed indexed annuities, and can explain the differences between each option.' } },
    { type: 'heading', data: { text: 'Life Insurance with Living Benefits', level: 2 } },
    { type: 'text', data: { text: 'We specialize in life insurance products that do more than provide a death benefit. Our policies include Accelerated Benefit Riders (ABR) that allow you to access benefits during your lifetime for chronic, critical, or terminal illness — providing a safety net that traditional long-term care insurance cannot match.' } },
    { type: 'heading', data: { text: 'EUTF Health Insurance Guidance', level: 2 } },
    { type: 'text', data: { text: 'We help you understand your Employer-Union Health Benefits Trust Fund (EUTF) coverage, plan for the transition to retiree health insurance, and navigate the Medicare enrollment process.' } },
    { type: 'cta', data: { text: 'Schedule a Free Consultation', href: '/schedule-an-appointment', variant: 'primary' } },
  ];

  const qualityCommitmentContent: ContentBlock[] = [
    { type: 'heading', data: { text: 'Our Commitment to Quality', level: 1 } },
    { type: 'text', data: { text: 'At Windward Financial, quality is not just a promise — it is how we operate every single day. We hold ourselves to the highest standards of professionalism, transparency, and client care.' } },
    { type: 'heading', data: { text: 'Licensed and Regulated', level: 2 } },
    { type: 'text', data: { text: 'All of our financial advisors are properly licensed and registered with the Hawaii Department of Commerce and Consumer Affairs, Insurance Division. We maintain all required continuing education credits and stay current on regulatory changes that affect our clients.' } },
    { type: 'heading', data: { text: 'Trusted Carrier Partnerships', level: 2 } },
    { type: 'text', data: { text: 'We work exclusively with highly rated, financially strong insurance carriers including National Life Group and Pacific Guardian Life. These companies have long track records of financial stability, strong claims-paying ability, and a commitment to policyholder value.' } },
    { type: 'heading', data: { text: 'Client-First Philosophy', level: 2 } },
    { type: 'text', data: { text: 'We are independent advisors, which means we are not captive to any single product or company. Our recommendations are based solely on what is best for you and your family. We take the time to understand your complete financial picture before making any recommendation.' } },
    { type: 'heading', data: { text: 'Ongoing Service and Support', level: 2 } },
    { type: 'text', data: { text: 'Our relationship does not end when a policy is issued. We provide ongoing annual reviews, beneficiary updates, claims assistance, and retirement planning adjustments as your life circumstances change. Our client service team is always available to answer your questions.' } },
    { type: 'cta', data: { text: 'Experience the Windward Difference', href: '/schedule-an-appointment', variant: 'primary' } },
  ];

  const contactContent: ContentBlock[] = [
    { type: 'heading', data: { text: 'Contact Us', level: 1 } },
    { type: 'text', data: { text: 'We would love to hear from you. Whether you have a question about your retirement plan, want to schedule a consultation, or just want to learn more about how we can help, reach out anytime.' } },
    { type: 'heading', data: { text: 'Get in Touch', level: 2 } },
    { type: 'text', data: { text: 'Phone: (808) 479-8447' } },
    { type: 'text', data: { text: 'Email: herb@windwardfinancial.net' } },
    { type: 'text', data: { text: 'We serve all Hawaiian islands — Oahu, Maui, Big Island, Kauai, Molokai, and Lanai. Consultations are available in person or via Zoom.' } },
    { type: 'heading', data: { text: 'Office Hours', level: 2 } },
    { type: 'text', data: { text: 'Monday through Friday: 8:00 AM - 5:00 PM HST. Evening and weekend appointments available by request.' } },
    { type: 'cta', data: { text: 'Schedule an Appointment', href: '/schedule-an-appointment', variant: 'primary' } },
  ];

  const scheduleContent: ContentBlock[] = [
    { type: 'heading', data: { text: 'Schedule an Appointment', level: 1 } },
    { type: 'text', data: { text: 'Ready to take the first step toward a secure retirement? Schedule a free, no-obligation consultation with one of our financial advisors. We will review your current benefits, identify any gaps, and provide personalized recommendations.' } },
    { type: 'heading', data: { text: 'What to Expect', level: 2 } },
    { type: 'text', data: { text: 'Your initial consultation typically lasts 30 to 45 minutes. We will discuss your employment background, years of service, current retirement savings, insurance coverage, and retirement goals. There is no cost and absolutely no obligation.' } },
    { type: 'heading', data: { text: 'What to Bring', level: 2 } },
    { type: 'text', data: { text: 'To get the most from your consultation, please have the following available if possible: your most recent ERS annual statement, your latest pay stub, any current 403(b) or 457 account statements, and any existing life insurance policy documents. Do not worry if you do not have everything — we can still have a productive conversation.' } },
    { type: 'cta', data: { text: 'Book Your Free Consultation', href: 'https://calendly.com/windwardfinancial', variant: 'primary' } },
  ];

  const nationalLifeContent: ContentBlock[] = [
    { type: 'heading', data: { text: 'National Life Group Transition', level: 1 } },
    { type: 'text', data: { text: 'If you are a National Life Group policyholder or are considering products from National Life, Windward Financial is here to help you navigate any transition or service needs.' } },
    { type: 'heading', data: { text: 'About National Life Group', level: 2 } },
    { type: 'text', data: { text: 'National Life Group, founded in 1848 in Montpelier, Vermont, is one of the oldest and most respected life insurance companies in the United States. They offer a full range of life insurance, annuity, and retirement products, and are the leading 403(b) provider for educators nationwide.' } },
    { type: 'heading', data: { text: 'Products We Offer Through National Life', level: 2 } },
    { type: 'product_card', data: { title: 'Life Solutions IUL', description: 'Indexed Universal Life insurance with living benefits for chronic, critical, and terminal illness. Cash value growth linked to the S&P 500 index with downside protection.', icon: 'shield-check' } },
    { type: 'product_card', data: { title: 'LSW FlexLife GUL', description: 'Guaranteed Universal Life insurance with guaranteed level premiums and a guaranteed death benefit to age 100 or beyond.', icon: 'lock' } },
    { type: 'product_card', data: { title: '403(b) SPDA', description: 'Single Premium Deferred Annuity with a competitive guaranteed interest rate and no market risk. Ideal for lump-sum rollovers or large contributions.', icon: 'piggy-bank' } },
    { type: 'product_card', data: { title: '403(b) FPDA', description: 'Flexible Premium Deferred Annuity designed for regular payroll-deducted contributions. Guaranteed minimum interest rate with potential for higher credited rates.', icon: 'chart-line' } },
    { type: 'heading', data: { text: 'Need Assistance?', level: 2 } },
    { type: 'text', data: { text: 'Whether you need help with an existing National Life policy, want to explore new products, or need assistance with a claim, our team is ready to help. We have deep experience with National Life products and can guide you through any process.' } },
    { type: 'cta', data: { text: 'Contact Us for Assistance', href: '/contact', variant: 'primary' } },
  ];

  const enrollContent: ContentBlock[] = [
    { type: 'heading', data: { text: '403(b) Enrollment', level: 1 } },
    { type: 'text', data: { text: 'Ready to start saving for retirement through your 403(b) plan? Enrolling is simple, and we will guide you through every step of the process.' } },
    { type: 'heading', data: { text: 'How to Enroll', level: 2 } },
    { type: 'text', data: { text: 'Step 1: Schedule a consultation with one of our advisors. We will review your financial situation, discuss your retirement goals, and recommend the best 403(b) product for your needs.' } },
    { type: 'text', data: { text: 'Step 2: Complete the enrollment application. We will help you fill out the paperwork, select your contribution amount, and choose your investment allocation.' } },
    { type: 'text', data: { text: 'Step 3: Submit your Salary Reduction Agreement (SRA) to your school or department payroll office. This authorizes the payroll deduction for your 403(b) contributions.' } },
    { type: 'text', data: { text: 'Step 4: Your contributions begin with your next paycheck. We will confirm everything is set up correctly and provide you with account access information.' } },
    { type: 'heading', data: { text: 'Why Start Now?', level: 2 } },
    { type: 'text', data: { text: 'The power of compound growth means that every year you wait can cost you significantly in retirement. A 30-year-old teacher contributing $200 per month could accumulate over $250,000 by age 60, assuming a 5% average annual return. Starting at 40, the same contribution would grow to approximately $130,000. Time is your most valuable asset.' } },
    { type: 'cta', data: { text: 'Start Your Enrollment', href: '/schedule-an-appointment', variant: 'primary' } },
  ];

  const resourcesContent: ContentBlock[] = [
    { type: 'heading', data: { text: 'Resources', level: 1 } },
    { type: 'text', data: { text: 'We believe that informed clients make the best decisions. Explore our collection of resources designed to help Hawaii public employees understand their benefits and plan for retirement.' } },
    { type: 'heading', data: { text: 'Retirement Planning Resources', level: 2 } },
    { type: 'text', data: { text: 'ERS Website — Visit the Hawaii Employees\' Retirement System at ers.ehawaii.gov for official plan information, forms, and your annual benefit statement.' } },
    { type: 'text', data: { text: 'EUTF Website — Learn about your health insurance benefits through the Employer-Union Health Benefits Trust Fund at eutf.hawaii.gov.' } },
    { type: 'text', data: { text: 'Island $avings Plan — Explore the state\'s 457 deferred compensation plan at islandsavingsplan.com.' } },
    { type: 'heading', data: { text: 'Educational Articles', level: 2 } },
    { type: 'text', data: { text: 'Visit our blog for in-depth articles on retirement planning topics relevant to Hawaii public employees, including ERS pension guides, 403(b) strategies, life insurance education, and more.' } },
    { type: 'heading', data: { text: 'Upcoming Events', level: 2 } },
    { type: 'text', data: { text: 'We regularly host free webinars and school presentations on retirement planning. Check our events page for upcoming sessions.' } },
    { type: 'cta', data: { text: 'Read Our Blog', href: '/blog', variant: 'secondary' } },
    { type: 'cta', data: { text: 'View Upcoming Events', href: '/events', variant: 'secondary' } },
  ];

  await db.insert(sitePages).values([
    { slug: 'home', title: 'Home', metaDescription: 'Windward Financial — retirement planning and financial services for Hawaii public employees and teachers.', content: homeContent, isPublished: true, sortOrder: 1 },
    { slug: 'about', title: 'About Us', metaDescription: 'Learn about Windward Financial — a family-owned retirement planning firm serving Hawaii public employees for over 30 years.', content: aboutContent, isPublished: true, sortOrder: 2 },
    { slug: 'expertise', title: 'Our Expertise', metaDescription: 'ERS pension planning, 403(b) enrollment, life insurance with living benefits, and EUTF guidance for Hawaii public employees.', content: expertiseContent, isPublished: true, sortOrder: 3 },
    { slug: 'quality-commitment', title: 'Quality Commitment', metaDescription: 'Our commitment to licensed, regulated, client-first financial planning for Hawaii public employees.', content: qualityCommitmentContent, isPublished: true, sortOrder: 4 },
    { slug: 'contact', title: 'Contact Us', metaDescription: 'Contact Windward Financial for retirement planning help — serving all Hawaiian islands.', content: contactContent, isPublished: true, sortOrder: 5 },
    { slug: 'schedule-an-appointment', title: 'Schedule an Appointment', metaDescription: 'Schedule a free retirement planning consultation with Windward Financial.', content: scheduleContent, isPublished: true, sortOrder: 6 },
    { slug: 'national-life-transition', title: 'National Life Group Transition', metaDescription: 'National Life Group products and transition assistance from Windward Financial.', content: nationalLifeContent, isPublished: true, sortOrder: 7 },
    { slug: 'enroll', title: '403(b) Enrollment', metaDescription: 'Enroll in a 403(b) retirement savings plan through Windward Financial — step-by-step guidance for Hawaii educators.', content: enrollContent, isPublished: true, sortOrder: 8 },
    { slug: 'resources', title: 'Resources', metaDescription: 'Retirement planning resources for Hawaii public employees — ERS, EUTF, 457, articles, and events.', content: resourcesContent, isPublished: true, sortOrder: 9 },
  ]);
  console.log('  Created 9 site pages.\n');

  // ══════════════════════════════════════════════
  //  DONE
  // ══════════════════════════════════════════════
  console.log('✅ Seed complete!');
  console.log('   Users:          3');
  console.log('   Team Members:   5');
  console.log('   Testimonials:   3');
  console.log('   Contacts:       30');
  console.log('   Pipeline:       30');
  console.log('   Email Templates: 6');
  console.log('   Policies:       8');
  console.log('   Tasks:          10');
  console.log('   Activities:     15');
  console.log('   Events:         2');
  console.log('   Blog Posts:     3');
  console.log('   Site Pages:     9');
  console.log('');

  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
