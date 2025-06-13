export interface FileItem {
  name: string;
  type: 'file' | 'directory';
  path: string;
  project?: string;
  lastModified?: string;
  
  // Enhanced metadata
  fileSize?: number;
  mimeType?: string;
  dimensions?: {
    width: number;
    height: number;
  };
  duration?: number;
  
  // Caching and validation
  etag?: string;
  contentHash?: string;
  
  // Additional metadata
  createdAt?: string;
  tags?: string[];
  category?: string;
  
  // Processing status
  processed?: boolean;
  processingError?: string;
  
  // Visibility control
  visibility?: 'visible' | 'hidden';
} 