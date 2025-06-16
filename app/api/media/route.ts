import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { MediaItem, MediaApiResponse, MediaQueryOptions } from '@/shared/types/media';
import { 
  extractMetadata, 
  MetadataCache, 
  isImage, 
  isVideo, 
  getMimeType 
} from '@/shared/utils/mediaMetadata';
import { loadVisibilityDb } from '@/shared/utils/visibilityDb';

const BASE_PATH = path.join(process.cwd(), 'public/content');
const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.webm', '.ogg'];

// In-memory cache for directory listings
const directoryCache = new Map<string, { items: MediaItem[]; timestamp: number; etag: string }>();
const DIRECTORY_CACHE_TTL = 1000 * 60 * 5; // 5 minutes

/**
 * Check if file should be included based on filters
 */
function matchesFilters(item: MediaItem, options: MediaQueryOptions, includeHidden = false): boolean {
  // Visibility filter - exclude hidden files unless includeHidden is true
  if (!includeHidden && item.visibility === 'hidden') {
    return false;
  }
  
  // File type filter
  if (options.fileType && options.fileType !== 'all') {
    const isImageFile = isImage(item.name);
    const isVideoFile = isVideo(item.name);
    if (options.fileType === 'image' && !isImageFile) return false;
    if (options.fileType === 'video' && !isVideoFile) return false;
  }
  
  // Size filters
  if (options.minSize && item.fileSize && item.fileSize < options.minSize) return false;
  if (options.maxSize && item.fileSize && item.fileSize > options.maxSize) return false;
  
  // Dimension filters
  if (item.dimensions) {
    if (options.minWidth && item.dimensions.width < options.minWidth) return false;
    if (options.maxWidth && item.dimensions.width > options.maxWidth) return false;
    if (options.minHeight && item.dimensions.height < options.minHeight) return false;
    if (options.maxHeight && item.dimensions.height > options.maxHeight) return false;
  }
  
  // Search filter
  if (options.search) {
    const searchLower = options.search.toLowerCase();
    const nameMatches = item.name.toLowerCase().includes(searchLower);
    const pathMatches = item.path.toLowerCase().includes(searchLower);
    const tagsMatch = item.tags?.some(tag => tag.toLowerCase().includes(searchLower));
    if (!nameMatches && !pathMatches && !tagsMatch) return false;
  }
  
  // Tags filter
  if (options.tags && options.tags.length > 0) {
    if (!item.tags || !options.tags.some(tag => item.tags!.includes(tag))) return false;
  }
  
  return true;
}

/**
 * Sort items based on sort options
 */
function sortItems(items: MediaItem[], sortBy: string = 'name', sortOrder: string = 'asc'): MediaItem[] {
  return items.sort((a, b) => {
    let aVal: any, bVal: any;
    
    switch (sortBy) {
      case 'size':
        aVal = a.fileSize || 0;
        bVal = b.fileSize || 0;
        break;
      case 'date':
        aVal = new Date(a.lastModified || 0);
        bVal = new Date(b.lastModified || 0);
        break;
      case 'dimensions':
        aVal = a.dimensions ? a.dimensions.width * a.dimensions.height : 0;
        bVal = b.dimensions ? b.dimensions.width * b.dimensions.height : 0;
        break;
      default: // name
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
    }
    
    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });
}

/**
 * Process a single file and return MediaItem with metadata
 */
async function processFile(absolutePath: string, relativePath: string, stat: fs.Stats): Promise<MediaItem> {
  const name = path.basename(absolutePath);
  const ext = path.extname(name).toLowerCase();
  
  // Extract project from path
  const pathParts = relativePath.split('/');
  const projectIndex = pathParts.indexOf('projects');
  const project = projectIndex !== -1 && projectIndex + 1 < pathParts.length 
    ? pathParts[projectIndex + 1] 
    : undefined;

  // Create base MediaItem (without visibility - that's added later)
  const mediaItem: MediaItem = {
    name,
    type: 'file' as const,
    path: relativePath,
    project,
    lastModified: stat.mtime.toISOString(),
    fileSize: stat.size,
    mimeType: getMimeType(ext),
  };

  // Extract additional metadata
  try {
    const metadata = await extractMetadata(absolutePath);
    Object.assign(mediaItem, metadata);
  } catch (error) {
    console.error(`Error extracting metadata for ${absolutePath}:`, error);
    mediaItem.processingError = error instanceof Error ? error.message : 'Unknown error';
  }

  return mediaItem;
}

