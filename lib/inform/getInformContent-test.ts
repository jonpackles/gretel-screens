import { ContentBlock } from "@/shared/types/inform/inform";

export const getInformContent = async (): Promise<ContentBlock[]> => {
  return [
    {
      id: "1",
      type: "announcement",
      data: {
        title: "Paloma's Birthday!",
        body: "Join us at 3pm in the kitchen for cake and embarrassing stories.",
        date: "2025-06-12",
        tag: "Announcement"
      },
      internal: true
    },
    {
      id: "2",
      type: "event",
      data: {
        title: "Creative Mornings NY",
        date: "2025-06-14",
        time: "7:00–8:30 AM",
        location: "@ Buck NY",
        description: "Monthly gathering of creative professionals.",
        tag: "Event"
      },
      internal: false
    },
    {
      id: "3",
      type: "project",
      data: {
        title: "Gretel Rebrand",
        description: "We're refining the brand voice and finalizing the motion language.",
        team: ["Jon", "Paloma", "Linda"],
        status: "In Progress"
      },
      internal: true
    },
    {
      id: "4",
      type: "announcement",
      data: {
        title: "Office Closed: Independence Day",
        body: "The studio will be closed on Thursday, July 4.",
        date: "2025-07-04",
        tag: "Announcement"
      },
      internal: true
    },
    {
      id: "5",
      type: "project",
      data: {
        title: "Internal AI Toolkit",
        description: "First round of prompts and helper tools are live in Notion.",
        team: ["Jon", "Chris"],
        status: "Shipped"
      },
      internal: true
    },
    {
      id: "6",
      type: "event",
      data: {
        title: "Summer Show & Tell",
        date: "2025-06-28",
        time: "4:00–6:00 PM",
        location: "Gretel",
        description: "Bring something weird or beautiful to share.",
        tag: "Event"
      },
      internal: true
    }
  ];
}; 