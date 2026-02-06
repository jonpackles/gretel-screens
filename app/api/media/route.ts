import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import { MediaItem, MediaApiResponse, MediaQueryOptions } from '@/shared/types/media';
import {
  extractMetadata,
  MetadataCache,
  isImage,
  isVideo,
  getMimeType
} from '@/shared/utils/mediaMetadata';
import { loadVisibilityDb, VisibilityRecord, getVariantSize as getVariantSizeFromVis } from '@/shared/utils/visibilityDb';
import { filterVariantsForDashboard, isVariantFile, getBaseFileName } from '@/shared/utils/variantUtils';

const BASE_PATH = path.join(process.cwd(), 'public/content');
const SUPPORTED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.webm', '.ogg']);

// In-memory cache for directory listings
const directoryCache = new Map<string, { items: MediaItem[]; timestamp: number; etag: string }>();
const DIRECTORY_CACHE_TTL = 1000 * 60 * 10; // 10 minutes

// Track when visibility was last updated to force cache refresh
let lastVisibilityUpdate = 0;

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
 * Look up visibility for a path against a pre-loaded DB (with variant inheritance)
 */
function getVisibilityFromDb(normalizedPath: string, db: VisibilityRecord): 'visible' | 'hidden' {
  if (normalizedPath in db) return db[normalizedPath];
  if (isVariantFile(normalizedPath)) {
    const base = getBaseFileName(normalizedPath);
    if (base in db) return db[base];
  }
  return 'visible';
}

/**
 * Process a single file and return MediaItem with metadata
 */
async function processFile(absolutePath: string, relativePath: string, stat: fs.Stats, visDb: VisibilityRecord): Promise<MediaItem> {
  const name = path.basename(absolutePath);
  const ext = path.extname(name).toLowerCase();

  // Extract project from path
  const pathParts = relativePath.split('/');
  const projectIndex = pathParts.indexOf('projects');
  const project = projectIndex !== -1 && projectIndex + 1 < pathParts.length
    ? pathParts[projectIndex + 1]
    : undefined;

  const normalizedPath = relativePath.replace(/\\/g, '/');
  const visibility = getVisibilityFromDb(normalizedPath, visDb);
  const variantSize = getVariantSizeFromVis(normalizedPath);
  const isVariant = isVariantFile(normalizedPath);
  const basePath = isVariant ? getBaseFileName(normalizedPath) : normalizedPath;

  const mediaItem: MediaItem = {
    name,
    type: 'file' as const,
    path: relativePath,
    project,
    lastModified: stat.mtime.toISOString(),
    fileSize: stat.size,
    mimeType: getMimeType(ext),
    visibility,
    variantSize,
    basePath,
    isVariant,
  };

  // Extract additional metadata (pass stats to avoid re-stat)
  try {
    const metadata = await extractMetadata(absolutePath, stat);
    Object.assign(mediaItem, metadata);
  } catch (error) {
    console.error(`Error extracting metadata for ${absolutePath}:`, error);
    mediaItem.processingError = error instanceof Error ? error.message : 'Unknown error';
  }

  return mediaItem;
}


/**
 * Get directory contents with enhanced metadata
 */
