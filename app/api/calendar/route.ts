import { getGoogleCalendarEvents } from '@/lib/getGoogleCalendarEvents';

export async function GET() {
  try {
    const events = await getGoogleCalendarEvents();
    return Response.json(events);
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return Response.json({ error: 'Failed to fetch calendar events' }, { status: 500 });
  }
} 