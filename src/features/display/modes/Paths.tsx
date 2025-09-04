"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { MediaItem } from "@/shared/types/media";

const SHAPES = ["house", "sine", "infinity", "circle"] as const;
type ShapeName = typeof SHAPES[number];
const STEP_MS = 100; // Speed of animation (ms per step)
const PAUSE_MS = 3000; // Pause at end of shape (ms)
const VIDEO_SIZE = 170;
const VIDEO_SPACING = 120;

function getShapePath(shape: ShapeName, count: number, containerSize?: { width: number; height: number }): { x: number; y: number }[] {
  switch (shape) {
    case "house":
      if (containerSize) {
        // Define house in a square coordinate system to maintain aspect ratio
        const size = Math.min(containerSize.width, containerSize.height) * 0.85; // 60% of the smaller dimension
        const centerX = containerSize.width / 2;
        const centerY = containerSize.height / 2;
        
        // Original house proportions (in a 1x1 square)
        const housePoints = [
          { x: -0.15, y: 0.2 },   // bottom left
          { x: -0.15, y: -0.1 },  // left wall up
          { x: 0, y: -0.3 },      // roof peak
          { x: 0.15, y: -0.1 },   // right wall down
          { x: 0.15, y: 0.2 },    // bottom right
          { x: -0.15, y: 0.2 },   // back to start
        ];
        
        // Scale and center the house
        return housePoints.map(pt => ({
          x: centerX + pt.x * size,
          y: centerY + pt.y * size,
        }));
      }
      // Fallback to relative coordinates if no container size
      return [
        { x: 0.35, y: 0.7 },
        { x: 0.35, y: 0.4 },
        { x: 0.5, y: 0.2 },
        { x: 0.65, y: 0.4 },
        { x: 0.65, y: 0.7 },
        { x: 0.35, y: 0.7 },
      ];
    case "sine":
      return Array.from({ length: count }, (_, i) => {
        const t = i / (count - 1);
        return {
          x: t,
          y: 0.5 + 0.2 * Math.sin(2 * Math.PI * t),
        };
      });
    case "infinity":
      return Array.from({ length: count }, (_, i) => {
        const t = (i / (count - 1)) * 2 * Math.PI;
        return {
          x: 0.5 + 0.25 * Math.sin(t),
          y: 0.5 + 0.25 * Math.sin(t) * Math.cos(t),
        };
      });
    case "circle":
      return Array.from({ length: count }, (_, i) => {
        const t = (i / (count - 1)) * 2 * Math.PI;
        return {
          x: 0.5 + 0.3 * Math.cos(t),
          y: 0.5 + 0.3 * Math.sin(t),
        };
      });
    default:
      return [];
  }
}

function getEvenlySpacedPoints(path: { x: number; y: number }[], spacingPx: number, containerSize?: { width: number; height: number }) {
  if (path.length < 2) return [];
  
  // If path points are between 0-1 (relative), convert to absolute; otherwise use as-is
  const needsConversion = path.some(p => p.x <= 1 && p.y <= 1 && p.x >= 0 && p.y >= 0);
  const pts = needsConversion && containerSize 
    ? path.map((p) => ({ x: p.x * containerSize.width, y: p.y * containerSize.height }))
    : path;
  
  const segLens = pts.slice(1).map((p, i) => Math.hypot(p.x - pts[i].x, p.y - pts[i].y));
  const totalLen = segLens.reduce((a, b) => a + b, 0);
  const n = Math.max(2, Math.floor(totalLen / spacingPx));
  const result = [];
  let dist = 0, segIdx = 0;
  for (let i = 0; i < n; i++) {
    const targetDist = (i / (n - 1)) * totalLen;
    while (dist + segLens[segIdx] < targetDist && segIdx < segLens.length - 1) {
      dist += segLens[segIdx];
      segIdx++;
    }
    const segStart = pts[segIdx];
    const segEnd = pts[segIdx + 1];
    const segT = (targetDist - dist) / segLens[segIdx];
    result.push({
      x: segStart.x + (segEnd.x - segStart.x) * segT,
      y: segStart.y + (segEnd.y - segStart.y) * segT,
    });
  }
  return result;
}