async function getEnhancedDirectoryContents(
  dirPath: string,
  relativeBase = '',
  recursive = false,
  visDb: VisibilityRecord = {}
): Promise<MediaItem[]> {
  let entries: fs.Dirent[];
  try {
    entries = await fsPromises.readdir(dirPath, { withFileTypes: true });
  } catch {
    return [];
  }

  const results: MediaItem[] = [];

  // Collect files and subdirectories
  const filePromises: Promise<MediaItem>[] = [];
  const subdirPromises: Promise<MediaItem[]>[] = [];

  for (const entry of entries) {
    const absolutePath = path.join(dirPath, entry.name);
    const relativePath = path.join(relativeBase, entry.name);

    if (entry.isDirectory()) {
      if (recursive) {
        subdirPromises.push(getEnhancedDirectoryContents(absolutePath, relativePath, true, visDb));
      } else {
        // Stat for directory listing (lightweight)
        const stat = await fsPromises.stat(absolutePath);
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
      const ext = path.extname(entry.name).toLowerCase();
      if (SUPPORTED_EXTENSIONS.has(ext)) {
        // Kick off file processing in parallel
        filePromises.push(
          fsPromises.stat(absolutePath).then(stat =>
            processFile(absolutePath, relativePath, stat, visDb)
          ).catch(error => {
            console.error(`Error processing file ${absolutePath}:`, error);
            return null as any;
          })
        );
      }
    }
  }

  // Wait for all files and subdirectories in parallel
  const [fileResults, subdirResults] = await Promise.all([
    Promise.all(filePromises),
    Promise.all(subdirPromises),
  ]);

  results.push(...fileResults.filter(Boolean));
  for (const subdir of subdirResults) {
    results.push(...subdir);
  }

  return results;
}

/**
 * Generate cache key for directory listing
 */
function generateCacheKey(
  options: MediaQueryOptions,
  includeHidden: boolean,
  isDashboard: boolean = false,
  showVariants: boolean = false
): string {
  return JSON.stringify({
    path: options.path || '',
    recursive: options.recursive || false,
    fileType: options.fileType || 'all',
    limit: options.limit || 50,
    includeHidden,
    isDashboard,
    showVariants,
    lastVisibilityUpdate,
    sortBy: options.sortBy,
    sortOrder: options.sortOrder,
    search: options.search,
    tags: options.tags,
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
  const isDashboard = searchParams.get('dashboard') === 'true';
  const showVariants = searchParams.get('showVariants') === 'true';

  const fullPath = path.join(BASE_PATH, options.path || '');

  try {
    // Validate path exists and is directory
    let dirStat: fs.Stats;
    try {
      dirStat = await fsPromises.stat(fullPath);
    } catch {
      return NextResponse.json({ error: 'Directory not found' }, { status: 404 });
    }
    if (!dirStat.isDirectory()) {
      return NextResponse.json({ error: 'Path is not a directory' }, { status: 400 });
    }

    // Check directory cache first
    const cacheKey = generateCacheKey(options, includeHidden, isDashboard, showVariants);
    const cached = directoryCache.get(cacheKey);
    const now = Date.now();
    
    let items: MediaItem[];
    let responseETag: string;
    
    if (cached && (now - cached.timestamp) < DIRECTORY_CACHE_TTL) {
      // Use cached items
      items = cached.items;
      responseETag = cached.etag;
      
      // Check if client has this cached version
      if (checkClientCache(req, responseETag)) {
        return new NextResponse(null, { 
          status: 304,
          headers: {
            'ETag': responseETag,
            'Cache-Control': 'public, max-age=30', // 30 seconds for faster updates
          }
        });
      }
    } else {
      // Fetch fresh data — load visibility DB once for the entire request
      const visDb = loadVisibilityDb();
      items = await getEnhancedDirectoryContents(fullPath, options.path, options.recursive, visDb);

      responseETag = `"${now}-${items.length}"`;

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
            'Cache-Control': 'public, max-age=30', // 30 seconds for faster updates
          }
        });
      }
    }

    // Apply filters (including visibility filtering)
    let filteredItems = items.filter(item => matchesFilters(item, options, includeHidden));
    
    // Apply variant filtering for dashboard
    if (isDashboard && !showVariants) {
      const { displayItems } = filterVariantsForDashboard(filteredItems);
      filteredItems = displayItems;
    }
    
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
        'Cache-Control': 'public, max-age=30', // 30 seconds for faster updates
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

export function invalidateDirectoryCache(path?: string) {
  // Update the visibility update timestamp to force cache refresh
  lastVisibilityUpdate = Date.now();
  
  if (path) {
    // Clear all cache entries since visibility changes affect all queries
    directoryCache.clear();
  } else {
    directoryCache.clear();
  }
}