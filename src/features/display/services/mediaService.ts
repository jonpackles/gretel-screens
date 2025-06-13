import { MediaItem } from '@/types';

// Utility function for proper array shuffling (Fisher-Yates)
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export class MediaService {
  private static cache: { [path: string]: MediaItem[] } = {};

  /**
   * Fetch media items from a specific path
   */
  static async fetchMedia(path: string, recursive = true): Promise<MediaItem[]> {
    try {
      console.log(`MediaService: Fetching media from ${path}`);
      const res = await fetch(`/api/media?path=${path}&recursive=${recursive}`);
      
      if (!res.ok) {
        throw new Error(`Failed to fetch media from ${path}`);
      }
      
      const data = await res.json();
      
      const files = (data.items?.filter((item: MediaItem) =>
        item.type === 'file' && 
        /\.(jpg|jpeg|png|gif|webp|mp4)$/i.test(item.name) &&
        !item.name.startsWith('_hide_')
      ) || []);

      console.log(`MediaService: Found ${files.length} files in ${path}`);
      return files;
    } catch (error) {
      console.error(`MediaService: Error fetching media from ${path}:`, error);
      return [];
    }
  }

  /**
   * Fetch and cache media for multiple paths
   */
  static async fetchMultipleMedia(paths: string[]): Promise<{ [path: string]: MediaItem[] }> {
    const mediaCache: { [path: string]: MediaItem[] } = {};
    
    const uniquePaths = Array.from(new Set(paths.filter(Boolean)));
    
    if (uniquePaths.length === 0) {
      console.log('MediaService: No media paths needed, skipping fetch');
      return mediaCache;
    }

    try {
      await Promise.all(
        uniquePaths.map(async (path) => {
          const files = await this.fetchMedia(path);
          // Shuffle the media once when fetched
          mediaCache[path] = shuffleArray(files);
        })
      );

      // Update internal cache
      Object.assign(this.cache, mediaCache);
      
      console.log('MediaService: Media fetch completed');
      return mediaCache;
    } catch (error) {
      console.error('MediaService: Error fetching multiple media:', error);
      return mediaCache;
    }
  }

  /**
   * Get cached media for a path
   */
  static getCachedMedia(path: string): MediaItem[] {
    return this.cache[path] || [];
  }

  /**
   * Clear media cache
   */
  static clearCache(): void {
    this.cache = {};
  }

  /**
   * Shuffle media array
   */
  static shuffle<T>(array: T[]): T[] {
    return shuffleArray(array);
  }

  /**
   * Filter media by type
   */
  static filterByType(media: MediaItem[], type: 'image' | 'video'): MediaItem[] {
    const videoExtensions = /\.(mp4|webm|ogg)$/i;
    const imageExtensions = /\.(jpg|jpeg|png|gif|webp)$/i;
    
    return media.filter(item => {
      if (type === 'video') {
        return videoExtensions.test(item.name);
      } else {
        return imageExtensions.test(item.name);
      }
    });
  }

  /**
   * Get media stats
   */
  static getMediaStats(media: MediaItem[]): { total: number; images: number; videos: number } {
    const images = this.filterByType(media, 'image');
    const videos = this.filterByType(media, 'video');
    
    return {
      total: media.length,
      images: images.length,
      videos: videos.length
    };
  }
} 