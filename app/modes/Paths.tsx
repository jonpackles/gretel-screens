'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import { MediaItem } from '../types/media';

interface PathsProps {
  media: MediaItem[];
}

// Constants
const PATHS_CONSTANTS = {
  FRAMES_PER_IMAGE_SPAWN: 4,
  PAUSE_DURATION_FRAMES: 180,
  MAX_BOUNDING_BOX_SIZE: 150,
  NUM_PATH_POINTS: 50
};

// House shape path generator
const createHouseShapePath = (pWidth: number, pHeight: number, pathResolution: number) => {
  const newPath: { x: number; y: number }[] = [];
  const housePoints = [
    { x: 0.35, y: 0.55 }, { x: 0.35, y: 0.35 }, { x: 0.5, y: 0.15 },
    { x: 0.65, y: 0.35 }, { x: 0.65, y: 0.55 }, { x: 0.35, y: 0.55 }
  ];
  
  // Use the smaller dimension to keep house proportions
  const minDimension = Math.min(pWidth, pHeight);
  const houseSize = minDimension; // Use 60% of the smaller dimension
  
  // Center the house on screen
  const offsetX = (pWidth - houseSize) / 2;
  const offsetY = (pHeight - houseSize) / 2;
  
  for (let i = 0; i < pathResolution; i++) {
    const t = i / (pathResolution - 1);
    const numSegments = housePoints.length - 1;
    const segmentIndex = Math.min(Math.floor(t * numSegments), numSegments - 1);
    const segmentT = (t * numSegments) % 1;
    
    const p1 = housePoints[segmentIndex];
    const p2 = housePoints[segmentIndex + 1] || housePoints[segmentIndex];
    
    // Apply to square area and center on screen
    const x = offsetX + houseSize * (p1.x + (p2.x - p1.x) * segmentT);
    const y = offsetY + houseSize * (p1.y + (p2.y - p1.y) * segmentT);
    newPath.push({ x, y });
  }
  return newPath;
};

// Sprite utilities
const createSprite = (texture: PIXI.Texture, maxWidth: number, maxHeight: number): PIXI.Sprite | null => {
  if (!texture || !texture.source || texture.width <= 0 || texture.height <= 0) return null;
  
  const sprite = new PIXI.Sprite(texture);
  const originalAspect = texture.width / texture.height;
  let newWidth, newHeight;

  if (originalAspect > 1) {
    newWidth = maxWidth;
    newHeight = newWidth / originalAspect;
  } else {
    newHeight = maxHeight;
    newWidth = newHeight * originalAspect;
  }

  sprite.width = Math.max(1, newWidth);
  sprite.height = Math.max(1, newHeight);
  return sprite;
};

const playVideoIfNeeded = (texture: PIXI.Texture): void => {
  if (texture.source?.resource?.tagName === 'VIDEO') {
    const videoElement = texture.source.resource as HTMLVideoElement;
    videoElement.muted = true;
    videoElement.loop = true;
    videoElement.currentTime = Math.random() * (videoElement.duration || 0);
    videoElement.play().catch(e => console.warn('Video play warning:', e));
  }
};

