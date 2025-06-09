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
    .replace(/https?:\/\/[^\s]+/, '')
    .replace(/#external/gi, '')
    .replace(/#internal/gi, '')
    .replace(/#\w+/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  let imageUrl: string | undefined = undefined;
  // Note: fetchOpenGraphImage functionality temporarily removed
  // if (url) {
  //   const ogImage = await fetchOpenGraphImage(url);
  //   if (ogImage) imageUrl = ogImage;
  // }

  return {
    id: event.uid || '',
    title: event.summary || '',
    description: cleanDescription,
    url,
    type,
    tag,
    date: event.start!.toISOString().split('T')[0],
    time: event.start!.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }),
    location: event.location || 'United States',
    imageUrl,
  };
} 