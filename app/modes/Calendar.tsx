'use client';

import { useEffect, useState } from 'react';
import { Event } from '@/components/calendar/Event';
import styles from './modes.module.scss';

export default function Calendar() {
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const response = await fetch('/api/calendar');
        const calendarData = await response.json();
        setEvents(calendarData);
      } catch (error) {
        console.error('Error fetching calendar events:', error);
      }
    }

    fetchEvents();
  }, []);

  return (
    <div className={styles.modeContainer} id="calendar">
    
      <pre className="whitespace-pre-wrap">
      {[...events, ...events].map((event, idx) => (
                <div
                  key={event.id + '-' + idx}
                  onClick={() => {
                    console.log('Event clicked:', event);
                   
                  }}
                >
                  <Event
                    event={event}
                    type={event.type}
                    layout="list"
                    isFullscreen={false}
                    isPending={false}
                    isSelected={false}
                    isToday={false}
                    isPast={false}
                    isFuture={false}
                  />
                </div>
              ))}
      </pre>
    </div>
  );
}