/**
 * Merge visibility data with media items at response time
 */
function mergeVisibilityData(items: MediaItem[]): MediaItem[] {
  const visibilityDb = loadVisibilityDb();
  
  return items.map(item => {
    // Normalize the path to use forward slashes
    const normalizedPath = item.path.replace(/\\/g, '/');
    return {
      ...item,
      visibility: visibilityDb[normalizedPath] || 'visible'
    };
  });
}

/**
 * Get directory contents with enhanced metadata
 */
async function getEnhancedDirectoryContents(
  dirPath: string, 
  relativeBase = '', 
  recursive = false
): Promise<MediaItem[]> {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const results: MediaItem[] = [];

  for (const entry of entries) {
    const absolutePath = path.join(dirPath, entry.name);
    const relativePath = path.join(relativeBase, entry.name);
    const stat = fs.statSync(absolutePath);

    if (entry.isDirectory()) {
      if (recursive) {
        // Recursively process subdirectories
        const children = await getEnhancedDirectoryContents(absolutePath, relativePath, true);
        results.push(...children);
      } else {
        // Add directory as an item (for project listing)
        const name = path.basename(relativePath);
        const projectPathParts = relativePath.split('/');
        const project = projectPathParts.length >= 3 && projectPathParts[1] === 'projects' ? projectPathParts[2] : projectPathParts[0];
        
        results.push({
          name,
          type: 'directory',
          path: relativePath.replace(/\\/g, '/'),
          project,
          lastModified: stat.mtime.toISOString(),
          fileSize: 0,
          createdAt: stat.birthtime.toISOString(),
          category: 'directory',
          tags: ['directory'],
          processed: true,
        });
      }
    } else if (entry.isFile()) {
      // Only process supported media files (now including previously hidden ones)
      const ext = path.extname(entry.name).toLowerCase();
      if (SUPPORTED_EXTENSIONS.includes(ext)) {
        try {
          const mediaItem = await processFile(absolutePath, relativePath, stat);
          results.push(mediaItem);
        } catch (error) {
          console.error(`Error processing file ${absolutePath}:`, error);
        }
      }
    }
  }

  return results;
}

/**
 * Generate cache key for directory listing
 */
function generateCacheKey(options: MediaQueryOptions, includeHidden: boolean): string {
  // Include visibility database hash in cache key
  const visibilityDb = loadVisibilityDb();
  const visibilityHash = require('crypto')
    .createHash('md5')
    .update(JSON.stringify(visibilityDb))
    .digest('hex')
    .substring(0, 8);
    
  return JSON.stringify({
    path: options.path || '',
    recursive: options.recursive || false,
    fileType: options.fileType || 'all',
    limit: options.limit || 50,
    includeHidden,
    visibilityHash,
  });
}

/**
 * Check if client has cached version using If-None-Match header
 */
