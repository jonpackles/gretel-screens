import { google } from 'googleapis';
import path from 'path';

export async function fetchGoogleCalendarEvents() {
  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(process.cwd(), 'lib/credentials/service-account.json'),
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
  });

  const calendar = google.calendar({ version: 'v3', auth });
  const calendarId = process.env.GOOGLE_CALENDAR_ID; // Set this in your .env

  const now = new Date().toISOString();
  const response = await calendar.events.list({
    calendarId,
    timeMin: now,
    maxResults: 20,
    singleEvents: true,
    orderBy: 'startTime',
  });

  return response.data.items || [];
}
