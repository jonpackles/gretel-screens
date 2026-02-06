import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

// Simple semaphore to limit concurrent ffprobe processes
class Semaphore {
  private running = 0;
  private queue: Array<() => void> = [];

  constructor(private max: number) {}

  async acquire(): Promise<void> {
    if (this.running < this.max) {
      this.running++;
      return;
    }
    return new Promise<void>(resolve => this.queue.push(resolve));
  }

  release(): void {
    this.running--;
    const next = this.queue.shift();
    if (next) {
      this.running++;
      next();
    }
  }
}

const ffprobeSemaphore = new Semaphore(5);

export interface ExtractedMetadata {
  fileSize: number;
  mimeType: string;
  dimensions?: { width: number; height: number };
  duration?: number;
  contentHash: string;
  etag: string;
  createdAt: string;
}

/**
 * Get MIME type based on file extension
 */
export function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const mimeMap: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.ogg': 'video/ogg',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
  };
  return mimeMap[ext] || 'application/octet-stream';
}

/**
 * Check if file is an image
 */
export function isImage(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
}

/**
 * Check if file is a video
 */
export function isVideo(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return ['.mp4', '.webm', '.ogg', '.mov', '.avi'].includes(ext);
}

/**
 * Generate a fast content fingerprint from file stats (no file read needed)
 */
export function generateContentFingerprint(filePath: string, stats: fs.Stats): string {
  return `${stats.size}-${stats.mtime.getTime()}`;
}

/**
 * Generate ETag from file stats
 */
export function generateETag(filePath: string, stats?: fs.Stats): string {
  if (!stats) stats = fs.statSync(filePath);
  return `"${stats.size}-${stats.mtime.getTime()}"`;
}

// Cache the image-size import so we don't dynamic-import on every call
let sizeOfFn: ((input: Buffer) => { width?: number; height?: number }) | null = null;

/**
 * Get image dimensions by reading only the file header (first 64KB)
 */
export async function getImageDimensions(filePath: string): Promise<{ width: number; height: number } | null> {
  try {
    if (!sizeOfFn) {
      const { default: sizeOf } = await import('image-size');
      sizeOfFn = sizeOf;
    }

    // Only read the first 64KB — image-size only needs the header
    const fd = fs.openSync(filePath, 'r');
    const headerBuffer = Buffer.alloc(65536);
    const bytesRead = fs.readSync(fd, headerBuffer, 0, 65536, 0);
    fs.closeSync(fd);

    const dimensions = sizeOfFn(headerBuffer.subarray(0, bytesRead));

    if (dimensions && dimensions.width && dimensions.height) {
      return { width: dimensions.width, height: dimensions.height };
    }
    return null;
  } catch (error) {
    console.warn(`Failed to get image dimensions for ${filePath}:`, error);
    return null;
  }
}

/**
 * Get video metadata using ffprobe
 */
export async function getVideoMetadata(filePath: string): Promise<{ 
  dimensions?: { width: number; height: number }; 
  duration?: number; 
} | null> {
  await ffprobeSemaphore.acquire();
  try {
    // Escape file path for shell execution
    const escapedPath = filePath.replace(/'/g, "'\"'\"'");

    // Use ffprobe to extract metadata
    const command = `ffprobe -v quiet -print_format json -show_format -show_streams '${escapedPath}'`;

    const { stdout } = await execAsync(command, { timeout: 10000 }); // 10 second timeout
    const data = JSON.parse(stdout);

    // Find the video stream
    const videoStream = data.streams?.find((stream: any) => stream.codec_type === 'video');

    if (videoStream) {
      const dimensions = {
        width: parseInt(videoStream.width),
        height: parseInt(videoStream.height)
      };

      const duration = data.format?.duration ? parseFloat(data.format.duration) : undefined;

      return {
        dimensions: dimensions.width && dimensions.height ? dimensions : undefined,
        duration
      };
    } else {
      return null;
    }
  } catch (error) {
    console.warn(`Failed to extract video metadata for ${filePath}:`, error);
    return null;
  } finally {
    ffprobeSemaphore.release();
  }
}

/**
 * Extract comprehensive metadata from a media file
 */
export async function extractMetadata(filePath: string, stats?: fs.Stats): Promise<ExtractedMetadata> {
  if (!stats) stats = fs.statSync(filePath);
  const filename = path.basename(filePath);

  // Check cache first
  const fileModTime = stats.mtime.getTime();
  const cachedMetadata = await MetadataCache.get(filePath, fileModTime);

  if (cachedMetadata) {
    return cachedMetadata;
  }

  // Basic file information
  const fileSize = stats.size;
  const mimeType = getMimeType(filename);
  const createdAt = stats.birthtime.toISOString();

  // Fast fingerprint from stats (no file read needed)
  const contentHash = generateContentFingerprint(filePath, stats);
  const etag = `"${contentHash}"`;

  // Extract dimensions based on file type
  let dimensions: { width: number; height: number } | undefined;
  let duration: number | undefined;

  if (isImage(filename)) {
    const imageDims = await getImageDimensions(filePath);
    if (imageDims) {
      dimensions = imageDims;
    }
  }

  const metadata: ExtractedMetadata = {
    fileSize,
    mimeType,
    dimensions,
    duration,
    contentHash,
    etag,
    createdAt,
  };

  // Cache the extracted metadata
  await MetadataCache.set(filePath, metadata);

  return metadata;
}

