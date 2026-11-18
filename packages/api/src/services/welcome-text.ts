import { db } from '../db';
import { activities, appSettings, contacts, smsMessages } from '../db/schema';
import { eq, inArray } from 'drizzle-orm';
import { quoService } from './quo';
import { assignRep, type Rep } from './rep-assignment';
import { formatPhone, toE164 } from './phone';
import { apiBaseUrl, bookingLink, intakeLink, repCardLink } from './links';
import { pickFromNumber } from './sms';

/**
 * Instant welcome text for new registrations.
 *
 * Everything the text says is configured in the Admin CRM (Welcome Text page):
 * which users are reps, each rep's phone / email / photo, the message
 * template, and the on/off switch. Nothing about the reps is hard-coded.
 *
 * The Quo API sends SMS only (no MMS), so the photo is delivered as a link to
 * the rep's card (GET /r/:slug), whose link-preview image is the photo.
 */

export const TEMPLATE_VARIABLES = [
  { name: 'first_name', description: "Registrant's first name" },
  { name: 'rep_name', description: "Rep's full name" },
  { name: 'rep_first_name', description: "Rep's first name" },
  { name: 'rep_title', description: "Rep's title" },
  { name: 'rep_phone', description: "Rep's phone number" },
  { name: 'rep_email', description: "Rep's email" },
  { name: 'rep_photo_link', description: "Link to the rep's photo card" },
  { name: 'booking_link', description: "Link where the client picks a call time" },
  { name: 'intake_link', description: "Link to the client's pre-call questions" },
] as const;

export type TemplateVars = Record<(typeof TEMPLATE_VARIABLES)[number]['name'], string>;

export const DEFAULT_TEMPLATE =
  'Aloha {{first_name}}, mahalo for registering with Windward Financial. ' +
  'Your rep is {{rep_name}}. {{rep_first_name}} will call you right away. ' +
  'Phone: {{rep_phone}} | Email: {{rep_email}} | Photo: {{rep_photo_link}} ' +
  'Reply STOP to opt out.';

export const MAX_TEMPLATE_LENGTH = 1000;

const KEY_ENABLED = 'welcome_text.enabled';
const KEY_TEMPLATE = 'welcome_text.template';

export interface WelcomeTextSettings {
  enabled: boolean;
  template: string;
}

export async function getWelcomeTextSettings(): Promise<WelcomeTextSettings> {
  const rows = await db
    .select()
    .from(appSettings)
    .where(inArray(appSettings.key, [KEY_ENABLED, KEY_TEMPLATE]));
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    enabled: map.get(KEY_ENABLED) !== 'false',
    template: map.get(KEY_TEMPLATE) || DEFAULT_TEMPLATE,
  };
}

export async function saveWelcomeTextSettings(
  patch: Partial<WelcomeTextSettings>,
  userId: number | null,
): Promise<WelcomeTextSettings> {
  const upsert = async (key: string, value: string) => {
    await db
      .insert(appSettings)
      .values({ key, value, updatedBy: userId })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: { value, updatedBy: userId, updatedAt: new Date() },
      });
  };
  if (patch.enabled !== undefined) await upsert(KEY_ENABLED, String(patch.enabled));
  if (patch.template !== undefined) await upsert(KEY_TEMPLATE, patch.template);
  return getWelcomeTextSettings();
}

/** Variables used in a template that are not in TEMPLATE_VARIABLES. */
export function unknownVariables(template: string): string[] {
  const known = new Set<string>(TEMPLATE_VARIABLES.map((v) => v.name));
  const found = [...template.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)].map((m) => m[1]);
  return [...new Set(found.filter((v) => !known.has(v)))];
}

export function renderTemplate(template: string, vars: TemplateVars): string {
  return template
    .replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, name: string) => (vars as Record<string, string>)[name] ?? '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/** SMS segments the carrier will bill: GSM-7 = 160/153 chars, otherwise 70/67. */
export function smsSegments(body: string): number {
  const gsm = /^[\x20-\x7E\n\r]*$/.test(body);
  const [single, multi] = gsm ? [160, 153] : [70, 67];
  return body.length <= single ? 1 : Math.ceil(body.length / multi);
}

