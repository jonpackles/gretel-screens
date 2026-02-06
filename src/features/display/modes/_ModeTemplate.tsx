/**
 * _ModeTemplate.tsx — Reference for creating new display modes.
 *
 * HOW TO ADD A NEW MODE:
 *
 *   1. Create your mode component file in this directory (e.g., MyMode.tsx).
 *      Use one of the two patterns below depending on whether your mode
 *      displays media files or fetches its own data.
 *
 *   2. Add a single entry to MODE_REGISTRY in ./registry.ts:
 *
 *      import MyMode from './MyMode';
 *      // then inside the array:
 *      { name: 'My Mode', component: MyMode, duration: 30000, mediaPath: 'linked-content/projects', variantSize: 'md' },
 *
 *      - mediaPath: set to the Dropbox content folder, or omit for data-driven modes
 *      - variantSize: preferred image variant ('original' | 'sm' | 'md' | 'lg' | 'xl')
 *      - duration: time in ms before ModeManager rotates to the next mode
 *
 *   IMPORTANT: Media items can be images OR videos (.mp4, .webm, .ogg).
 *   Always check the file extension and render <video> or <img> accordingly.
 *   See the helper function `isVideo()` in Pattern A below.
 *
 *   That's it — no other files need editing.
 */

// ─── PATTERN A: Media-driven mode ───────────────────────────────────────────
// Receives shuffled media[] from ModeManager. Handles cycling & transitions.

/*
'use client';

import { useEffect, useState } from 'react';
import { MediaItem } from '@/shared/types/media';
import BaseMode from './BaseMode';
import styles from './modes.module.scss';

type MyModeProps = {
  media: MediaItem[];
};

// Helper: check if a media item is a video
function isVideo(name: string) {
  return /\.(mp4|webm|ogg)$/i.test(name);
}

export default function MyMode({ media }: MyModeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  // Cycle through items with fade transition
  useEffect(() => {
    if (media.length === 0) return;
    const interval = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentIndex(prev => (prev + 1) % media.length);
        setIsVisible(true);
      }, 500);
    }, 5000);
    return () => clearInterval(interval);
  }, [media.length]);

  const currentItem = media[currentIndex];
  const fadeClass = `transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`;

  return (
    <BaseMode media={media} emptyMessage="No media for My Mode">
      {currentItem && (
        isVideo(currentItem.name) ? (
          <video
            key={currentItem.path}
            src={`/content/${currentItem.path}`}
            autoPlay muted loop playsInline
            className={`w-full h-full object-cover ${fadeClass}`}
          />
        ) : (
          <img
            key={currentItem.path}
            src={`/content/${currentItem.path}`}
            alt={currentItem.name}
            className={`w-full h-full object-cover ${fadeClass}`}
          />
        )
      )}
    </BaseMode>
  );
}

// Optional: preload for smooth transitions (called by ModeManager)
MyMode.preload = async (media: MediaItem[]) => {
  await Promise.all(
    media.slice(0, 5).map(item =>
      new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = `/content/${item.path}`;
      })
    )
  );
};
*/

// ─── PATTERN B: Data-driven mode ────────────────────────────────────────────
// Fetches its own data via hooks/API. No media prop needed.

/*
'use client';

import BaseMode from './BaseMode';
import styles from './modes.module.scss';
// import { useMyDataHook } from '@/shared/hooks/useMyDataHook';

export default function MyDataMode() {
  // const { data, loading, error } = useMyDataHook();

  return (
    <BaseMode>
      <div>Data-driven mode content here</div>
    </BaseMode>
  );
}
*/

export {};
