import fs from 'fs';
import path from 'path';

const INFORM_CONTENT_DB_PATH = path.join(process.cwd(), '.data', 'inform-content.json');

export interface InformContentOverride {
  id: string;
  overrides?: {
    title?: string;
    description?: string;
    body?: string;
    date?: string;
    time?: string;
    location?: string;
    tag?: string;
    url?: string;
    team?: string[];
    status?: string;
  };
  visibility: 'visible' | 'hidden';
  lastModified: string;
}

export interface InformContentDatabase {
  [contentId: string]: InformContentOverride;
}

/**
 * Ensure the .data directory exists
 */
function ensureDataDir() {
  const dataDir = path.dirname(INFORM_CONTENT_DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

/**
 * Load inform content database from disk
 */
export function loadInformContentDb(): InformContentDatabase {
  try {
    ensureDataDir();
    if (fs.existsSync(INFORM_CONTENT_DB_PATH)) {
      const data = fs.readFileSync(INFORM_CONTENT_DB_PATH, 'utf8');
      return JSON.parse(data);
    }
    return {};
  } catch (error) {
    console.error('Error loading inform content database:', error);
    return {};
  }
}

/**
 * Save inform content database to disk
 */
export function saveInformContentDb(db: InformContentDatabase): void {
  try {
    ensureDataDir();
    fs.writeFileSync(INFORM_CONTENT_DB_PATH, JSON.stringify(db, null, 2));
  } catch (error) {
    console.error('Error saving inform content database:', error);
  }
}

/**
 * Get content override data
 */
export function getContentOverride(contentId: string): InformContentOverride | null {
  const db = loadInformContentDb();
  return db[contentId] || null;
}

/**
 * Set content visibility
 */
export function setContentVisibility(contentId: string, visibility: 'visible' | 'hidden'): void {
  const db = loadInformContentDb();
  
  if (!db[contentId]) {
    db[contentId] = {
      id: contentId,
      visibility,
      lastModified: new Date().toISOString(),
    };
  } else {
    db[contentId].visibility = visibility;
    db[contentId].lastModified = new Date().toISOString();
  }
  
  saveInformContentDb(db);
}

/**
 * Set content overrides (for editing)
 */
export function setContentOverrides(contentId: string, overrides: InformContentOverride['overrides']): void {
  const db = loadInformContentDb();
  
  if (!db[contentId]) {
    db[contentId] = {
      id: contentId,
      visibility: 'visible',
      overrides,
      lastModified: new Date().toISOString(),
    };
  } else {
    db[contentId].overrides = { ...db[contentId].overrides, ...overrides };
    db[contentId].lastModified = new Date().toISOString();
  }
  
  saveInformContentDb(db);
}

/**
 * Update both visibility and overrides
 */
export function updateContentRecord(contentId: string, update: Partial<InformContentOverride>): void {
  const db = loadInformContentDb();
  
  if (!db[contentId]) {
    db[contentId] = {
      id: contentId,
      visibility: 'visible',
      lastModified: new Date().toISOString(),
      ...update,
    };
  } else {
    Object.assign(db[contentId], update, {
      lastModified: new Date().toISOString(),
    });
  }
  
  saveInformContentDb(db);
}

/**
 * Toggle content visibility
 */
export function toggleContentVisibility(contentId: string): 'visible' | 'hidden' {
  const existing = getContentOverride(contentId);
  const currentVisibility = existing?.visibility || 'visible';
  const newVisibility = currentVisibility === 'visible' ? 'hidden' : 'visible';
  
  setContentVisibility(contentId, newVisibility);
  return newVisibility;
}

/**
 * Remove content override (reset to original)
 */
export function removeContentOverride(contentId: string): void {
  const db = loadInformContentDb();
  delete db[contentId];
  saveInformContentDb(db);
}

/**
 * Get all hidden content IDs
 */
export function getHiddenContentIds(): string[] {
  const db = loadInformContentDb();
  return Object.values(db)
    .filter(record => record.visibility === 'hidden')
    .map(record => record.id);
}

/**
 * Get all content with overrides
 */
export function getModifiedContentIds(): string[] {
  const db = loadInformContentDb();
  return Object.values(db)
    .filter(record => record.overrides && Object.keys(record.overrides).length > 0)
    .map(record => record.id);
}

/**
 * Apply overrides to content item
 */
export function applyContentOverrides(content: any): any {
  const override = getContentOverride(content.id);
  
  if (!override?.overrides) {
    return content;
  }
  
  // Create a deep copy to avoid mutating original
  const modified = JSON.parse(JSON.stringify(content));
  
  // Apply overrides to data object
  Object.entries(override.overrides).forEach(([key, value]) => {
    if (value !== undefined) {
      modified.data[key] = value;
    }
  });
  
  return modified;
}

/**
 * Filter content by visibility
 */
export function filterVisibleContent(content: any[]): any[] {
  const hiddenIds = getHiddenContentIds();
  return content.filter(item => !hiddenIds.includes(item.id));
}

/**
 * Process content with overrides and visibility sorting (hidden items go to bottom)
 */
export function processInformContent(content: any[]): any[] {
  // Apply overrides first
  const withOverrides = content.map(applyContentOverrides);
  
  // Sort by visibility (visible first, hidden last) then by original order
  const hiddenIds = getHiddenContentIds();
  
  return withOverrides.sort((a, b) => {
    const aIsHidden = hiddenIds.includes(a.id);
    const bIsHidden = hiddenIds.includes(b.id);
    
    // If visibility status is different, sort by visibility (visible first)
    if (aIsHidden !== bIsHidden) {
      return aIsHidden ? 1 : -1;
    }
    
    // If both have same visibility status, maintain original order
    return 0;
  });
}

/**
 * Clear all content data (reset to defaults)
 */
export function clearInformContentDb(): void {
  saveInformContentDb({});
} 