export function slugify(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ'’ʻ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Public URL of the rep's photo card, or '' when it cannot be built. */
export function repCardUrl(rep: Pick<Rep, 'profileSlug'>): string {
  return repCardLink(rep.profileSlug);
}

export function templateVarsFor(
  firstName: string,
  rep: Rep,
  quoLine?: string | null,
  contactToken: string | null = 'preview',
): TemplateVars {
  return {
    first_name: firstName.trim(),
    rep_name: rep.name,
    rep_first_name: rep.name.trim().split(/\s+/)[0] ?? '',
    rep_title: rep.title ?? '',
    rep_phone: formatPhone(rep.phone) || formatPhone(quoLine) || '',
    rep_email: rep.email,
    rep_photo_link: repCardUrl(rep),
    booking_link: bookingLink(contactToken),
    intake_link: intakeLink(contactToken),
  };
}

/** Problems that would make this rep's text incomplete. Shown in the admin UI. */
export function repWarnings(rep: Rep, template: string): string[] {
  const uses = (v: string) => new RegExp(`\\{\\{\\s*${v}\\s*\\}\\}`).test(template);
  const out: string[] = [];
  if (uses('rep_phone') && !toE164(rep.phone)) out.push('No valid phone number');
  if (uses('rep_photo_link')) {
    if (!rep.photoData) out.push('No photo uploaded');
    if (!apiBaseUrl()) out.push('API_PUBLIC_URL is not set, so the photo link is blank');
  }
  if (uses('rep_title') && !rep.title) out.push('No title');
  return out;
}

export type WelcomeTextResult =
  | { sent: true; messageId: number; body: string }
  | { sent: false; reason: string };

async function note(contactId: number, subject: string, body?: string) {
  await db.insert(activities).values({ contactId, activityType: 'Note', subject, body: body ?? null });
}

export { pickFromNumber };

export async function sendWelcomeText(contactId: number): Promise<WelcomeTextResult> {
  // Env var is a hard kill switch; the Admin CRM switch is the normal control.
  if (process.env.WELCOME_SMS_ENABLED === 'false') return { sent: false, reason: 'disabled' };
  const settings = await getWelcomeTextSettings();
  if (!settings.enabled) return { sent: false, reason: 'disabled' };

  const [contact] = await db.select().from(contacts).where(eq(contacts.id, contactId)).limit(1);
  if (!contact) return { sent: false, reason: 'contact not found' };

  if (contact.smsOptOut) return { sent: false, reason: 'opted out' };
  const to = toE164(contact.phone);
  if (!to) return { sent: false, reason: 'no valid mobile number' };

  const rep = await assignRep(contactId);
  if (!rep) {
    await note(contactId, 'Welcome text not sent', 'No rep is selected (Admin CRM > Welcome Text).');
    return { sent: false, reason: 'no lead rep configured' };
  }

  if (!quoService.isConfigured()) {
    await note(contactId, 'Welcome text not sent', 'QUO_API_KEY is not configured.');
    return { sent: false, reason: 'quo not configured' };
  }

  const from = await pickFromNumber(rep.id);
  if (!from) {
    await note(contactId, 'Welcome text not sent', 'No Quo phone numbers synced.');
    return { sent: false, reason: 'no quo phone number' };
  }

  const body = renderTemplate(
    settings.template,
    templateVarsFor(contact.firstName, rep, from.assignedUserId === rep.id ? from.phoneNumber : null, contact.publicToken),
  );

  try {
    const result = await quoService.sendSMS(from.quoPhoneNumberId, to, body);

    const [message] = await db
      .insert(smsMessages)
      .values({
        quoMessageId: result?.id ?? null,
        contactId,
        agentId: rep.id,
        direction: 'outbound',
        body,
        status: 'sent',
        quoPhoneNumberId: from.quoPhoneNumberId,
        participantNumber: to,
        sentAt: new Date(),
      })
      .returning({ id: smsMessages.id });

    await db.insert(activities).values({
      contactId,
      userId: rep.id,
      activityType: 'SMS Sent',
      subject: `Welcome text sent (rep: ${rep.name})`,
      body,
    });

    // Tell the rep to call now. Best-effort; skipped when the rep's cell is
    // the sending line itself.
    const repCell = toE164(rep.phone);
    if (repCell && repCell !== toE164(from.phoneNumber)) {
      try {
        await quoService.sendSMS(
          from.quoPhoneNumberId,
          repCell,
          `New registration: ${contact.firstName} ${contact.lastName}, ${formatPhone(to)}. ` +
            'They were just texted that you will call right away.',
        );
      } catch (err) {
        console.error(`Rep alert text failed for contact ${contactId}:`, err);
      }
    }

    return { sent: true, messageId: message.id, body };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Welcome text failed for contact ${contactId}:`, err);
    await note(contactId, 'Welcome text failed', msg);
    return { sent: false, reason: msg };
  }
}
