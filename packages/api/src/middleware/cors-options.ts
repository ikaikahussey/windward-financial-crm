import type { Request } from 'express';
import type { CorsOptions } from 'cors';

/**
 * CORS policy.
 *
 * Allowed: the public site and admin app origins from PUBLIC_URL / ADMIN_URL
 * (each may be a comma-separated list), and the API's own origin, because the
 * API serves the client booking and intake pages, which post back to it.
 */
const splitOrigins = (value: string | undefined): string[] =>
  (value || '')
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean);

export function isOriginAllowed(origin: string | undefined, host: string | undefined): boolean {
  if (!origin) return true; // same-origin navigation, curl, server-to-server
  const allowed = [
    ...splitOrigins(process.env.PUBLIC_URL),
    ...splitOrigins(process.env.ADMIN_URL),
    ...splitOrigins(process.env.API_PUBLIC_URL),
  ];
  if (allowed.includes(origin)) return true;
  try {
    return Boolean(host) && new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function corsDelegate(req: Request, cb: (err: Error | null, options?: CorsOptions) => void) {
  const origin = req.get('origin');
  if (isOriginAllowed(origin, req.get('host'))) return cb(null, { origin: true, credentials: true });
  return cb(new Error(`CORS: origin ${origin} not allowed`));
}
