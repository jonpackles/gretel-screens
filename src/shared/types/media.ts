export type MediaItem = {
  // Basic file information
  name: string;
  type: 'file';
  path: string;
  project?: string;
  lastModified?: string;
  
  // Enhanced metadata (Option A)
  fileSize?: number; // Size in bytes
  mimeType?: string; // e.g., 'image/jpeg', 'video/mp4'
  dimensions?: {
    width: number;
    height: number;
  };
  duration?: number; // For videos, in seconds
  
  // Thumbnail and preview paths
  thumbnailPath?: string; // Path to generated thumbnail
  previewPath?: string; // Path to low-res preview for faster loading
  
  // Caching and validation (Option B)
  etag?: string; // For cache validation
  contentHash?: string; // SHA-256 hash of file content
  
  // Additional metadata
  createdAt?: string; // ISO timestamp
  tags?: string[]; // Extracted or assigned tags
  category?: string; // Derived from directory structure
  
  // Processing status
  processed?: boolean; // Whether metadata extraction is complete
  processingError?: string; // If metadata extraction failed
};

// API response types
export interface MediaApiResponse {
  items: MediaItem[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  cache?: {
    etag: string;
    lastModified: string;
    expires: string;
  };
  stats?: {
    totalFiles: number;
    totalSize: number;
    fileTypes: Record<string, number>;
  };
}

// Filtering and search options
export interface MediaQueryOptions {
  path?: string;
  recursive?: boolean;
  fileType?: 'image' | 'video' | 'all';
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  minSize?: number; // bytes
  maxSize?: number; // bytes
  tags?: string[];
  search?: string; // filename search
  sortBy?: 'name' | 'size' | 'date' | 'dimensions';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
} 