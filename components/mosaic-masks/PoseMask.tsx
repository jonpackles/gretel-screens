'use client';

import * as PIXI from 'pixi.js';
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';

export default class PoseMask {
  private app: PIXI.Application;
  private tileSprites: PIXI.Sprite[];
  private tileMetadata: Map<PIXI.Sprite, { tileX: number, tileY: number, tileSize: number }>;
  private tileDelays: Map<PIXI.Sprite, number>;
  private showSkeletonRef: React.MutableRefObject<boolean>;
  
  private video?: HTMLVideoElement;
  private poseLandmarker?: PoseLandmarker;
  private cameraStream?: MediaStream;
  private poseOverlay?: PIXI.Graphics;
  private previousLandmarks?: any[];

  constructor(
    app: PIXI.Application,
    tileSprites: PIXI.Sprite[],
    tileMetadata: Map<PIXI.Sprite, { tileX: number, tileY: number, tileSize: number }>,
    tileDelays: Map<PIXI.Sprite, number>,
    showSkeletonRef: React.MutableRefObject<boolean>
  ) {
    this.app = app;
    this.tileSprites = tileSprites;
    this.tileMetadata = tileMetadata;
    this.tileDelays = tileDelays;
    this.showSkeletonRef = showSkeletonRef;
  }

