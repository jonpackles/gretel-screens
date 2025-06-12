'use client';

import { useState, useEffect } from 'react';
import { basel, quadrant, droulers } from '@/styles/fonts';
import Block from '@/components/inform/Block';
import styles from './modes.module.scss';
import '@/styles/inform/inform.scss';

export default function Inform() {
  const [content, setContent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/inform');
        if (!response.ok) {
          throw new Error('Failed to fetch data');
        }
        const data = await response.json();
        
        // Filter to only show events and announcements (no projects)
        const eventsOnly = data.filter((item: any) => 
          item.type === 'event' || item.type === 'announcement'
        );
        
        setContent(eventsOnly);
      } catch (error) {
        console.error('Failed to fetch inform content:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className={`${styles.modeContainer} ${basel.variable} ${quadrant.variable} ${droulers.variable}`} id="inform">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className={`${styles.modeContainer} ${basel.variable} ${quadrant.variable} ${droulers.variable}`} id="inform">
      {content.map((item, index) => (
        <Block 
          key={index} 
          type={item.type} 
          data={item.data} 
          internal={item.internal} 
        />
      ))}
    </div>
  );
}