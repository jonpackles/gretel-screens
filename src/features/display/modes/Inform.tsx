'use client';

import { basel, quadrant, droulers } from '@/styles/fonts';
import Block from '@/shared/components/inform/Block';
import styles from './modes.module.scss';
import '@/styles/inform/inform.scss';
import { useInformContent } from '@/shared/hooks/useInformContent';

export default function Inform() {
  const { content, loading, error } = useInformContent({
    filterType: 'event',
    pollInterval: 60000, // Poll every minute
    enableBroadcast: true
  });

  if (loading && content.length === 0) {
    return (
      <div className={`${styles.modeContainer} ${basel.variable} ${quadrant.variable} ${droulers.variable}`} id="inform">
        <div>Loading...</div>
      </div>
    );
  }

  if (error && content.length === 0) {
    return (
      <div className={`${styles.modeContainer} ${basel.variable} ${quadrant.variable} ${droulers.variable}`} id="inform">
        <div>Error loading content: {error}</div>
      </div>
    );
  }

  return (
    <div className={`${styles.modeContainer} ${basel.variable} ${quadrant.variable} ${droulers.variable}`} id="inform">
      {content.map((item, index) => (
        <Block 
          key={item.id || index} 
          type={item.type} 
          data={item.data} 
          internal={item.internal} 
        />
      ))}
    </div>
  );
}