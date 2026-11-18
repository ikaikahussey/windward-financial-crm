import { Router, Request, Response } from 'express';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { formatPhone, toE164 } from '../services/phone';

/**
 * Public rep card: GET /r/:slug (HTML) and GET /r/:slug/photo.
 *
 * The welcome text links here. Content comes from the user row, so edits made
 * in the Admin CRM show immediately. The Open Graph image is the rep's photo,
 * so phones that render link previews show it in the message thread.
 */
const router = Router();

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

async function findRep(slug: string) {
  const [rep] = await db.select().from(users).where(eq(users.profileSlug, slug)).limit(1);
  // Only people currently offered as reps have a public card.
  return rep?.isLeadRep ? rep : null;
}

router.get('/:slug/photo', async (req: Request, res: Response) => {
  try {
    const [rep] = await db
      .select()
      .from(users)
      .where(eq(users.profileSlug, req.params.slug as string))
      .limit(1);
    if (!rep?.photoData || !rep.photoMime) return res.status(404).send('Not found');
    res.set('Content-Type', rep.photoMime);
    res.set('Cache-Control', 'public, max-age=300');
    return res.send(Buffer.from(rep.photoData, 'base64'));
  } catch (error) {
    console.error('Rep photo error:', error);
    return res.status(500).send('Error');
  }
});

router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const rep = await findRep(req.params.slug as string);
    if (!rep) return res.status(404).send('Not found');

    const base = `${req.protocol}://${req.get('host')}`;
    const photoUrl = rep.photoData ? `${base}/r/${rep.profileSlug}/photo?v=${rep.updatedAt.getTime()}` : '';
    const tel = toE164(rep.phone);
    const phone = formatPhone(rep.phone);
    const name = esc(rep.name);
    const title = esc(rep.title || 'Windward Financial');
    const email = esc(rep.email);
    const initials = esc(rep.name.split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase());
    const description = esc(
      [`${rep.name}, ${rep.title || 'your rep'} at Windward Financial.`, phone, rep.email].filter(Boolean).join(' '),
    );

    res.set('Content-Type', 'text/html; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=300');
    return res.send(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${name} — Windward Financial</title>
<meta name="description" content="${description}">
<meta property="og:type" content="profile">
<meta property="og:title" content="${name} — Windward Financial">
<meta property="og:description" content="${description}">
<meta property="og:url" content="${esc(`${base}/r/${rep.profileSlug}`)}">
${photoUrl ? `<meta property="og:image" content="${esc(photoUrl)}">\n<meta name="twitter:card" content="summary_large_image">` : ''}
<style>
  body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#f6f3ec;color:#1f2937}
  main{max-width:24rem;margin:0 auto;padding:2.5rem 1.25rem;text-align:center}
  .photo{width:12rem;height:12rem;border-radius:50%;object-fit:cover;background:#d9ece8;display:flex;align-items:center;justify-content:center;margin:0 auto 1.25rem;font-size:4rem;color:#14524a}
  h1{font-size:1.75rem;margin:0 0 .25rem;color:#14524a}
  .title{margin:0 0 1.5rem;color:#1d7a6d;font-weight:600}
  a.btn{display:block;padding:.9rem 1rem;border-radius:.6rem;margin:.6rem 0;text-decoration:none;font-weight:600;font-size:1.05rem}
  a.primary{background:#1d7a6d;color:#fff}
  a.secondary{border:1px solid #1d7a6d;color:#14524a;background:#fff}
  .email{word-break:break-all}
  footer{margin-top:2rem;font-size:.85rem;color:#6b7280}
</style>
</head>
<body>
<main>
  ${photoUrl ? `<img class="photo" src="${esc(photoUrl)}" alt="${name}" width="192" height="192">` : `<div class="photo">${initials}</div>`}
  <h1>${name}</h1>
  <p class="title">${title}</p>
  ${tel ? `<a class="btn primary" href="tel:${tel}">Call ${esc(phone)}</a>\n  <a class="btn secondary" href="sms:${tel}">Text ${esc(phone)}</a>` : ''}
  <a class="btn secondary email" href="mailto:${email}">${email}</a>
  <footer>Windward Financial</footer>
</main>
</body>
</html>`);
  } catch (error) {
    console.error('Rep card error:', error);
    return res.status(500).send('Error');
  }
});

export default router;
