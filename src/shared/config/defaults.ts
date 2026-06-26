// Default configuration values for the application

export const APP_DEFAULTS = {
  // Display settings
  FADE_DURATION: 2000, // ms
  PRELOAD_TIMEOUT: 30000, // ms
  
  // Mode settings
  AUTO_ROTATE: true,
  SHOW_CONTROLS: false,
  
  // Video settings
  VIDEO_SIZE: 64, // px
  VIDEO_SPACING: 80, // px
  
  // Grid settings
  GRID_COLS: 5,
  GRID_ROWS: 14,
  
  // Path animation settings
  STEP_MS: 100, // ms per step
  PAUSE_MS: 3000, // ms pause between shapes
  
  // Content paths
  CONTENT_BASE_PATH: '/content',
  DEFAULT_MEDIA_PATH: 'linked-content/projects',
  
  // API settings
  API_TIMEOUT: 10000, // ms
  RETRY_ATTEMPTS: 3,
} as const;

export const KEYBOARD_SHORTCUTS = {
  NEXT_MODE: 'ArrowRight',
  PREV_MODE: 'ArrowLeft',
  TOGGLE_HIDE: 'h',
} as const; 