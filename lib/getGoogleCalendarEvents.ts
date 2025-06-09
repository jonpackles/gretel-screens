const ICAL_URL = 'https://calendar.google.com/calendar/ical/c_003c5b670b6f318dfe479736156f2a34fb9709fb7ba8c1a610466295b19aee99%40group.calendar.google.com/private-d3d5b2bdaaa19b69b337a4dac0fdb7ac/basic.ics';

import ical from 'ical'
import { processCalendarEvent } from './utils/processCalendarEvent';

export async function getGoogleCalendarEvents() {
    try {
    const response = await fetch(ICAL_URL);
    const icalData = await response.text();
    const parsedData = ical.parseICS(icalData);

    const events = await Promise.all(
        (Object.values(parsedData) as ical.CalendarComponent[])
          .filter((event): event is ical.CalendarComponent => 
            event.type === 'VEVENT' && 
            new Date(event.start!) >= new Date()
          )
          .sort((a, b) => a.start!.getTime() - b.start!.getTime())
          .slice(0, 12)
          .map(processCalendarEvent)
      );

    return events;
  } catch (error) {
    console.error('Error fetching US holidays:', error);
    throw error;
  }
}
