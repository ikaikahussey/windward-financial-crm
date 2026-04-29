import postgres from 'postgres';

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

type EventRow = {
  id: number;
  title: string;
  description: string;
  event_date: Date;
  end_date: Date | null;
  location: string | null;
  zoom_link: string | null;
  registration_required: boolean;
  max_attendees: number | null;
};

const fromRow = (r: EventRow): PublicEvent => ({
  id: r.id,
  title: r.title,
  description: r.description,
  eventDate: r.event_date,
  endDate: r.end_date,
  location: r.location,
  zoomLink: r.zoom_link,
  registrationRequired: r.registration_required,
  maxAttendees: r.max_attendees,
});

export async function getUpcomingEvents(): Promise<PublicEvent[]> {
  const url = process.env.BUILD_DATABASE_URL;
  if (!url) {
    console.warn('[events] BUILD_DATABASE_URL not set — returning empty event list for build');
    return [];
  }

  const client = postgres(url, { max: 1 });
  try {
    const rows = await client<EventRow[]>`
      select id, title, description, event_date, end_date, location,
             zoom_link, registration_required, max_attendees
      from events
      where is_published = true
        and event_date >= now()
      order by event_date asc
    `;
    return rows.map(fromRow);
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
    const rows = await client<EventRow[]>`
      select id, title, description, event_date, end_date, location,
             zoom_link, registration_required, max_attendees
      from events
      where id = ${id}
        and is_published = true
      limit 1
    `;
    return rows[0] ? fromRow(rows[0]) : null;
  } catch (err) {
    console.warn('[events] getEventById failed:', err);
    return null;
  } finally {
    await client.end();
  }
}
