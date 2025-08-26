'use client';

import { useRef, useLayoutEffect, useEffect, useState } from 'react';
import { basel, quadrant, droulers } from '@/styles/fonts';
import Block from '@/shared/components/inform/Block';
import styles from '../modes.module.scss';
import '@/styles/inform/inform.scss';
import { useInformContent } from '@/shared/hooks/useInformContent';

let calendarCache: any[] | null = null;

export async function preload() {
  // Clear cache to force fresh data
  calendarCache = null;
  
  if (!calendarCache) {
    const response = await fetch('/api/inform');
    if (response.ok) {
      const data = await response.json();
      calendarCache = data.filter((item: any) => item.type === 'event' || item.type === 'announcement');
    }
  }
}

export default function Calendar() {
  // Get real-time content from hook
  const { content: sourceContent, loading, error } = useInformContent({
    filterType: 'event',
    pollInterval: 60000, // Poll every minute
    enableBroadcast: true
  });

  // Local state for animation - this CAN be modified
  const [animatedContent, setAnimatedContent] = useState<any[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const blockRefs = useRef<(HTMLDivElement | null)[]>([]);
  const scrollY = useRef(0);
  const pendingScrollReset = useRef<number | null>(null);

  // Sync animated content when source content changes (from API/broadcast)
  useEffect(() => {
    setAnimatedContent(sourceContent);
  }, [sourceContent]);

  // Animation loop for seamless upward scrolling
  useEffect(() => {
    if (animatedContent.length === 0) return;
    
    // Check if content actually overflows the container
    const container = containerRef.current;
    if (!container) return;
    
    // Calculate total content height
    const totalContentHeight = blockRefs.current.reduce((total, block) => {
      return total + (block?.offsetHeight || 0);
    }, 0);
    
    // Only animate if content overflows the container
    if (totalContentHeight <= container.clientHeight) {
      return; // Don't start animation if content fits in viewport
    }
    
    let animationFrame: number;
    let lastTimestamp = performance.now();

    function animate(now: number) {
      const elapsed = now - lastTimestamp;
      lastTimestamp = now;
      const speed = 0.03; // px per ms (adjust for desired speed, 0.03 = ~1.8px/frame at 60fps)
      scrollY.current += speed * elapsed;

      const container = containerRef.current;
      const firstBlock = blockRefs.current[0];
      if (container && firstBlock) {
        container.scrollTop = scrollY.current;

        // If the first block is fully out of view, rotate it to the end
        if (scrollY.current >= firstBlock.offsetHeight) {
          // ✅ Now we can modify the animated content
          setAnimatedContent(prev => [...prev.slice(1), prev[0]]);
          pendingScrollReset.current = scrollY.current - firstBlock.offsetHeight;
          // Don't set scrollTop here! Wait for DOM update.
        }
      }

      animationFrame = requestAnimationFrame(animate);
    }

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [animatedContent]); // ✅ Use animatedContent instead of content

  // After content changes, reset scroll position if needed
  useLayoutEffect(() => {
    if (pendingScrollReset.current !== null && containerRef.current) {
      scrollY.current = pendingScrollReset.current;
      containerRef.current.scrollTop = scrollY.current;
      pendingScrollReset.current = null;
    }
  }, [animatedContent]); // ✅ Use animatedContent instead of content

  if (loading && animatedContent.length === 0) {
    return (
      <div className={`${styles.modeContainer} ${basel.variable} ${quadrant.variable} ${droulers.variable}`} id="inform">
        <div>Loading calendar events...</div>
      </div>
    );
  }

  if (error && animatedContent.length === 0) {
    return (
      <div className={`${styles.modeContainer} ${basel.variable} ${quadrant.variable} ${droulers.variable}`} id="inform">
        <div>Error loading calendar events: {error}</div>
      </div>
    );
  }

  if (animatedContent.length === 0) {
    return (
      <div className={`${styles.modeContainer} ${basel.variable} ${quadrant.variable} ${droulers.variable}`} id="inform">
        <div>No calendar events available.</div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{ height: '100vh', overflow: 'hidden', position: 'relative' }}
      className={`${styles.modeContainer} ${basel.variable} ${quadrant.variable} ${droulers.variable}`}
      id="inform"
    >
      {animatedContent.map((item, index) => (
        <div
          key={item.id || index}
          ref={el => { blockRefs.current[index] = el; }}
        >
          <Block
            type={item.type}
            data={item.data}
            internal={item.internal}
          />
        </div>
      ))}
    </div>
  );
}