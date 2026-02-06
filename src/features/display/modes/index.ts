import { MediaItem } from '@/types';
import { getModeEntry as _getModeEntry } from './registry';

// Re-export everything from the registry (single source of truth)
export {
  MODE_REGISTRY,
  AVAILABLE_MODES,
  DEFAULT_MODE_DURATIONS,
  MEDIA_PATHS,
  getModeEntry,
} from './registry';
export type { ModeRegistryEntry } from './registry';

// Type for mode components that support preloading
export type ModeComponent = React.ComponentType<{ media: MediaItem[] }> & {
  preload?: (media: MediaItem[]) => Promise<void>;
}

// Helper to get mode component by name
export function getModeComponent(modeName: string): ModeComponent | null {
  const entry = _getModeEntry(modeName);
  return (entry?.component as ModeComponent) || null;
}
