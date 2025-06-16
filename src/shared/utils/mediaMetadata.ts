import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

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
 * Generate content hash for caching
 */
export async function generateContentHash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    
    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

/**
 * Generate ETag from file stats and content hash
 */
export function generateETag(filePath: string, contentHash?: string): string {
  const stats = fs.statSync(filePath);
  const base = `${stats.size}-${stats.mtime.getTime()}`;
  return contentHash ? `"${base}-${contentHash.substring(0, 8)}"` : `"${base}"`;
}

/**
 * Get image dimensions using image-size library
 */
export async function getImageDimensions(filePath: string): Promise<{ width: number; height: number } | null> {
  try {
    console.log(`Extracting dimensions for: ${filePath}`);
    
    // Read file into buffer for image-size
    const imageBuffer = fs.readFileSync(filePath);
    
    // Dynamic import with proper destructuring
    const { default: sizeOf } = await import('image-size');
    const dimensions = sizeOf(imageBuffer);
    
    if (dimensions && dimensions.width && dimensions.height) {
      console.log(`Dimensions: ${dimensions.width}x${dimensions.height}`);
      return { width: dimensions.width, height: dimensions.height };
    } else {
      console.warn(`No dimensions found for: ${filePath}`);
      return null;
    }
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
  try {
    console.log(`Extracting video metadata for: ${filePath}`);
    
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
      
      console.log(`Video metadata: ${dimensions.width}x${dimensions.height}, duration: ${duration ? `${duration.toFixed(1)}s` : 'unknown'}`);
      
      return {
        dimensions: dimensions.width && dimensions.height ? dimensions : undefined,
        duration
      };
    } else {
      console.warn(`No video stream found in: ${filePath}`);
      return null;
    }
  } catch (error) {
    console.warn(`Failed to extract video metadata for ${filePath}:`, error);
    return null;
  }
}

/**
 * Extract comprehensive metadata from a media file
 */
export async function extractMetadata(filePath: string): Promise<ExtractedMetadata> {
  const stats = fs.statSync(filePath);
  const filename = path.basename(filePath);
  
  // Check cache first with detailed logging
  const fileModTime = stats.mtime.getTime();
  const cachedMetadata = await MetadataCache.get(filePath, fileModTime);
  
  if (cachedMetadata) {
    console.log(`✅ Using cached metadata for: ${filename}`);
    return cachedMetadata;
  } else {
    console.log(`🔄 Extracting fresh metadata for: ${filename} (cache miss or stale)`);
  }
  
  // Basic file information
  const fileSize = stats.size;
  const mimeType = getMimeType(filename);
  const createdAt = stats.birthtime.toISOString();
  
  // Generate content hash (for caching)
  const contentHash = await generateContentHash(filePath);
  const etag = generateETag(filePath, contentHash);
  
  // Extract dimensions based on file type
  let dimensions: { width: number; height: number } | undefined;
  let duration: number | undefined;
  
  if (isImage(filename)) {
    const imageDims = await getImageDimensions(filePath);
    if (imageDims) {
      dimensions = imageDims;
    }
  } else if (isVideo(filename)) {
    const videoMeta = await getVideoMetadata(filePath);
    if (videoMeta) {
      dimensions = videoMeta.dimensions;
      duration = videoMeta.duration;
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
  
  console.log(`✅ Metadata extraction complete for ${filename}:`, {
    fileSize,
    mimeType,
    dimensions,
    duration: duration ? `${duration.toFixed(1)}s` : 'N/A',
    cached: false
  });
  
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