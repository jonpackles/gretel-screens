import { ContentBlock } from "@/shared/types/inform/inform";
import { getGoogleCalendarEvents } from "@/lib/getGoogleCalendarEvents";
import { fetchProjectsFromSheet } from "./fetch/fetchProjectsFromSheet";

/**
 * Converts calendar events from your existing system to ContentBlock format
 * @param events - Events from getGoogleCalendarEvents()
 * @returns Array of ContentBlocks
 */
function convertEventsToContentBlocks(events: any[]): ContentBlock[] {
  return events.map((event) => {
    // Determine if this is an announcement or event based on tag or description
    const isAnnouncement = event.tag === 'announcement' || 
                          event.description?.toLowerCase().includes('announcement') || 
                          event.title?.toLowerCase().includes('announcement');
    
    return {
      id: event.id,
      type: isAnnouncement ? "announcement" : "event",
      data: {
        title: event.title,
        date: event.date, // Already in YYYY-MM-DD format from your processCalendarEvent
        time: event.time, // Already formatted from your processCalendarEvent
        location: event.location,
        description: isAnnouncement ? undefined : event.description, // Events get description
        body: isAnnouncement ? event.description : undefined,        // Announcements get body
        url: event.url,
        tag: isAnnouncement ? 'Announcement' : (event.tag || 'Event'),
        imageUrl: event.imageUrl,
      },
      internal: event.type === 'internal', // Your system uses 'internal'/'external' strings
    } as ContentBlock;
  });
}

/**
 * Converts projects to ContentBlock format
 * @param projects - Raw project data
 * @returns Array of ContentBlocks
 */
function convertProjectsToContentBlocks(projects: any[]): ContentBlock[] {
  return projects.map(project => ({
    id: project.id,
    type: "project",
    data: {
      title: project.title,
      description: project.description,
      team: project.team,
      status: project.status,
    },
    internal: project.internal,
  } as ContentBlock));
}

/**
 * Main function to fetch all inform content from multiple sources
 * Uses your existing getGoogleCalendarEvents() for calendar data
 * @returns Promise<ContentBlock[]> - All content blocks sorted by date
 */
export async function getInformContent(): Promise<ContentBlock[]> {
  let calendarEvents: any[] = [];
  let projects: any[] = [];
  let hasErrors = false;
  
  // Fetch calendar events with individual error handling
  try {
    calendarEvents = await getGoogleCalendarEvents();
  } catch (error) {
    hasErrors = true;
  }
  
  // Fetch projects with individual error handling
  try {
    projects = await fetchProjectsFromSheet();
  } catch (error) {
    hasErrors = true;
  }
  
  // If we have some data, use it even if there were partial errors
  if (calendarEvents.length > 0 || projects.length > 0) {
    
    // Convert raw data to ContentBlock format
    const contentBlocks: ContentBlock[] = [
      ...convertEventsToContentBlocks(calendarEvents),
      ...convertProjectsToContentBlocks(projects),
    ];
    
    // Sort by date (soonest first) for events, projects go to end
    const sortedContent = contentBlocks.sort((a, b) => {
      // Projects always go to the end
      if (a.type === 'project' && b.type !== 'project') return 1;
      if (b.type === 'project' && a.type !== 'project') return -1;
      if (a.type === 'project' && b.type === 'project') return 0;
      
      // Sort events and announcements by date (ascending)
      const dateA = a.type === 'project' ? new Date(0) : new Date((a.data as any).date || 0);
      const dateB = b.type === 'project' ? new Date(0) : new Date((b.data as any).date || 0);
      return dateA.getTime() - dateB.getTime();
    });
    
    if (hasErrors) {
      return sortedContent;
    } else {
      return sortedContent;
    }
  }
  
  // Only fall back to test data if we got no data at all
  const { getInformContent: getTestContent } = await import('./getInformContent-test');
  return getTestContent();
}