import { MediaItem } from '@/types';
import { ModeComponent } from '../modes';
import { ModeConfig } from './sequenceService';

export class PreloadService {
  /**
   * Preload a mode if it has a preload method
   */
  static async preloadMode(modeConfig: ModeConfig | null | undefined, media: MediaItem[] = []): Promise<void> {
    if (!modeConfig) return;
    
    if (typeof (modeConfig.component as any).preload === 'function') {
      try {
        console.log(`PreloadService: Preloading mode ${modeConfig.name}`);
        await (modeConfig.component as any).preload(media);
        console.log(`PreloadService: Successfully preloaded ${modeConfig.name}`);
      } catch (error) {
        console.warn(`PreloadService: Error preloading mode ${modeConfig.name}:`, error);
      }
    }
  }

  /**
   * Preload multiple modes in parallel
   */
  static async preloadModes(modeConfigs: ModeConfig[], mediaMap: { [path: string]: MediaItem[] }): Promise<void> {
    const preloadPromises = modeConfigs.map(async (config) => {
      const media = config.mediaPath ? mediaMap[config.mediaPath] || [] : [];
      await this.preloadMode(config, media);
    });

    try {
      await Promise.all(preloadPromises);
      console.log('PreloadService: All modes preloaded successfully');
    } catch (error) {
      console.warn('PreloadService: Some modes failed to preload:', error);
    }
  }

  /**
   * Preload media items (images and videos)
   */
  static async preloadMediaItems(media: MediaItem[], limit?: number): Promise<void> {
    const itemsToPreload = limit ? media.slice(0, limit) : media;
    
    const preloadPromises = itemsToPreload.map(item => {
      const src = `/content/${item.path}`;
      
      if (/\.(mp4|webm|ogg)$/i.test(item.name)) {
        // Preload video
        return new Promise<boolean>(resolve => {
          const video = document.createElement('video');
          video.src = src;
          video.preload = 'auto';
          video.muted = true;
          video.oncanplaythrough = () => resolve(true);
          video.onerror = () => resolve(false);
          
          // Timeout after 10 seconds
          setTimeout(() => resolve(false), 10000);
        });
      } else {
        // Preload image
        return new Promise<boolean>(resolve => {
          const img = new Image();
          img.src = src;
          img.onload = () => resolve(true);
          img.onerror = () => resolve(false);
          
          // Timeout after 5 seconds
          setTimeout(() => resolve(false), 5000);
        });
      }
    });

    try {
      const results = await Promise.all(preloadPromises);
      const successCount = results.filter(Boolean).length;
      console.log(`PreloadService: Preloaded ${successCount}/${itemsToPreload.length} media items`);
    } catch (error) {
      console.warn('PreloadService: Error preloading media items:', error);
    }
  }

  /**
   * Preload next mode in sequence for better transitions
   */
  static async preloadNextMode(
    currentIndex: number, 
    modes: ModeConfig[], 
    mediaMap: { [path: string]: MediaItem[] }
  ): Promise<void> {
    if (modes.length === 0) return;
    
    const nextIndex = (currentIndex + 1) % modes.length;
    const nextMode = modes[nextIndex];
    
    if (nextMode) {
      const media = nextMode.mediaPath ? mediaMap[nextMode.mediaPath] || [] : [];
      await this.preloadMode(nextMode, media);
    }
  }

  /**
   * Check if browser supports preloading
   */
  static supportsPreloading(): boolean {
    return typeof window !== 'undefined' && 
           typeof document !== 'undefined' && 
           typeof Image !== 'undefined';
  }

  /**
   * Get preload statistics
   */
  static async getPreloadStats(media: MediaItem[]): Promise<{
    total: number;
    images: number;
    videos: number;
    estimatedSize: string;
  }> {
    const images = media.filter(item => /\.(jpg|jpeg|png|gif|webp)$/i.test(item.name));
    const videos = media.filter(item => /\.(mp4|webm|ogg)$/i.test(item.name));
    
    // Rough size estimation (this is just an estimate)
    const estimatedImageSize = images.length * 0.5; // 0.5MB average per image
    const estimatedVideoSize = videos.length * 2; // 2MB average per video
    const totalEstimatedMB = estimatedImageSize + estimatedVideoSize;
    
    return {
      total: media.length,
      images: images.length,
      videos: videos.length,
      estimatedSize: `~${totalEstimatedMB.toFixed(1)}MB`
    };
  }
} 