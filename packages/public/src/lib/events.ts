import { drizzle } from 'drizzle-orm/postgres-js';
import { and, asc, eq, gte } from 'drizzle-orm';
import postgres from 'postgres';
import { events } from '../../../api/src/db/schema';

export interface PublicEvent {
  id: number;
  title: string;
  description: string;
  eventDate: Date;
  endDate: Date | null;
  location: string | null;
  zoomLink: string | null;
  registrationRequired: boolean;
  maxAttendees: number | null;
}

async function queryEvents(): Promise<PublicEvent[]> {
  const url = process.env.BUILD_DATABASE_URL;
  if (!url) {
    console.warn('[events.ts] BUILD_DATABASE_URL unset — returning empty events list for build');
    return [];
  }

  const client = postgres(url, { max: 1 });
  try {
    const db = drizzle(client);
    const rows = await db
      .select({
        id: events.id,
        title: events.title,
        description: events.description,
        eventDate: events.eventDate,
        endDate: events.endDate,
        location: events.location,
        zoomLink: events.zoomLink,
        registrationRequired: events.registrationRequired,
        maxAttendees: events.maxAttendees,
      })
      .from(events)
      .where(and(eq(events.isPublished, true), gte(events.eventDate, new Date())))
      .orderBy(asc(events.eventDate));
    return rows;
  } finally {
    await client.end({ timeout: 5 });
  }
}

export async function getUpcomingEvents(): Promise<PublicEvent[]> {
  try {
    return await queryEvents();
  } catch (err) {
    console.error('[events.ts] query failed — returning empty list:', err);
    return [];
  }
}

export async function getEventById(id: number): Promise<PublicEvent | null> {
  const all = await getUpcomingEvents();
  return all.find((e) => e.id === id) || null;
}
