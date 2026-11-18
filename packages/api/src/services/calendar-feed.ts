import ical from 'node-ical';

/**
 * Read a rep's busy times from a read-only ICS calendar link.
 *
 * Proton Calendar has no API, but any calendar can be shared as an ICS link
 * (Proton: Settings > Calendars > Share via link). Only the times are used;
 * event titles are never stored or shown.
 */

export interface Interval {
  start: Date;
  end: Date;
}

const CACHE_MS = 5 * 60 * 1000;
const FETCH_TIMEOUT_MS = 10_000;
const cache = new Map<string, { at: number; text: string }>();

export function clearFeedCache() {
  cache.clear();
}

export function validateFeedUrl(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url.trim().replace(/^webcal:/i, 'https:'));
  } catch {
    return 'Not a valid link';
  }
  if (u.protocol !== 'https:') return 'Link must start with https://';
  const host = u.hostname.toLowerCase();
  if (host === 'localhost' || /^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host) || host.endsWith('.internal')) {
    return 'Link must be a public calendar address';
  }
  return null;
}

export async function fetchFeedText(url: string, fresh = false): Promise<string> {
  const normalized = url.trim().replace(/^webcal:/i, 'https:');
  const hit = cache.get(normalized);
  if (!fresh && hit && Date.now() - hit.at < CACHE_MS) return hit.text;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(normalized, { signal: controller.signal, redirect: 'follow' });
    if (!res.ok) throw new Error(`Calendar link returned ${res.status}`);
    const text = await res.text();
    if (!text.includes('BEGIN:VCALENDAR')) throw new Error('Link did not return a calendar');
    cache.set(normalized, { at: Date.now(), text });
    return text;
  } finally {
    clearTimeout(timer);
  }
}

/** Busy intervals in [from, to] from ICS text. Recurring events are expanded. */
export function busyFromIcs(
  icsText: string,
  from: Date,
  to: Date,
  opts: { ignoreAllDay?: boolean } = {},
): Interval[] {
  const parsed = ical.sync.parseICS(icsText);
  const out: Interval[] = [];
  for (const item of Object.values(parsed)) {
    if (!item || item.type !== 'VEVENT') continue;
    if (item.status === 'CANCELLED' || item.transparency === 'TRANSPARENT') continue;
    let instances;
    try {
      instances = ical.expandRecurringEvent(item, { from, to, expandOngoing: true });
    } catch {
      continue; // one malformed event must not hide the rest
    }
    for (const inst of instances) {
      if (opts.ignoreAllDay !== false && inst.isFullDay) continue;
      const start = new Date(inst.start);
      const end = inst.end ? new Date(inst.end) : new Date(start.getTime() + 30 * 60_000);
      if (end > from && start < to) out.push({ start, end });
    }
  }
  return out.sort((a, b) => a.start.getTime() - b.start.getTime());
}

export async function busyFromFeed(
  url: string,
  from: Date,
  to: Date,
  opts: { ignoreAllDay?: boolean; fresh?: boolean } = {},
): Promise<Interval[]> {
  return busyFromIcs(await fetchFeedText(url, opts.fresh), from, to, opts);
}
