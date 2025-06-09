'use client';

import { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';

interface GlassProps {
  // No media needed - using camera only
}

export default function Glass({}: GlassProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [numSlices, setNumSlices] = useState(40);
  const lenticularStripsRef = useRef<PIXI.Sprite[]>([]);
  const masksRef = useRef<PIXI.Graphics[]>([]);

  useEffect(() => {
    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          } 
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          
          // Wait for video to load before playing
          const playVideo = () => {
            if (videoRef.current) {
              videoRef.current.play()
                .then(() => {
                  setCameraActive(true);
                })
                .catch((error) => {
                  console.error('Error playing video:', error);
                  // Try again after a short delay
                  setTimeout(() => {
                    if (videoRef.current) {
                      videoRef.current.play().catch(console.error);
                    }
                  }, 100);
                });
            }
          };

          // Listen for when video metadata is loaded
          videoRef.current.addEventListener('loadedmetadata', playVideo);
          
          // Also try to play immediately in case metadata is already loaded
          if (videoRef.current.readyState >= 1) {
            playVideo();
          }
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
      }
    };

    initCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    const initPIXI = async () => {
      if (!containerRef.current || !cameraActive || !videoRef.current) return;

      try {
        // Destroy existing app if it exists
        if (appRef.current) {
          appRef.current.destroy(true);
          appRef.current = null;
        }

        // Clear container
        if (containerRef.current.firstChild) {
          containerRef.current.removeChild(containerRef.current.firstChild);
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

          // Create lenticular strips from camera
          createLenticularStrips(app);
          
          // Start simple update loop
          startUpdateLoop();
        }
      } catch (error) {
        console.error('Error initializing PIXI:', error);
      }
    };

    const createLenticularStrips = (app: PIXI.Application) => {
      if (!videoRef.current) return;

      // Clear existing strips and masks
      lenticularStripsRef.current.forEach(strip => strip.destroy());
      masksRef.current.forEach(mask => mask.destroy());
      lenticularStripsRef.current = [];
      masksRef.current = [];
      
      // Create texture from video
      const videoTexture = PIXI.Texture.from(videoRef.current);
      const stripWidth = app.screen.width / numSlices;
      
      for (let i = 0; i < numSlices; i++) {
        // Create sprite for each strip
        const sprite = new PIXI.Sprite(videoTexture);
        
        // Create a mask for this strip to show only a slice
        const mask = new PIXI.Graphics();
        mask.rect(i * stripWidth, 0, stripWidth, app.screen.height);
        mask.fill(0xffffff);
        
        sprite.mask = mask;
        
        // Position and scale sprite so each slice shows different part of video
        sprite.x = i * stripWidth - (i * stripWidth); // Reset to 0 then offset
        sprite.y = 0;
        sprite.width = app.screen.width;
        sprite.height = app.screen.height;
        
        // Offset the sprite so this slice shows the correct portion of the video
        sprite.x = -(i * stripWidth);
        
        app.stage.addChild(mask);
        app.stage.addChild(sprite);
        lenticularStripsRef.current.push(sprite);
        masksRef.current.push(mask);
      }
    };

    const startUpdateLoop = () => {
      const update = () => {
        if (!appRef.current || !videoRef.current) return;

        // Just update video texture - no animations
        const videoTexture = PIXI.Texture.from(videoRef.current);
        
        lenticularStripsRef.current.forEach((strip) => {
          strip.texture = videoTexture;
        });

        requestAnimationFrame(update);
      };
      update();
    };

    if (cameraActive) {
      initPIXI();
    }

    return () => {
      if (appRef.current) {
        appRef.current.destroy(true);
        appRef.current = null;
      }
    };
  }, [cameraActive, numSlices]);

  // Fullscreen functionality
  const enterFullscreen = () => {
    if (containerRef.current) {
      containerRef.current.requestFullscreen?.();
    }
  };

  return (
    <div 
      ref={containerRef} 
      style={{ 
        width: '100vw', 
        height: '100vh',
        overflow: 'hidden',
        position: 'relative'
      }}
      onClick={enterFullscreen}
    >
      {/* Camera video */}
      <video
        ref={videoRef}
        style={{ 
          position: 'absolute',
          top: -1000,
          left: -1000,
          width: 1,
          height: 1,
          opacity: 0
        }}
        muted
        autoPlay
        playsInline
      />

      {/* Slice count slider */}
      {cameraActive && (
        <div
          style={{
            position: 'absolute',
            top: 20,
            left: 20,
            zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.7)',
            padding: '15px 20px',
            borderRadius: '10px',
            color: 'white',
            fontFamily: 'monospace',
            cursor: 'pointer'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
            Slices: {numSlices}
          </label>
          <input
            type="range"
            min="5"
            max="150"
            value={numSlices}
            onChange={(e) => setNumSlices(parseInt(e.target.value))}
            style={{
              width: '200px',
              height: '4px',
              background: '#333',
              outline: 'none',
              borderRadius: '2px',
              cursor: 'pointer'
            }}
          />
        </div>
      )}

      {/* Loading state */}
      {!cameraActive && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'white',
          fontSize: '24px'
        }}>
          Activating camera...
        </div>
      )}

      {/* Camera status indicator */}
      {cameraActive && (
        <div
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            background: 'rgba(0, 255, 0, 0.8)',
            width: 12,
            height: 12,
            borderRadius: '50%',
            zIndex: 1000
          }}
        />
      )}
    </div>
  );
}
