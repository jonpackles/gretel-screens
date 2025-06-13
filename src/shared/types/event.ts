export interface Event {
    id: string;
    title: string;
    description: string;
    date: string;
    time: string;
    location: string;
    imageUrl?: string;
    type: 'internal' | 'external';
    tag?: string;
    url?: string;
  } 