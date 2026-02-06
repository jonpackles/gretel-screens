import { VariantSize } from '@/shared/utils/variantUtils';

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

// ModeComponent is exported from ../modes (re-exported via display/index.ts)

export interface ModeSequenceItem {
  mode: string;
  duration?: number;
  mediaPath?: string;
  variantSize?: VariantSize;
}
