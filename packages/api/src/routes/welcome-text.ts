import { Router, Request, Response } from 'express';
import { db } from '../db';
import { users } from '../db/schema';
import { and, asc, eq, ne } from 'drizzle-orm';
import { quoService } from '../services/quo';
import { toE164 } from '../services/phone';
import {
  DEFAULT_TEMPLATE,
  MAX_TEMPLATE_LENGTH,
  TEMPLATE_VARIABLES,
  getWelcomeTextSettings,
  pickFromNumber,
  renderTemplate,
  repCardUrl,
  repWarnings,
  saveWelcomeTextSettings,
  slugify,
  smsSegments,
  templateVarsFor,
  unknownVariables,
} from '../services/welcome-text';

/**
 * Admin settings for the instant welcome text. Mounted at /api/welcome-text
 * behind requireAuth + requireAdmin.
 */
const router = Router();

const PHOTO_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_PHOTO_BYTES = 600 * 1024; // carrier-safe size for link previews

type UserRow = typeof users.$inferSelect;

function shapeRep(u: UserRow, template: string) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    phone: u.phone,
    title: u.title,
    profileSlug: u.profileSlug,
    isLeadRep: u.isLeadRep,
    hasPhoto: Boolean(u.photoData),
    photoUrl: u.photoData && u.profileSlug ? `/api/public/r/${u.profileSlug}/photo?v=${u.updatedAt.getTime()}` : null,
    cardUrl: repCardUrl(u) || (u.profileSlug ? `/api/public/r/${u.profileSlug}` : null),
    lastLeadAssignedAt: u.lastLeadAssignedAt,
    warnings: u.isLeadRep ? repWarnings(u, template) : [],
  };
}

async function buildState() {
  const settings = await getWelcomeTextSettings();
  const all = await db.select().from(users).orderBy(asc(users.name));
  const reps = all.map((u) => shapeRep(u, settings.template));
  const active = all.filter((u) => u.isLeadRep);
  const sample = active[0] ?? all[0];

  const warnings: string[] = [];
  if (active.length === 0) warnings.push('No rep is selected. Welcome texts will not send.');
  if (!quoService.isConfigured()) warnings.push('QUO_API_KEY is not set. Welcome texts will not send.');
  if (process.env.WELCOME_SMS_ENABLED === 'false') {
    warnings.push('WELCOME_SMS_ENABLED=false is set on the server and overrides this switch.');
  }

  const preview = sample
    ? renderTemplate(settings.template, templateVarsFor('Lani', sample))
    : '';

  return {
    enabled: settings.enabled,
    template: settings.template,
    defaultTemplate: DEFAULT_TEMPLATE,
    maxTemplateLength: MAX_TEMPLATE_LENGTH,
    variables: TEMPLATE_VARIABLES,
    reps,
    warnings,
    preview: { body: preview, length: preview.length, segments: smsSegments(preview), repId: sample?.id ?? null },
  };
}

function validateTemplate(template: unknown): string | null {
  if (typeof template !== 'string' || !template.trim()) return 'template is required';
  if (template.length > MAX_TEMPLATE_LENGTH) return `template must be ${MAX_TEMPLATE_LENGTH} characters or fewer`;
  const unknown = unknownVariables(template);
  if (unknown.length) return `Unknown variable(s): ${unknown.map((v) => `{{${v}}}`).join(', ')}`;
  return null;
}