function checkClientCache(request: NextRequest, etag: string): boolean {
  const ifNoneMatch = request.headers.get('if-none-match');
  return ifNoneMatch === etag;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  
  // Log cache statistics at start
  const cacheStats = await MetadataCache.getStats();
  console.log(`📊 Cache stats at start - Entries: ${cacheStats.size}, Memory: ${cacheStats.memoryUsage}, Disk: ${cacheStats.diskSize || 'N/A'}`);
  
  // Parse query options
  const options: MediaQueryOptions = {
    path: searchParams.get('path') || '',
    recursive: searchParams.get('recursive') === 'true',
    fileType: (searchParams.get('fileType') as 'image' | 'video' | 'all') || 'all',
    minWidth: searchParams.get('minWidth') ? parseInt(searchParams.get('minWidth')!) : undefined,
    maxWidth: searchParams.get('maxWidth') ? parseInt(searchParams.get('maxWidth')!) : undefined,
    minHeight: searchParams.get('minHeight') ? parseInt(searchParams.get('minHeight')!) : undefined,
    maxHeight: searchParams.get('maxHeight') ? parseInt(searchParams.get('maxHeight')!) : undefined,
    minSize: searchParams.get('minSize') ? parseInt(searchParams.get('minSize')!) : undefined,
    maxSize: searchParams.get('maxSize') ? parseInt(searchParams.get('maxSize')!) : undefined,
    search: searchParams.get('search') || undefined,
    tags: searchParams.get('tags')?.split(',').filter(Boolean) || undefined,
    sortBy: (searchParams.get('sortBy') as any) || 'name',
    sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'asc',
    page: parseInt(searchParams.get('page') || '1'),
    limit: parseInt(searchParams.get('limit') || '50'),
  };

  const includeHidden = searchParams.get('includeHidden') === 'true';

  const fullPath = path.join(BASE_PATH, options.path || '');

  try {
    // Validate path exists and is directory
    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({ error: 'Directory not found' }, { status: 404 });
    }

    const stat = fs.statSync(fullPath);
    if (!stat.isDirectory()) {
      return NextResponse.json({ error: 'Path is not a directory' }, { status: 400 });
    }

    // Check directory cache first
    const cacheKey = generateCacheKey(options, includeHidden);
    const cached = directoryCache.get(cacheKey);
    const now = Date.now();
    
    let items: MediaItem[];
    let responseETag: string;
    
    if (cached && (now - cached.timestamp) < DIRECTORY_CACHE_TTL) {
      // Use cached items
      items = cached.items;
      responseETag = cached.etag;
      console.log(`📦 Using cached directory listing for: ${options.path}`);
      
      // Check if client has this cached version
      if (checkClientCache(req, responseETag)) {
        return new NextResponse(null, { 
          status: 304,
          headers: {
            'ETag': responseETag,
            'Cache-Control': 'public, max-age=300', // 5 minutes
          }
        });
      }
    } else {
      // Fetch fresh data
      console.log(`🔄 Fetching fresh media data for: ${options.path}`);
      items = await getEnhancedDirectoryContents(fullPath, options.path, options.recursive);
      
      // Merge visibility data before caching
      items = mergeVisibilityData(items);
      
      // Generate ETag based on items and timestamp
      const itemsHash = require('crypto')
        .createHash('md5')
        .update(JSON.stringify(items.map(i => ({ path: i.path, lastModified: i.lastModified, visibility: i.visibility }))))
        .digest('hex');
      responseETag = `"${itemsHash}-${now}"`;
      
      // Cache the results
      directoryCache.set(cacheKey, {
        items,
        timestamp: now,
        etag: responseETag,
      });
      
      // Check if client has this version
      if (checkClientCache(req, responseETag)) {
        return new NextResponse(null, { 
          status: 304,
          headers: {
            'ETag': responseETag,
            'Cache-Control': 'public, max-age=300',
          }
        });
      }
    }

    // Apply filters (including visibility filtering)
    const filteredItems = items.filter(item => matchesFilters(item, options, includeHidden));
    
    // Apply sorting
    const sortedItems = sortItems(filteredItems, options.sortBy, options.sortOrder);
    
    // Apply pagination
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(10000, Math.max(1, options.limit || 50)); // Increased cap to 10000 for slideshow use
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedItems = sortedItems.slice(startIndex, endIndex);
    
    // Calculate stats
    const totalSize = filteredItems.reduce((sum, item) => sum + (item.fileSize || 0), 0);
    const fileTypes = filteredItems.reduce((acc, item) => {
      const type = isImage(item.name) ? 'image' : isVideo(item.name) ? 'video' : 'other';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Log final cache statistics
    const finalCacheStats = await MetadataCache.getStats();
    console.log(`📊 Cache stats at end - Entries: ${finalCacheStats.size}, Memory: ${finalCacheStats.memoryUsage}, Disk: ${finalCacheStats.diskSize || 'N/A'}`);
    
    // Build response
    const response: MediaApiResponse = {
      items: paginatedItems,
      pagination: {
        page,
        limit,
        total: filteredItems.length,
        hasNext: endIndex < filteredItems.length,
        hasPrev: page > 1,
      },
      cache: {
        etag: responseETag,
        lastModified: new Date().toISOString(),
        expires: new Date(now + DIRECTORY_CACHE_TTL).toISOString(),
      },
      stats: {
        totalFiles: filteredItems.length,
        totalSize,
        fileTypes,
      },
    };

    return NextResponse.json(response, {
      headers: {
        'ETag': responseETag,
        'Cache-Control': 'public, max-age=300', // 5 minutes
        'Last-Modified': new Date().toUTCString(),
      },
    });

  } catch (error) {
    console.error('Error in enhanced media API:', error);
    return NextResponse.json({ 
      error: 'Failed to process media directory',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}