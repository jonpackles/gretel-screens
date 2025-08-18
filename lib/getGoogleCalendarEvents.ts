import { fetchGoogleCalendarEvents } from './inform/fetch/fetchEventsFromGoogleCal';

export async function getGoogleCalendarEvents() {
  try {
    const events = await fetchGoogleCalendarEvents();

    // Map Google Calendar API events to the expected shape
    return events.map((event: any) => {
      // Extract URL from description if present
      const desc = event.description || '';
      const urlMatch = desc.match(/https?:\/\/[^\s]+/);
      const url = urlMatch ? urlMatch[0] : undefined;

      // Tag and type logic (mimic old processCalendarEvent)
      let type: 'internal' | 'external' = 'external';
      if (/#internal/i.test(desc)) type = 'internal';
      let tag: string | undefined;
      const tagMatch = desc.match(/#(?!external|internal)(\w+)/i);
      if (tagMatch) tag = tagMatch[1];

      // Clean description
      let cleanDescription = desc
        .replace(/<a[^>]*>https?:\/\/[^\s]+<\/a>|https?:\/\/[^\s]+/, '')
        .replace(/<br\s*\/?\>/gi, '\n')
        .replace(/#external/gi, '')
        .replace(/#internal/gi, '')
        .replace(/#\w+/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      // Location logic
      let location = event.location || '';
      if (location === 'United States') {
        location = '';
      } else if (location) {
        const addressLines = location.split(/[\,\n]/);
        location = addressLines[0].trim();
      }

      // Time logic
      let time: string;
      const startTime = event.start?.dateTime ? new Date(event.start.dateTime) : (event.start?.date ? new Date(event.start.date) : undefined);
      const endTime = event.end?.dateTime ? new Date(event.end.dateTime) : (event.end?.date ? new Date(event.end.date) : undefined);
      
      if (startTime && startTime.getHours() === 0 && startTime.getMinutes() === 0) {
        time = 'All Day';
      } else if (startTime && endTime && endTime.getTime() !== startTime.getTime()) {
        const startFormatted = startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        const endFormatted = endTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        time = `${startFormatted}–${endFormatted}`;
      } else if (startTime) {
        time = startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      } else {
        time = '';
      }

      // Image attachment logic
      let imageUrl: string | undefined = undefined;
      if (Array.isArray(event.attachments)) {
        const imageAttachment = event.attachments.find((att: any) =>
          att.mimeType && att.mimeType.startsWith('image/') && att.fileUrl
        );
        if (imageAttachment) {
          imageUrl = imageAttachment.fileUrl;
        }
      }

      return {
        id: event.id || '',
        title: event.summary || '',
        description: cleanDescription,
        url,
        type,
        tag,
        date: (() => {
          // For all-day events, use the date field directly
          if (event.start?.date && !event.start?.dateTime) {
            return event.start.date;
          }
          
          // For timed events, extract date from the original dateTime string
          if (event.start?.dateTime) {
            // Extract YYYY-MM-DD from "2024-07-23T17:00:00-07:00"
            return event.start.dateTime.split('T')[0];
          }
          
          // Fallback to converted date if needed
          return startTime ? startTime.toISOString().split('T')[0] : '';
        })(),
        endDate: endTime ? endTime.toISOString().split('T')[0] : undefined,
        time,
        location,
        imageUrl,
      };
    });
  } catch (error) {
    console.error('Error fetching Google Calendar events:', error);
    throw error;
  }
}
