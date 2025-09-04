"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { MediaItem } from "@/shared/types/media";

const SHAPES = ["house", "sine", "infinity", "circle"] as const;
type ShapeName = typeof SHAPES[number];
const STEP_MS = 100;
const PAUSE_MS = 3000;
const VIDEO_SIZE = 170;
const VIDEO_SPACING = 120;
const MAX_VIDEO_POOL_SIZE = 50; // Limit video element pool size

interface VideoElement extends HTMLVideoElement {
  _isInUse?: boolean;
  _poolId?: string;
}

interface PathPoint {
  x: number;
  y: number;
}

interface AnimationState {
  shapeIndex: number;
  currentStep: number;
  mediaStartIndex: number;
  isAnimating: boolean;
  isPaused: boolean;
}

// Video pool manager for efficient reuse of video elements
class VideoPool {
  private pool: VideoElement[] = [];
  private inUse = new Set<VideoElement>();
  private maxSize: number;

  constructor(maxSize: number = MAX_VIDEO_POOL_SIZE) {
    this.maxSize = maxSize;
  }

  getVideo(src: string): VideoElement {
    // Try to find an unused video with the same source
    let video = this.pool.find(v => !v._isInUse && v.src.endsWith(src));
    
    if (!video) {
      // Try to find any unused video
      video = this.pool.find(v => !v._isInUse);
      
      if (video) {
        // Reuse existing video with new source
        video.src = src;
      } else if (this.pool.length < this.maxSize) {
        // Create new video if pool isn't full
        video = this.createVideo(src);
        this.pool.push(video);
      } else {
        // Pool is full, reuse oldest video
        video = this.pool[0];
        this.releaseVideo(video);
        video.src = src;
      }
    }

    video._isInUse = true;
    video._poolId = `${src}-${Date.now()}`;
    this.inUse.add(video);
    return video;
  }

  releaseVideo(video: VideoElement): void {
    if (!video._isInUse) return;
    
    video._isInUse = false;
    video.pause();
    this.inUse.delete(video);
  }

  releaseAll(): void {
    this.inUse.forEach(video => {
      video._isInUse = false;
      video.pause();
    });
    this.inUse.clear();
  }

  destroy(): void {
    this.pool.forEach(video => {
      video.pause();
      video.src = '';
      video.load();
    });
    this.pool = [];
    this.inUse.clear();
  }

  private createVideo(src: string): VideoElement {
    const video = document.createElement('video') as VideoElement;
    video.src = src;
    video.autoplay = true;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.style.position = 'absolute';
    video.style.width = `${VIDEO_SIZE}px`;
    video.style.height = `${VIDEO_SIZE}px`;
    video.style.objectFit = 'cover';
    video.preload = 'auto';
    return video;
  }

  getStats() {
    return {
      total: this.pool.length,
      inUse: this.inUse.size,
      available: this.pool.length - this.inUse.size
    };
  }
}

