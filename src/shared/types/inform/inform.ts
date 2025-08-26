export type ContentBlock = {
    id: string;
    type: "announcement" | "event" | "project";
    data: EventData | ProjectData;
    internal?: boolean;  // Optional boolean to indicate if the block is internal
  };
  
  export type EventData = {
    title: string;
    date?: string;          // Made optional to support announcements without dates
    time?: string;
    location?: string;
    description?: string;   // This covers both event descriptions and announcement body text
    body?: string;          // Keep for backward compatibility with existing announcement data
    imageUrl?: string;
    tag?: string;
  };
  
  export type ProjectData = {
    title: string;
    description?: string;
    team?: string[];
    status?: "In Progress" | "Shipped" | "Paused";
    imageUrl?: string;  // Selected image from project folder (backward compatibility)
    mediaUrls?: string[]; // Multiple selected media files from project folder
  };