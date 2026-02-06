// Mode constants — re-exported from the single source of truth in registry.ts
export { AVAILABLE_MODES, DEFAULT_MODE_DURATIONS, MEDIA_PATHS } from '@/features/display/modes/registry';

export type ModeName = string;

// Screen constants (not mode-specific, kept here)
export const AVAILABLE_SCREENS = ['screen-a', 'screen-b'] as const;

export type ScreenId = typeof AVAILABLE_SCREENS[number];