  async initialize(): Promise<void> {
    try {
      // Set up camera
      this.cameraStream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 } 
      });
      
      this.video = document.createElement('video');
      this.video.srcObject = this.cameraStream;
      this.video.muted = true;
      this.video.autoplay = true;
      this.video.playsInline = true;
      
      await new Promise((resolve, reject) => {
        this.video!.onloadeddata = () => {
          console.log('Camera loaded:', this.video!.videoWidth, 'x', this.video!.videoHeight);
          resolve(true);
        };
        this.video!.onerror = reject;
        setTimeout(() => reject(new Error('Camera timeout')), 5000);
      });

      // Initialize MediaPipe
      console.log('Loading MediaPipe...');
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
      );

      this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        numPoses: 1
      });
      console.log('MediaPipe loaded successfully');

      // Create pose overlay graphics
      this.poseOverlay = new PIXI.Graphics();
      this.app.stage.addChild(this.poseOverlay);

      // Test circle
      this.poseOverlay.circle(100, 100, 20).fill(0xff00ff);
      console.log('Test circle drawn');

      // Add camera preview
      const cameraTexture = PIXI.Texture.from(this.video);
      const cameraSprite = new PIXI.Sprite(cameraTexture);
      cameraSprite.width = 160;
      cameraSprite.height = 120;
      cameraSprite.x = this.app.screen.width - 170;
      cameraSprite.y = 10;
      this.app.stage.addChild(cameraSprite);
      console.log('Camera preview added');

    } catch (error) {
      console.error('PoseMask initialization error:', error);
    }
  }

  update(): void {
    if (!this.video || !this.poseLandmarker || !this.poseOverlay) return;

    try {
      if (this.video.videoWidth > 0 && this.video.readyState >= 2) {
        const results = this.poseLandmarker.detectForVideo(this.video, performance.now());
        
        // Clear previous overlay but keep test circle
        this.poseOverlay.clear();
        this.poseOverlay.circle(100, 100, 20).fill(0xff00ff);
        
        if (results.landmarks && results.landmarks.length > 0) {
          let landmarks = results.landmarks[0];
          
          const smoothingFactor = 0.9;
          if (this.previousLandmarks) {
            for (let i = 0; i < landmarks.length; i++) {
              const prev = this.previousLandmarks[i];
              const curr = landmarks[i];
              landmarks[i] = {
                x: smoothingFactor * prev.x + (1 - smoothingFactor) * curr.x,
                y: smoothingFactor * prev.y + (1 - smoothingFactor) * curr.y,
                z: smoothingFactor * prev.z + (1 - smoothingFactor) * curr.z,
                visibility: curr.visibility // Optionally keep current visibility
              };
            }
          }
          this.previousLandmarks = landmarks;
          
          // Mirror the landmarks
          const mirroredLandmarks = landmarks.map(landmark => ({
            ...landmark,
            x: 1 - landmark.x
          }));
          
          // Apply pose masking logic
          this.applyPoseMask(mirroredLandmarks);
          
          // Draw pose visuals if enabled
          if (this.showSkeletonRef.current) {
            this.drawPoseVisuals(mirroredLandmarks);
          }
        } else {
          // No pose detected - hide all tiles
          this.tileSprites.forEach(sprite => sprite.visible = false);
        }
      }
    } catch (error) {
      console.error('Pose detection error:', error);
    }
  }

  private applyPoseMask(landmarks: any[]): void {
    const tilesToShow = new Set<PIXI.Sprite>();
    
    // Hysteresis values
    const TURN_ON_THRESHOLD = 1.0;
    const TURN_OFF_THRESHOLD = 1.3;
    const DELAY_FRAMES = 8;

    // Get current tile size from first tile metadata
    const firstTileMetadata = Array.from(this.tileMetadata.values())[0];
    const tileSize = firstTileMetadata?.tileSize || 75;

    // Apply all the pose detection logic (skeleton lines, body areas, etc.)
    this.markSkeletonTiles(landmarks, tilesToShow, tileSize, TURN_ON_THRESHOLD, TURN_OFF_THRESHOLD);
    this.markLandmarkTiles(landmarks, tilesToShow, tileSize, TURN_ON_THRESHOLD, TURN_OFF_THRESHOLD);
    this.fillBodyAreas(landmarks, tilesToShow, tileSize);

    // Update tile visibility with delay system
    this.tileSprites.forEach(sprite => {
      const currentDelay = this.tileDelays.get(sprite) || 0;
      
      if (tilesToShow.has(sprite)) {
        this.tileDelays.set(sprite, DELAY_FRAMES);
        sprite.visible = true;
        sprite.alpha = 1.0;
      } else {
        if (currentDelay > 0) {
          const newDelay = currentDelay - 1;
          this.tileDelays.set(sprite, newDelay);
          sprite.alpha = newDelay / DELAY_FRAMES;
          sprite.visible = true;
        } else {
          sprite.visible = false;
          sprite.alpha = 0;
        }
      }
    });
  }

  private markSkeletonTiles(landmarks: any[], tilesToShow: Set<PIXI.Sprite>, tileSize: number, onThreshold: number, offThreshold: number): void {
    const connections = [
      [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
      [11, 23], [12, 24], [23, 24], [23, 25], [25, 27],
      [24, 26], [26, 28], [0, 1], [1, 2], [2, 3], [3, 7],
      [0, 4], [4, 5], [5, 6], [6, 8]
    ];

    connections.forEach(([start, end]) => {
      if (landmarks[start] && landmarks[end]) {
        const startX = landmarks[start].x * this.app.screen.width;
        const startY = landmarks[start].y * this.app.screen.height;
        const endX = landmarks[end].x * this.app.screen.width;
        const endY = landmarks[end].y * this.app.screen.height;
        
        this.tileSprites.forEach(sprite => {
          const metadata = this.tileMetadata.get(sprite);
          if (metadata && this.tileIntersectsLine(metadata, startX, startY, endX, endY, sprite, tileSize, onThreshold, offThreshold)) {
            tilesToShow.add(sprite);
          }
        });
      }
    });
  }

  private markLandmarkTiles(landmarks: any[], tilesToShow: Set<PIXI.Sprite>, tileSize: number, onThreshold: number, offThreshold: number): void {
    const majorLandmarks = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
    
    majorLandmarks.forEach(landmarkIndex => {
      if (landmarks[landmarkIndex]) {
        const lx = landmarks[landmarkIndex].x * this.app.screen.width;
        const ly = landmarks[landmarkIndex].y * this.app.screen.height;
        
        this.tileSprites.forEach(sprite => {
          const metadata = this.tileMetadata.get(sprite);
          if (metadata) {
            const tileCenterX = metadata.tileX + metadata.tileSize / 2;
            const tileCenterY = metadata.tileY + metadata.tileSize / 2;
            const distance = Math.sqrt((tileCenterX - lx) ** 2 + (tileCenterY - ly) ** 2);
            
            const isCurrentlyVisible = sprite.visible && (this.tileDelays.get(sprite) || 0) > 0;
            const threshold = isCurrentlyVisible ? offThreshold : onThreshold;
            const landmarkRadius = tileSize * threshold * 1.5;
            
            if (distance <= landmarkRadius) {
              tilesToShow.add(sprite);
            }
          }
        });
      }
    });
  }

  private fillBodyAreas(landmarks: any[], tilesToShow: Set<PIXI.Sprite>, tileSize: number): void {
    // Fill torso, head, arms, legs (simplified version)
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    
    if (leftShoulder && rightShoulder && leftHip && rightHip) {
      // Simple torso fill - add all tiles in the torso rectangle
      const minX = Math.min(leftShoulder.x, rightShoulder.x, leftHip.x, rightHip.x) * this.app.screen.width;
      const maxX = Math.max(leftShoulder.x, rightShoulder.x, leftHip.x, rightHip.x) * this.app.screen.width;
      const minY = Math.min(leftShoulder.y, rightShoulder.y, leftHip.y, rightHip.y) * this.app.screen.height;
      const maxY = Math.max(leftShoulder.y, rightShoulder.y, leftHip.y, rightHip.y) * this.app.screen.height;
      
      this.tileSprites.forEach(sprite => {
        const metadata = this.tileMetadata.get(sprite);
        if (metadata) {
          const tileCenterX = metadata.tileX + metadata.tileSize / 2;
          const tileCenterY = metadata.tileY + metadata.tileSize / 2;
          
          if (tileCenterX >= minX && tileCenterX <= maxX && tileCenterY >= minY && tileCenterY <= maxY) {
            tilesToShow.add(sprite);
          }
        }
      });
    }
  }

  private tileIntersectsLine(metadata: any, x1: number, y1: number, x2: number, y2: number, sprite: PIXI.Sprite, tileSize: number, onThreshold: number, offThreshold: number): boolean {
    const tileCenterX = metadata.tileX + tileSize / 2;
    const tileCenterY = metadata.tileY + tileSize / 2;
    
    const isCurrentlyVisible = sprite.visible && (this.tileDelays.get(sprite) || 0) > 0;
    const threshold = isCurrentlyVisible ? offThreshold : onThreshold;
    const radius = tileSize * threshold;
    
    const A = tileCenterX - x1;
    const B = tileCenterY - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    if (lenSq === 0) return Math.sqrt(A * A + B * B) <= radius;
    
    let param = dot / lenSq;
    param = Math.max(0, Math.min(1, param));
    
    const xx = x1 + param * C;
    const yy = y1 + param * D;
    
    const dx = tileCenterX - xx;
    const dy = tileCenterY - yy;
    
    return Math.sqrt(dx * dx + dy * dy) <= radius;
  }

  private drawPoseVisuals(landmarks: any[]): void {
    if (!this.poseOverlay) return;

    // Draw landmark points
    landmarks.forEach((landmark) => {
      const x = landmark.x * this.app.screen.width;
      const y = landmark.y * this.app.screen.height;
      this.poseOverlay!.circle(x, y, 8).fill(0xff0000);
    });

    // Draw skeleton connections
    const connections = [
      [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
      [11, 23], [12, 24], [23, 24], [23, 25], [25, 27],
      [24, 26], [26, 28]
    ];

    connections.forEach(([start, end]) => {
      if (landmarks[start] && landmarks[end]) {
        const startX = landmarks[start].x * this.app.screen.width;
        const startY = landmarks[start].y * this.app.screen.height;
        const endX = landmarks[end].x * this.app.screen.width;
        const endY = landmarks[end].y * this.app.screen.height;
        
        this.poseOverlay!.moveTo(startX, startY).lineTo(endX, endY).stroke({ width: 4, color: 0x00ff00 });
      }
    });
  }

  destroy(): void {
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(track => track.stop());
    }
    if (this.poseLandmarker) {
      this.poseLandmarker.close();
    }
    if (this.poseOverlay) {
      this.app.stage.removeChild(this.poseOverlay);
    }
  }
}