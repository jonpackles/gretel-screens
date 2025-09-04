"use client";

import { useEffect, useRef } from "react";
import { MediaItem } from "@/shared/types/media";

const SHAPES = ["house", "sine", "infinity", "circle"] as const;
type ShapeName = typeof SHAPES[number];
const STEP_MS = 100;
const PAUSE_MS = 3000;
const VIDEO_SIZE = 130;
const VIDEO_SPACING = 100;
const MAX_CONCURRENT_VIDEOS = 50; // Limit to prevent WebMediaPlayer errors

interface PathPoint {
  x: number;
  y: number;
}

interface AnimationContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  videos: HTMLVideoElement[];
  currentShape: number;
  currentStep: number;
  pathPoints: PathPoint[];
  videoMedia: MediaItem[];
  mediaStartIndex: number; // Track where we are in the media array
  lastStepTime: number;
  isAnimating: boolean;
  isPaused: boolean;
  pauseStartTime: number; // Track when pause started
  animationFrameId: number | null;
}

function getShapePath(shape: ShapeName, count: number, containerSize: { width: number; height: number }): PathPoint[] {
  switch (shape) {
    case "house":
      const size = Math.min(containerSize.width, containerSize.height) * 0.9;
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
    case "sine":
      return Array.from({ length: count }, (_, i) => {
        const t = i / (count - 1);
        return {
          x: t * containerSize.width,
          y: containerSize.height * (0.5 + 0.2 * Math.sin(2 * Math.PI * t)),
        };
      });
    case "infinity":
      return Array.from({ length: count }, (_, i) => {
        const t = (i / (count - 1)) * 2 * Math.PI;
        return {
          x: containerSize.width * (0.5 + 0.25 * Math.sin(t)),
          y: containerSize.height * (0.5 + 0.25 * Math.sin(t) * Math.cos(t)),
        };
      });
    case "circle":
      return Array.from({ length: count }, (_, i) => {
        const t = (i / (count - 1)) * 2 * Math.PI;
        return {
          x: containerSize.width * (0.5 + 0.3 * Math.cos(t)),
          y: containerSize.height * (0.5 + 0.3 * Math.sin(t)),
        };
      });
    default:
      return [];
  }
}

function getEvenlySpacedPoints(path: PathPoint[], spacingPx: number): PathPoint[] {
  if (path.length < 2) return [];
  
  const segLens = path.slice(1).map((p, i) => Math.hypot(p.x - path[i].x, p.y - path[i].y));
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
    const segStart = path[segIdx];
    const segEnd = path[segIdx + 1];
    const segT = segLens[segIdx] > 0 ? (targetDist - dist) / segLens[segIdx] : 0;
    result.push({
      x: segStart.x + (segEnd.x - segStart.x) * segT,
      y: segStart.y + (segEnd.y - segStart.y) * segT,
    });
  }
  return result;
}

function createVideoElement(src: string): HTMLVideoElement {
  const video = document.createElement('video');
  video.src = src;
  video.autoplay = true;
  video.loop = true;
  video.muted = true;
  video.playsInline = true;
  video.style.display = 'none'; // Hide from DOM
  document.body.appendChild(video);
  
  // Use onloadeddata property instead of addEventListener to avoid leak
  video.onloadeddata = () => {
    video.play().catch(() => {
      // Silent fail - autoplay restrictions are common
    });
  };
  
  // Force play attempt immediately
  video.play().catch(() => {
    // Silent fail - expected on initial load
  });
  
  return video;
}

function forceCleanupVideo(video: HTMLVideoElement): void {
  // Aggressive cleanup to prevent WebMediaPlayer accumulation
  video.pause();
  video.onloadeddata = null;
  video.onerror = null;
  video.onended = null;
  video.src = '';
  video.srcObject = null;
  video.load(); // Force resource release
  
  if (document.body.contains(video)) {
    document.body.removeChild(video);
  }
}

