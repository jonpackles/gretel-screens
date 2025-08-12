'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { MediaItem } from '@/shared/types/media';
import { useKeyboard } from '@/shared/hooks/useKeyboard';
import { 
  groupFileVariants, 
  selectOptimalVariant, 
  selectSpecificVariant,
  DisplayContext 
} from '@/shared/utils/variantUtils';

// Import all available modes from the new structure
import Slideshow from '../../modes/Slideshow';
import Calendar from '../../modes/Calendar';
import VerticalCarousel from '../../modes/VerticalCarousel';
import PoseHouse from '../../modes/PoseHouse';
import Inform from '../../modes/Inform';
import Grid from '../../modes/Grid';
import Paths from '../../modes/Paths';
import Mosaic from '../../modes/Mosaic';

// Import inform sub-modes
import InformCalendar from '../../modes/inform/Calendar';
import InformProjects from '../../modes/inform/ProjectsMode';

// Utility function for proper array shuffling (Fisher-Yates)
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Mode configuration
interface ModeConfig {
  component: React.ComponentType<any>;
  name: string;
  duration: number; // Duration in milliseconds
  mediaPath: string | undefined; // Always present, can be undefined
  variantSize?: 'original' | 'sm' | 'md' | 'lg' | 'xl' | 'small' | 'medium' | 'large' | 'thumb'; // Preferred variant size
  props?: any; // Additional props for the mode
}

// Allows custom mode, duration, and mediaPath
export type ModeSequenceItem = {
  mode: string;
  duration?: number;
  mediaPath?: string;
  variantSize?: 'original' | 'sm' | 'md' | 'lg' | 'xl' | 'small' | 'medium' | 'large' | 'thumb';
};

const MODE_CONFIGS: ModeConfig[] = [
  {
    component: Slideshow,
    name: 'Slideshow',
    duration: 10000, 
    mediaPath: 'linked-content/projects',
    variantSize: 'original', // Full resolution for 4K TV display
  },
  {
    component: VerticalCarousel,
    name: 'Vertical Carousel',
    duration: 5000,
    mediaPath: 'linked-content/posters',
    variantSize: 'md', // Medium for carousel items
  },
  {
    component: Calendar,
    name: 'Calendar',
    duration: 5000, // 20 seconds
    mediaPath: undefined, // Calendar doesn't need media
  },
  {
    component: PoseHouse,
    name: 'Pose House',
    duration: 30000, // 30 seconds
    mediaPath: undefined, // PoseHouse uses camera, no media needed
  },
  {
    component: Inform,
    name: 'Inform',
    duration: 30000, // 30 seconds
    mediaPath: undefined, // Inform doesn't need media
  },
  {
    component: Grid,
    name: 'Grid',
    duration: 30000, // 30 seconds
    mediaPath: 'linked-content/projects',
    variantSize: 'sm', // Small for performance with many grid items
  },
  {
    component: Paths,
    name: 'Paths',
    duration: 30000, // 30 seconds
    mediaPath: 'linked-content/projects',
    variantSize: 'md', // Medium for path animations
  },
  {
    component: Mosaic,
    name: 'Mosaic',
    duration: 40000, // 40 seconds
    mediaPath: 'linked-content/projects',
    variantSize: 'md', // Medium for mosaic layout
  },
  // Add inform sub-modes
  {
    component: InformCalendar,
    name: 'Inform Calendar',
    duration: 30000, // 30 seconds
    mediaPath: undefined, // Inform Calendar doesn't need media
  },
  {
    component: InformProjects,
    name: 'Inform Projects',
    duration: 30000, // 30 seconds
    mediaPath: undefined, // Inform Projects doesn't need media
  },
];

export interface ModeManagerProps {
  autoRotate?: boolean;
  showControls?: boolean;
  sequence?: ModeSequenceItem[];
}

// Helper to preload a mode if it has a preload method
async function preloadMode(modeConfig: ModeConfig | null | undefined, media: MediaItem[] = []) {
  if (!modeConfig) return;
  if (typeof (modeConfig.component as any).preload === 'function') {
    try {
      await (modeConfig.component as any).preload(media);
    } catch (e) {
      // Ignore preload errors
    }
  }
}

