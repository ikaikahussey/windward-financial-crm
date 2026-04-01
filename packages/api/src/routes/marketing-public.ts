import { Router, Request, Response } from 'express';
import { db } from '../db';
import { webinarRegistrations, documentRequests, districtContacts, districts } from '../db/schema';
import { eq } from 'drizzle-orm';
import { createOrUpdateLead } from '../services/lead-capture';

const router = Router();

// POST /section-125/register-webinar
router.post('/section-125/register-webinar', async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, phone, districtName, webinarTopic } = req.body;

    if (!firstName || !lastName || !email) {
      return res.status(400).json({ error: 'firstName, lastName, and email are required' });
    }

    // Create CRM lead
    const lead = await createOrUpdateLead({
      firstName,
      lastName,
      email,
      phone,
      leadSource: 'Webinar',
      notes: `Section 125 webinar registration. District: ${districtName || 'N/A'}. Topic: ${webinarTopic || 'General'}`,
    });

    // Create webinar registration
    const [registration] = await db.insert(webinarRegistrations).values({
      contactId: lead.contactId,
      firstName,
      lastName,
      email,
      phone,
      districtName,
      webinarTopic: webinarTopic || 'Section 125 Cafeteria Plans',
      webinarDate: null,
    }).returning();

    return res.status(201).json({ message: 'Registration successful!', registrationId: registration.id });
  } catch (error) {
    console.error('Webinar registration error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /section-125/download-pdf
router.post('/section-125/download-pdf', async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, phone, title, districtName } = req.body;

    if (!firstName || !lastName || !email) {
      return res.status(400).json({ error: 'firstName, lastName, and email are required' });
    }

    // Create CRM lead
    const lead = await createOrUpdateLead({
      firstName,
      lastName,
      email,
      phone,
      leadSource: 'Website',
      notes: `Section 125 PDF download. Title: ${title || 'N/A'}. District: ${districtName || 'N/A'}`,
    });

    // Create document request
    const [doc] = await db.insert(documentRequests).values({
      contactId: lead.contactId,
      documentType: 'Section 125 Guide',
      status: 'sent',
      documentUrl: '/section-125-cafeteria-plan-guide.pdf',
    }).returning();

    return res.status(201).json({
      message: 'Download ready!',
      downloadUrl: '/section-125-cafeteria-plan-guide.pdf',
      documentId: doc.id,
    });
  } catch (error) {
    console.error('PDF download error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /section-125/schedule — schedule appointment specific to S125
router.post('/section-125/schedule', async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, phone, title, districtName, message } = req.body;

    if (!firstName || !lastName || !email) {
      return res.status(400).json({ error: 'firstName, lastName, and email are required' });
    }

    const lead = await createOrUpdateLead({
      firstName,
      lastName,
      email,
      phone,
      leadSource: 'Website',
      notes: `Section 125 appointment request. Title: ${title || 'N/A'}. District: ${districtName || 'N/A'}. Message: ${message || ''}`,
    });

    return res.status(201).json({ message: 'Appointment request received!', contactId: lead.contactId });
  } catch (error) {
    console.error('S125 schedule error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
