// Display feature types
export interface DisplayState {
  currentModeIndex: number;
  loading: boolean;
  error: string | null;
  isFading: boolean;
}

export interface ModeManagerProps {
  autoRotate?: boolean;
  showControls?: boolean;
  sequence?: ModeSequenceItem[];
}

export interface ModeTransition {
  from: string;
  to: string;
  duration: number;
  type: 'fade' | 'slide' | 'instant';
}

export interface ModeMetrics {
  loadTime: number;
  renderTime: number;
  mediaCount: number;
  preloadSuccess: boolean;
}

// Re-export from services for convenience
export type { ModeConfig } from '../services/sequenceService';
export type { ModeComponent, ModeRegistryKey } from '../modes';

export interface ModeSequenceItem {
  mode: string;
  duration?: number;
  mediaPath?: string;
} 