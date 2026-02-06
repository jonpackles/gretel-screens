import { VariantSize } from '@/shared/utils/variantUtils';

import Slideshow from './Slideshow';
import VerticalCarousel from './VerticalCarousel';
import Grid from './Grid';
import Mosaic from './Mosaic';
import Paths3 from './Paths-3';
import PoseHouse from './PoseHouse';
import Inform from './Inform';
import InformCalendar from './inform/Calendar';
import InformProjects from './inform/ProjectsMode';

export interface ModeRegistryEntry {
  component: React.ComponentType<any>;
  name: string;
  duration: number;
  mediaPath?: string;          // undefined = data-driven (no media fetch)
  variantSize?: VariantSize;
}

export const MODE_REGISTRY: ModeRegistryEntry[] = [
  { name: 'Slideshow',         component: Slideshow,        duration: 10000, mediaPath: 'linked-content/projects', variantSize: 'original' },
  { name: 'Vertical Carousel', component: VerticalCarousel, duration: 5000,  mediaPath: 'linked-content/posters',  variantSize: 'md' },
  { name: 'Grid',              component: Grid,             duration: 30000, mediaPath: 'linked-content/projects', variantSize: 'sm' },
  { name: 'Mosaic',            component: Mosaic,           duration: 40000, mediaPath: 'linked-content/projects', variantSize: 'md' },
  { name: 'Paths',             component: Paths3,           duration: 30000, mediaPath: 'linked-content/projects', variantSize: 'md' },
  { name: 'Pose House',        component: PoseHouse,        duration: 30000 },
  { name: 'Inform Calendar',   component: InformCalendar,   duration: 30000 },
  { name: 'Inform Projects',   component: InformProjects,   duration: 30000 },
  { name: 'Inform',            component: Inform,           duration: 30000 },
];

// Derived values for backward compatibility
export const AVAILABLE_MODES = MODE_REGISTRY.map(m => m.name);
export const DEFAULT_MODE_DURATIONS: Record<string, number> = Object.fromEntries(
  MODE_REGISTRY.map(m => [m.name, m.duration])
);
export const MEDIA_PATHS = [...new Set(
  MODE_REGISTRY.map(m => m.mediaPath).filter((p): p is string => p !== undefined)
)];

export function getModeEntry(name: string): ModeRegistryEntry | undefined {
  return MODE_REGISTRY.find(m => m.name === name);
}
