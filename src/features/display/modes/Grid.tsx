import { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { MediaItem } from '@/shared/types/media';
import styles from './modes.module.scss';
import { basel, quadrant, droulers } from '@/styles/fonts';

const GRID_COLS = 7;
const GRID_ROWS = 14; // 7 x 14 = 98
const GRID_SIZE = GRID_COLS * GRID_ROWS;
const SCROLL_SPEED = 0.03; // px per ms

// Fixed window size — never grows beyond this
const INITIAL_VISIBLE_ROWS = GRID_ROWS * 2;
const INITIAL_VISIBLE_SIZE = GRID_COLS * INITIAL_VISIBLE_ROWS;
const MAX_ROWS = INITIAL_VISIBLE_ROWS;
const MAX_ITEMS = INITIAL_VISIBLE_SIZE;

// Animation constants
const FADE_IN_DELAY = 50; // ms between each item animation
const FADE_IN_DURATION = 800; // ms for each item to fade in

// Scroll threshold for recycling rows (percentage of total height)
const SCROLL_THRESHOLD = 0.7;

type GridProps = {
  media: MediaItem[];
};

export default function Grid({ media }: GridProps) {
  const [gridItems, setGridItems] = useState<MediaItem[]>([]);
  const [visibleItems, setVisibleItems] = useState<Set<number>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const scrollY = useRef(0);
  const animationTimeouts = useRef<NodeJS.Timeout[]>([]);
  const isAddingRows = useRef(false);
  const isFirstLoad = useRef(true);

  // Sliding window: drop first GRID_SIZE items, append new ones, adjust scroll back
  const generateMoreItems = () => {
    if (!media?.length || isAddingRows.current) return;

    isAddingRows.current = true;
    const shuffled = [...media].sort(() => Math.random() - 0.5).slice(0, GRID_SIZE);

    setGridItems(prev => {
      const trimmed = prev.length >= MAX_ITEMS ? prev.slice(GRID_SIZE) : prev;
      return [...trimmed, ...shuffled];
    });

    // Pull scroll position back by the height of the removed rows so the view doesn't jump
    const container = containerRef.current;
    if (container) {
      const rowHeight = container.scrollHeight / MAX_ROWS;
      scrollY.current = Math.max(0, scrollY.current - rowHeight * GRID_ROWS);
    }

    isAddingRows.current = false;
  };

  // Initial grid setup
  useEffect(() => {
    if (!media?.length) return;
    isFirstLoad.current = true;
    const shuffled = [...media].sort(() => Math.random() - 0.5).slice(0, GRID_SIZE);
    setGridItems([...shuffled, ...shuffled]);
  }, [media]);

  // Scroll detection for recycling rows
  useEffect(() => {
    if (gridItems.length === 0) return;

    const checkScroll = () => {
      const container = containerRef.current;
      if (!container) return;

      const scrollPercentage = container.scrollTop / (container.scrollHeight - container.clientHeight);
      if (scrollPercentage > SCROLL_THRESHOLD) {
        generateMoreItems();
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScroll);
    }

    return () => {
      if (container) {
        container.removeEventListener('scroll', checkScroll);
      }
    };
  }, [gridItems, media]);

  // Fade-in animation effect — only animates on first load; recycles show items immediately
  useEffect(() => {
    if (gridItems.length === 0) return;

    animationTimeouts.current.forEach(timeout => clearTimeout(timeout));
    animationTimeouts.current = [];

    if (!isFirstLoad.current) {
      // Recycled content: show all immediately without re-animating
      setVisibleItems(new Set(Array.from({ length: gridItems.length }, (_, i) => i)));
      return;
    }
    isFirstLoad.current = false;

    setVisibleItems(new Set());

    const SAFETY_BUFFER = 3;
    const START_ROW = Math.max(0, GRID_ROWS - SAFETY_BUFFER);

    const animationOrder: number[] = [];
    for (let row = START_ROW; row >= 0; row--) {
      for (let col = 0; col < GRID_COLS; col++) {
        animationOrder.push(row * GRID_COLS + col);
      }
    }

    animationOrder.forEach((itemIndex, orderIndex) => {
      const timeout = setTimeout(() => {
        setVisibleItems(prev => new Set([...prev, itemIndex]));
      }, orderIndex * FADE_IN_DELAY);
      animationTimeouts.current.push(timeout);
    });

    const remainingItems: number[] = [];
    for (let row = START_ROW + 1; row < MAX_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const index = row * GRID_COLS + col;
        if (index < gridItems.length) remainingItems.push(index);
      }
    }
    setVisibleItems(prev => {
      const newSet = new Set(prev);
      remainingItems.forEach(item => newSet.add(item));
      return newSet;
    });

    return () => {
      animationTimeouts.current.forEach(timeout => clearTimeout(timeout));
    };
  }, [gridItems]);

  // Animation loop — starts once when items load, never restarts
  const hasItems = gridItems.length > 0;
  useEffect(() => {
    if (!hasItems) return;
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
  }, [hasItems]);

  // Build grid rows (fixed at MAX_ROWS)
  const rows = [];
  for (let r = 0; r < MAX_ROWS; r++) {
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
      className={styles.modeContainer}
      style={{
        height: '100vh',
        overflow: 'auto',
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
          gridTemplateRows: `repeat(${MAX_ROWS}, 1fr)`,
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
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    height: '100%',
                    aspectRatio: '1 / 1',
                    overflow: (cIdx === 0 || cIdx === GRID_COLS - 1 || rIdx === 0 || rIdx === MAX_ROWS - 1) ? 'visible' : 'hidden',
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
                  <h4
                    className={basel.className}
                    style={{
                      color: 'lightgray',
                      fontSize: '7px',
                      marginTop: '10px',
                      textAlign: 'center',
                    }}
                  >
                    {item.name.length > 35 
                      ? `${item.name.substring(0, 20)}${item.name.substring(item.name.lastIndexOf('.'))}`
                      : item.name
                    }
                  </h4>
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
  // Preload only first 30 items to prevent WebMediaPlayer errors
  const preloadCount = Math.min(30, media.length);
  const shuffled = [...media].sort(() => Math.random() - 0.5).slice(0, preloadCount);
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
