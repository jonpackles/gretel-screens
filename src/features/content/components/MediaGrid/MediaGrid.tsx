'use client';

import { useState, useEffect } from 'react';
import { MediaItem } from '../MediaItem';
import { FileItem } from '../../types';

interface MediaGridProps {
  media: FileItem[];
  pendingVisibilityChanges: Record<string, 'visible' | 'hidden'>;
  onToggleVisibility: (item: FileItem) => void;
}

export function MediaGrid({ media, pendingVisibilityChanges, onToggleVisibility }: MediaGridProps) {
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  useEffect(() => {
    console.log('MediaGrid received media items:', media.length);
    if (media.length > 0) {
      console.log('First media item:', media[0]);
    }
  }, [media]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'h' && focusedIndex !== null) {
        const item = media[focusedIndex];
        console.log('Toggling visibility for item:', item, 'Current state:', pendingVisibilityChanges[item.path] || item.visibility || 'visible');
        onToggleVisibility(item);
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [focusedIndex, media, onToggleVisibility]);

  if (media.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-500">No media files found in this project.</p>
      </div>
    );
  }

  return (
    <div 
      className="grid grid-cols-4 gap-4"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '1rem'
      }}
    >
      {media.map((item, index) => (
        <MediaItem
          key={item.path}
          item={item}
          index={index}
          pendingVisibilityChange={pendingVisibilityChanges[item.path]}
          isFocused={index === focusedIndex}
          onFocus={() => setFocusedIndex(index)}
        />
      ))}
    </div>
  );
} 