import fs from 'fs';
import path from 'path';

const VISIBILITY_DB_PATH = path.join(process.cwd(), '.data', 'visibility.json');

export interface VisibilityRecord {
  [filePath: string]: 'visible' | 'hidden';
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
 * Get visibility for a specific file
 */
export function getFileVisibility(filePath: string): 'visible' | 'hidden' {
  const db = loadVisibilityDb();
  return db[filePath] || 'visible'; // Default to visible
}

/**
 * Set visibility for a specific file
 */
export function setFileVisibility(filePath: string, visibility: 'visible' | 'hidden'): void {
  const db = loadVisibilityDb();
  if (visibility === 'visible') {
    // Remove from database if setting to visible (default state)
    delete db[filePath];
  } else {
    db[filePath] = visibility;
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