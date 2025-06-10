import { useEffect, useCallback, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import { FLOW_CONSTANTS } from '../constants';
import { pathGenerators } from '../utils/pathGenerators';
import { createSprite, playVideoIfNeeded } from '../utils/spriteUtils';

interface FlowModeProps {
  pixiApp: PIXI.Application;
  textures: PIXI.Texture[];
}

export const FlowMode = ({ pixiApp, textures }: FlowModeProps) => {
  const [pathPoints, setPathPoints] = useState<{ x: number; y: number }[]>([]);
  const [currentPathGeneratorIndex, setCurrentPathGeneratorIndex] = useState(0);
  
  const framesSinceSpawnRef = useRef(0);
  const currentTextureIndexRef = useRef(0);
  const displayedStaticSpritesOnPathRef = useRef<PIXI.Sprite[]>([]);
  const pauseCounterRef = useRef(0);
  const shuffledTexturesRef = useRef<PIXI.Texture[]>([]);
  const spawnFrameScheduleRef = useRef<number[]>([]);

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
    if (!pixiApp || !pixiApp.renderer || textures.length === 0) {
      setPathPoints([]);
      return;
    }

    const screenWidth = pixiApp.renderer.width;
    const screenHeight = pixiApp.renderer.height;

    if (!screenWidth || !screenHeight) {
      console.warn('FlowMode: Invalid screen dimensions');
      return;
    }

    const generator = pathGenerators[currentPathGeneratorIndex];
    if (!generator) {
      console.warn('FlowMode: No path generator found at index', currentPathGeneratorIndex);
      return;
    }

    const newPath = generator(screenWidth, screenHeight, FLOW_CONSTANTS.NUM_PATH_POINTS);
    setPathPoints(newPath);

    // Reset animation state
    framesSinceSpawnRef.current = 0;
    currentTextureIndexRef.current = 0;
    pauseCounterRef.current = 0;
    shuffledTexturesRef.current = [...textures].sort(() => Math.random() - 0.5);

    // Compute eased spawn schedule
    const totalImages = textures.length;
    const totalEasedFrames = FLOW_CONSTANTS.FRAMES_PER_IMAGE_SPAWN * (totalImages - 1);
    spawnFrameScheduleRef.current = computeEasedSpawnFrames(totalImages, totalEasedFrames);

    // Clear existing sprites
    displayedStaticSpritesOnPathRef.current.forEach(sprite => {
      if (sprite.parent) {
        sprite.parent.removeChild(sprite);
      }
      sprite.destroy();
    });
    displayedStaticSpritesOnPathRef.current = [];
  }, [pixiApp, textures, currentPathGeneratorIndex]);

  useEffect(() => {
    if (pixiApp && textures.length > 0) {
      if (pixiApp.stage) {
        pixiApp.stage.removeChildren();
      }
      updateGeneratedPath();
    }
  }, [pixiApp, textures, currentPathGeneratorIndex, updateGeneratedPath]);

  const animateFlowPath = useCallback((ticker: PIXI.Ticker) => {
    if (!pixiApp || !pixiApp.stage || pathPoints.length === 0 || textures.length === 0 || shuffledTexturesRef.current.length === 0) return;

    const delta = ticker.deltaTime;

    if (pauseCounterRef.current > 0) {
      pauseCounterRef.current -= delta;
      if (pauseCounterRef.current <= 0) {
        setCurrentPathGeneratorIndex(prev => (prev + 1) % pathGenerators.length);
      }
      return;
    }

    const totalImagesToSpawn = shuffledTexturesRef.current.length;
    const canSpawnMoreTextures = currentTextureIndexRef.current < totalImagesToSpawn;

    if (canSpawnMoreTextures) {
      framesSinceSpawnRef.current += delta;
      const imageIndex = currentTextureIndexRef.current;
      const spawnFrame = spawnFrameScheduleRef.current[imageIndex] || 0;
      if (framesSinceSpawnRef.current >= spawnFrame) {
        // Uniform placement along the path
        const texture = shuffledTexturesRef.current[imageIndex];
        let targetPathIndex = 0;
        if (totalImagesToSpawn > 1) {
          const t = imageIndex / (totalImagesToSpawn - 1);
          targetPathIndex = Math.round(t * (pathPoints.length - 1));
        } else {
          targetPathIndex = Math.floor(pathPoints.length / 2);
        }
        targetPathIndex = Math.max(0, Math.min(pathPoints.length - 1, targetPathIndex));
        const spawnPoint = pathPoints[targetPathIndex];
        if (texture && spawnPoint) {
          const sprite = createSprite(texture, FLOW_CONSTANTS.MAX_BOUNDING_BOX_SIZE, FLOW_CONSTANTS.MAX_BOUNDING_BOX_SIZE);
          if (!sprite) {
            currentTextureIndexRef.current++;
            return;
          }
          sprite.anchor.set(0.5);
          sprite.x = spawnPoint.x;
          sprite.y = spawnPoint.y;
          playVideoIfNeeded(texture);
          pixiApp.stage.addChild(sprite);
          displayedStaticSpritesOnPathRef.current.push(sprite);
          currentTextureIndexRef.current++;
        }
      }
    } else if (displayedStaticSpritesOnPathRef.current.length > 0 && pauseCounterRef.current <= 0) {
      pauseCounterRef.current = FLOW_CONSTANTS.PAUSE_DURATION_FRAMES;
    }
  }, [pixiApp, pathPoints, textures]);

  useEffect(() => {
    if (pixiApp && pixiApp.ticker && pathPoints.length > 0 && textures.length > 0 && shuffledTexturesRef.current.length > 0) {
      pixiApp.ticker.add(animateFlowPath);
      return () => {
        pixiApp.ticker.remove(animateFlowPath);
      };
    }
  }, [pixiApp, textures, pathPoints, animateFlowPath]);

  return null; // This component doesn't render anything directly
}; 