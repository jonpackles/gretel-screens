'use client';

import { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js'; 
import { MediaItem } from '../types/media';

interface PathsProps {
  media: MediaItem[];
  pathData?: {
    svgPath?: string; // Path to SVG file (e.g., 'house.svg')
    animationSpeed?: number; // Speed of media appearance
  };
}

export default function Paths({ media, pathData }: PathsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(pathData?.animationSpeed || 100); // milliseconds between media appearances
  const [pathPoints, setPathPoints] = useState<{x: number, y: number}[]>([]);
  const [visibleMediaCount, setVisibleMediaCount] = useState(0);
  const [holdDuration, setHoldDuration] = useState(3000); // milliseconds to hold after completion
  const [isHolding, setIsHolding] = useState(false);

  if (!media.length) return <div>Waiting for media...</div>;

  // Function to load SVG and extract path points
  const loadSVGPath = async (svgFileName: string): Promise<{x: number, y: number}[]> => {
    try {
      const response = await fetch(`/paths/${svgFileName}`);
      const svgText = await response.text();
      
      // Parse SVG and extract path data
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
      const pathElements = svgDoc.querySelectorAll('path');
      
      const points: {x: number, y: number}[] = [];
      
      pathElements.forEach(pathElement => {
        const pathData = pathElement.getAttribute('d');
        if (pathData) {
          // Simple path parsing - extract points along the path
          const pathPoints = parsePathData(pathData);
          points.push(...pathPoints);
        }
      });
      
      return points;
    } catch (error) {
      console.error('Error loading SVG path:', error);
      return [];
    }
  };

  // Simple path data parser (basic implementation)
  const parsePathData = (pathData: string): {x: number, y: number}[] => {
    const points: {x: number, y: number}[] = [];
    const commands = pathData.match(/[MLHVCSQTAZ][^MLHVCSQTAZ]*/gi);
    
    if (!commands) return points;
    
    let currentX = 0;
    let currentY = 0;
    
    commands.forEach(command => {
      const type = command[0].toUpperCase();
      const coords = command.slice(1).trim().split(/[\s,]+/).map(Number).filter(n => !isNaN(n));
      
      switch (type) {
        case 'M': // Move to
          if (coords.length >= 2) {
            currentX = coords[0];
            currentY = coords[1];
            points.push({ x: currentX, y: currentY });
          }
          break;
        case 'L': // Line to
          for (let i = 0; i < coords.length; i += 2) {
            if (coords[i + 1] !== undefined) {
              currentX = coords[i];
              currentY = coords[i + 1];
              points.push({ x: currentX, y: currentY });
            }
          }
          break;
        case 'H': // Horizontal line
          coords.forEach(x => {
            currentX = x;
            points.push({ x: currentX, y: currentY });
          });
          break;
        case 'V': // Vertical line
          coords.forEach(y => {
            currentY = y;
            points.push({ x: currentX, y: currentY });
          });
          break;
      }
    });
    
    return points;
  };

  useEffect(() => {
    let animationId: number;

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

          // Load SVG path if specified
          let points: {x: number, y: number}[] = [];
          if (pathData?.svgPath) {
            points = await loadSVGPath(pathData.svgPath);
            setPathPoints(points);
            
            // Scale and center the path points to fit the screen
            if (points.length > 0) {
              const minX = Math.min(...points.map(p => p.x));
              const maxX = Math.max(...points.map(p => p.x));
              const minY = Math.min(...points.map(p => p.y));
              const maxY = Math.max(...points.map(p => p.y));
              
              const pathWidth = maxX - minX;
              const pathHeight = maxY - minY;
              
              // Scale to fit 80% of screen
              const scaleX = (app.screen.width * 0.8) / pathWidth;
              const scaleY = (app.screen.height * 0.8) / pathHeight;
              const scale = Math.min(scaleX, scaleY);
              
              // Center on screen
              const offsetX = (app.screen.width - pathWidth * scale) / 2 - minX * scale;
              const offsetY = (app.screen.height - pathHeight * scale) / 2 - minY * scale;
              
              points = points.map(p => ({
                x: p.x * scale + offsetX,
                y: p.y * scale + offsetY
              }));
              
              setPathPoints(points);
            }
          }

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

          // Create media sprites positioned along the path
          const mediaSprites: PIXI.Sprite[] = [];
          const mediaSize = 50; // Size of each media item
          
          if (points.length > 0) {
            // Distribute media along the path points
            const pointsPerMedia = Math.max(1, Math.floor(points.length / media.length));
            
            for (let i = 0; i < media.length; i++) {
              const texture = textures[i % textures.length];
              const sprite = new PIXI.Sprite(texture);
              
              // Scale to media size
              const scale = mediaSize / Math.max(texture.width, texture.height);
              sprite.scale.set(scale);
              
              // Position along path
              const pointIndex = i * pointsPerMedia;
              if (points[pointIndex]) {
                sprite.x = points[pointIndex].x - mediaSize / 2;
                sprite.y = points[pointIndex].y - mediaSize / 2;
              }
              
              // Initially hide all media
              sprite.visible = false;
              
              app.stage.addChild(sprite);
              mediaSprites.push(sprite);
            }
          } else {
            // Fallback: arrange media in a grid if no path is available
            const cols = Math.ceil(Math.sqrt(media.length));
            const spacing = 80;
            const startX = (app.screen.width - (cols - 1) * spacing) / 2;
            const startY = (app.screen.height - (Math.ceil(media.length / cols) - 1) * spacing) / 2;
            
            for (let i = 0; i < media.length; i++) {
              const texture = textures[i % textures.length];
              const sprite = new PIXI.Sprite(texture);
              
              const scale = mediaSize / Math.max(texture.width, texture.height);
              sprite.scale.set(scale);
              
              const col = i % cols;
              const row = Math.floor(i / cols);
              sprite.x = startX + col * spacing - mediaSize / 2;
              sprite.y = startY + row * spacing - mediaSize / 2;
              
              sprite.visible = false;
              
              app.stage.addChild(sprite);
              mediaSprites.push(sprite);
            }
          }

          console.log('Paths mode initialized with', media.length, 'media items along path with', points.length, 'points');

          // Animation logic to show media one by one
          let lastTime = 0;
          let currentVisibleIndex = 0;
          let holdStartTime = 0;
          
          const updateLoop = (currentTime: number) => {
            if (isAnimating) {
              if (currentVisibleIndex < mediaSprites.length) {
                // Still showing media items
                if (currentTime - lastTime >= animationSpeed) {
                  mediaSprites[currentVisibleIndex].visible = true;
                  currentVisibleIndex++;
                  setVisibleMediaCount(currentVisibleIndex);
                  lastTime = currentTime;
                  
                  // Check if we just finished showing all media
                  if (currentVisibleIndex >= mediaSprites.length) {
                    setIsHolding(true);
                    holdStartTime = currentTime;
                  }
                }
              } else if (isHolding) {
                // Hold period after completion
                if (currentTime - holdStartTime >= holdDuration) {
                  // Hold period is over, stop animation
                  setIsAnimating(false);
                  setIsHolding(false);
                  currentVisibleIndex = 0; // Reset for next animation
                }
              }
            }
            
            animationId = requestAnimationFrame(updateLoop);
          };
          updateLoop(0);

        } else {
          console.error('Failed to create PIXI canvas');
        }
      } catch (error) {
        console.error('Error initializing PIXI in Paths mode:', error);
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
  }, [media, currentMediaIndex, pathData, isAnimating, animationSpeed, holdDuration, isHolding]);

  return (
    <>
      {/* Controls */}
      <div className="fixed top-4 left-4 z-10 bg-black/50 p-4 rounded">
        <h3 className="text-white text-lg mb-4">Paths Mode</h3>
        
        {/* Animation Controls */}
        <div className="mb-4">
          <button
            onClick={() => {
              setIsAnimating(!isAnimating);
              if (!isAnimating) {
                setVisibleMediaCount(0);
              }
            }}
            className={`px-4 py-2 rounded text-sm font-medium ${
              isAnimating 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            {isAnimating ? 'Stop Animation' : 'Start Animation'}
          </button>
          
          <button
            onClick={() => {
              setIsAnimating(false);
              setIsHolding(false);
              setVisibleMediaCount(0);
            }}
            className="ml-2 px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded text-sm"
          >
            Reset
          </button>
        </div>

        {/* Speed Control */}
        <label className="block text-white text-sm mb-2">
          Animation Speed: {animationSpeed}ms
        </label>
        <input
          type="range"
          min="50"
          max="1000"
          value={animationSpeed}
          onChange={(e) => setAnimationSpeed(Number(e.target.value))}
          className="w-32 mb-4"
        />

        {/* Hold Duration Control */}
        <label className="block text-white text-sm mb-2">
          Hold Duration: {holdDuration / 1000}s
        </label>
        <input
          type="range"
          min="1000"
          max="10000"
          step="500"
          value={holdDuration}
          onChange={(e) => setHoldDuration(Number(e.target.value))}
          className="w-32 mb-4"
        />
        
        {/* Path Info */}
        {pathData?.svgPath && (
          <div className="mb-4">
            <div className="text-white text-sm">Path: {pathData.svgPath}</div>
            <div className="text-white text-sm">Points: {pathPoints.length}</div>
            <div className="text-white text-sm">Visible: {visibleMediaCount}/{media.length}</div>
            {isHolding && <div className="text-yellow-400 text-sm">Holding...</div>}
          </div>
        )}
        
        {media.length > 1 && (
          <>
            <label className="block text-white text-sm mb-2">
              Media: {media[currentMediaIndex]?.name || 'Unknown'}
            </label>
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setCurrentMediaIndex((prev) => (prev - 1 + media.length) % media.length)}
                className="px-2 py-1 bg-white/20 text-white text-xs rounded hover:bg-white/30"
              >
                ←
              </button>
              <span className="text-white text-xs px-2 py-1">
                {currentMediaIndex + 1}/{media.length}
              </span>
              <button
                onClick={() => setCurrentMediaIndex((prev) => (prev + 1) % media.length)}
                className="px-2 py-1 bg-white/20 text-white text-xs rounded hover:bg-white/30"
              >
                →
              </button>
            </div>
          </>
        )}
      </div>

      {/* Info Panel */}
      <div className="fixed top-4 right-4 z-10 bg-black/50 p-4 rounded text-white text-sm">
        <div>Mode: Paths</div>
        <div>Media: {media.length} items</div>
        {pathData && <div>Path Data: Available</div>}
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