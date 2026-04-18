import { Router, Request, Response } from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import { db } from '../db';
import {
  districts, districtContacts, campaigns, campaignSteps,
  campaignEnrollments, campaignEvents, webinarRegistrations,
  documentRequests, geoAdCampaigns,
} from '../db/schema';
import { eq, desc, and, or, ilike, sql, asc } from 'drizzle-orm';
import { launchCampaign, pauseCampaign, getCampaignMetrics } from '../services/campaign-engine';
import { searchSuperintendent, searchAllSuperintendents, createAndLaunchSection125Campaign } from '../services/superintendent-search';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// ── Districts ──

// GET /districts — list with filters, includes first contact per district
router.get('/districts', async (req: Request, res: Response) => {
  try {
    const { state, county, production_status, search, page = '1', limit = '50' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit as string) || 50));
    const offset = (pageNum - 1) * limitNum;

    const conditions: any[] = [];
    if (state) conditions.push(eq(districts.state, state as string));
    if (county) conditions.push(ilike(districts.county, `%${county}%`));
    if (production_status) conditions.push(eq(districts.productionStatus, production_status as any));
    if (search) {
      conditions.push(or(
        ilike(districts.employerName, `%${search}%`),
        ilike(districts.city, `%${search}%`),
        ilike(districts.planAdminName, `%${search}%`)
      ));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = whereClause
      ? await db.select().from(districts).where(whereClause).orderBy(asc(districts.employerName)).limit(limitNum).offset(offset)
      : await db.select().from(districts).orderBy(asc(districts.employerName)).limit(limitNum).offset(offset);

    const [{ count: total }] = whereClause
      ? await db.select({ count: sql<number>`count(*)::int` }).from(districts).where(whereClause)
      : await db.select({ count: sql<number>`count(*)::int` }).from(districts);

    // Fetch first contact for each district in the result set
    const districtIds = rows.map(r => r.id);
    let contactsByDistrict: Record<number, any> = {};
    if (districtIds.length > 0) {
      const contacts = await db.select().from(districtContacts)
        .where(sql`${districtContacts.districtId} IN ${districtIds}`);
      for (const c of contacts) {
        if (!contactsByDistrict[c.districtId]) {
          contactsByDistrict[c.districtId] = c;
        }
      }
    }

    const data = rows.map(r => ({
      ...r,
      contact: contactsByDistrict[r.id] || null,
    }));

    return res.json({ data, pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) } });
  } catch (error) {
    console.error('List districts error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /districts — manually create a single district
router.post('/districts', async (req: Request, res: Response) => {
  try {
    const {
      employerName,
      city,
      county,
      state,
      groupType,
      classificationSource,
      productionStatus,
      planAdminName,
    } = req.body ?? {};

    if (!employerName || typeof employerName !== 'string' || !employerName.trim()) {
      return res.status(400).json({ error: 'employerName is required' });
    }
    if (state && typeof state === 'string' && state.length > 2) {
      return res.status(400).json({ error: 'state must be a 2-letter code' });
    }
    if (productionStatus && productionStatus !== 'Dormant' && productionStatus !== 'Low Prod') {
      return res.status(400).json({ error: "productionStatus must be 'Dormant' or 'Low Prod'" });
    }

    const [district] = await db.insert(districts).values({
      employerName: employerName.trim(),
      city: city?.trim() || null,
      county: county?.trim() || null,
      state: state ? (state as string).trim().toUpperCase() : null,
      groupType: groupType?.trim() || null,
      classificationSource: classificationSource?.trim() || null,
      productionStatus: (productionStatus as 'Dormant' | 'Low Prod') || null,
      planAdminName: planAdminName?.trim() || null,
    }).returning();

    return res.status(201).json(district);
  } catch (error) {
    console.error('Create district error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /districts/upload-csv — bulk import from CSV
router.post('/districts/upload-csv', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const csvContent = req.file.buffer.toString('utf-8');
    const records = parse(csvContent, { columns: true, skip_empty_lines: true, trim: true }) as Record<string, string>[];

    const inserted: any[] = [];
    for (const row of records) {
      const [district] = await db.insert(districts).values({
        employerName: row['Employer Name'] || row['employer_name'] || '',
        city: row['Group City'] || row['city'] || '',
        county: row['Group county'] || row['Group County'] || row['county'] || '',
        state: row['Group State'] || row['state'] || '',
        groupType: row['Group Type'] || row['group_type'] || '',
        classificationSource: row['Classification Source'] || row['classification_source'] || '',
        productionStatus: (row['Status - Production'] || row['production_status'] || 'Dormant') === 'Low Prod' ? 'Low Prod' : 'Dormant',
        planAdminName: row['Plan Admin Name'] || row['plan_admin_name'] || '',
      }).returning();
      inserted.push(district);
    }

    return res.status(201).json({ message: `${inserted.length} districts imported`, count: inserted.length });
  } catch (error) {
    console.error('CSV upload error:', error);
    return res.status(500).json({ error: 'Failed to import CSV' });
  }
});

// POST /districts/search-all — search superintendents for all districts
router.post('/districts/search-all', async (_req: Request, res: Response) => {
  try {
    const result = await searchAllSuperintendents();
    return res.json(result);
  } catch (error) {
    console.error('Search all contacts error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /districts/search-batch — search contacts for specific district IDs
router.post('/districts/search-batch', async (req: Request, res: Response) => {
  try {
    const { districtIds } = req.body;
    if (!Array.isArray(districtIds) || districtIds.length === 0) {
      return res.status(400).json({ error: 'districtIds array is required' });
    }

    const results: { districtId: number; found: boolean; contact?: any }[] = [];
    for (const districtId of districtIds) {
      // Check if already has a contact
      const existing = await db.select().from(districtContacts)
        .where(eq(districtContacts.districtId, districtId)).limit(1);
      if (existing.length > 0) {
        results.push({ districtId, found: true, contact: existing[0] });
        continue;
      }

      const result = await searchSuperintendent(districtId);
      if (result.found && result.contact) {
        const [contact] = await db.insert(districtContacts).values({
          districtId,
          firstName: result.contact.firstName,
          lastName: result.contact.lastName,
          title: result.contact.title,
          email: result.contact.email,
        }).returning();
        results.push({ districtId, found: true, contact });
      } else {
        results.push({ districtId, found: false });
      }
    }
    return res.json({ results });
  } catch (error) {
    console.error('Batch search error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /district-contacts/:id — edit a district contact
router.patch('/district-contacts/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const { firstName, lastName, title, email, phone } = req.body;
    const updates: any = {};
    if (firstName !== undefined) updates.firstName = firstName;
    if (lastName !== undefined) updates.lastName = lastName;
    if (title !== undefined) updates.title = title;
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;

    const [updated] = await db.update(districtContacts)
      .set(updates)
      .where(eq(districtContacts.id, id)).returning();
    if (!updated) return res.status(404).json({ error: 'Contact not found' });
    return res.json(updated);
  } catch (error) {
    console.error('Update district contact error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /launch-section125 — create campaign for selected districts
router.post('/launch-section125', async (req: Request, res: Response) => {
  try {
    const { districtIds } = req.body;
    // If districtIds provided, create campaign for just those districts
    if (Array.isArray(districtIds) && districtIds.length > 0) {
      const result = await createAndLaunchSection125Campaign(districtIds);
      return res.json({ message: 'Section 125 campaign created!', ...result });
    }
    // Otherwise create for all
    const result = await createAndLaunchSection125Campaign();
    return res.json({ message: 'Section 125 campaign created!', ...result });
  } catch (error) {
    console.error('Launch Section 125 campaign error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /districts/:id — includes contacts and campaign enrollments
router.get('/districts/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const [district] = await db.select().from(districts).where(eq(districts.id, id)).limit(1);
    if (!district) return res.status(404).json({ error: 'District not found' });

    // Get contacts for this district
    const contacts = await db.select().from(districtContacts).where(eq(districtContacts.districtId, id));

    // Get campaign enrollments with campaign info and events
    const enrollments = await db.select({
      enrollment: campaignEnrollments,
      campaign: campaigns,
    })
    .from(campaignEnrollments)
    .innerJoin(campaigns, eq(campaignEnrollments.campaignId, campaigns.id))
    .where(eq(campaignEnrollments.districtId, id))
    .orderBy(desc(campaignEnrollments.enrolledAt));

    // Get events for these enrollments
    const enrollmentIds = enrollments.map(e => e.enrollment.id);
    let events: any[] = [];
    if (enrollmentIds.length > 0) {
      events = await db.select().from(campaignEvents)
        .where(sql`${campaignEvents.enrollmentId} IN ${enrollmentIds}`)
        .orderBy(desc(campaignEvents.occurredAt));
    }

    return res.json({ ...district, contacts, enrollments, events });
  } catch (error) {
    console.error('Get district error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /districts/:id
router.patch('/districts/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const [updated] = await db.update(districts)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(districts.id, id)).returning();
    if (!updated) return res.status(404).json({ error: 'District not found' });
    return res.json(updated);
  } catch (error) {
    console.error('Update district error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /districts/:id
router.delete('/districts/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const [deleted] = await db.delete(districts).where(eq(districts.id, id)).returning();
    if (!deleted) return res.status(404).json({ error: 'District not found' });
    return res.json({ message: 'District deleted' });
  } catch (error) {
    console.error('Delete district error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── District Contacts ──

// POST /districts/:id/contacts
router.post('/districts/:id/contacts', async (req: Request, res: Response) => {
  try {
    const districtId = parseInt(req.params.id as string);
    const [contact] = await db.insert(districtContacts).values({
      districtId,
      ...req.body,
    }).returning();
    return res.status(201).json(contact);
  } catch (error) {
    console.error('Create district contact error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /districts/:id/search-contact — search for superintendent/principal
router.post('/districts/:id/search-contact', async (req: Request, res: Response) => {
  try {
    const districtId = parseInt(req.params.id as string);
    const result = await searchSuperintendent(districtId);

    if (!result.found || !result.contact) {
      return res.json({ districtId, status: 'not_found', message: 'No contact found for this district' });
    }

    // Create the contact in the database
    const [contact] = await db.insert(districtContacts).values({
      districtId,
      firstName: result.contact.firstName,
      lastName: result.contact.lastName,
      title: result.contact.title,
      email: result.contact.email,
    }).returning();

    return res.json({
      districtId,
      status: 'found',
      contact,
    });
  } catch (error) {
    console.error('Search contact error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Campaigns ──

// GET /campaigns
router.get('/campaigns', async (req: Request, res: Response) => {
  try {
    const { status, type } = req.query;
    const conditions: any[] = [];
    if (status) conditions.push(eq(campaigns.status, status as any));
    if (type) conditions.push(eq(campaigns.type, type as any));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const rows = whereClause
      ? await db.select().from(campaigns).where(whereClause).orderBy(desc(campaigns.createdAt))
      : await db.select().from(campaigns).orderBy(desc(campaigns.createdAt));

    return res.json(rows);
  } catch (error) {
    console.error('List campaigns error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /campaigns
router.post('/campaigns', async (req: Request, res: Response) => {
  try {
    const [campaign] = await db.insert(campaigns).values({
      ...req.body,
      createdBy: req.session.userId,
    }).returning();
    return res.status(201).json(campaign);
  } catch (error) {
    console.error('Create campaign error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /campaigns/:id — includes steps and enrollment count
router.get('/campaigns/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    const steps = await db.select().from(campaignSteps)
      .where(eq(campaignSteps.campaignId, id)).orderBy(asc(campaignSteps.stepNumber));

    const [{ count: enrollmentCount }] = await db.select({ count: sql<number>`count(*)::int` })
      .from(campaignEnrollments).where(eq(campaignEnrollments.campaignId, id));

    return res.json({ ...campaign, steps, enrollmentCount });
  } catch (error) {
    console.error('Get campaign error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /campaigns/:id
router.patch('/campaigns/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const [updated] = await db.update(campaigns)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(campaigns.id, id)).returning();
    if (!updated) return res.status(404).json({ error: 'Campaign not found' });
    return res.json(updated);
  } catch (error) {
    console.error('Update campaign error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /campaigns/:id
router.delete('/campaigns/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    // Delete related data first
    await db.delete(campaignEvents).where(
      sql`${campaignEvents.enrollmentId} IN (SELECT id FROM campaign_enrollments WHERE campaign_id = ${id})`
    );
    await db.delete(campaignEnrollments).where(eq(campaignEnrollments.campaignId, id));
    await db.delete(campaignSteps).where(eq(campaignSteps.campaignId, id));
    const [deleted] = await db.delete(campaigns).where(eq(campaigns.id, id)).returning();
    if (!deleted) return res.status(404).json({ error: 'Campaign not found' });
    return res.json({ message: 'Campaign deleted' });
  } catch (error) {
    console.error('Delete campaign error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Campaign Steps ──

// POST /campaigns/:id/steps
router.post('/campaigns/:id/steps', async (req: Request, res: Response) => {
  try {
    const campaignId = parseInt(req.params.id as string);
    const [step] = await db.insert(campaignSteps).values({
      campaignId,
      ...req.body,
    }).returning();
    return res.status(201).json(step);
  } catch (error) {
    console.error('Create step error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /campaigns/:id/steps/:stepId
router.patch('/campaigns/:id/steps/:stepId', async (req: Request, res: Response) => {
  try {
    const stepId = parseInt(req.params.stepId as string);
    const [updated] = await db.update(campaignSteps)
      .set(req.body)
      .where(eq(campaignSteps.id, stepId)).returning();
    if (!updated) return res.status(404).json({ error: 'Step not found' });
    return res.json(updated);
  } catch (error) {
    console.error('Update step error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /campaigns/:id/steps/:stepId
router.delete('/campaigns/:id/steps/:stepId', async (req: Request, res: Response) => {
  try {
    const stepId = parseInt(req.params.stepId as string);
    const [deleted] = await db.delete(campaignSteps).where(eq(campaignSteps.id, stepId)).returning();
    if (!deleted) return res.status(404).json({ error: 'Step not found' });
    return res.json({ message: 'Step deleted' });
  } catch (error) {
    console.error('Delete step error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Campaign Launch/Pause ──

router.post('/campaigns/:id/launch', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    await launchCampaign(id);
    return res.json({ message: 'Campaign launched' });
  } catch (error) {
    console.error('Launch campaign error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/campaigns/:id/pause', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    await pauseCampaign(id);
    return res.json({ message: 'Campaign paused' });
  } catch (error) {
    console.error('Pause campaign error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Campaign Enrollments ──

// GET /campaigns/:id/enrollments
router.get('/campaigns/:id/enrollments', async (req: Request, res: Response) => {
  try {
    const campaignId = parseInt(req.params.id as string);
    const rows = await db.select({
      enrollment: campaignEnrollments,
      district: districts,
      contact: districtContacts,
    })
    .from(campaignEnrollments)
    .innerJoin(districts, eq(campaignEnrollments.districtId, districts.id))
    .leftJoin(districtContacts, eq(campaignEnrollments.districtContactId, districtContacts.id))
    .where(eq(campaignEnrollments.campaignId, campaignId));

    return res.json(rows);
  } catch (error) {
    console.error('List enrollments error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /campaigns/:id/enrollments — enroll districts
router.post('/campaigns/:id/enrollments', async (req: Request, res: Response) => {
  try {
    const campaignId = parseInt(req.params.id as string);
    const { enrollments } = req.body; // Array of { districtId, districtContactId? }

    if (!Array.isArray(enrollments) || enrollments.length === 0) {
      return res.status(400).json({ error: 'enrollments array is required' });
    }

    const inserted = [];
    for (const item of enrollments) {
      const [enrollment] = await db.insert(campaignEnrollments).values({
        campaignId,
        districtId: item.districtId,
        districtContactId: item.districtContactId || null,
      }).returning();
      inserted.push(enrollment);
    }

    return res.status(201).json({ message: `${inserted.length} districts enrolled`, enrollments: inserted });
  } catch (error) {
    console.error('Enroll districts error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /campaigns/:id/enrollments/:enrollmentId
router.delete('/campaigns/:id/enrollments/:enrollmentId', async (req: Request, res: Response) => {
  try {
    const enrollmentId = parseInt(req.params.enrollmentId as string);
    await db.delete(campaignEvents).where(eq(campaignEvents.enrollmentId, enrollmentId));
    const [deleted] = await db.delete(campaignEnrollments).where(eq(campaignEnrollments.id, enrollmentId)).returning();
    if (!deleted) return res.status(404).json({ error: 'Enrollment not found' });
    return res.json({ message: 'Enrollment removed' });
  } catch (error) {
    console.error('Remove enrollment error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Campaign Metrics ──

router.get('/campaigns/:id/metrics', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const metrics = await getCampaignMetrics(id);
    return res.json(metrics);
  } catch (error) {
    console.error('Campaign metrics error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Webinars ──

router.get('/webinars', async (_req: Request, res: Response) => {
  try {
    const rows = await db.select().from(webinarRegistrations).orderBy(desc(webinarRegistrations.registeredAt));
    return res.json(rows);
  } catch (error) {
    console.error('List webinars error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/webinars/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const [updated] = await db.update(webinarRegistrations)
      .set(req.body)
      .where(eq(webinarRegistrations.id, id)).returning();
    if (!updated) return res.status(404).json({ error: 'Registration not found' });
    return res.json(updated);
  } catch (error) {
    console.error('Update webinar error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Documents ──

router.get('/documents', async (_req: Request, res: Response) => {
  try {
    const rows = await db.select({
      document: documentRequests,
      district: districts,
      contact: districtContacts,
    })
    .from(documentRequests)
    .leftJoin(districts, eq(documentRequests.districtId, districts.id))
    .leftJoin(districtContacts, eq(documentRequests.districtContactId, districtContacts.id))
    .orderBy(desc(documentRequests.sentAt));
    return res.json(rows);
  } catch (error) {
    console.error('List documents error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/documents', async (req: Request, res: Response) => {
  try {
    const [doc] = await db.insert(documentRequests).values(req.body).returning();
    return res.status(201).json(doc);
  } catch (error) {
    console.error('Create document error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/documents/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const [updated] = await db.update(documentRequests)
      .set(req.body)
      .where(eq(documentRequests.id, id)).returning();
    if (!updated) return res.status(404).json({ error: 'Document not found' });
    return res.json(updated);
  } catch (error) {
    console.error('Update document error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Geo Ad Campaigns ──

router.get('/ads', async (_req: Request, res: Response) => {
  try {
    const rows = await db.select({
      ad: geoAdCampaigns,
      district: districts,
    })
    .from(geoAdCampaigns)
    .leftJoin(districts, eq(geoAdCampaigns.districtId, districts.id))
    .orderBy(desc(geoAdCampaigns.createdAt));
    return res.json(rows);
  } catch (error) {
    console.error('List ads error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/ads', async (req: Request, res: Response) => {
  try {
    const [ad] = await db.insert(geoAdCampaigns).values(req.body).returning();
    return res.status(201).json(ad);
  } catch (error) {
    console.error('Create ad error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/ads/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const [updated] = await db.update(geoAdCampaigns)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(geoAdCampaigns.id, id)).returning();
    if (!updated) return res.status(404).json({ error: 'Ad campaign not found' });
    return res.json(updated);
  } catch (error) {
    console.error('Update ad error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/ads/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const [deleted] = await db.delete(geoAdCampaigns).where(eq(geoAdCampaigns.id, id)).returning();
    if (!deleted) return res.status(404).json({ error: 'Ad campaign not found' });
    return res.json({ message: 'Ad campaign deleted' });
  } catch (error) {
    console.error('Delete ad error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Marketing Dashboard Stats ──

router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const [{ count: totalDistricts }] = await db.select({ count: sql<number>`count(*)::int` }).from(districts);
    const [{ count: totalContacts }] = await db.select({ count: sql<number>`count(*)::int` }).from(districtContacts);
    const [{ count: activeCampaigns }] = await db.select({ count: sql<number>`count(*)::int` }).from(campaigns).where(eq(campaigns.status, 'active'));
    const [{ count: totalEnrollments }] = await db.select({ count: sql<number>`count(*)::int` }).from(campaignEnrollments);
    const [{ count: totalWebinarRegs }] = await db.select({ count: sql<number>`count(*)::int` }).from(webinarRegistrations);
    const [{ count: documentsSent }] = await db.select({ count: sql<number>`count(*)::int` }).from(documentRequests);
    const [{ count: totalEmailsSent }] = await db.select({ count: sql<number>`count(*)::int` }).from(campaignEvents).where(eq(campaignEvents.eventType, 'sent'));

    // Districts by state
    const districtsByState = await db.select({
      state: districts.state,
      count: sql<number>`count(*)::int`,
    }).from(districts).groupBy(districts.state);

    return res.json({
      totalDistricts,
      totalContacts,
      activeCampaigns,
      totalEnrollments,
      totalWebinarRegs,
      documentsSent,
      totalEmailsSent,
      districtsByState,
    });
  } catch (error) {
    console.error('Marketing stats error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
