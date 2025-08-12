import path from 'path';
import { MediaItem } from '@/shared/types/media';

export type VariantSize = 'original' | 'sm' | 'md' | 'lg' | 'xl' | 'small' | 'medium' | 'large' | 'thumb';

export interface FileVariant {
  size: VariantSize;
  path: string;
  name: string;
  dimensions?: { width: number; height: number };
  fileSize?: number;
  mediaItem: MediaItem; // Reference to the original MediaItem
}

export interface FileVariantGroup {
  basePath: string;
  baseName: string;
  variants: FileVariant[];
  primary: FileVariant; // The "original" or best quality
  isHidden: boolean; // Based on primary file visibility
}

export interface DisplayContext {
  maxWidth?: number;
  maxHeight?: number;
  bandwidth?: 'low' | 'medium' | 'high';
  purpose?: 'thumbnail' | 'display' | 'fullscreen';
  preferSmaller?: boolean; // For bandwidth conservation
}

/**
 * Extract variant size from filename
 */
export function getVariantSize(filePath: string): VariantSize {
  const name = path.basename(filePath, path.extname(filePath));
  const match = name.match(/-(?:sm|md|lg|xl|small|medium|large|thumb)$/);
  
  if (!match) return 'original';
  
  const suffix = match[0].slice(1); // Remove the '-'
  return suffix as VariantSize;
}

/**
 * Extract base filename without variant suffix
 * e.g., "video-sm.mp4" -> "video.mp4", "image-md.jpg" -> "image.jpg"
 */
export function getBaseFileName(filePath: string): string {
  const dir = path.dirname(filePath);
  const name = path.basename(filePath);
  const ext = path.extname(name);
  const baseName = path.basename(name, ext);
  
  // Remove variant suffixes like -sm, -md, -lg, -xl, -small, -medium, -large, -thumb
  const baseNameClean = baseName.replace(/-(?:sm|md|lg|xl|small|medium|large|thumb)$/, '');
  
  return path.join(dir, baseNameClean + ext).replace(/\\/g, '/');
}

/**
 * Check if a file is a variant (has size suffix)
 */
export function isVariantFile(filePath: string): boolean {
  const name = path.basename(filePath, path.extname(filePath));
  return /-(?:sm|md|lg|xl|small|medium|large|thumb)$/.test(name);
}

/**
 * Get variant priority for sorting (higher = better quality)
 */
function getVariantPriority(size: VariantSize): number {
  const priorities = {
    'original': 100,
    'xl': 80,
    'large': 75,
    'lg': 70,
    'md': 50,
    'medium': 45,
    'sm': 30,
    'small': 25,
    'thumb': 10
  };
  return priorities[size] || 0;
}

/**
 * Group files by their base name, collecting variants
 */
export function groupFileVariants(files: MediaItem[]): FileVariantGroup[] {
  const groups = new Map<string, FileVariantGroup>();
  
  files.forEach(file => {
    const basePath = getBaseFileName(file.path);
    const size = getVariantSize(file.path);
    
    if (!groups.has(basePath)) {
      groups.set(basePath, {
        basePath,
        baseName: path.basename(basePath),
        variants: [],
        primary: null as any,
        isHidden: file.visibility === 'hidden'
      });
    }
    
    const group = groups.get(basePath)!;
    const variant: FileVariant = {
      size,
      path: file.path,
      name: file.name,
      dimensions: file.dimensions,
      fileSize: file.fileSize,
      mediaItem: file
    };
    
    group.variants.push(variant);
    
    // Set primary (prefer original, then highest quality)
    if (!group.primary || getVariantPriority(size) > getVariantPriority(group.primary.size)) {
      group.primary = variant;
    }
    
    // Update group visibility based on primary file
    if (variant === group.primary) {
      group.isHidden = file.visibility === 'hidden';
    }
  });
  
  // Sort variants within each group by priority (highest first)
  groups.forEach(group => {
    group.variants.sort((a, b) => getVariantPriority(b.size) - getVariantPriority(a.size));
  });
  
  return Array.from(groups.values());
}

/**
 * Filter out variants from main listings, keeping only primary files
 */
export function filterVariantsForDashboard(items: MediaItem[]): {
  displayItems: MediaItem[];
  variantGroups: FileVariantGroup[];
} {
  const groups = groupFileVariants(items);
  
  // For dashboard, show only primary files
  const displayItems = groups.map(group => group.primary.mediaItem);
  
  return { displayItems, variantGroups: groups };
}

