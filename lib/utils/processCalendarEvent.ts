import ical from 'ical';

export async function processCalendarEvent(event: ical.CalendarComponent) {
  const desc = event.description || '';
  const urlMatch = desc.match(/https?:\/\/[^\s]+/);
  const url = urlMatch ? urlMatch[0] : undefined;

  let type: 'internal' | 'external' = 'external';
  if (/#internal/i.test(desc)) {
    type = 'internal';
  }

  // Find a tag after a # that is not #external or #internal
  let tag: string | undefined;
  const tagMatch = desc.match(/#(?!external|internal)(\w+)/i);
  if (tagMatch) tag = tagMatch[1];

  // Remove url, #external, #internal, and #tag from description
  let cleanDescription = desc
    .replace(/<a[^>]*>https?:\/\/[^\s]+<\/a>|https?:\/\/[^\s]+/, '')
    .replace(/<br\s*\/?>/gi, '\n') 
    .replace(/#external/gi, '')
    .replace(/#internal/gi, '')
    .replace(/#\w+/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Process location
  let location = event.location || '';
  if (location === 'United States') {
    location = '';
  } else if (location) {
    // If location is a full address, use just the first line
    const addressLines = location.split(/[,\n]/);
    location = addressLines[0].trim();
  }

  // Process time
  let time: string;
  const startTime = event.start!;
  const endTime = event.end;
  
  // Check if it's an all-day event (starts at 12:00 AM)
  if (startTime.getHours() === 0 && startTime.getMinutes() === 0) {
    time = 'All Day';
  } else if (endTime && endTime.getTime() !== startTime.getTime()) {
    // Format time range if end time exists and is different from start
    const startFormatted = startTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    const endFormatted = endTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    time = `${startFormatted}–${endFormatted}`;
  } else {
    // Single start time
    time = startTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  let imageUrl: string | undefined = undefined;

  return {
    id: event.uid || '',
    title: event.summary || '',
    description: cleanDescription,
    url,
    type,
    tag,
    date: event.start!.toISOString().split('T')[0],
    time,
    location,
    imageUrl,
  };
} 