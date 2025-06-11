import { ContentBlock } from "@/types/inform/inform";

// Configuration for data sources
const DATA_SOURCES = {
  // Google Sheet for project data  
  // Make sheet public: Share → Anyone with link can view → Copy link
  // Then replace /edit#gid=0 with /export?format=csv&gid=0
  projectSheet: process.env.NEXT_PUBLIC_PROJECTS_SHEET_URL || '',
};

/**
 * Fetches calendar events from your existing API route
 * @returns Array of calendar events
 */
async function fetchCalendarEvents() {
  try {
    console.log('Fetching calendar events from API...');
    const response = await fetch('/api/calendar');
    
    if (!response.ok) {
      throw new Error(`Calendar API failed: ${response.status}`);
    }
    
    const events = await response.json();
    console.log(`Fetched ${events.length} calendar events`);
    return events;
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return [];
  }
}

/**
 * Fetches project data from Google Sheets CSV export
 * @returns Array of project objects
 */
async function fetchProjectData() {
  try {
    if (!DATA_SOURCES.projectSheet) {
      console.warn('Project sheet URL not provided');
      return [];
    }

    console.log('Fetching project data from Google Sheets');
    const response = await fetch(DATA_SOURCES.projectSheet);
    
    if (!response.ok) {
      throw new Error(`Sheet fetch failed: ${response.status}`);
    }
    
    const csvData = await response.text();
    return parseProjectCSV(csvData);
  } catch (error) {
    console.error('Error fetching project data:', error);
    return [];
  }
}

/**
 * Parses CSV data from Google Sheets into project objects
 * Expected columns: Title, Description, Team, Status, Internal
 * @param csvData - Raw CSV string
 * @returns Array of parsed projects
 */
function parseProjectCSV(csvData: string) {
  const lines = csvData.split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const projects = [];
  
  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    
    if (values.length >= headers.length && values[0]) { // Has title
      const project = {
        id: `project-${i}`,
        title: values[0],
        description: values[1] || '',
        team: values[2] ? values[2].split(';').map(t => t.trim()) : [],
        status: values[3] || 'Unknown',
        internal: values[4]?.toLowerCase() === 'true',
      };
      
      projects.push(project);
    }
  }
  
  console.log(`Parsed ${projects.length} projects from CSV`);
  return projects;
}

/**
 * Converts calendar events from your existing system to ContentBlock format
 * @param events - Events from the calendar API
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
        description: event.description,
        body: isAnnouncement ? event.description : undefined,
        url: event.url,
        tag: event.tag,
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
 * Uses your existing calendar API route for calendar data
 * @returns Promise<ContentBlock[]> - All content blocks sorted by date
 */
export async function getInformContent(): Promise<ContentBlock[]> {
  console.log('🔄 Fetching inform content from multiple sources...');
  
  try {
    // Fetch data from all sources in parallel for better performance
    const [calendarEvents, projects] = await Promise.all([
      fetchCalendarEvents(), // Your existing calendar API
      fetchProjectData(),
    ]);
    
    // Convert raw data to ContentBlock format
    const contentBlocks: ContentBlock[] = [
      ...convertEventsToContentBlocks(calendarEvents),
      ...convertProjectsToContentBlocks(projects),
    ];
    
    // Sort by date (most recent first) for events, projects go to end
    const sortedContent = contentBlocks.sort((a, b) => {
      // Projects always go to the end
      if (a.type === 'project' && b.type !== 'project') return 1;
      if (b.type === 'project' && a.type !== 'project') return -1;
      if (a.type === 'project' && b.type === 'project') return 0;
      
      // Sort events and announcements by date
      const dateA = a.type === 'project' ? new Date(0) : new Date((a.data as any).date || 0);
      const dateB = b.type === 'project' ? new Date(0) : new Date((b.data as any).date || 0);
      return dateB.getTime() - dateA.getTime();
    });
    
    console.log(`✅ Successfully loaded ${sortedContent.length} content blocks`);
    console.log(`   - ${calendarEvents.length} calendar events`);
    console.log(`   - ${projects.length} projects`);
    
    return sortedContent;
    
  } catch (error) {
    console.error('❌ Error loading inform content:', error);
    
    // Fallback to test data if production data fails
    console.log('🔄 Falling back to test data...');
    const { getInformContent: getTestContent } = await import('./getInformContent-test');
    return getTestContent();
  }
}