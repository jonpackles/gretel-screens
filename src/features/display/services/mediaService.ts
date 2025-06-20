import { MediaItem, MediaApiResponse, MediaQueryOptions } from '@/shared/types/media';
import { shuffleMedia } from '@/shared/utils/shuffle';

export class MediaService {
  private static cache: { [path: string]: { data: MediaApiResponse; timestamp: number } } = {};
  private static readonly CACHE_TTL = 1000 * 60 * 5; // 5 minutes

  /**
   * Fetch media items from a specific path with enhanced options
   */
  static async fetchMedia(
    path: string, 
    options: Partial<MediaQueryOptions> = {}
  ): Promise<MediaItem[]> {
    const queryOptions: MediaQueryOptions = {
      path,
      recursive: true,
      fileType: 'all',
      sortBy: 'name',
      sortOrder: 'asc',
      page: 1,
      limit: 1000, // Large limit to get all items for compatibility
      ...options,
    };

    try {
      console.log(`MediaService: Fetching media from ${path} with options:`, queryOptions);
      
      // Build query string
      const searchParams = new URLSearchParams();
      Object.entries(queryOptions).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            searchParams.set(key, value.join(','));
          } else {
            searchParams.set(key, value.toString());
          }
        }
      });

      const response = await fetch(`/api/media?${searchParams.toString()}`, {
        headers: {
          'Accept': 'application/json',
          // Include If-None-Match for caching if we have a cached ETag
          ...(this.getCachedETag(path) && {
            'If-None-Match': this.getCachedETag(path)!
          })
        },
      });
      
      // Handle 304 Not Modified
      if (response.status === 304) {
        const cached = this.getCachedResponse(path);
        if (cached) {
          console.log(`MediaService: Using cached data for ${path} (304 Not Modified)`);
          return cached.items;
        }
      }
      
      if (!response.ok) {
        throw new Error(`Failed to fetch media from ${path}: ${response.status} ${response.statusText}`);
      }
      
      const data: MediaApiResponse = await response.json();
      
      // Cache the response
      this.setCachedResponse(path, data);
      
      console.log(`MediaService: Found ${data.items.length} files in ${path}`);
      console.log(`MediaService: Stats - Total: ${data.stats?.totalFiles || 0}, Size: ${this.formatFileSize(data.stats?.totalSize || 0)}`);
      
      return data.items;
    } catch (error) {
      console.error(`MediaService: Error fetching media from ${path}:`, error);
      return [];
    }
  }

  /**
   * Fetch media with filtering and search
   */
  static async fetchFilteredMedia(options: MediaQueryOptions): Promise<{
    items: MediaItem[];
    pagination: MediaApiResponse['pagination'];
    stats: MediaApiResponse['stats'];
  }> {
    try {
      const searchParams = new URLSearchParams();
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            searchParams.set(key, value.join(','));
          } else {
            searchParams.set(key, value.toString());
          }
        }
      });

      const response = await fetch(`/api/media?${searchParams.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch filtered media: ${response.status}`);
      }
      
      const data: MediaApiResponse = await response.json();
      
      return {
        items: data.items,
        pagination: data.pagination,
        stats: data.stats,
      };
    } catch (error) {
      console.error('MediaService: Error fetching filtered media:', error);
      return {
        items: [],
        pagination: undefined,
        stats: undefined,
      };
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
      // Fetch all paths in parallel
      const fetchPromises = uniquePaths.map(async (path) => {
        const files = await this.fetchMedia(path);
        // Shuffle the media once when fetched for compatibility with existing modes
        return { path, files: shuffleMedia(files) };
      });

      const results = await Promise.all(fetchPromises);
      
      // Build result object
      results.forEach(({ path, files }) => {
        mediaCache[path] = files;
      });

      console.log('MediaService: Media fetch completed');
      return mediaCache;
    } catch (error) {
      console.error('MediaService: Error fetching multiple media:', error);
      return mediaCache;
    }
  }

  /**
   * Get cached media for a path (legacy compatibility)
   */
  static getCachedMedia(path: string): MediaItem[] {
    const cached = this.getCachedResponse(path);
    return cached?.items || [];
  }

  /**
   * Filter media by type
   */
  static filterByType(media: MediaItem[], type: 'image' | 'video'): MediaItem[] {
    return media.filter(item => {
      if (type === 'video') {
        return item.mimeType?.startsWith('video/') || /\.(mp4|webm|ogg)$/i.test(item.name);
      } else {
        return item.mimeType?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(item.name);
      }
    });
  }

  /**
   * Filter media by dimensions
   */
  static filterByDimensions(
    media: MediaItem[], 
    minWidth?: number, 
    maxWidth?: number, 
    minHeight?: number, 
    maxHeight?: number
  ): MediaItem[] {
    return media.filter(item => {
      if (!item.dimensions) return false;
      
      if (minWidth && item.dimensions.width < minWidth) return false;
      if (maxWidth && item.dimensions.width > maxWidth) return false;
      if (minHeight && item.dimensions.height < minHeight) return false;
      if (maxHeight && item.dimensions.height > maxHeight) return false;
      
      return true;
    });
  }

  /**
   * Filter media by file size
   */
  static filterBySize(media: MediaItem[], minSize?: number, maxSize?: number): MediaItem[] {
    return media.filter(item => {
      if (!item.fileSize) return false;
      if (minSize && item.fileSize < minSize) return false;
      if (maxSize && item.fileSize > maxSize) return false;
      return true;
    });
  }

  /**
   * Search media by name, path, or tags
   */
  static searchMedia(media: MediaItem[], query: string): MediaItem[] {
    const searchLower = query.toLowerCase();
    return media.filter(item => {
      const nameMatch = item.name.toLowerCase().includes(searchLower);
      const pathMatch = item.path.toLowerCase().includes(searchLower);
      const tagsMatch = item.tags?.some(tag => tag.toLowerCase().includes(searchLower));
      return nameMatch || pathMatch || tagsMatch;
    });
  }

  /**
   * Get media stats
   */
  static getMediaStats(media: MediaItem[]): { 
    total: number; 
    images: number; 
    videos: number; 
    totalSize: number;
    averageSize: number;
    withDimensions: number;
  } {
    const images = this.filterByType(media, 'image');
    const videos = this.filterByType(media, 'video');
    const totalSize = media.reduce((sum, item) => sum + (item.fileSize || 0), 0);
    const withDimensions = media.filter(item => item.dimensions).length;
    
    return {
      total: media.length,
      images: images.length,
      videos: videos.length,
      totalSize,
      averageSize: media.length > 0 ? totalSize / media.length : 0,
      withDimensions,
    };
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Clear cache for specific paths or all cache
   */
  static clearCache(paths?: string[]): void {
    if (paths) {
      paths.forEach(path => {
        delete this.cache[path];
      });
      console.log(`MediaService: Cleared cache for ${paths.length} paths`);
    } else {
      this.cache = {};
      console.log('MediaService: Cleared all cache');
    }
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): { entries: number; memoryUsage: string } {
    const entries = Object.keys(this.cache).length;
    const memoryUsage = this.formatFileSize(
      JSON.stringify(this.cache).length * 2 // Rough estimate (UTF-16)
    );
    return { entries, memoryUsage };
  }

  // Private helper methods
  private static getCachedResponse(path: string): MediaApiResponse | null {
    const cached = this.cache[path];
    if (!cached) return null;
    
    const now = Date.now();
    if (now - cached.timestamp > this.CACHE_TTL) {
      delete this.cache[path];
      return null;
    }
    
    return cached.data;
  }

  private static setCachedResponse(path: string, data: MediaApiResponse): void {
    this.cache[path] = {
      data,
      timestamp: Date.now(),
    };
  }

  private static getCachedETag(path: string): string | null {
    const cached = this.getCachedResponse(path);
    return cached?.cache?.etag || null;
  }
} 