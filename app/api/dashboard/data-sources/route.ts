import { NextResponse } from 'next/server';

export async function GET() {
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  const sheetId = process.env.GOOGLE_SHEET_ID;

  return NextResponse.json({
    calendar: {
      hasId: !!calendarId,
      url: calendarId ? `https://calendar.google.com/calendar/u/0/r?cid=${encodeURIComponent(calendarId)}` : null
    },
    sheet: {
      hasId: !!sheetId,
      url: sheetId ? `https://docs.google.com/spreadsheets/d/${sheetId}/edit` : null
    }
  });
}
