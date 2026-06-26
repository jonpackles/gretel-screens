import { useEffect, useRef, useState, type RefObject } from 'react';
import { MediaItem } from '@/shared/types/media';
import styles from './modes.module.scss';
import { basel } from '@/styles/fonts';

const GRID_COLS = 5;
const GRID_ROWS = 14; // 5 x 14 = 70
const GRID_SIZE = GRID_COLS * GRID_ROWS;
const MAX_ROWS = GRID_ROWS * 2; // fixed 28 rows, 140 cells
const SCROLL_SPEED = 0.03; // px per ms

// Animation constants
const FADE_IN_DELAY = 50; // ms between each item animation
const FADE_IN_DURATION = 800; // ms for each item to fade in

type GridProps = {
  media: MediaItem[];
};

type GridVideoProps = {
  src: string;
  scrollRoot: RefObject<HTMLDivElement | null>;
};

function GridVideo({ src, scrollRoot }: GridVideoProps) {
  const cellRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const cell = cellRef.current;
    const video = videoRef.current;
    if (!cell || !video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          void video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { root: scrollRoot.current, threshold: 0.15 }
    );

    observer.observe(cell);
    return () => observer.disconnect();
  }, [src, scrollRoot]);

  return (
    <div
      ref={cellRef}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        maxWidth: '70%',
        maxHeight: '70%',
      }}
    >
      <video
        ref={videoRef}
        src={src}
        className="max-w-full max-h-full object-contain"
        muted
        loop
        playsInline
        preload="metadata"
        style={{ maxWidth: '100%', maxHeight: '100%' }}
      />
    </div>
  );
}

export default function Grid({ media }: GridProps) {
  const [gridItems, setGridItems] = useState<MediaItem[]>([]);
  const [visibleItems, setVisibleItems] = useState<Set<number>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollY = useRef(0);
  const animationTimeouts = useRef<NodeJS.Timeout[]>([]);

  // Initial grid setup — fixed size, duplicated shuffle for seamless scroll loop
  useEffect(() => {
    if (!media?.length) return;
    const shuffled = [...media].sort(() => Math.random() - 0.5).slice(0, GRID_SIZE);
    setGridItems([...shuffled, ...shuffled]);
  }, [media]);

  // Fade-in animation effect (runs once on load)
  useEffect(() => {
    if (gridItems.length === 0) return;

    animationTimeouts.current.forEach(timeout => clearTimeout(timeout));
    animationTimeouts.current = [];
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

  // Continuous scroll within fixed grid; loop at midpoint (duplicate content)
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
        const maxScroll = container.scrollHeight - container.clientHeight;
        const loopPoint = maxScroll / 2;
        if (loopPoint > 0 && scrollY.current >= loopPoint) {
          scrollY.current -= loopPoint;
        }
        container.scrollTop = scrollY.current;
      }
      animationFrame = requestAnimationFrame(animate);
    }
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [hasItems]);

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
                    <GridVideo src={src} scrollRoot={containerRef} />
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
        video.preload = 'metadata';
        video.muted = true;
        video.onloadeddata = () => resolve(true);
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
