import fs from 'fs';
import path from 'path';

const VISIBILITY_DB_PATH = path.join(process.cwd(), '.data', 'visibility.json');

export interface VisibilityRecord {
  [filePath: string]: 'visible' | 'hidden';
}

/**
 * Extract base filename without variant suffix
 * e.g., "video-sm.mp4" -> "video.mp4", "image-md.jpg" -> "image.jpg"
 */
function getBaseFileName(filePath: string): string {
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
function isVariantFile(filePath: string): boolean {
  const name = path.basename(filePath, path.extname(filePath));
  return /-(?:sm|md|lg|xl|small|medium|large|thumb)$/.test(name);
}

/**
 * Extract variant size from filename
 */
export function getVariantSize(filePath: string): 'original' | 'sm' | 'md' | 'lg' | 'xl' | 'small' | 'medium' | 'large' | 'thumb' {
  const name = path.basename(filePath, path.extname(filePath));
  const match = name.match(/-(?:sm|md|lg|xl|small|medium|large|thumb)$/);
  
  if (!match) return 'original';
  
  const suffix = match[0].slice(1); // Remove the '-'
  return suffix as any;
}

/**
 * Ensure the .data directory exists
 */
function ensureDataDir() {
  const dataDir = path.dirname(VISIBILITY_DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

/**
 * Load visibility database from disk
 */
export function loadVisibilityDb(): VisibilityRecord {
  try {
    ensureDataDir();
    if (fs.existsSync(VISIBILITY_DB_PATH)) {
      const data = fs.readFileSync(VISIBILITY_DB_PATH, 'utf8');
      return JSON.parse(data);
    }
    return {};
  } catch (error) {
    console.error('Error loading visibility database:', error);
    return {};
  }
}

/**
 * Save visibility database to disk
 */
export function saveVisibilityDb(db: VisibilityRecord): void {
  try {
    ensureDataDir();
    fs.writeFileSync(VISIBILITY_DB_PATH, JSON.stringify(db, null, 2));
  } catch (error) {
    console.error('Error saving visibility database:', error);
  }
}

/**
 * Get visibility for a specific file (with variant inheritance)
 */
export function getFileVisibility(filePath: string): 'visible' | 'hidden' {
  const db = loadVisibilityDb();
  const normalizedPath = filePath.replace(/\\/g, '/');
  
  // Check direct visibility first
  if (normalizedPath in db) {
    return db[normalizedPath];
  }
  
  // If this is a variant, check the base file's visibility
  if (isVariantFile(normalizedPath)) {
    const basePath = getBaseFileName(normalizedPath);
    if (basePath in db) {
      return db[basePath];
    }
  }
  
  return 'visible'; // Default to visible
}

/**
 * Set visibility for a specific file (and optionally apply to all variants)
 */
export function setFileVisibility(
  filePath: string, 
  visibility: 'visible' | 'hidden',
  applyToVariants: boolean = true
): void {
  const db = loadVisibilityDb();
  const normalizedPath = filePath.replace(/\\/g, '/');
  
  if (visibility === 'visible') {
    // Remove from database if setting to visible (default state)
    delete db[normalizedPath];
  } else {
    db[normalizedPath] = visibility;
  }
  
  // If applying to variants and this is a base file, also set visibility for all variants
  if (applyToVariants && !isVariantFile(normalizedPath)) {
    // Note: We store the base file visibility, and variants inherit it via getFileVisibility
    // This is more efficient than storing each variant separately
  }
  
  saveVisibilityDb(db);
}

/**
 * Toggle visibility for a specific file
 */
export function toggleFileVisibility(filePath: string): 'visible' | 'hidden' {
  const currentVisibility = getFileVisibility(filePath);
  const newVisibility = currentVisibility === 'visible' ? 'hidden' : 'visible';
  setFileVisibility(filePath, newVisibility);
  return newVisibility;
}

/**
 * Batch update visibility for multiple files
 */
export function batchUpdateVisibility(updates: Record<string, 'visible' | 'hidden'>): void {
  const db = loadVisibilityDb();
  
  Object.entries(updates).forEach(([filePath, visibility]) => {
    if (visibility === 'visible') {
      delete db[filePath];
    } else {
      db[filePath] = visibility;
    }
  });
  
  saveVisibilityDb(db);
}

/**
 * Get all hidden files
 */
export function getHiddenFiles(): string[] {
  const db = loadVisibilityDb();
  return Object.keys(db).filter(path => db[path] === 'hidden');
}

/**
 * Clear all visibility data (reset to all visible)
 */
export function clearVisibilityDb(): void {
  saveVisibilityDb({});
} 