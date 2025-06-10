import * as PIXI from 'pixi.js';

export const calculateSpriteDimensions = (
  texture: PIXI.Texture,
  maxWidth: number,
  maxHeight: number,
  scaleFactor: number = 1
): { width: number; height: number } => {
  const originalAspect = texture.width / texture.height;
  let newWidth, newHeight;

  if (originalAspect > 1) {
    newWidth = maxWidth * scaleFactor;
    newHeight = newWidth / originalAspect;
  } else {
    newHeight = maxHeight * scaleFactor;
    newWidth = newHeight * originalAspect;
  }

  return {
    width: Math.max(1, newWidth),
    height: Math.max(1, newHeight)
  };
};

export const createSprite = (
  texture: PIXI.Texture,
  maxWidth: number,
  maxHeight: number,
  scaleFactor: number = 1
): PIXI.Sprite | null => {
  if (!texture || !texture.source || texture.width <= 0 || texture.height <= 0) return null;
  const sprite = new PIXI.Sprite(texture);
  const { width, height } = calculateSpriteDimensions(texture, maxWidth, maxHeight, scaleFactor);
  sprite.width = width;
  sprite.height = height;
  return sprite;
};

export const playVideoIfNeeded = (texture: PIXI.Texture): void => {
  if (texture.source?.resource?.tagName === 'VIDEO') {
    const videoElement = texture.source.resource as HTMLVideoElement;
    videoElement.muted = true;
    videoElement.loop = true;
    videoElement.currentTime = Math.random() * (videoElement.duration || 0);
    videoElement.play().catch(e => console.warn('Video play warning:', e));
  }
}; 