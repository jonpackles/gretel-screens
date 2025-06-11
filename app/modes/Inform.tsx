'use client';

import { useState, useEffect } from 'react';
import { basel, quadrant, droulers } from '@/styles/fonts';
import { getInformContent } from "@/lib/inform/getInformContent";
import Block from '@/components/inform/Block';
import '@/styles/inform/inform.scss';

export default function Inform() {
  const [content, setContent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getInformContent();
        setContent(data);
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
      <main id="inform" className={`${basel.variable} ${quadrant.variable} ${droulers.variable}`}>
        <div>Loading...</div>
      </main>
    );
  }

  return (
    <main id="inform" className={`${basel.variable} ${quadrant.variable} ${droulers.variable}`}>
      {content.map((item, index) => (
        <Block 
          key={index} 
          type={item.type} 
          data={item.data} 
          internal={item.internal} 
        />
      ))}
    </main>
  );
}