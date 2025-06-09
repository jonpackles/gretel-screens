'use client';

import { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js'; 
import { MediaItem } from '../types/media';
import PoseMask from '@/components/mosaic-masks/PoseMask';

interface MosaicProps {
  media: MediaItem[];
  maskSource: 'pose' | 'video' | null;
  maskVideoPath?: string;
}

export default function Mosaic({ media, maskSource, maskVideoPath }: MosaicProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const [tileSize, setTileSize] = useState(75);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [rowOffset, setRowOffset] = useState(0);
  const showSkeletonRef = useRef(showSkeleton);

  // Update ref when state changes
  useEffect(() => {
    showSkeletonRef.current = showSkeleton;
  }, [showSkeleton]);

  if (!media.length) return <div>Waiting for media...</div>;

  useEffect(() => {
    let cameraStream: MediaStream | null = null;
    let animationId: number;
    let poseMaskInstance: PoseMask | null = null;

    const initPIXI = async () => {
      if (!containerRef.current || !media.length) return;

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

        // Create PIXI application with v8 async initialization
        const app = new PIXI.Application();
        
        await app.init({
          width: window.innerWidth,
          height: window.innerHeight,
          backgroundColor: 0x000000,
        });

        // Add canvas to DOM - v8 uses app.canvas instead of app.view
        if (app.canvas && containerRef.current) {
          containerRef.current.appendChild(app.canvas);
          appRef.current = app;

          // Create textures from all media items
          const textures: PIXI.Texture[] = [];
          
          for (let i = 0; i < media.length; i++) {
            const mediaItem = media[i];
            let texture: PIXI.Texture;
            
            if (mediaItem.name.match(/\.(mp4)$/i)) {
              // Video texture
              const video = document.createElement('video');
              video.src = `/content/${mediaItem.path}`;
              video.muted = true;
              video.loop = true;
              video.autoplay = true;
              video.playsInline = true;
              
              await new Promise((resolve) => {
                video.onloadeddata = () => resolve(true);
              });
              
              texture = PIXI.Texture.from(video);
            } else {
              // Image texture
              texture = await PIXI.Assets.load(`/content/${mediaItem.path}`);
            }
            
            textures.push(texture);
          }

          console.log(`Created ${textures.length} textures from media items`);

          // Create mosaic grid - store all sprites for pose interaction
          const tileSprites: PIXI.Sprite[] = [];
          const tileMetadata = new Map<PIXI.Sprite, { tileX: number, tileY: number, tileSize: number }>();
          const tileDelays = new Map<PIXI.Sprite, number>(); // Track delay frames for each tile
          
          let tileIndex = 0; // For cycling through textures
          let rowIndex = 0; // Track which row we're on for offset
          
          for (let y = 0; y < app.screen.height; y += tileSize) {
            const offsetX = (rowIndex % 2) * (rowOffset / 100) * tileSize; // Apply offset to alternate rows
            
            for (let x = -tileSize; x < app.screen.width + tileSize; x += tileSize) { // Extended range to handle offsets
              const actualX = x + offsetX;
              
              // Skip tiles that are completely off-screen
              if (actualX + tileSize < 0 || actualX > app.screen.width) continue;
              
              // Cycle through available textures
              const texture = textures[tileIndex % textures.length];
              const sprite = new PIXI.Sprite(texture);
              
              // Calculate scale to cover the tile (object-fit: cover behavior)
              const scaleX = tileSize / texture.width;
              const scaleY = tileSize / texture.height;
              const scale = Math.max(scaleX, scaleY); // Use max for cover behavior
              
              sprite.scale.set(scale);
              
              // Center the sprite within the tile
              sprite.x = actualX + (tileSize - texture.width * scale) / 2;
              sprite.y = y + (tileSize - texture.height * scale) / 2;
              
              // Create a mask to ensure content doesn't overflow the tile
              const mask = new PIXI.Graphics();
              mask.rect(actualX, y, tileSize, tileSize);
              mask.fill(0xffffff);
              sprite.mask = mask;
              
              // Initially hide all tiles
              sprite.visible = false;
              sprite.alpha = 1.0;
              
              // Store tile info for pose interaction (use logical position for calculations)
              tileMetadata.set(sprite, { tileX: actualX, tileY: y, tileSize });
              tileDelays.set(sprite, 0); // Initialize delay counter
              
              app.stage.addChild(mask);
              app.stage.addChild(sprite);
              tileSprites.push(sprite);
              
              tileIndex++; // Move to next texture for next tile
            }
            rowIndex++;
          }

          // Handle different mask sources
          if (maskSource === 'pose') {
            // Use PoseMask component for pose detection
            poseMaskInstance = new PoseMask(app, tileSprites, tileMetadata, tileDelays, showSkeletonRef);
            await poseMaskInstance.initialize();
            
            const updateLoop = () => {
              if (poseMaskInstance) {
                poseMaskInstance.update();
              }
              animationId = requestAnimationFrame(updateLoop);
            };
            updateLoop();
            
          } else if (maskSource === 'video' && maskVideoPath) {
            // Use video as mask
            const maskVideo = document.createElement('video');
            maskVideo.src = `/content/${maskVideoPath}`;
            maskVideo.muted = true;
            maskVideo.loop = true;
            maskVideo.autoplay = true;
            maskVideo.playsInline = true;
            
            await new Promise((resolve) => {
              maskVideo.onloadeddata = () => resolve(true);
            });

            const videoMaskLoop = () => {
              // Create a simple threshold-based mask from video
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              
              if (ctx && maskVideo.videoWidth > 0) {
                canvas.width = maskVideo.videoWidth;
                canvas.height = maskVideo.videoHeight;
                ctx.drawImage(maskVideo, 0, 0);
                
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                
                // Reset all tiles
                tileSprites.forEach(sprite => sprite.visible = false);
                
                // Show tiles based on video brightness
                tileSprites.forEach(sprite => {
                  const metadata = tileMetadata.get(sprite);
                  if (metadata) {
                    const tileCenterX = metadata.tileX + metadata.tileSize / 2;
                    const tileCenterY = metadata.tileY + metadata.tileSize / 2;
                    
                    // Map screen coordinates to video coordinates
                    const videoX = Math.floor((tileCenterX / app.screen.width) * canvas.width);
                    const videoY = Math.floor((tileCenterY / app.screen.height) * canvas.height);
                    
                    if (videoX >= 0 && videoX < canvas.width && videoY >= 0 && videoY < canvas.height) {
                      const pixelIndex = (videoY * canvas.width + videoX) * 4;
                      const r = data[pixelIndex];
                      const g = data[pixelIndex + 1];
                      const b = data[pixelIndex + 2];
                      
                      // Calculate brightness
                      const brightness = (r + g + b) / 3;
                      
                      // Show tile if brightness is above threshold
                      if (brightness > 128) {
                        sprite.visible = true;
                        sprite.alpha = brightness / 255;
                      }
                    }
                  }
                });
              }
              
              animationId = requestAnimationFrame(videoMaskLoop);
            };
            
            videoMaskLoop();
          } else {
            // No mask - show all tiles
            tileSprites.forEach(sprite => {
              sprite.visible = true;
              sprite.alpha = 1.0;
            });
          }

        } else {
          console.error('Failed to create PIXI canvas');
        }
      } catch (error) {
        console.error('Error initializing PIXI:', error);
      }
    };

    initPIXI();

    // Cleanup function
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      if (poseMaskInstance) {
        poseMaskInstance.destroy();
        poseMaskInstance = null;
      }
      if (appRef.current) {
        appRef.current.destroy(true);
        appRef.current = null;
      }
      if (containerRef.current?.firstChild) {
        containerRef.current.removeChild(containerRef.current.firstChild);
      }
    };
  }, [media, tileSize, maskSource, maskVideoPath, rowOffset]);

  return (
    <>
      {/* Controls */}
      <div className="fixed top-4 left-4 z-10 bg-black/50 p-4 rounded">
        <label className="block text-white text-sm mb-2">
          Tile Size: {tileSize}px
        </label>
        <input
          type="range"
          min="25"
          max="200"
          value={tileSize}
          onChange={(e) => setTileSize(Number(e.target.value))}
          className="w-32 mb-4"
        />
        
        <label className="block text-white text-sm mb-2">
          Row Offset: {rowOffset}%
        </label>
        <input
          type="range"
          min="-100"
          max="100"
          value={rowOffset}
          onChange={(e) => setRowOffset(Number(e.target.value))}
          className="w-32 mb-4"
        />
        
        {maskSource === 'pose' && (
          <label className="flex items-center text-white text-sm">
            <input
              type="checkbox"
              checked={showSkeleton}
              onChange={(e) => setShowSkeleton(e.target.checked)}
              className="mr-2"
            />
            Show Skeleton Lines
          </label>
        )}
      </div>

      {/* Mask Source Info */}
      <div className="fixed top-4 right-4 z-10 bg-black/50 p-4 rounded text-white text-sm">
        <div>Mask Source: {maskSource || 'None'}</div>
        {maskSource === 'video' && maskVideoPath && (
          <div>Video: {maskVideoPath}</div>
        )}
      </div>
      
      {/* PIXI Container */}
      <div 
        ref={containerRef} 
        style={{ 
          width: '100vw', 
          height: '100vh',
          overflow: 'hidden'
        }} 
      />
    </>
  );
}