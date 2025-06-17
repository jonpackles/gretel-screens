'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MediaItem } from '../MediaItem';
import { FileItem } from '../../types';

interface MediaGridProps {
  media: FileItem[];
  pendingVisibilityChanges: Record<string, 'visible' | 'hidden'>;
  onToggleVisibility: (item: FileItem) => void;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => Promise<void>;
}

export function MediaGrid({ 
  media, 
  pendingVisibilityChanges, 
  onToggleVisibility,
  hasMore,
  isLoadingMore,
  onLoadMore 
}: MediaGridProps) {
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // If the target is visible and we have more items to load
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          onLoadMore();
        }
      },
      {
        root: null, // Use viewport as root
        rootMargin: '100px', // Start loading when within 100px of the bottom
        threshold: 0.1 // Trigger when at least 10% of the target is visible
      }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasMore, isLoadingMore, onLoadMore]);

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
    <div className="space-y-6">
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

      {/* Loading indicator and observer target */}
      <div 
        ref={observerTarget}
        className="h-20 flex items-center justify-center"
      >
        {isLoadingMore && (
          <div className="text-gray-500">
            Loading more items...
          </div>
        )}
      </div>
    </div>
  );
} 