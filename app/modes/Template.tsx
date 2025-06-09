'use client';

import { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import { MediaItem } from '../types/media';

interface TemplateProps {
  media: MediaItem[];
}

export default function Template({ media }: TemplateProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);

  if (!media.length) return <div>Waiting for media...</div>;

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

          // Create textures from media items
          const textures = await Promise.all(
            media.map(item => PIXI.Assets.load(`/content/${item.path}`))
          );

          // Example: Add a sprite using first texture
          const sprite = new PIXI.Sprite(textures[0]);
          sprite.anchor.set(0.5);
          sprite.x = app.screen.width / 2;
          sprite.y = app.screen.height / 2;
          app.stage.addChild(sprite);

          // Example animation loop
          const animate = () => {
            sprite.rotation += 0.01;
            requestAnimationFrame(animate);
          };
          animate();

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
      if (appRef.current) {
        appRef.current.destroy(true);
        appRef.current = null;
      }
      if (containerRef.current?.firstChild) {
        containerRef.current.removeChild(containerRef.current.firstChild);
      }
    };
  }, [media]);

  return (
    <div 
      ref={containerRef} 
      style={{ 
        width: '100vw', 
        height: '100vh',
        overflow: 'hidden'
      }} 
    />
  );
}