/**
 * Select optimal variant for given context
 */
export function selectOptimalVariant(
  group: FileVariantGroup, 
  context: DisplayContext = {}
): FileVariant {
  const { maxWidth, maxHeight, bandwidth = 'high', purpose = 'display', preferSmaller = false } = context;
  
  // If only one variant, return it
  if (group.variants.length === 1) {
    return group.variants[0];
  }
  
  // Start with all variants
  let candidates = [...group.variants];
  
  // Filter by dimensions if specified
  if (maxWidth || maxHeight) {
    candidates = candidates.filter(variant => {
      if (!variant.dimensions) return true; // Keep if no dimension info
      if (maxWidth && variant.dimensions.width > maxWidth) return false;
      if (maxHeight && variant.dimensions.height > maxHeight) return false;
      return true;
    });
  }
  
  // If no candidates after filtering, fall back to smallest variant
  if (candidates.length === 0) {
    candidates = [group.variants[group.variants.length - 1]]; // Last one should be smallest
  }
  
  // Apply bandwidth/purpose preferences
  if (bandwidth === 'low' || preferSmaller || purpose === 'thumbnail') {
    // Prefer smaller variants
    return candidates[candidates.length - 1];
  } else if (purpose === 'fullscreen') {
    // Prefer highest quality that fits constraints
    return candidates[0];
  } else {
    // Default: prefer medium quality for balanced performance
    const mediumVariant = candidates.find(v => ['md', 'medium', 'lg'].includes(v.size));
    return mediumVariant || candidates[Math.floor(candidates.length / 2)];
  }
}

/**
 * Force selection of a specific variant size (for testing/override)
 */
export function selectSpecificVariant(
  group: FileVariantGroup, 
  forcedSize: VariantSize
): FileVariant {
  // First try to find the exact size requested
  const exactMatch = group.variants.find(v => v.size === forcedSize);
  if (exactMatch) {
    return exactMatch;
  }
  
  // If not found, fall back to closest available size
  console.warn(`Variant size '${forcedSize}' not found for ${group.baseName}, using fallback`);
  
  // Define fallback priority
  const fallbackMap: Record<VariantSize, VariantSize[]> = {
    'sm': ['small', 'md', 'medium', 'lg', 'large', 'xl', 'original'],
    'small': ['sm', 'md', 'medium', 'lg', 'large', 'xl', 'original'],
    'md': ['medium', 'lg', 'large', 'sm', 'small', 'xl', 'original'],
    'medium': ['md', 'lg', 'large', 'sm', 'small', 'xl', 'original'],
    'lg': ['large', 'xl', 'original', 'md', 'medium', 'sm', 'small'],
    'large': ['lg', 'xl', 'original', 'md', 'medium', 'sm', 'small'],
    'xl': ['large', 'lg', 'original', 'md', 'medium', 'sm', 'small'],
    'original': ['xl', 'large', 'lg', 'md', 'medium', 'sm', 'small'],
    'thumb': ['sm', 'small', 'md', 'medium', 'lg', 'large', 'xl', 'original']
  };
  
  const fallbacks = fallbackMap[forcedSize] || [];
  for (const fallback of fallbacks) {
    const match = group.variants.find(v => v.size === fallback);
    if (match) {
      console.log(`Using ${match.size} instead of ${forcedSize} for ${group.baseName}`);
      return match;
    }
  }
  
  // Last resort: return the primary (highest quality available)
  return group.primary;
}

/**
 * Get all files that are variants (not primary files)
 */
export function getVariantFiles(files: MediaItem[]): MediaItem[] {
  return files.filter(file => isVariantFile(file.path));
}

/**
 * Get all primary files (original or highest quality variants)
 */
export function getPrimaryFiles(files: MediaItem[]): MediaItem[] {
  const groups = groupFileVariants(files);
  return groups.map(group => group.primary.mediaItem);
}

/**
 * Find all variants of a specific file
 */
export function findFileVariants(files: MediaItem[], targetFile: MediaItem): MediaItem[] {
  const basePath = getBaseFileName(targetFile.path);
  return files.filter(file => getBaseFileName(file.path) === basePath);
} 