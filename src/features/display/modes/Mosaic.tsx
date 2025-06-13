'use client';

import { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import { MediaItem } from '@/shared/types/media';
import styles from './modes.module.scss';

type MosaicProps = {
  media: MediaItem[];
  maskSource?: 'pose' | 'video' | null;
  maskVideoPath?: string;
};

export default function Mosaic({ media, maskSource, maskVideoPath }: MosaicProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const [tileSize, setTileSize] = useState(75);
  const [rowOffset, setRowOffset] = useState(0);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [blackAndWhite, setBlackAndWhite] = useState(false);

  let animationId: number;

  // Cycle through media every 5 seconds
  useEffect(() => {
    if (!media.length) return;
    
    const interval = setInterval(() => {
      setCurrentMediaIndex(prev => (prev + 1) % media.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [media.length]);

  useEffect(() => {
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

          // Load current media texture
          const currentMedia = media[currentMediaIndex];
          const texture = await PIXI.Assets.load(`/content/${currentMedia.path}`);

          const createMosaic = () => {
            // Clear stage
            app.stage.removeChildren();

            const screenWidth = app.screen.width;
            const screenHeight = app.screen.height;
            
            const cols = Math.ceil(screenWidth / tileSize);
            const rows = Math.ceil(screenHeight / tileSize);

            // Create mosaic tiles
            for (let row = 0; row < rows; row++) {
              for (let col = 0; col < cols; col++) {
                const sprite = new PIXI.Sprite(texture);
                
                // Position tile
                sprite.x = col * tileSize + (row % 2) * (rowOffset / 100) * tileSize;
                sprite.y = row * tileSize;
                
                // Scale tile to fit tileSize
                const scale = tileSize / Math.max(texture.width, texture.height);
                sprite.scale.set(scale);
                
                // Apply black and white filter if enabled
                if (blackAndWhite) {
                  const colorMatrix = new PIXI.ColorMatrixFilter();
                  colorMatrix.desaturate();
                  sprite.filters = [colorMatrix];
                }

                app.stage.addChild(sprite);
              }
            }
          };

          // Animation loop (simplified - no pose detection for now)
          const animate = () => {
            if (!appRef.current) return;
            animationId = requestAnimationFrame(animate);
          };

          createMosaic();
          animate();

          // Recreate mosaic when settings change
          const recreateMosaic = () => {
            createMosaic();
          };

          // Store recreate function for later use
          (window as any).recreateMosaic = recreateMosaic;
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
      if (appRef.current) {
        appRef.current.destroy(true);
        appRef.current = null;
      }
      if (containerRef.current?.firstChild) {
        containerRef.current.removeChild(containerRef.current.firstChild);
      }
    };
  }, [media, tileSize, maskSource, maskVideoPath, rowOffset, currentMediaIndex, blackAndWhite]);

  // Trigger mosaic recreation when settings change
  useEffect(() => {
    if ((window as any).recreateMosaic) {
      (window as any).recreateMosaic();
    }
  }, [tileSize, rowOffset, blackAndWhite]);

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
        
        <label className="block text-white text-sm mb-2">
          <input
            type="checkbox"
            checked={blackAndWhite}
            onChange={(e) => setBlackAndWhite(e.target.checked)}
            className="mr-2"
          />
          Black & White
        </label>
        
        {media.length > 0 && (
          <div className="text-white text-sm mt-4">
            Media: {currentMediaIndex + 1}/{media.length}
            <br />
            {media[currentMediaIndex]?.name}
          </div>
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
        className={styles.modeContainer}
      />
    </>
  );
}