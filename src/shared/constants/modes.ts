// Mode constants and configuration
export const AVAILABLE_MODES = [
  'Slideshow',
  'Vertical Carousel',
  'Marquee',
  'Calendar',
  'Mosaic',
  'Glass (Camera)',
  'Pose House',
  'Inform Calendar',
  'Inform Projects',
  'Grid',
  'Paths',
] as const;

export type ModeName = typeof AVAILABLE_MODES[number];

export const DEFAULT_MODE_DURATIONS = {
  'Slideshow': 10000,
  'Vertical Carousel': 5000,
  'Marquee': 30000,
  'Calendar': 5000,
  'Mosaic': 40000,
  'Glass (Camera)': 30000,
  'Pose House': 30000,
  'Inform Calendar': 30000,
  'Inform Projects': 30000,
  'Grid': 30000,
  'Paths': 30000,
} as const;

export const MEDIA_PATHS = [
  'linked-content/projects',
  'linked-content/posters',
] as const;

export const AVAILABLE_SCREENS = ['screen-a', 'screen-b'] as const;

export type ScreenId = typeof AVAILABLE_SCREENS[number]; 