// GET / — settings, variables, every user with rep fields, and a live preview
router.get('/', async (_req: Request, res: Response) => {
  try {
    return res.json(await buildState());
  } catch (error) {
    console.error('Welcome text settings error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT / — update on/off switch and/or message template
router.put('/', async (req: Request, res: Response) => {
  try {
    const { enabled, template } = req.body ?? {};
    const patch: { enabled?: boolean; template?: string } = {};
    if (enabled !== undefined) {
      if (typeof enabled !== 'boolean') return res.status(400).json({ error: 'enabled must be true or false' });
      patch.enabled = enabled;
    }
    if (template !== undefined) {
      const err = validateTemplate(template);
      if (err) return res.status(400).json({ error: err });
      patch.template = (template as string).trim();
    }
    await saveWelcomeTextSettings(patch, req.session.userId ?? null);
    return res.json(await buildState());
  } catch (error) {
    console.error('Welcome text save error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /preview — render an unsaved template for a given rep
router.post('/preview', async (req: Request, res: Response) => {
  try {
    const { template, repId } = req.body ?? {};
    const err = validateTemplate(template);
    if (err) return res.status(400).json({ error: err });
    const [rep] = repId
      ? await db.select().from(users).where(eq(users.id, Number(repId))).limit(1)
      : await db.select().from(users).where(eq(users.isLeadRep, true)).orderBy(asc(users.name)).limit(1);
    if (!rep) return res.status(400).json({ error: 'Select a rep first' });
    const body = renderTemplate(template, templateVarsFor('Lani', rep));
    return res.json({ body, length: body.length, segments: smsSegments(body), repId: rep.id });
  } catch (error) {
    console.error('Welcome text preview error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /reps/:id — change who is a rep and what the text says about them.
// `photo` is a data URL (image/jpeg|png|webp) to set, or null to remove.
router.patch('/reps/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'invalid id' });
    const [current] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!current) return res.status(404).json({ error: 'User not found' });

    const { isLeadRep, phone, title, profileSlug, photo } = req.body ?? {};
    const update: Partial<UserRow> = { updatedAt: new Date() };

    if (isLeadRep !== undefined) {
      if (typeof isLeadRep !== 'boolean') return res.status(400).json({ error: 'isLeadRep must be true or false' });
      update.isLeadRep = isLeadRep;
    }
    if (phone !== undefined) {
      if (phone && !toE164(phone)) return res.status(400).json({ error: 'Enter a 10-digit US phone number' });
      update.phone = phone || null;
    }
    if (title !== undefined) update.title = title ? String(title).slice(0, 255) : null;

    if (photo !== undefined) {
      if (photo === null) {
        update.photoData = null;
        update.photoMime = null;
      } else {
        const m = /^data:([a-z/+.-]+);base64,([A-Za-z0-9+/=]+)$/.exec(String(photo));
        if (!m || !PHOTO_MIMES.includes(m[1])) {
          return res.status(400).json({ error: 'Photo must be a JPG, PNG, or WebP image' });
        }
        if (Buffer.byteLength(m[2], 'base64') > MAX_PHOTO_BYTES) {
          return res.status(400).json({ error: 'Photo must be 600 KB or smaller' });
        }
        update.photoMime = m[1];
        update.photoData = m[2];
      }
    }

    // Slug: explicit value, else keep, else derive from the name once needed.
    let slug: string | null | undefined;
    if (profileSlug !== undefined) slug = profileSlug ? slugify(String(profileSlug)) : null;
    const willBeRep = update.isLeadRep ?? current.isLeadRep;
    if (!slug && slug !== undefined && willBeRep) slug = undefined; // reps always keep a slug
    if (slug === undefined && !current.profileSlug && (willBeRep || update.photoData)) {
      slug = slugify(current.name) || `rep-${current.id}`;
    }
    if (slug) {
      const [taken] = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.profileSlug, slug), ne(users.id, id)))
        .limit(1);
      if (taken) slug = `${slug}-${id}`;
      update.profileSlug = slug;
    } else if (slug === null) {
      update.profileSlug = null;
    }

    await db.update(users).set(update).where(eq(users.id, id));
    return res.json(await buildState());
  } catch (error) {
    console.error('Welcome text rep update error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /test — send the current text to a number you choose, as a given rep
router.post('/test', async (req: Request, res: Response) => {
  try {
    const { to, repId } = req.body ?? {};
    const number = toE164(to);
    if (!number) return res.status(400).json({ error: 'Enter a 10-digit US mobile number' });
    const [rep] = await db.select().from(users).where(eq(users.id, Number(repId))).limit(1);
    if (!rep) return res.status(400).json({ error: 'Select a rep' });
    if (!quoService.isConfigured()) return res.status(400).json({ error: 'QUO_API_KEY is not configured' });
    const from = await pickFromNumber(rep.id);
    if (!from) return res.status(400).json({ error: 'No Quo phone numbers synced' });

    const settings = await getWelcomeTextSettings();
    const body = renderTemplate(
      settings.template,
      templateVarsFor('Lani', rep, from.assignedUserId === rep.id ? from.phoneNumber : null),
    );
    await quoService.sendSMS(from.quoPhoneNumberId, number, body);
    return res.json({ sent: true, body, from: from.phoneNumber });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Send failed';
    console.error('Welcome text test error:', error);
    return res.status(502).json({ error: msg });
  }
});

export default router;
