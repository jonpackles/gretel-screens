import { lazy } from 'react';
import { MediaItem } from '@/types';

// Lazy load all modes for better performance
export const Calendar = lazy(() => import('./Calendar'));
export const Grid = lazy(() => import('./Grid'));
export const Inform = lazy(() => import('./Inform'));
export const Mosaic = lazy(() => import('./Mosaic'));
export const Paths = lazy(() => import('./Paths'));
export const PoseHouse = lazy(() => import('./PoseHouse'));
export const Slideshow = lazy(() => import('./Slideshow'));
export const VerticalCarousel = lazy(() => import('./VerticalCarousel'));

// Import inform sub-modes
export const InformCalendar = lazy(() => import('./inform/Calendar'));
export const InformProjects = lazy(() => import('./inform/ProjectsMode'));

// Mode registry for dynamic access
export const MODE_REGISTRY = {
  'Calendar': Calendar,
  'Grid': Grid,
  'Inform': Inform,
  'Mosaic': Mosaic,
  'Paths': Paths,
  'Pose House': PoseHouse,
  'Slideshow': Slideshow,
  'Vertical Carousel': VerticalCarousel,
  'Inform Calendar': InformCalendar,
  'Inform Projects': InformProjects,
} as const;

export type ModeRegistryKey = keyof typeof MODE_REGISTRY;

// Type for mode components that support preloading
export type ModeComponent = React.ComponentType<{ media: MediaItem[] }> & {
  preload?: (media: MediaItem[]) => Promise<void>;
}

// Helper to get mode component by name
export function getModeComponent(modeName: string): ModeComponent | null {
  return MODE_REGISTRY[modeName as ModeRegistryKey] || null;
}

// Get all available mode names
export function getAvailableModes(): string[] {
  return Object.keys(MODE_REGISTRY);
} 