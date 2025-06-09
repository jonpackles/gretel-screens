'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { MediaItem } from '../types/media';

type SlideshowProps = {
  media: MediaItem[];
};

export default function Slideshow({ media }: SlideshowProps) {
  const [currentItems, setCurrentItems] = useState<MediaItem[]>([]);

  useEffect(() => {
    if (!media.length) return;
    
    const pickRandom = () => {
      const shuffled = [...media].sort(() => Math.random() - 0.5);
      const count = Math.random() < 0.5 ? 1 : 2;
      
      if (count === 1) {
        // Single item - pick any random item
        setCurrentItems(shuffled.slice(0, 1));
      } else {
        // Two items - ensure they're from the same project
        
        // Group media by project (extract from path)
        const projectGroups: { [project: string]: MediaItem[] } = {};
        
        media.forEach(item => {
          // Extract project from path (e.g., "linked-content/projects/PROJECT_NAME/...")
          const pathParts = item.path.split('/');
          const project = pathParts.length >= 3 ? pathParts[2] : 'unknown';
          
          if (!projectGroups[project]) {
            projectGroups[project] = [];
          }
          projectGroups[project].push(item);
        });
        
        // Find projects that have 2+ items
        const projectsWithMultipleItems = Object.entries(projectGroups)
          .filter(([_, items]) => items.length >= 2);
        
        if (projectsWithMultipleItems.length > 0) {
          // Pick a random project with multiple items
          const [_, projectItems] = projectsWithMultipleItems[
            Math.floor(Math.random() * projectsWithMultipleItems.length)
          ];
          
          // Pick 2 random items from that project
          const shuffledProjectItems = [...projectItems].sort(() => Math.random() - 0.5);
          setCurrentItems(shuffledProjectItems.slice(0, 2));
        } else {
          // Fallback: if no project has 2+ items, just show 1 item
          setCurrentItems(shuffled.slice(0, 1));
        }
      }
    };

    pickRandom();
    const interval = setInterval(pickRandom, 10000); // every 30s
    return () => clearInterval(interval);
  }, [media]);

  // Log current items whenever they change
  useEffect(() => {
    if (currentItems.length > 0) {
      console.log('Currently showing media items:', currentItems);
    }
  }, [currentItems]);

  const isSingleItem = currentItems.length === 1;

  const renderMediaItem = (item: MediaItem, anchor: 'top' | 'bottom', horizontalAnchor: 'left' | 'right' | 'center' = 'center') => {
    const verticalClass = anchor === 'top' ? 'items-start' : 'items-end';
    const horizontalClass = horizontalAnchor === 'left' ? 'justify-start' : 
                           horizontalAnchor === 'right' ? 'justify-end' : 'justify-center';
    
    return item.name.match(/\.(mp4)$/i) ? (
      <div className={`flex ${verticalClass} ${horizontalClass} w-full h-full`}>
        <video
          key={item.path}
          src={`/content/${item.path}`}
          className="max-w-full max-h-full object-contain"
          autoPlay
          muted
          loop
          playsInline
        />
      </div>
    ) : (
      <div className={`flex ${verticalClass} ${horizontalClass} w-full h-full`}>
        <div className="relative max-w-full max-h-full">
          <Image
            onLoadingComplete={() => {
              console.log('Image loaded:', {
                name: item.name,
                type: item.type,
                path: item.path
              });
            }}
            src={`/content/${item.path}`}
            alt={item.name}
            width={0}
            height={0}
            className="w-auto h-auto max-w-full max-h-full object-contain"
            sizes="50vw"
            style={{ width: 'auto', height: 'auto' }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="flex w-full h-screen">
      {isSingleItem ? (
        // Single item takes full width and height
        <div className="w-full h-full overflow-hidden flex items-center justify-center">
          {renderMediaItem(currentItems[0], 'top', 'center')}
        </div>
      ) : (
        <>
          {/* Left Container - 50% width, full height */}
          <div className="w-1/2 h-full overflow-hidden">
            {currentItems[0] && renderMediaItem(currentItems[0], 'top', 'center')}
          </div>
          
          {/* Right Container - 50% width, full height */}
          <div className="w-1/2 h-full overflow-hidden justify-end">
            {currentItems[1] && renderMediaItem(currentItems[1], 'bottom', 'right')}
          </div>
        </>
      )}
    </div>
  );
}