/**
 * Cache for storing extracted metadata to avoid repeated processing
 * Now with file-based persistence to survive server restarts
 */
export class MetadataCache {
  private static cache = new Map<string, { metadata: ExtractedMetadata; timestamp: number }>();
  private static readonly CACHE_TTL = 1000 * 60 * 60 * 96; // 96 hours for file cache
  private static readonly CACHE_FILE = '.cache/metadata.json';
  private static initialized = false;
  
  /**
   * Initialize cache by loading from disk
   */
  private static async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      // Create cache directory if it doesn't exist
      const cacheDir = path.dirname(this.CACHE_FILE);
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }
      
      // Load existing cache from disk
      if (fs.existsSync(this.CACHE_FILE)) {
        const cacheData = JSON.parse(fs.readFileSync(this.CACHE_FILE, 'utf8'));
        
        // Convert plain object back to Map
        for (const [filePath, entry] of Object.entries(cacheData)) {
          this.cache.set(filePath, entry as { metadata: ExtractedMetadata; timestamp: number });
        }
        
        console.log(`📦 Loaded ${this.cache.size} cached metadata entries from disk`);
      } else {
        console.log(`📦 No existing cache file found, starting fresh`);
      }
      
      this.initialized = true;
    } catch (error) {
      console.warn('Failed to initialize metadata cache:', error);
      this.initialized = true; // Continue without cache
    }
  }
  
  /**
   * Save cache to disk
   */
  private static async persist(): Promise<void> {
    try {
      // Convert Map to plain object for JSON serialization
      const cacheData = Object.fromEntries(this.cache.entries());
      
      // Write atomically using a temp file
      const tempFile = this.CACHE_FILE + '.tmp';
      fs.writeFileSync(tempFile, JSON.stringify(cacheData, null, 2));
      fs.renameSync(tempFile, this.CACHE_FILE);
      
      // Only log occasionally to avoid spam
      if (Math.random() < 0.1) { // 10% chance
        console.log(`💾 Persisted ${this.cache.size} metadata entries to disk`);
      }
    } catch (error) {
      console.warn('Failed to persist metadata cache:', error);
    }
  }
  
  static async get(filePath: string, fileModTime: number): Promise<ExtractedMetadata | null> {
    await this.initialize();
    
    const cached = this.cache.get(filePath);
    if (!cached) return null;
    
    // Check if cache is still valid (file hasn't been modified and cache hasn't expired)
    const now = Date.now();
    const isExpired = now - cached.timestamp > this.CACHE_TTL;
    const isStale = fileModTime > cached.timestamp;
    
    if (isExpired || isStale) {
      this.cache.delete(filePath);
      // Don't persist on every deletion, just mark as dirty
      return null;
    }
    
    return cached.metadata;
  }
  
  static async set(filePath: string, metadata: ExtractedMetadata): Promise<void> {
    await this.initialize();
    
    this.cache.set(filePath, {
      metadata,
      timestamp: Date.now(),
    });
    
    // Persist to disk asynchronously (don't block)
    this.persist().catch(err => console.warn('Cache persist failed:', err));
  }
  
  static async clear(): Promise<void> {
    await this.initialize();
    
    this.cache.clear();
    
    try {
      if (fs.existsSync(this.CACHE_FILE)) {
        fs.unlinkSync(this.CACHE_FILE);
        console.log('🗑️ Cleared cache file from disk');
      }
    } catch (error) {
      console.warn('Failed to delete cache file:', error);
    }
  }
  
  static async getStats(): Promise<{ size: number; memoryUsage: string; diskSize?: string }> {
    await this.initialize();
    
    const size = this.cache.size;
    const memoryUsage = `${Math.round(JSON.stringify([...this.cache.values()]).length / 1024)}KB`;
    
    let diskSize = 'N/A';
    try {
      if (fs.existsSync(this.CACHE_FILE)) {
        const stats = fs.statSync(this.CACHE_FILE);
        diskSize = `${Math.round(stats.size / 1024)}KB`;
      }
    } catch (error) {
      // Ignore file stat errors
    }
    
    return { size, memoryUsage, diskSize };
  }
  
  /**
   * Clean up expired entries (can be called periodically)
   */
  static async cleanup(): Promise<number> {
    await this.initialize();
    
    const now = Date.now();
    let removedCount = 0;
    
    for (const [filePath, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.CACHE_TTL) {
        this.cache.delete(filePath);
        removedCount++;
      }
    }
    
    if (removedCount > 0) {
      console.log(`🧹 Cleaned up ${removedCount} expired cache entries`);
      await this.persist();
    }
    
    return removedCount;
  }
} 