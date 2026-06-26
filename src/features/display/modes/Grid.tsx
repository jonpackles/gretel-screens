import { useEffect, useRef, useState } from 'react';
import { MediaItem } from '@/shared/types/media';
import styles from './modes.module.scss';
import { basel } from '@/styles/fonts';

const GRID_COLS = 7;
const GRID_ROWS = 14;
const GRID_SIZE = GRID_COLS * GRID_ROWS; // 98

// Fixed window — DOM row count never changes
const MAX_ROWS = GRID_ROWS * 2; // 28
const MAX_ITEMS = MAX_ROWS * GRID_COLS; // 196

const SCROLL_SPEED = 0.03; // px per ms
const FADE_IN_DELAY = 50;
const FADE_IN_DURATION = 800;

type GridProps = {
  media: MediaItem[];
};

export default function Grid({ media }: GridProps) {
  const [gridItems, setGridItems] = useState<MediaItem[]>([]);
  const [visibleItems, setVisibleItems] = useState<Set<number>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const transformY = useRef(0);
  const animationTimeouts = useRef<NodeJS.Timeout[]>([]);
  const isFirstLoad = useRef(true);

  // Keep a stable ref to the recycle function so the rAF loop never needs to restart
  const recycleRowRef = useRef<() => void>(() => {});
  useEffect(() => {
    recycleRowRef.current = () => {
      if (!media?.length) return;
      const newRow = [...media].sort(() => Math.random() - 0.5).slice(0, GRID_COLS);
      setGridItems(prev => [...prev.slice(GRID_COLS), ...newRow]);
    };
  }, [media]);

  // Initial grid setup
  useEffect(() => {
    if (!media?.length) return;
    isFirstLoad.current = true;
    transformY.current = 0;
    const shuffled = [...media].sort(() => Math.random() - 0.5).slice(0, GRID_SIZE);
    setGridItems([...shuffled, ...shuffled]);
  }, [media]);

  // Fade-in on first load; immediate show on recycles
  useEffect(() => {
    if (gridItems.length === 0) return;

    animationTimeouts.current.forEach(timeout => clearTimeout(timeout));
    animationTimeouts.current = [];

    if (!isFirstLoad.current) {
      setVisibleItems(new Set(Array.from({ length: MAX_ITEMS }, (_, i) => i)));
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

  // Animation loop — starts once, never restarts. Uses transform instead of scrollTop
  // so recycling a row never causes a position snap.
  const hasItems = gridItems.length > 0;
  useEffect(() => {
    if (!hasItems) return;
    let animationFrame: number;
    let lastTimestamp = performance.now();

    function animate(now: number) {
      const elapsed = now - lastTimestamp;
      lastTimestamp = now;
      transformY.current += SCROLL_SPEED * elapsed;

      const inner = innerRef.current;
      if (inner) {
        const rowHeight = inner.offsetHeight / MAX_ROWS;
        if (rowHeight > 0 && transformY.current >= rowHeight) {
          // Subtract first so the condition won't re-fire next frame
          transformY.current -= rowHeight;
          recycleRowRef.current();
        }
        inner.style.transform = `translateY(-${transformY.current}px)`;
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
        ref={innerRef}
        style={{
          display: 'grid',
          gridTemplateRows: `repeat(${MAX_ROWS}, 1fr)`,
          gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
          width: '110vw',
          marginLeft: '-5vw',
          height: `calc(100vh + 2 * (100vh / ${GRID_ROWS}))`,
          gap: '0',
          willChange: 'transform',
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
      return new Promise(resolve => {
        const video = document.createElement('video');
        video.src = src;
        video.preload = 'auto';
        video.muted = true;
        video.oncanplaythrough = () => resolve(true);
        video.onerror = () => resolve(false);
      });
    } else {
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
