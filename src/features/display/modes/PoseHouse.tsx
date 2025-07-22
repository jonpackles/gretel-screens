'use client';

import { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import { usePoseDetection } from '@/shared/hooks/usePoseDetection';
import styles from './modes.module.scss';

type Point = { x: number; y: number };
type HousePoint = Point & { 
  targetX: number;
  targetY: number;
  originalX: number;
  originalY: number;
  lastSeen?: number; 
};

type PoseHouseProps = {
  // No props needed for this mode
};

export default function PoseHouse({}: PoseHouseProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  
  // Use the pose detection hook
  const {
    cameraActive,
    poseDetected,
    debugInfo,
    videoRef,
    startDetection,
    latestResult
  } = usePoseDetection();
  
  // Use ref to track latest pose result without causing re-renders
  const latestResultRef = useRef(latestResult);
  latestResultRef.current = latestResult;
  
  // House shape refs
  const houseGraphicsRef = useRef<PIXI.Graphics | null>(null);
  const housePointsRef = useRef<HousePoint[]>([]);
  const animationFrameRef = useRef<number>();

  // House shape points (extracted from the SVG path)
  const originalHousePoints: Point[] = [
    { x: 97.5, y: 0.707 },     // Top peak
    { x: 194.5, y: 97.8584 },  // Top right
    { x: 194.5, y: 229.5 },    // Bottom right
    { x: 0.5, y: 229.5 },      // Bottom left
    { x: 0.5, y: 97.8584 },    // Top left
  ];

  // Pose landmark indices for mapping (full body only)
  const poseMappings = [
    0,  // nose -> house peak
    16, // right wrist -> top right
    28, // right ankle -> bottom right  
    27, // left ankle -> bottom left
    15, // left wrist -> top left
  ];

  // Start pose detection on mount
  useEffect(() => {
    startDetection();
  }, [startDetection]);

  useEffect(() => {
    const initPIXI = async () => {
      if (!containerRef.current || !cameraActive) return;

      try {
        // Destroy existing app if it exists
        if (appRef.current) {
          appRef.current.destroy(true);
          appRef.current = null;
        }

        // Clear only canvas elements from container, not all children
        if (containerRef.current) {
          const canvases = containerRef.current.querySelectorAll('canvas');
          canvases.forEach(canvas => canvas.remove());
        }

        // Create PIXI application
        const app = new PIXI.Application();
        
        await app.init({
          width: window.innerWidth,
          height: window.innerHeight,
          backgroundColor: 0x000000,
        });

        if (app.canvas && containerRef.current) {
          containerRef.current.appendChild(app.canvas);
          appRef.current = app;

          // Initialize house shape
          await initHouseShape(app);
          
          // Start animation loop
          startAnimationLoop();
        }
      } catch (error) {
        console.error('PoseHouse: Error initializing PIXI:', error);
      }
    };

    const initHouseShape = async (app: PIXI.Application) => {
      // Create graphics object for house
      const houseGraphics = new PIXI.Graphics();
      app.stage.addChild(houseGraphics);
      houseGraphicsRef.current = houseGraphics;

      // Scale and center the house points
      const centerX = app.screen.width / 2;
      const centerY = app.screen.height / 2;
      const scale = Math.min(app.screen.width, app.screen.height) * 0.3 / 195; // Scale based on SVG width

      // Initialize house points with original positions
      housePointsRef.current = originalHousePoints.map(point => ({
        x: centerX + (point.x - 97.5) * scale,
        y: centerY + (point.y - 115) * scale, // Center vertically
        targetX: centerX + (point.x - 97.5) * scale,
        targetY: centerY + (point.y - 115) * scale,
        originalX: centerX + (point.x - 97.5) * scale,
        originalY: centerY + (point.y - 115) * scale,
      }));

      // Draw initial house shape
      drawHouse();
    };

    const drawHouse = () => {
      if (!houseGraphicsRef.current) return;

      const graphics = houseGraphicsRef.current;
      graphics.clear();

      // Draw filled house polygon
      const points: number[] = [];
      housePointsRef.current.forEach(p => {
        points.push(p.x, p.y);
      });
      graphics.poly(points);
      graphics.stroke({ width: 2, color: 0xffffff }); // Add white stroke with width of 2
      
    };

    const updateHouseFromPose = () => {
      const currentResult = latestResultRef.current;
      if (!currentResult || !appRef.current) return;

      const now = Date.now();
          
      if (currentResult.isFullBodyDetected && currentResult.landmarks) {
        const landmarks = currentResult.landmarks;

              housePointsRef.current.forEach((housePoint, index) => {
          const poseIndex = poseMappings[index];
          const landmark = poseIndex !== undefined ? landmarks[poseIndex] : null;

                  if (landmark && landmark.visibility > 0.6) {
                    const screenX = (1 - landmark.x) * appRef.current!.screen.width;
                    const screenY = landmark.y * appRef.current!.screen.height;
                    
            const padding = 50;
            housePoint.targetX = Math.max(padding, Math.min(appRef.current!.screen.width - padding, screenX));
            housePoint.targetY = Math.max(padding, Math.min(appRef.current!.screen.height - padding, screenY));
            housePoint.lastSeen = now;
          } else if (housePoint.lastSeen && now - housePoint.lastSeen < 800) {
            // Retain the last known target position
            // Do nothing
          } else {
            // Landmark not seen recently; revert to original
            housePoint.targetX = housePoint.originalX;
            housePoint.targetY = housePoint.originalY;
                }
              });
            } else {
        // No pose detected; revert all to original
            housePointsRef.current.forEach(housePoint => {
              housePoint.targetX = housePoint.originalX;
              housePoint.targetY = housePoint.originalY;
            });
      }
    };

    const lerpPoints = () => {
      const lerpFactor = 0.08; // Faster, more visible interpolation speed
      
      housePointsRef.current.forEach(housePoint => {
        housePoint.x += (housePoint.targetX - housePoint.x) * lerpFactor;
        housePoint.y += (housePoint.targetY - housePoint.y) * lerpFactor;
      });
    };

    const startAnimationLoop = () => {
      const animate = () => {
        if (!appRef.current) return;

        updateHouseFromPose();
        lerpPoints();
        drawHouse();

        animationFrameRef.current = requestAnimationFrame(animate);
      };
      animate();
    };

    if (cameraActive) {
      initPIXI();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (appRef.current) {
        appRef.current.destroy(true);
        appRef.current = null;
      }
    };
  }, [cameraActive]); // Removed latestResult from dependencies

  // Fullscreen functionality
  const enterFullscreen = () => {
    if (containerRef.current) {
      containerRef.current.requestFullscreen?.();
    }
  };

  return (
    <div 
      className={styles.modeContainer}
      style={{ cursor: 'none' }}
      onClick={enterFullscreen}
    >
      {/* Camera preview - separate from PIXI container */}
      <video
        ref={videoRef}
        style={{ 
          position: 'fixed',
          bottom: 10,
          right: 10,
          width: 160,
          height: 120,
          border: '2px solid white',
          zIndex: 9999,
          pointerEvents: 'none'
        }}
        muted
        autoPlay
        playsInline
      />

      {/* PIXI Container - separate from video */}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0
        }}
      />

      {/* Loading state */}
      {!cameraActive && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'white',
          fontSize: '24px',
          zIndex: 9999
        }}>
          Activating camera...
        </div>
      )}

      {/* Status indicators */}
      <div style={{
        position: 'fixed',
        top: 20,
        left: 20,
        color: 'white',
        fontSize: '16px',
        zIndex: 9999,
        backgroundColor: 'rgba(0,0,0,0.7)',
        padding: '10px',
        borderRadius: '5px',
        pointerEvents: 'none'
      }}>
        <div>Camera: {cameraActive ? '✓' : '...'}</div>
        <div>Pose: {poseDetected ? '✓ Full Body Detected' : '◦ Searching for full body...'}</div>
        <div style={{ fontSize: '12px', marginTop: '5px' }}>
          Debug: {debugInfo}
        </div>
      </div>

      {/* Camera status indicator */}
      {cameraActive && (
        <div
          style={{
            position: 'fixed',
            top: 140,
            right: 20,
            background: poseDetected ? 'rgba(255, 107, 107, 0.8)' : 'rgba(78, 205, 196, 0.8)',
            width: 12,
            height: 12,
            borderRadius: '50%',
            zIndex: 9999,
            pointerEvents: 'none'
          }}
        />
      )}
    </div>
  );
} 