export default function ModeManager({
  autoRotate = true,
  showControls = false,
  sequence,
}: ModeManagerProps) {
  const [currentModeIndex, setCurrentModeIndex] = useState(0);
  const [media, setMedia] = useState<{ [path: string]: MediaItem[] }>({});
  const [loading, setLoading] = useState(true);
  const [isFading, setIsFading] = useState(false);
  const fadeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Compute active modes based on sequence prop
  const activeModes = useMemo(() => {
    if (!sequence) return MODE_CONFIGS;

    return sequence
      .map((item) => {
        const base = MODE_CONFIGS.find((m) => m.name === item.mode);
        if (!base) return null;
        return {
          ...base,
          duration: item.duration ?? base.duration,
          mediaPath: item.mediaPath ?? base.mediaPath,
          variantSize: item.variantSize ?? base.variantSize,
        };
      })
      .filter((m): m is ModeConfig => m !== null);
  }, [sequence]);

  const currentMode = activeModes[currentModeIndex];

  // Debug logging
  useEffect(() => {
    console.log('ModeManager: Active modes:', activeModes.map(m => m.name));
    console.log('ModeManager: Current mode index:', currentModeIndex);
    console.log('ModeManager: Current mode:', currentMode?.name);
  }, [activeModes, currentModeIndex, currentMode]);

  // Fetch media for all active modes that need it
  useEffect(() => {
    const fetchAllMedia = async () => {
      console.log('ModeManager: Starting media fetch...');
      setLoading(true);
      const mediaCache: { [path: string]: MediaItem[] } = {};
      
      // Get unique media paths from active modes only
      const mediaPaths = Array.from(new Set(
        activeModes
          .map(config => config.mediaPath)
          .filter(Boolean) as string[]
      ));

      console.log('ModeManager: Media paths to fetch:', mediaPaths);

      try {
        if (mediaPaths.length === 0) {
          console.log('ModeManager: No media paths needed, skipping fetch');
          setMedia({});
          setLoading(false);
          return;
        }

        await Promise.all(
          mediaPaths.map(async (path) => {
            console.log(`ModeManager: Fetching media from ${path}`);
            // Fetch ALL files including variants for smart selection
            const res = await fetch(`/api/media?path=${path}&recursive=true&limit=10000&includeHidden=false`);
            const data = await res.json();
            
            const allFiles = (data.items?.filter((item: MediaItem) =>
              item.type === 'file' && 
              /\.(jpg|jpeg|png|gif|webp|mp4)$/i.test(item.name)
            ) || []);

            console.log(`ModeManager: Found ${allFiles.length} total files in ${path}`);
            
            // Group files by variants and select mode-specific versions
            const variantGroups = groupFileVariants(allFiles);
            console.log(`ModeManager: Grouped into ${variantGroups.length} variant groups`);
            
            // Find the mode that uses this media path to get its variant preference
            const modeForPath = activeModes.find(mode => mode.mediaPath === path);
            const preferredSize = modeForPath?.variantSize;
            
            // Select variants based on mode preference
            const optimizedFiles = variantGroups.map(group => {
              let selectedVariant;
              
                             if (preferredSize) {
                 // Use mode-specific variant size
                 selectedVariant = selectSpecificVariant(group, preferredSize);
                 console.log(`ModeManager: Selected ${selectedVariant.size} variant (mode preference: ${preferredSize}) for ${group.baseName}`);
               } else {
                 // Fall back to auto-selection if no preference set
                 const displayContext: DisplayContext = {
                   bandwidth: 'high',
                   purpose: 'display'
                 };
                 selectedVariant = selectOptimalVariant(group, displayContext);
                 console.log(`ModeManager: Selected ${selectedVariant.size} variant (auto) for ${group.baseName}`);
               }
              
              return selectedVariant.mediaItem;
            });

            console.log(`ModeManager: Optimized to ${optimizedFiles.length} files for display`);
            mediaCache[path] = optimizedFiles;
          })
        );

        setMedia(mediaCache);
        console.log('ModeManager: Media fetch completed with variant optimization');
      } catch (err) {
        console.error('ModeManager: Error fetching media:', err);
      } finally {
        setLoading(false);
      }
    };

    // Only fetch if we have active modes
    if (activeModes.length > 0) {
      fetchAllMedia();
    }
  }, [activeModes]);

  // Auto-rotation timer with fade effect
  useEffect(() => {
    if (!autoRotate || loading || !currentMode || activeModes.length === 0) {
      return;
    }

    const fadeDuration = 2000; // 2 seconds

    const timeout = setTimeout(() => {
      setIsFading(true);

      fadeTimeoutRef.current = setTimeout(() => {
        setCurrentModeIndex((prevIndex) => 
          (prevIndex + 1) % activeModes.length
        );
        setIsFading(false);
      }, fadeDuration);
    }, currentMode.duration);

    return () => {
      clearTimeout(timeout);
      if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
    };
  }, [currentModeIndex, currentMode?.duration, autoRotate, loading, currentMode, activeModes]);

  // Preload next mode for smooth transitions
  useEffect(() => {
    if (!autoRotate || loading || !currentMode || activeModes.length === 0) return;
    const nextIndex = (currentModeIndex + 1) % activeModes.length;
    const nextMode = activeModes[nextIndex] ?? null;
    const nextMediaPath = nextMode?.mediaPath;
    
    // Use freshly shuffled media for preloading too
    const nextMedia = nextMediaPath ? shuffleArray(media[nextMediaPath] || []) : [];
    preloadMode(nextMode, nextMedia);
  }, [currentModeIndex, activeModes, autoRotate, loading, currentMode, media]);

  // Use shared keyboard hook for navigation
  useKeyboard({
    onNext: () => setCurrentModeIndex((prev) => (prev + 1) % activeModes.length),
    onPrev: () => setCurrentModeIndex((prev) => prev === 0 ? activeModes.length - 1 : prev - 1),
    enabled: true,
  });

  // Handle empty or invalid mode selection
  if (activeModes.length === 0) {
    return (
      <div className="flex items-center justify-center w-full h-screen bg-black">
        <div className="text-white text-center">
          <div className="text-2xl mb-4">No modes selected</div>
          <div className="text-sm">Available modes: {MODE_CONFIGS.map(m => m.name).join(', ')}</div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center w-full h-screen bg-black">
        <div className="text-white text-2xl">Loading modes...</div>
      </div>
    );
  }

  // Reset currentModeIndex if it's out of bounds
  if (currentModeIndex >= activeModes.length) {
    setCurrentModeIndex(0);
    return null;
  }

  // Get media for current mode - shuffle fresh each time for variety
  const currentMedia = currentMode?.mediaPath 
    ? (() => {
        const shuffled = shuffleArray(media[currentMode.mediaPath] || []);
        console.log(`ModeManager: Freshly shuffled ${shuffled.length} items for ${currentMode.name}`);
        return shuffled;
      })()
    : [];

  // Early return if no current mode
  if (!currentMode) {
    return (
      <div className="flex items-center justify-center w-full h-screen bg-black">
        <div className="text-white text-2xl">Loading mode...</div>
      </div>
    );
  }

  // Render current mode
  const CurrentModeComponent = currentMode.component;
  const modeProps = {
    media: currentMedia,
    ...currentMode.props,
  };

  return (
    <div className="relative w-full h-screen">
      {/* Current Mode with fade transition */}
      <div className={`transition-opacity duration-1000 w-full h-full ${isFading ? 'opacity-0' : 'opacity-100'}`}>
        <CurrentModeComponent {...modeProps} />
      </div>

      {/* Mode Indicator (always visible) */}
      <div className="fixed bottom-4 right-4 z-40 bg-black/60 text-white px-3 py-1 rounded text-sm">
        {currentMode.name} ({currentModeIndex + 1}/{activeModes.length})
      </div>
    </div>
  );
}