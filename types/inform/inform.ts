export type ContentBlock = {
    id: string;
    type: "announcement" | "event" | "project";
    data: AnnouncementData | EventData | ProjectData;
  };
  
  export type AnnouncementData = {
    title: string;
    body?: string;
    date?: string;
  };
  
  export type EventData = {
    title: string;
    date: string;
    time?: string;
    location?: string;
    description?: string;
  };
  
  export type ProjectData = {
    title: string;
    description?: string;
    team?: string[];
    status?: "In Progress" | "Shipped" | "Paused";
  };