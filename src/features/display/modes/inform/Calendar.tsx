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
  const isPausedRef = useRef(false);
  const pauseStartTime = useRef(0);
  const hasStarted = useRef(false);

  // Sync animated content when source content changes (from API/broadcast)
  useEffect(() => {
    setAnimatedContent(sourceContent);
  }, [sourceContent]);

  // Animation loop for infinite scrolling with blank space
  useEffect(() => {
    if (animatedContent.length === 0) return;
    
    const container = containerRef.current;
    if (!container) return;
    
    let animationFrame: number;
    let lastTimestamp = performance.now();

    function animate(now: number) {
      const elapsed = now - lastTimestamp;
      lastTimestamp = now;
      
      // Handle pause logic
      if (!hasStarted.current) {
        // Initial 5-second pause
        if (!isPausedRef.current) {
          isPausedRef.current = true;
          pauseStartTime.current = now;
        }
        
        if (now - pauseStartTime.current >= 5000) { // 5 seconds
          hasStarted.current = true;
          isPausedRef.current = false;
          console.log('Calendar: Initial pause complete, starting scroll');
        }
      }
      
      // Only scroll if not paused
      if (!isPausedRef.current) {
        const speed = 0.05; // px per ms
        scrollY.current += speed * elapsed;

        if (container) {
          container.scrollTop = scrollY.current;

          // Calculate single cycle height (content + blank space)
          const totalContentHeight = blockRefs.current.reduce((total, block) => {
            return total + (block?.offsetHeight || 0);
          }, 0);
          
          const blankSpaceHeight = container.clientHeight * 0.4;
          const singleCycleHeight = totalContentHeight + blankSpaceHeight;
          
          // Check if we've completed a full cycle and should pause
          if (hasStarted.current && scrollY.current >= singleCycleHeight) {
            // Reset to beginning and start pause
            scrollY.current = 0;
            container.scrollTop = 0;
            isPausedRef.current = true;
            pauseStartTime.current = now;
            console.log(`Calendar: Cycle complete (${scrollY.current}px >= ${singleCycleHeight}px), starting pause`);
          }
        }
      } else if (hasStarted.current) {
        // Handle pause after cycle completion
        if (now - pauseStartTime.current >= 5000) { // 5 seconds
          isPausedRef.current = false;
          console.log('Calendar: Cycle pause complete, resuming scroll');
        }
      }

      animationFrame = requestAnimationFrame(animate);
    }

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [animatedContent]);

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
      {/* Content with infinite duplication */}
      {[...Array(3)].map((_, cycleIndex) => (
        <div key={`cycle-${cycleIndex}`}>
          {animatedContent.map((item, index) => (
            <div
              key={`${cycleIndex}-${item.id || index}`}
              ref={cycleIndex === 0 ? (el => { blockRefs.current[index] = el; }) : undefined}
            >
              <Block
                type={item.type}
                data={item.data}
                internal={item.internal}
              />
            </div>
          ))}
          {/* Blank spacer after each cycle */}
          <div style={{ height: '40vh' }} />
        </div>
      ))}
    </div>
  );
}