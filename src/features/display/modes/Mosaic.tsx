'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as PIXI from 'pixi.js';
import { MediaItem } from '@/shared/types/media';
import { usePoseDetection } from '@/shared/hooks/usePoseDetection';
import { useGlobalSettings } from '@/shared/hooks/useGlobalSettings';
import styles from './modes.module.scss';

type SmoothedPoint = {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  visibility: number;
};

type MosaicProps = {
  media: MediaItem[];
};

export default function Mosaic({ media }: MosaicProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const spritesRef = useRef<PIXI.Sprite[]>([]);
  const skeletonRef = useRef<PIXI.Graphics | null>(null);
  const smoothedLandmarksRef = useRef<SmoothedPoint[]>([]);
  const lastTextureRef = useRef<PIXI.Texture | null>(null);
  
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  
  // Get global settings
  const { settings: globalSettings } = useGlobalSettings();
  
  // Settings state
  const [settings, setSettings] = useState({
    tileSize: 75,
    rowOffset: 0,
    blackAndWhite: false,
    useCamera: true,
    showMosaic: true,
  });

  // Refs for animation loop
  const settingsRef = useRef(settings);
  const textureRef = useRef<PIXI.Texture | null>(null);

  const {
    cameraActive,
    poseDetected,
    debugInfo,
    videoRef,
    startDetection,
    stopDetection,
    latestResult
  } = usePoseDetection();
  const latestResultRef = useRef(latestResult);

  // Keep refs updated without causing re-renders
  useEffect(() => {
    latestResultRef.current = latestResult;
    settingsRef.current = settings;
  });

  // Start/stop camera based on settings
  useEffect(() => {
    if (settings.useCamera) {
      startDetection();
    } else {
      stopDetection();
    }
  }, [settings.useCamera, startDetection, stopDetection]);

  // Cycle through media
  useEffect(() => {
    if (!media.length) return;
    const interval = setInterval(() => {
      setCurrentMediaIndex(prev => (prev + 1) % media.length);
    }, 20000);
    return () => clearInterval(interval);
  }, [media.length]);

  // Load new texture when media changes
  useEffect(() => {
    if (media.length > 0) {
      const currentMedia = media[currentMediaIndex];
      if (currentMedia) {
        PIXI.Assets.load(`/content/${currentMedia.path}`)
          .then(texture => {
            if (texture.width > 0) { // Ensure texture is valid
              textureRef.current = texture;
            }
          })
          .catch(err => {
            console.error("Failed to load texture:", err);
            textureRef.current = null;
          });
      }
    } else {
      textureRef.current = null;
    }
  }, [media, currentMediaIndex]);

  const rebuildGrid = useCallback(() => {
    const app = appRef.current;
    if (!app) return;

    const currentSettings = settingsRef.current;
    const screenWidth = app.screen.width;
    const screenHeight = app.screen.height;
    const { tileSize, rowOffset } = currentSettings;

    // Clear old sprites by destroying them individually
    spritesRef.current.forEach(sprite => sprite.destroy());
    spritesRef.current = [];

    if (tileSize <= 0 || !textureRef.current) return;

    const texture = textureRef.current;
    const cols = Math.ceil(screenWidth / tileSize);
    const aspectRatio = texture.width / texture.height;
    const rowHeight = tileSize / aspectRatio;
    const rows = Math.ceil(screenHeight / rowHeight);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const sprite = new PIXI.Sprite(texture);
        sprite.x = col * tileSize + (row % 2) * (rowOffset / 100) * tileSize;
        sprite.y = row * rowHeight;
        sprite.width = tileSize;
        sprite.height = rowHeight;
        
        // Attach custom property for smoothing
        (sprite as any).currentAlpha = 0.2; 
        sprite.alpha = 0.2;
        
        app.stage.addChild(sprite);
        spritesRef.current.push(sprite);
      }
    }
    lastTextureRef.current = texture;
  }, []);

  // Rebuild grid when settings or texture changes
  useEffect(() => {
    if (appRef.current && (textureRef.current !== lastTextureRef.current)) {
      rebuildGrid();
    }
  }, [settings.tileSize, settings.rowOffset, textureRef.current, rebuildGrid]);

  // Main PIXI setup and animation loop
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const app = new PIXI.Application();
    let isMounted = true;
    
    const init = async () => {
      await app.init({
        width: container.clientWidth,
        height: container.clientHeight,
        backgroundColor: 0x000000,
        resizeTo: container
      });

      if (!isMounted) {
        app.destroy(true);
        return;
      }

      container.appendChild(app.canvas);
      appRef.current = app;
      app.stage.sortableChildren = true;

      // Initialize skeleton graphics
      skeletonRef.current = new PIXI.Graphics();
      skeletonRef.current.zIndex = 10;
      app.stage.addChild(skeletonRef.current);

      rebuildGrid();
      app.renderer.on('resize', rebuildGrid);

      const animate = () => {
        if (!appRef.current || !isMounted) return;
        
        const currentSettings = settingsRef.current;
        const currentPose = latestResultRef.current;
        const { useCamera, blackAndWhite, tileSize, showMosaic } = currentSettings;
        const screenWidth = app.screen.width;
        const screenHeight = app.screen.height;

        // Update sprites in place
        if (showMosaic) {
          spritesRef.current.forEach(sprite => {
            // Update filters for B&W
            const hasBwFilter = sprite.filters?.some(f => f instanceof PIXI.ColorMatrixFilter);
            if (blackAndWhite && !hasBwFilter) {
              sprite.filters = [new PIXI.ColorMatrixFilter()];
              (sprite.filters[0] as PIXI.ColorMatrixFilter).desaturate();
            } else if (!blackAndWhite && hasBwFilter) {
              sprite.filters = null;
            }

            // Calculate target alpha based on distance to nearest landmark
            let targetAlpha = 1.0;
            if (useCamera && currentPose?.landmarks) {
              let minDistance = Infinity;
              
              currentPose.landmarks.forEach(lm => {
                if (lm.visibility && lm.visibility > 0.3) {
                  const poseX = (1 - lm.x) * screenWidth; // Mirrored X
                  const poseY = lm.y * screenHeight;
                  const distance = Math.sqrt(
                    Math.pow(sprite.x + sprite.width / 2 - poseX, 2) +
                    Math.pow(sprite.y + sprite.height / 2 - poseY, 2)
                  );
                  if (distance < minDistance) {
                    minDistance = distance;
                  }
                }
              });

              if (minDistance !== Infinity) {
                const maxDistance = Math.min(screenWidth, screenHeight) * 0.3; // Make aura tighter
                targetAlpha = Math.max(0.2, 1 - minDistance / maxDistance);
              } else {
                targetAlpha = 0.2; // Default alpha if no landmarks visible
              }
            }

            // Smoothing logic
            const currentAlpha = (sprite as any).currentAlpha;
            const newAlpha = currentAlpha * 0.9 + targetAlpha * 0.1; // Easing
            sprite.alpha = newAlpha;
            (sprite as any).currentAlpha = newAlpha;
          });
        } else {
          // If mosaic is hidden, make all sprites transparent
          spritesRef.current.forEach(sprite => {
            sprite.alpha = 0;
          });
        }
        
        // Clear and redraw skeleton
        const skeletonGraphics = skeletonRef.current;
        if (skeletonGraphics) {
          skeletonGraphics.clear();
        
          if (useCamera && currentPose && currentPose.landmarks) { 
            const landmarks = currentPose.landmarks;
            
            // Initialize or update smoothed landmarks
            if (smoothedLandmarksRef.current.length !== landmarks.length) {
              smoothedLandmarksRef.current = landmarks.map(lm => ({
                x: (1 - lm.x) * screenWidth,
                y: lm.y * screenHeight,
                targetX: (1 - lm.x) * screenWidth,
                targetY: lm.y * screenHeight,
                visibility: lm.visibility ?? 0,
              }));
            } else {
              landmarks.forEach((lm, i) => {
                const point = smoothedLandmarksRef.current[i];
                if (point) {
                  point.targetX = (1 - lm.x) * screenWidth;
                  point.targetY = lm.y * screenHeight;
                  point.visibility = lm.visibility ?? 0;
                }
              });
            }

            // Apply smoothing
            smoothedLandmarksRef.current.forEach(point => {
              point.x += (point.targetX - point.x) * 0.2; // Easing factor
              point.y += (point.targetY - point.y) * 0.2;
            });

            const smoothedPoints = smoothedLandmarksRef.current;
            const connections = [[0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8], [9, 10], [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24], [23, 25], [24, 26], [25, 27], [26, 28], [11, 13], [13, 15], [15, 21], [15, 19], [15, 17], [12, 14], [14, 16], [16, 22], [16, 20], [16, 18], [23, 25], [25, 27], [27, 29], [27, 31], [24, 26], [26, 28], [28, 30], [28, 32]];
            
            // --- Draw connections as filled polygons ---
            skeletonGraphics.beginFill(0xffffff, 0.8);
            const lineWidth = 3;
            connections.forEach(([start, end]) => {
                const startLm = smoothedPoints[start];
                const endLm = smoothedPoints[end];

                if (startLm && endLm && startLm.visibility > 0.3 && endLm.visibility > 0.3) {
                    const dx = endLm.x - startLm.x;
                    const dy = endLm.y - startLm.y;
                    const length = Math.sqrt(dx * dx + dy * dy);
                    if (length < 1) return;

                    // Normalized perpendicular vector
                    const perpX = -dy / length;
                    const perpY = dx / length;
                    const halfWidth = lineWidth / 2;

                    skeletonGraphics.drawPolygon([
                        startLm.x - perpX * halfWidth, startLm.y - perpY * halfWidth,
                        startLm.x + perpX * halfWidth, startLm.y + perpY * halfWidth,
                        endLm.x + perpX * halfWidth, endLm.y + perpY * halfWidth,
                        endLm.x - perpX * halfWidth, endLm.y - perpY * halfWidth,
                    ]);
                }
            });
            skeletonGraphics.endFill();

            // --- Then draw joints on top ---
            skeletonGraphics.beginFill(0xffffff, 0.8);
            smoothedPoints.forEach(lm => {
                if (lm.visibility > 0.3) {
                    skeletonGraphics.drawCircle(lm.x, lm.y, 5); // Slightly larger joints
                }
            });
            skeletonGraphics.endFill();
          }
        }

        animationFrameRef.current = requestAnimationFrame(animate);
      };
      animate();
    };

    init();

    return () => {
      isMounted = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (appRef.current) {
        appRef.current.renderer.off('resize', rebuildGrid);
        appRef.current.destroy(true, { children: true, texture: true });
        appRef.current = null;
      }
    };
  }, [rebuildGrid]);

  return (
    <>
      {/* Controls - only show if overlays are not hidden */}
      {!globalSettings.hideOverlays && (
        <div className="fixed top-4 left-4 z-10 bg-black/50 p-4 rounded">
        <label className="block text-white text-sm mb-2">
          Tile Size: {settings.tileSize}px
        </label>
        <input
          type="range"
          min="25"
          max="200"
          value={settings.tileSize}
          onChange={(e) => setSettings(s => ({ ...s, tileSize: Number(e.target.value) }))}
          className="w-32 mb-4"
        />
        
        <label className="block text-white text-sm mb-2">
          Row Offset: {settings.rowOffset}%
        </label>
        <input
          type="range"
          min="-100"
          max="100"
          value={settings.rowOffset}
          onChange={(e) => setSettings(s => ({ ...s, rowOffset: Number(e.target.value) }))}
          className="w-32 mb-4"
        />
        
        <label className="block text-white text-sm mb-2">
          <input
            type="checkbox"
            checked={settings.blackAndWhite}
            onChange={(e) => setSettings(s => ({ ...s, blackAndWhite: e.target.checked }))}
            className="mr-2"
          />
          Black & White
        </label>

        <label className="block text-white text-sm mb-2">
          <input
            type="checkbox"
            checked={settings.useCamera}
            onChange={(e) => setSettings(s => ({ ...s, useCamera: e.target.checked }))}
            className="mr-2"
          />
          Use Camera
        </label>

        <label className="block text-white text-sm mb-2">
          <input
            type="checkbox"
            checked={settings.showMosaic}
            onChange={(e) => setSettings(s => ({ ...s, showMosaic: e.target.checked }))}
            className="mr-2"
          />
          Show Mosaic
        </label>
        
        {media.length > 0 && (
          <div className="text-white text-sm mt-4">
            Media: {currentMediaIndex + 1}/{media.length}
            <br />
            {media[currentMediaIndex]?.name}
          </div>
        )}
        </div>
      )}

      {/* Camera Status - only show if overlays are not hidden */}
      {!globalSettings.hideOverlays && settings.useCamera && (
        <div className="fixed top-4 right-4 z-10 bg-black/50 p-4 rounded text-white text-sm">
          <div>Camera: {cameraActive ? '✓' : '...'}</div>
          <div>Pose: {poseDetected ? '✓ Detected' : '◦ Searching...'}</div>
          <div style={{ fontSize: '10px', marginTop: '5px', maxWidth: '200px' }}>
            {debugInfo}
          </div>
          <div style={{ fontSize: '8px', marginTop: '5px', color: '#888' }}>
            <div>Latest Result: {latestResult ? 'Yes' : 'No'}</div>
            <div>Landmarks: {latestResult?.landmarks ? latestResult.landmarks.length : 0}</div>
          </div>
        </div>
      )}

      {/* Camera Preview - always render for pose detection, but hide if overlays disabled */}
      {settings.useCamera && (
        <video
          ref={videoRef}
          style={{ 
            transform: 'scaleX(-1)',
            position: 'fixed',
            bottom: 10,
            right: 10,
            width: 160,
            height: 120,
            border: '2px solid white',
            zIndex: 9999,
            pointerEvents: 'none',
            visibility: globalSettings.hideOverlays ? 'hidden' : (cameraActive ? 'visible' : 'hidden'),
          }}
          muted
          autoPlay
          playsInline
        />
      )}
      
      <div ref={containerRef} className={styles.modeContainer} />
    </>
  );
}

// Add static preload method to Mosaic
Mosaic.preload = async function(media: MediaItem[] = []) {
  if (!media?.length) return;
  
  // Preload all media items since Mosaic cycles through them
  const preloaders = media.map(item => {
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