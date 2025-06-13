// Common types used across the application

export interface MediaItem {
  name: string;
  type: 'file' | 'directory';
  path: string;
  project?: string;
  lastModified?: string;
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

// Re-export types that are used across features
export type { ScreenId, ModeName } from '../constants/modes'; 