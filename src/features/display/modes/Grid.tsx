import { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { MediaItem } from '@/shared/types/media';

const GRID_COLS = 7;
const GRID_ROWS = 14; // 7 x 14 = 98
const GRID_SIZE = GRID_COLS * GRID_ROWS;
const SCROLL_SPEED = 0.03; // px per ms

// Double the number of rows for more scrollable area
const VISIBLE_ROWS = GRID_ROWS * 2;
const VISIBLE_SIZE = GRID_COLS * VISIBLE_ROWS;

// Animation constants
const FADE_IN_DELAY = 50; // ms between each item animation
const FADE_IN_DURATION = 800; // ms for each item to fade in

type GridProps = {
  media: MediaItem[];
};

export default function Grid({ media }: GridProps) {
  // Shuffle and slice to 98 items, then repeat to fill VISIBLE_SIZE
  const [gridItems, setGridItems] = useState<MediaItem[]>([]);
  const [visibleItems, setVisibleItems] = useState<Set<number>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const scrollY = useRef(0);
  const animationTimeouts = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    if (!media?.length) return;
    const shuffled = [...media].sort(() => Math.random() - 0.5).slice(0, GRID_SIZE);
    // Repeat the rows to double the scrollable area
    setGridItems([...shuffled, ...shuffled]);
  }, [media]);

  // Fade-in animation effect - dynamic start point with safety buffer
  useEffect(() => {
    if (gridItems.length === 0) return;

    // Clear any existing timeouts
    animationTimeouts.current.forEach(timeout => clearTimeout(timeout));
    animationTimeouts.current = [];
    
    // Reset visible items
    setVisibleItems(new Set());

    // Dynamic configuration
    const SAFETY_BUFFER = 3;
    const START_ROW = Math.max(0, GRID_ROWS - SAFETY_BUFFER); // Row 11 (14-3)
    
    console.log(`Grid: Starting animation from row ${START_ROW} (GRID_ROWS=${GRID_ROWS}, SAFETY_BUFFER=${SAFETY_BUFFER})`);
    
    // Calculate animation order (from START_ROW going upward)
    const animationOrder: number[] = [];
    
    // Create bottom-to-top order starting from START_ROW
    for (let row = START_ROW; row >= 0; row--) {
      for (let col = 0; col < GRID_COLS; col++) {
        const index = row * GRID_COLS + col;
        animationOrder.push(index);
      }
    }

    console.log(`Grid: Animating ${animationOrder.length} items from row ${START_ROW} upward`);

    // Trigger animations with staggered delays
    animationOrder.forEach((itemIndex, orderIndex) => {
      const timeout = setTimeout(() => {
        setVisibleItems(prev => new Set([...prev, itemIndex]));
      }, orderIndex * FADE_IN_DELAY);
      
      animationTimeouts.current.push(timeout);
    });

    // Show all remaining items immediately (below START_ROW)
    const remainingItems: number[] = [];
    for (let row = START_ROW + 1; row < VISIBLE_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const index = row * GRID_COLS + col;
        if (index < VISIBLE_SIZE) {
          remainingItems.push(index);
        }
      }
    }
    
    // Show remaining items immediately
    setVisibleItems(prev => new Set([...remainingItems]));

    // Cleanup timeouts on unmount
    return () => {
      animationTimeouts.current.forEach(timeout => clearTimeout(timeout));
    };
  }, [gridItems]);

  // Animation loop for seamless upward scrolling
  useEffect(() => {
    if (gridItems.length === 0) return;
    let animationFrame: number;
    let lastTimestamp = performance.now();

    function animate(now: number) {
      const elapsed = now - lastTimestamp;
      lastTimestamp = now;
      scrollY.current += SCROLL_SPEED * elapsed;

      const container = containerRef.current;
      if (container) {
        container.scrollTop = scrollY.current;
      }
      animationFrame = requestAnimationFrame(animate);
    }
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [gridItems]);

  // Build grid rows
  const rows = [];
  for (let r = 0; r < VISIBLE_ROWS; r++) {
    const row = gridItems.slice(r * GRID_COLS, (r + 1) * GRID_COLS);
    rows.push(row);
  }

  if (!media?.length) {
    return (
      <div style={{ height: '100vh', width: '100vw', background: 'black', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
        Loading...
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        height: '100vh',
        overflow: 'hidden',
        position: 'relative',
        width: '100vw',
        background: 'black',
      }}
    >
      <style jsx>{`
        .grid-item {
          opacity: 0;
          transform: translateY(30px);
          transition: opacity ${FADE_IN_DURATION}ms ease-out, transform ${FADE_IN_DURATION}ms ease-out;
        }
        
        .grid-item.visible {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>
      
      <div
        style={{
          display: 'grid',
          gridTemplateRows: `repeat(${VISIBLE_ROWS}, 1fr)`,
          gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
          width: '110vw',
          marginLeft: '-5vw',
          height: `calc(100vh + 2 * (100vh / ${GRID_ROWS}))`,
          gap: '0',
        }}
      >
        {rows.map((row, rIdx) => (
          <div key={`row-${rIdx}`} style={{ display: 'contents' }}>
            {row.map((item, cIdx) => {
              const itemIndex = rIdx * GRID_COLS + cIdx;
              const isVisible = visibleItems.has(itemIndex);
              const isVideo = /\.(mp4|webm|ogg)$/i.test(item.name);
              const src = `/content/${item.path}`;
              
              return (
                <div
                  key={item.path || item.name || `${rIdx}-${cIdx}`}
                  ref={cIdx === 0 ? el => { rowRefs.current[rIdx] = el; } : undefined}
                  className={`grid-item ${isVisible ? 'visible' : ''}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    height: '100%',
                    aspectRatio: '1 / 1',
                    overflow: (cIdx === 0 || cIdx === GRID_COLS - 1 || rIdx === 0 || rIdx === VISIBLE_ROWS - 1) ? 'visible' : 'hidden',
                  }}
                >
                  {isVideo ? (
                    <video
                      src={src}
                      className="max-w-full max-h-full object-contain"
                      autoPlay
                      muted
                      loop
                      playsInline
                      style={{ maxWidth: '70%', maxHeight: '70%' }}
                    />
                  ) : (
                    <img
                      src={src}
                      alt={item.name}
                      style={{
                        maxWidth: '70%',
                        maxHeight: '70%',
                        objectFit: 'contain',
                        display: 'block',
                        margin: 'auto',
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// Add static preload method to Grid
Grid.preload = async function(media: MediaItem[] = []) {
  if (!media?.length) return;
  // Shuffle and slice to 98 items, matching the grid display logic
  const shuffled = [...media].sort(() => Math.random() - 0.5).slice(0, GRID_SIZE);
  const preloaders = shuffled.map(item => {
    const src = `/content/${item.path}`;
    if (/\.(mp4|webm|ogg)$/i.test(item.name)) {
      // Preload video
      return new Promise(resolve => {
        const video = document.createElement('video');
        video.src = src;
        video.preload = 'auto';
        video.muted = true;
        video.oncanplaythrough = () => resolve(true);
        video.onerror = () => resolve(false);
      });
    } else {
      // Preload image
      return new Promise(resolve => {
        const img = new window.Image();
        img.src = src;
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
      });
    }
  });
  await Promise.all(preloaders);
};