export default function Paths({ media }: PathsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const pathPointsRef = useRef<{ x: number; y: number }[]>([]);
  const [texturesReady, setTexturesReady] = useState(false);
  
  // Animation state refs
  const framesSinceSpawnRef = useRef(0);
  const currentTextureIndexRef = useRef(0);
  const displayedStaticSpritesOnPathRef = useRef<PIXI.Sprite[]>([]);
  const pauseCounterRef = useRef(0);
  const shuffledTexturesRef = useRef<PIXI.Texture[]>([]);
  const spawnFrameScheduleRef = useRef<number[]>([]);
  const texturesRef = useRef<PIXI.Texture[]>([]);

  const computeEasedSpawnFrames = (numImages: number, totalFrames: number) => {
    // Linear timing: uniform intervals
    const frames: number[] = [];
    for (let i = 0; i < numImages; i++) {
      const t = i / (numImages - 1);
      const linearT = t;
      frames.push(Math.round(linearT * totalFrames));
    }
    return frames;
  };

  const updateGeneratedPath = useCallback(() => {
    console.log('Paths: updateGeneratedPath called');
    
    if (!appRef.current || !appRef.current.renderer || texturesRef.current.length === 0) {
      console.log('Paths: updateGeneratedPath blocked -', {
        hasApp: !!appRef.current,
        hasRenderer: !!appRef.current?.renderer,
        texturesLength: texturesRef.current.length
      });
      pathPointsRef.current = [];
      return;
    }

    const screenWidth = appRef.current.renderer.width;
    const screenHeight = appRef.current.renderer.height;

    console.log('Paths: Screen dimensions -', { screenWidth, screenHeight });

    if (!screenWidth || !screenHeight) {
      console.warn('Paths: Invalid screen dimensions');
      return;
    }

    // Generate house shape path
    console.log('Paths: Generating house path with', PATHS_CONSTANTS.NUM_PATH_POINTS, 'points');
    const newPath = createHouseShapePath(screenWidth, screenHeight, PATHS_CONSTANTS.NUM_PATH_POINTS);
    console.log('Paths: Generated path with', newPath.length, 'points. First few:', newPath.slice(0, 3));
    pathPointsRef.current = newPath;

    // Reset animation state
    framesSinceSpawnRef.current = 0;
    currentTextureIndexRef.current = 0;
    pauseCounterRef.current = 0;
    shuffledTexturesRef.current = [...texturesRef.current].sort(() => Math.random() - 0.5);

    // Compute eased spawn schedule
    const totalImages = texturesRef.current.length;
    const totalEasedFrames = PATHS_CONSTANTS.FRAMES_PER_IMAGE_SPAWN * (totalImages - 1);
    const schedule = computeEasedSpawnFrames(totalImages, totalEasedFrames);
    spawnFrameScheduleRef.current = schedule;
    
    console.log('Paths: Spawn schedule created -', {
      totalImages,
      totalEasedFrames,
      firstFewFrames: schedule.slice(0, 5)
    });

    // Clear existing sprites
    displayedStaticSpritesOnPathRef.current.forEach(sprite => {
      if (sprite.parent) {
        sprite.parent.removeChild(sprite);
      }
      sprite.destroy();
    });
    displayedStaticSpritesOnPathRef.current = [];
    
    console.log('Paths: updateGeneratedPath complete. Path length:', pathPointsRef.current.length);
  }, []);

  // Update path when textures are ready
  useEffect(() => {
    if (texturesReady && texturesRef.current.length > 0 && appRef.current) {
      console.log('Paths: useEffect triggering updateGeneratedPath due to texturesReady');
      updateGeneratedPath();
    }
  }, [texturesReady, updateGeneratedPath]);

  // Load textures
  const loadTextures = useCallback(async () => {
    if (!media.length) return;
    
    console.log('Paths: loadTextures starting for', media.length, 'items');
    setTexturesReady(false);
    const textures: PIXI.Texture[] = [];
    
    for (const mediaItem of media) {
      try {
        let texture: PIXI.Texture;
        
        if (mediaItem.name.match(/\.(mp4)$/i)) {
          const video = document.createElement('video');
          video.src = `/content/${mediaItem.path}`;
          video.muted = true;
          video.loop = true;
          video.autoplay = true;
          video.playsInline = true;
          
          await new Promise(resolve => {
            video.onloadeddata = () => resolve(true);
            video.onerror = () => resolve(false);
          });
          
          texture = PIXI.Texture.from(video);
        } else {
          texture = await PIXI.Assets.load(`/content/${mediaItem.path}`);
        }
        
        textures.push(texture);
      } catch (error) {
        console.error('Failed to load:', mediaItem.path);
      }
    }
    
    texturesRef.current = textures;
    console.log('Paths: loadTextures complete, loaded', textures.length, 'textures');
    setTexturesReady(true);
  }, [media]);

  // Initialize PIXI
  useEffect(() => {
    if (!containerRef.current || !media.length) return;

    let mounted = true;

    const initApp = async () => {
      console.log('Paths: initApp starting');
      
      // Clean up existing app and canvas
      if (appRef.current) {
        console.log('Paths: Destroying existing PIXI app');
        appRef.current.destroy(true);
        appRef.current = null;
      }

      // Clear any existing canvas elements
      if (containerRef.current) {
        while (containerRef.current.firstChild) {
          containerRef.current.removeChild(containerRef.current.firstChild);
        }
      }

      if (!mounted) return;

      // Create new app
      const app = new PIXI.Application();
      await app.init({
        width: window.innerWidth,
        height: window.innerHeight,
        backgroundColor: 0x000000,
      });

      if (!mounted || !containerRef.current) {
        app.destroy(true);
        return;
      }

      console.log('Paths: Adding canvas to container');
      containerRef.current.appendChild(app.canvas);
      appRef.current = app;

      // Load textures
      await loadTextures();
      
      if (!mounted) {
        app.destroy(true);
        return;
      }
      
      // Start animation ticker
      app.ticker.add(animateFlowPath);
      console.log('Paths: PIXI app initialization complete');
    };

    initApp();

    return () => {
      console.log('Paths: Cleanup function called');
      mounted = false;
      
      if (appRef.current) {
        console.log('Paths: Destroying PIXI app in cleanup');
        appRef.current.destroy(true);
        appRef.current = null;
      }
      
      // Clear container
      if (containerRef.current) {
        while (containerRef.current.firstChild) {
          containerRef.current.removeChild(containerRef.current.firstChild);
        }
      }
    };
  }, [media]); // Removed loadTextures from dependencies

  const animateFlowPath = useCallback((ticker: PIXI.Ticker) => {
    if (!appRef.current || !appRef.current.stage || pathPointsRef.current.length === 0 || texturesRef.current.length === 0 || shuffledTexturesRef.current.length === 0) {
      console.log('Paths: Animation blocked -', {
        hasApp: !!appRef.current,
        hasStage: !!appRef.current?.stage,
        pathPointsLength: pathPointsRef.current.length,
        texturesLength: texturesRef.current.length,
        shuffledLength: shuffledTexturesRef.current.length
      });
      return;
    }

    const delta = ticker.deltaTime;

    if (pauseCounterRef.current > 0) {
      pauseCounterRef.current -= delta;
      console.log('Paths: Pausing, frames left:', pauseCounterRef.current);
      if (pauseCounterRef.current <= 0) {
        // Reset for next cycle
        console.log('Paths: Pause complete, restarting cycle');
        updateGeneratedPath();
      }
      return;
    }

    const totalImagesToSpawn = shuffledTexturesRef.current.length;
    const canSpawnMoreTextures = currentTextureIndexRef.current < totalImagesToSpawn;

    console.log('Paths: Animation frame -', {
      framesSinceSpawn: framesSinceSpawnRef.current.toFixed(2),
      currentIndex: currentTextureIndexRef.current,
      totalToSpawn: totalImagesToSpawn,
      canSpawnMore: canSpawnMoreTextures,
      nextSpawnFrame: spawnFrameScheduleRef.current[currentTextureIndexRef.current]
    });

    if (canSpawnMoreTextures) {
      framesSinceSpawnRef.current += delta;
      const imageIndex = currentTextureIndexRef.current;
      const spawnFrame = spawnFrameScheduleRef.current[imageIndex] || 0;
      
      if (framesSinceSpawnRef.current >= spawnFrame) {
        console.log('Paths: Spawning sprite', imageIndex + 1);
        
        // Uniform placement along the path
        const texture = shuffledTexturesRef.current[imageIndex];
        let targetPathIndex = 0;
        
        if (totalImagesToSpawn > 1) {
          const t = imageIndex / (totalImagesToSpawn - 1);
          targetPathIndex = Math.round(t * (pathPointsRef.current.length - 1));
        } else {
          targetPathIndex = Math.floor(pathPointsRef.current.length / 2);
        }
        
        targetPathIndex = Math.max(0, Math.min(pathPointsRef.current.length - 1, targetPathIndex));
        const spawnPoint = pathPointsRef.current[targetPathIndex];
        
        console.log('Paths: Spawn details -', {
          textureValid: !!texture,
          spawnPoint,
          pathIndex: targetPathIndex
        });
        
        if (texture && spawnPoint) {
          const sprite = createSprite(texture, PATHS_CONSTANTS.MAX_BOUNDING_BOX_SIZE, PATHS_CONSTANTS.MAX_BOUNDING_BOX_SIZE);
          if (!sprite) {
            console.warn('Paths: Failed to create sprite for texture');
            currentTextureIndexRef.current++;
            return;
          }
          
          sprite.anchor.set(0.5);
          sprite.x = spawnPoint.x;
          sprite.y = spawnPoint.y;
          
          console.log('Paths: Sprite created and positioned at', sprite.x, sprite.y);
          
          playVideoIfNeeded(texture);
          appRef.current.stage.addChild(sprite);
          displayedStaticSpritesOnPathRef.current.push(sprite);
          
          console.log('Paths: Sprite added to stage. Total sprites:', displayedStaticSpritesOnPathRef.current.length);
          
          currentTextureIndexRef.current++;
        }
      }
    } else if (displayedStaticSpritesOnPathRef.current.length > 0 && pauseCounterRef.current <= 0) {
      console.log('Paths: All sprites spawned, starting pause');
      pauseCounterRef.current = PATHS_CONSTANTS.PAUSE_DURATION_FRAMES;
    }
  }, [updateGeneratedPath]);

  if (!media.length) return <div>No media loaded</div>;

  return (
    <div className="flex flex-col h-full">
      {/* Status */}
      <div className="p-3 bg-gray-900 border-b border-gray-700">
        <div className="text-xs text-gray-500">
          {displayedStaticSpritesOnPathRef.current.length}/{media.length} sprites • 
          {pathPointsRef.current.length} path points • 
          {texturesReady ? (
            <span className="text-green-400"> ✓ Ready</span>
          ) : (
            <span className="text-yellow-400"> ⏳ Loading...</span>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        <div ref={containerRef} className="w-full h-full" />
      </div>
    </div>
  );
} 