export default function Paths({ media }: { media: MediaItem[] }) {
  const [shapeIdx, setShapeIdx] = useState(0);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [currentIdx, setCurrentIdx] = useState(0);
  const [mediaIdx, setMediaIdx] = useState(0); // Track position in media array
  const [isPaused, setIsPaused] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pointsRef = useRef<{ x: number; y: number }[]>([]);
  const videoMediaRef = useRef<MediaItem[]>([]);
  const isAnimatingRef = useRef(false);
  const videoElementsRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const isMountedRef = useRef(true);

  // Cleanup effect - runs on unmount
  useEffect(() => {
    return () => {
      console.log('Paths: Component unmounting, cleaning up resources');
      isMountedRef.current = false;
      
      // Clear all timers
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      // Clean up video elements
      videoElementsRef.current.forEach((video, key) => {
        video.pause();
        video.src = '';
        video.load(); // This releases the video resources
      });
      videoElementsRef.current.clear();
    };
  }, []);

  // Track container size and initialize
  useEffect(() => {
    function update() {
      if (containerRef.current && isMountedRef.current) {
        const newWidth = containerRef.current.offsetWidth;
        const newHeight = containerRef.current.offsetHeight;
        
        // Only update if size actually changed to prevent unnecessary re-renders
        setContainerSize(prevSize => {
          if (prevSize.width !== newWidth || prevSize.height !== newHeight) {
            console.log(`Paths: Container size changed - ${newWidth}x${newHeight}`);
            return { width: newWidth, height: newHeight };
          }
          return prevSize;
        });
        
        // Mark as initialized once we have a real container size
        if (!isInitialized && newWidth > 0 && newHeight > 0) {
          console.log(`Paths: Container initialized - size: ${newWidth}x${newHeight}`);
          setIsInitialized(true);
        }
      }
    }
    
    // Use a small delay to ensure DOM is ready, especially in production builds
    const timer = setTimeout(update, 50);
    
    // Throttle resize events to prevent excessive re-renders
    let resizeTimeout: NodeJS.Timeout;
    const throttledUpdate = () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(update, 100);
    };
    
    window.addEventListener("resize", throttledUpdate);
    return () => {
      clearTimeout(timer);
      if (resizeTimeout) clearTimeout(resizeTimeout);
      window.removeEventListener("resize", throttledUpdate);
    };
  }, [isInitialized]);

  // Memoize video media to prevent unnecessary re-filtering
  const videoMedia = useMemo(() => media.filter((m) => /\.mp4$/i.test(m.name)), [media]);
  
  // Memoize path points to prevent unnecessary recalculation
  const points = useMemo(() => {
    const basePath = getShapePath(SHAPES[shapeIdx], 100, containerSize);
    return getEvenlySpacedPoints(basePath, VIDEO_SPACING, containerSize);
  }, [shapeIdx, containerSize.width, containerSize.height]);
  
  // Update refs when values change
  useEffect(() => {
    console.log(`Paths: Updating refs - points: ${points.length}, videoMedia: ${videoMedia.length}`);
    pointsRef.current = points;
    videoMediaRef.current = videoMedia;
  }, [points, videoMedia]);

  // Clean up video elements when shape changes
  useEffect(() => {
    return () => {
      // Clean up video elements for the current shape
      const currentShapeName = SHAPES[shapeIdx];
      const keysToDelete: string[] = [];
      
      videoElementsRef.current.forEach((video, key) => {
        if (key.startsWith(`${currentShapeName}-`)) {
          video.pause();
          video.src = '';
          video.load();
          keysToDelete.push(key);
        }
      });
      
      keysToDelete.forEach(key => {
        videoElementsRef.current.delete(key);
      });
      
      console.log(`Paths: Cleaned up ${keysToDelete.length} video elements for shape ${currentShapeName}`);
    };
  }, [shapeIdx]);
  
  // Memoize videos starting from current mediaIdx position to prevent flashing
  const usedVideos = useMemo(() => {
    if (videoMedia.length === 0) return [];
    return Array.from({ length: points.length }, (_, i) => {
      const idx = (mediaIdx + i) % videoMedia.length;
      return videoMedia[idx];
    });
  }, [points.length, mediaIdx, videoMedia]);

  // Single animation manager effect
  useEffect(() => {
    if (!isInitialized || pointsRef.current.length === 0 || videoMediaRef.current.length === 0 || !isMountedRef.current) {
      return;
    }

    // Clear any existing timers before starting new ones
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const startAnimation = () => {
      if (!isMountedRef.current) return;
      
      console.log(`Paths: Starting animation for shape: ${SHAPES[shapeIdx]}`);
      setCurrentIdx(0);
      
      const runAnimation = () => {
        let step = 0;
        const points = pointsRef.current;
        
        intervalRef.current = setInterval(() => {
          if (!isMountedRef.current) {
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            return;
          }
          
          step++;
          console.log(`Paths: Animation step ${step}/${points.length}`);
          setCurrentIdx(step);
          
          if (step >= points.length) {
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            console.log(`Paths: Shape complete, pausing for ${PAUSE_MS}ms`);
            
            timeoutRef.current = setTimeout(() => {
              if (!isMountedRef.current) return;
              
              console.log(`Paths: Timeout callback executing, switching to next shape`);
              setShapeIdx((prev) => {
                const next = (prev + 1) % SHAPES.length;
                console.log(`Paths: Switching from ${SHAPES[prev]} to ${SHAPES[next]}`);
                return next;
              });
              setMediaIdx((prev) => (prev + points.length) % videoMediaRef.current.length);
              timeoutRef.current = null;
            }, PAUSE_MS);
          }
        }, STEP_MS);
      };
      
      runAnimation();
    };

    startAnimation();
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [shapeIdx, isInitialized]); // Only restart when shape changes or initialized

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        background: "black",
        overflow: "hidden",
      }}
    >
      {points.slice(0, currentIdx).map((pt, i) => {
        const vid = usedVideos[i];
        if (!vid) return null;
        
        const videoKey = `${SHAPES[shapeIdx]}-${i}-${vid.path}`;
        
        return (
          <video
            key={videoKey}
            src={`/content/${vid.path}`}
            autoPlay
            loop
            muted
            playsInline
            onLoadedData={(e) => {
              // Track video element for cleanup
              const video = e.currentTarget as HTMLVideoElement;
              videoElementsRef.current.set(videoKey, video);
            }}
            onError={(e) => {
              console.error(`Paths: Video error for ${vid.path}:`, e);
              // Remove from tracking on error
              videoElementsRef.current.delete(videoKey);
            }}
            style={{
              position: "absolute",
              left: pt.x - VIDEO_SIZE / 2,
              top: pt.y - VIDEO_SIZE / 2,
              width: VIDEO_SIZE,
              height: VIDEO_SIZE,
              objectFit: "cover",
              transition: "left 0.04s linear, top 0.04s linear",
            }}
          />
        );
      })}
    </div>
  );
}

// Add static preload method to Paths (DISABLED - using Paths3 instead)
Paths.preload = async function(media: MediaItem[] = []) {
  // Disabled to prevent WebMediaPlayer errors - Paths3 is active instead
  return;
}; 