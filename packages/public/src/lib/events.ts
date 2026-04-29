import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { and, asc, eq, gte } from 'drizzle-orm';
import { events } from '../../../api/src/db/schema';

export type PublicEvent = {
  id: number;
  title: string;
  description: string;
  eventDate: Date;
  endDate: Date | null;
  location: string | null;
  zoomLink: string | null;
  registrationRequired: boolean;
  maxAttendees: number | null;
};

export async function getUpcomingEvents(): Promise<PublicEvent[]> {
  const url = process.env.BUILD_DATABASE_URL;
  if (!url) {
    console.warn('[events] BUILD_DATABASE_URL not set — returning empty event list for build');
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
  } catch (err) {
    console.warn('[events] query failed — returning empty event list:', err);
    return [];
  } finally {
    await client.end();
  }
}

export async function getEventById(id: number): Promise<PublicEvent | null> {
  const url = process.env.BUILD_DATABASE_URL;
  if (!url) return null;

  const client = postgres(url, { max: 1 });
  try {
    const db = drizzle(client);
    const [row] = await db
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
      .where(and(eq(events.id, id), eq(events.isPublished, true)))
      .limit(1);
    return row ?? null;
  } catch (err) {
    console.warn('[events] getEventById failed:', err);
    return null;
  } finally {
    await client.end();
  }
}