function animate(context: AnimationContext) {
  const { canvas, ctx, videos, pathPoints } = context;
  const now = Date.now();
  
  // Clear canvas
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Check if we should advance step
  if (!context.isPaused && now - context.lastStepTime >= STEP_MS) {
    context.lastStepTime = now;
    context.currentStep++;
    
    if (context.currentStep > pathPoints.length) {
      // Shape completed, start pause
      context.isPaused = true;
      context.pauseStartTime = now; // Track when pause started
      // Keep videos visible during pause - don't clean up yet
    } else {
      // Add new video for this step (with safety limit)
      if (context.videos.length < MAX_CONCURRENT_VIDEOS) {
        const videoIndex = (context.mediaStartIndex + context.currentStep - 1) % context.videoMedia.length;
        const mediaItem = context.videoMedia[videoIndex];
        const video = createVideoElement(`/content/${mediaItem.path}`);
        context.videos.push(video);
      }
    }
  }

  // Handle pause duration and shape transition
  if (context.isPaused && now - context.pauseStartTime >= PAUSE_MS) {
    // Clean up videos before transitioning to next shape
    videos.forEach(forceCleanupVideo);
    context.videos = [];
    
    // Pause is complete, move to next shape
    context.currentShape = (context.currentShape + 1) % SHAPES.length;
    context.currentStep = 0;
    context.isPaused = false;
    context.lastStepTime = now; // Reset step timer
    
    // Advance media start index to use different videos for next shape
    context.mediaStartIndex = (context.mediaStartIndex + pathPoints.length) % context.videoMedia.length;
    
    // Generate new path
    const basePath = getShapePath(SHAPES[context.currentShape], 100, {
      width: canvas.width,
      height: canvas.height
    });
    context.pathPoints = getEvenlySpacedPoints(basePath, VIDEO_SPACING);
  }
  
  // Render all active videos
  // During pause, show all videos; during animation, show up to current step
  const videosToRender = context.isPaused 
    ? Math.min(pathPoints.length, videos.length)
    : Math.min(context.currentStep, pathPoints.length, videos.length);
    
  for (let i = 0; i < videosToRender; i++) {
    const point = pathPoints[i];
    const video = videos[i];
    
    if (video && video.readyState >= 2) { // Video has loaded enough data
      const x = point.x - VIDEO_SIZE / 2;
      const y = point.y - VIDEO_SIZE / 2;
      
      // Ensure video is playing
      if (video.paused) {
        video.play().catch(() => {
          // Silent fail - video may not be ready
        });
      }
      
      try {
        // Calculate aspect ratio and scaling for "cover" behavior
        const videoAspect = video.videoWidth / video.videoHeight;
        const targetAspect = 1; // Square target
        
        let sourceX = 0, sourceY = 0, sourceWidth = video.videoWidth, sourceHeight = video.videoHeight;
        
        if (videoAspect > targetAspect) {
          // Video is wider than target - crop sides
          sourceWidth = video.videoHeight * targetAspect;
          sourceX = (video.videoWidth - sourceWidth) / 2;
        } else {
          // Video is taller than target - crop top/bottom
          sourceHeight = video.videoWidth / targetAspect;
          sourceY = (video.videoHeight - sourceHeight) / 2;
        }
        
        // Draw the cropped portion of the video to fill the square
        ctx.drawImage(
          video,
          sourceX, sourceY, sourceWidth, sourceHeight,  // Source rectangle (what to crop from video)
          x, y, VIDEO_SIZE, VIDEO_SIZE                   // Destination rectangle (where to draw)
        );
      } catch (error) {
        // Video not ready yet, skip rendering this frame
      }
    }
  }
  
  // Debug info - only show in development
  if (process.env.NODE_ENV === 'development') {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(10, 10, 300, 60);
    ctx.fillStyle = 'white';
    ctx.font = '14px Arial';
    ctx.fillText(`Shape: ${SHAPES[context.currentShape]} | Step: ${context.currentStep}/${pathPoints.length}`, 15, 30);
    const playingCount = videos.filter(v => !v.paused && v.readyState >= 2).length;
    ctx.fillText(`Videos: ${videos.length} | Active: ${Math.min(context.currentStep, pathPoints.length)} | Playing: ${playingCount}`, 15, 50);
  }
  
  // Continue animation
  if (context.isAnimating) {
    context.animationFrameId = requestAnimationFrame(() => animate(context));
  }
}

export default function Paths3({ media }: { media: MediaItem[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<AnimationContext | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Filter video media
    const videoMedia = media.filter((m) => /\.mp4$/i.test(m.name));

    if (videoMedia.length === 0) return;

    // Generate initial path
    const basePath = getShapePath(SHAPES[0], 100, {
      width: canvas.width,
      height: canvas.height
    });
    const pathPoints = getEvenlySpacedPoints(basePath, VIDEO_SPACING);

    // Create animation context
    const context: AnimationContext = {
      canvas,
      ctx,
      videos: [],
      currentShape: 0,
      currentStep: 0,
      pathPoints,
      videoMedia,
      mediaStartIndex: 0, // Start at beginning of media array
      lastStepTime: Date.now(),
      isAnimating: true,
      isPaused: false,
      pauseStartTime: 0, // Initialize pause timer
      animationFrameId: null,
    };

    contextRef.current = context;
    
    // Start animation
    animate(context);

    // Handle resize
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      // Regenerate path for new size
      const basePath = getShapePath(SHAPES[context.currentShape], 100, {
        width: canvas.width,
        height: canvas.height
      });
      context.pathPoints = getEvenlySpacedPoints(basePath, VIDEO_SPACING);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      // Cleanup
      context.isAnimating = false;
      if (context.animationFrameId) {
        cancelAnimationFrame(context.animationFrameId);
      }
      
      // Clean up videos
      context.videos.forEach(forceCleanupVideo);
      
      window.removeEventListener('resize', handleResize);
    };
  }, [media]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'black',
      }}
    />
  );
}

// Preload function
Paths3.preload = async function(media: MediaItem[] = []) {
  if (!media?.length) return;
  
  const videoMedia = media.filter((m) => /\.mp4$/i.test(m.name));
  const preloadCount = Math.min(20, videoMedia.length);
  
  const preloadPromises = videoMedia.slice(0, preloadCount).map((item) => {
    return new Promise<boolean>((resolve) => {
      const video = document.createElement('video');
      video.src = `/content/${item.path}`;
      video.preload = 'metadata';
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
  
  await Promise.allSettled(preloadPromises);
};