function getShapePath(shape: ShapeName, count: number, containerSize?: { width: number; height: number }): PathPoint[] {
  switch (shape) {
    case "house":
      if (containerSize) {
        const size = Math.min(containerSize.width, containerSize.height) * 0.85;
        const centerX = containerSize.width / 2;
        const centerY = containerSize.height / 2;
        
        const housePoints = [
          { x: -0.15, y: 0.2 },
          { x: -0.15, y: -0.1 },
          { x: 0, y: -0.3 },
          { x: 0.15, y: -0.1 },
          { x: 0.15, y: 0.2 },
          { x: -0.15, y: 0.2 },
        ];
        
        return housePoints.map(pt => ({
          x: centerX + pt.x * size,
          y: centerY + pt.y * size,
        }));
      }
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

function getEvenlySpacedPoints(path: PathPoint[], spacingPx: number, containerSize?: { width: number; height: number }): PathPoint[] {
  if (path.length < 2) return [];
  
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

export default function Paths2({ media }: { media: MediaItem[] }) {
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [isInitialized, setIsInitialized] = useState(false);
  const [animationState, setAnimationState] = useState<AnimationState>({
    shapeIndex: 0,
    currentStep: 0,
    mediaStartIndex: 0,
    isAnimating: false,
    isPaused: false
  });

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const videoPoolRef = useRef<VideoPool | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const lastStepTimeRef = useRef(0);

  // Memoized video media
  const videoMedia = useMemo(() => {
    const filtered = media.filter((m) => /\.mp4$/i.test(m.name));
    console.log(`Paths2: Media filtering - total: ${media.length}, videos: ${filtered.length}`, filtered.slice(0, 3));
    return filtered;
  }, [media]);

  // Memoized path points
  const pathPoints = useMemo(() => {
    console.log(`Paths2: Generating path for shape ${SHAPES[animationState.shapeIndex]}, container: ${containerSize.width}x${containerSize.height}`);
    const basePath = getShapePath(SHAPES[animationState.shapeIndex], 100, containerSize);
    const points = getEvenlySpacedPoints(basePath, VIDEO_SPACING, containerSize);
    console.log(`Paths2: Generated ${points.length} points for ${SHAPES[animationState.shapeIndex]}`, points.slice(0, 3));
    return points;
  }, [animationState.shapeIndex, containerSize.width, containerSize.height]);

  // Initialize video pool
  useEffect(() => {
    videoPoolRef.current = new VideoPool(MAX_VIDEO_POOL_SIZE);
    console.log('Paths2: Video pool initialized');

    return () => {
      if (videoPoolRef.current) {
        console.log('Paths2: Destroying video pool');
        videoPoolRef.current.destroy();
        videoPoolRef.current = null;
      }
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Container size tracking with throttling
  useEffect(() => {
    let resizeTimeout: NodeJS.Timeout;
    
    const updateSize = () => {
      console.log(`Paths2: updateSize called - containerRef exists: ${!!containerRef.current}, isMounted: ${isMountedRef.current}`);
      
      if (containerRef.current && isMountedRef.current) {
        const newWidth = containerRef.current.offsetWidth;
        const newHeight = containerRef.current.offsetHeight;
        
        console.log(`Paths2: Container dimensions - ${newWidth}x${newHeight}, initialized: ${isInitialized}`);
        
        setContainerSize(prev => {
          if (prev.width !== newWidth || prev.height !== newHeight) {
            console.log(`Paths2: Container size changed - ${newWidth}x${newHeight}`);
            return { width: newWidth, height: newHeight };
          }
          return prev;
        });

        if (!isInitialized && newWidth > 0 && newHeight > 0) {
          console.log(`Paths2: INITIALIZING CONTAINER - ${newWidth}x${newHeight}`);
          setIsInitialized(true);
        }
      } else {
        console.log(`Paths2: Cannot update size - missing containerRef or unmounted`);
      }
    };

    const throttledResize = () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(updateSize, 100);
    };

    // Initial size update
    const timer = setTimeout(updateSize, 50);
    
    // Force initialization after a short delay if not already initialized
    const forceInitTimer = setTimeout(() => {
      if (!isInitialized) {
        console.log(`Paths2: FORCE INITIALIZING - timeout reached`);
        setIsInitialized(true);
      }
    }, 200);
    
    window.addEventListener('resize', throttledResize);
    
    return () => {
      clearTimeout(timer);
      clearTimeout(forceInitTimer);
      if (resizeTimeout) clearTimeout(resizeTimeout);
      window.removeEventListener('resize', throttledResize);
    };
  }, [isInitialized]);

  // Animation loop using RAF for better performance
  const animate = useCallback(() => {
    if (!isMountedRef.current || !isInitialized || pathPoints.length === 0 || videoMedia.length === 0) {
      return;
    }

    const now = Date.now();
    // console.log(`Paths2: animate() called - time since last step: ${now - lastStepTimeRef.current}ms`);
    
    if (now - lastStepTimeRef.current >= STEP_MS) {
      lastStepTimeRef.current = now;
      
      setAnimationState(prev => {
        if (prev.isPaused) {
          console.log(`Paths2: Animation paused, stopping RAF`);
          return prev;
        }
        
        const nextStep = prev.currentStep + 1;
        console.log(`Paths2: Animation step ${nextStep}/${pathPoints.length} (was ${prev.currentStep})`);
        
        if (nextStep > pathPoints.length) {
          // Shape completed, start pause
          console.log(`Paths2: Shape ${SHAPES[prev.shapeIndex]} completed, pausing`);
          return { ...prev, isPaused: true, currentStep: pathPoints.length };
        }
        
        console.log(`Paths2: Advancing to step ${nextStep}`);
        return { ...prev, currentStep: nextStep };
      });
    }

    // Always continue animation unless component is unmounted
    if (isMountedRef.current) {
      animationFrameRef.current = requestAnimationFrame(animate);
      // console.log(`Paths2: Scheduling next RAF`);
    } else {
      console.log(`Paths2: Component unmounted, stopping RAF`);
    }
  }, [isInitialized, pathPoints.length, videoMedia.length]);

  // Handle pause and shape transitions
  useEffect(() => {
    if (animationState.isPaused && isMountedRef.current) {
      console.log(`Paths2: Starting pause timeout for ${PAUSE_MS}ms`);
      
      // Stop the animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      timeoutRef.current = setTimeout(() => {
        if (!isMountedRef.current) return;
        
        // Release all videos from previous shape
        if (videoPoolRef.current) {
          videoPoolRef.current.releaseAll();
        }
        
        setAnimationState(prev => {
          const nextShapeIndex = (prev.shapeIndex + 1) % SHAPES.length;
          const nextMediaStart = (prev.mediaStartIndex + pathPoints.length) % videoMedia.length;
          
          console.log(`Paths2: Transitioning to shape ${SHAPES[nextShapeIndex]}`);
          
          return {
            shapeIndex: nextShapeIndex,
            currentStep: 0,
            mediaStartIndex: nextMediaStart,
            isAnimating: false,
            isPaused: false
          };
        });
      }, PAUSE_MS);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [animationState.isPaused, pathPoints.length, videoMedia.length]);

  // Start animation when conditions are ready
  useEffect(() => {
    // Only start animation once when first initialized
    if (isInitialized && pathPoints.length > 0 && videoMedia.length > 0 && !animationState.isAnimating && !animationState.isPaused && animationState.currentStep === 0) {
      console.log(`Paths2: STARTING ANIMATION for shape ${SHAPES[animationState.shapeIndex]}`);
      
      // Start animation immediately
      setAnimationState(prev => ({ 
        ...prev, 
        isAnimating: true, 
        currentStep: 1  // Start with 1 to show first video immediately
      }));
      
      lastStepTimeRef.current = Date.now();
      animationFrameRef.current = requestAnimationFrame(animate);
    }
  }, [isInitialized, pathPoints.length, videoMedia.length]);

  // Render videos efficiently
  const renderVideos = useCallback(() => {
    if (pathPoints.length === 0 || videoMedia.length === 0) {
      console.log(`Paths2: No rendering - pathPoints: ${pathPoints.length}, videoMedia: ${videoMedia.length}`);
      return null;
    }

    const videos: JSX.Element[] = [];
    const videosToRender = Math.min(animationState.currentStep, pathPoints.length);
    
    console.log(`Paths2: Rendering ${videosToRender} videos (step: ${animationState.currentStep}, points: ${pathPoints.length})`);

    for (let i = 0; i < videosToRender; i++) {
      const point = pathPoints[i];
      const mediaIndex = (animationState.mediaStartIndex + i) % videoMedia.length;
      const mediaItem = videoMedia[mediaIndex];
      const src = `/content/${mediaItem.path}`;
      
      console.log(`Paths2: Creating video ${i} at (${point.x.toFixed(1)}, ${point.y.toFixed(1)}) with src: ${src}`);
      
      videos.push(
        <div
          key={`video-container-${animationState.shapeIndex}-${i}`}
          style={{
            position: 'absolute',
            left: point.x - VIDEO_SIZE / 2,
            top: point.y - VIDEO_SIZE / 2,
            width: VIDEO_SIZE,
            height: VIDEO_SIZE,
          }}
        >
          <video
            src={src}
            autoPlay
            loop
            muted
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              border: `2px solid ${['red', 'blue', 'green', 'yellow', 'purple'][i % 5]}`, // Debug: different colors per video
            }}
            onLoadStart={() => {
              // console.log(`Paths2: Video ${i} started loading: ${src}`);
            }}
            onLoadedData={() => {
              // console.log(`Paths2: Video ${i} loaded data: ${src}`);
            }}
            onError={(e) => {
              console.error(`Paths2: Video error for ${src}:`, e);
            }}
          />
          <div style={{
            position: 'absolute',
            top: 5,
            left: 5,
            background: 'rgba(0,0,0,0.7)',
            color: 'white',
            padding: '2px 6px',
            fontSize: '12px',
            fontWeight: 'bold'
          }}>
            {i}
          </div>
        </div>
      );
    }

    return videos;
  }, [pathPoints, videoMedia, animationState.currentStep, animationState.mediaStartIndex, animationState.shapeIndex]);

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
      {renderVideos()}
      {/* Debug info */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          position: 'absolute',
          top: 10,
          left: 10,
          color: 'white',
          fontSize: '12px',
          fontFamily: 'monospace',
          background: 'rgba(0,0,0,0.7)',
          padding: '8px',
          borderRadius: '4px'
        }}>
          Shape: {SHAPES[animationState.shapeIndex]} | 
          Step: {animationState.currentStep}/{pathPoints.length} | 
          Videos: {Math.min(animationState.currentStep, pathPoints.length)}
        </div>
      )}
    </div>
  );
}

// Preload function with pool management
Paths2.preload = async function(media: MediaItem[] = []) {
  if (!media?.length) return;
  
  const videoMedia = media.filter((m) => /\.mp4$/i.test(m.name));
  const preloadCount = Math.min(30, videoMedia.length); // Reduced preload count
  
  console.log(`Paths2: Preloading ${preloadCount} videos`);
  
  const preloadPromises = videoMedia.slice(0, preloadCount).map((item, index) => {
    return new Promise<boolean>((resolve) => {
      const video = document.createElement('video');
      video.src = `/content/${item.path}`;
      video.preload = 'metadata'; // Load only metadata, not full video
      video.muted = true;
      
      const cleanup = () => {
        video.src = '';
        video.load();
      };
      
      const timeoutId = setTimeout(() => {
        cleanup();
        resolve(false);
      }, 3000);
      
      video.onloadedmetadata = () => {
        clearTimeout(timeoutId);
        cleanup();
        resolve(true);
      };
      
      video.onerror = () => {
        clearTimeout(timeoutId);
        cleanup();
        resolve(false);
      };
    });
  });
  
  const results = await Promise.allSettled(preloadPromises);
  const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
  console.log(`Paths2: Preloaded ${successful}/${preloadCount} videos successfully`);
};
