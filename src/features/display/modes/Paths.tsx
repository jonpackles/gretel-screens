"use client";

import { useEffect, useRef, useState } from "react";
import { MediaItem } from "@/shared/types/media";

const SHAPES = ["house", "sine", "infinity", "circle"] as const;
type ShapeName = typeof SHAPES[number];
const STEP_MS = 100; // Speed of animation (ms per step)
const PAUSE_MS = 3000; // Pause at end of shape (ms)
const VIDEO_SIZE = 220;
const VIDEO_SPACING = 120;

function getShapePath(shape: ShapeName, count: number): { x: number; y: number }[] {
  switch (shape) {
    case "house":
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

function getEvenlySpacedPoints(path: { x: number; y: number }[], spacingPx: number, width: number, height: number) {
  if (path.length < 2) return [];
  const pts = path.map((p) => ({ x: p.x * width, y: p.y * height }));
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
  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Track container size
  useEffect(() => {
    function update() {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Get path points for current shape
  const basePath = getShapePath(SHAPES[shapeIdx], 100);
  const points = getEvenlySpacedPoints(basePath, VIDEO_SPACING, containerSize.width, containerSize.height);
  const videoMedia = media.filter((m) => /\.mp4$/i.test(m.name));
  
  // Use videos starting from current mediaIdx position
  const usedVideos = Array.from({ length: points.length }, (_, i) => {
    const idx = (mediaIdx + i) % videoMedia.length;
    return videoMedia[idx];
  });

  // Animation logic
  useEffect(() => {
    if (points.length === 0 || usedVideos.length === 0) return;
    if (isPaused) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setCurrentIdx((idx) => {
        if (idx < points.length) {
          return idx + 1;
        } else {
          // At end: pause, then switch shape
          setIsPaused(true);
          if (intervalRef.current) clearInterval(intervalRef.current);
          timeoutRef.current = setTimeout(() => {
            setShapeIdx((i) => (i + 1) % SHAPES.length);
            setCurrentIdx(0);
            // Update mediaIdx to continue from where we left off
            setMediaIdx((prev) => (prev + points.length) % videoMedia.length);
            setIsPaused(false);
          }, PAUSE_MS);
          return idx;
        }
      });
    }, STEP_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shapeIdx, isPaused, points.length, usedVideos.length]);

  // Reset currentIdx when shape changes
  useEffect(() => {
    setCurrentIdx(0);
  }, [shapeIdx]);

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
        return (
          <video
            key={shapeIdx + "-" + i + "-" + vid.path}
            src={`/content/${vid.path}`}
            autoPlay
            loop
            muted
            playsInline
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

// Add static preload method to Paths
Paths.preload = async function(media: MediaItem[] = []) {
  if (!media?.length) return;
  // Filter for videos
  const videoMedia = media.filter((m) => /\.mp4$/i.test(m.name));
  // Only preload up to 70 videos, looping if not enough
  const N = 70;
  const usedVideos = Array.from({ length: N }, (_, i) => videoMedia[i % videoMedia.length]);
  const preloaders = usedVideos.map(item => {
    const src = `/content/${item.path}`;
    return new Promise(resolve => {
      const video = document.createElement('video');
      video.src = src;
      video.preload = 'auto';
      video.muted = true;
      video.oncanplaythrough = () => resolve(true);
      video.onerror = () => resolve(false);
    });
  });
  await Promise.all(preloaders);
}; 