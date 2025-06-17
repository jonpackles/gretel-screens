'use client';

import { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import { MediaItem } from '@/shared/types/media';
import styles from './modes.module.scss';
import { basel } from '@/styles/fonts';

type SlideshowProps = {
  media: MediaItem[];
};

export default function Slideshow({ media }: SlideshowProps) {
  const [currentItems, setCurrentItems] = useState<MediaItem[]>([]);
  const [cycleDuration] = useState(10000);
  const [isVisible, setIsVisible] = useState(true);
  const [currentProject, setCurrentProject] = useState<string>('');
  
  // Group media by project for intelligent pairing
  const mediaByProject = useMemo(() => {
    const grouped: { [project: string]: MediaItem[] } = {};
    
    media.forEach(item => {
      const project = item.project || 'unknown';
      if (!grouped[project]) {
        grouped[project] = [];
      }
      grouped[project].push(item);
    });
    
    // Filter out projects with only 1 item for better pairing
    const projectsWithMultipleItems = Object.entries(grouped)
      .filter(([_, items]) => items.length >= 2);
    
    return {
      all: grouped,
      multiItem: Object.fromEntries(projectsWithMultipleItems)
    };
  }, [media]);
  
  useEffect(() => {
    if (!media?.length) return;

    const updateItems = () => {
      // Start fade out
      setIsVisible(false);
      
      // Wait for fade out, then update items
      setTimeout(() => {
        const shouldShowSingle = Math.random() > 0.6; // 40% chance of single item
      
        if (shouldShowSingle) {
          // Single item - can be from any project - use proper shuffle
          const shuffled = [...media];
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          }
          setCurrentItems([shuffled[0]]);
          setCurrentProject(shuffled[0]?.project || '');
        } else {
          // Dual items - must be from same project
          const projectsWithPairs = Object.keys(mediaByProject.multiItem);
          
          if (projectsWithPairs.length === 0) {
            // No projects with multiple items, fall back to single item
            const shuffled = [...media];
            for (let i = shuffled.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            setCurrentItems([shuffled[0]]);
            setCurrentProject(shuffled[0]?.project || '');
            return;
          }
          
          // Pick a random project that has multiple items
          const selectedProject = projectsWithPairs[Math.floor(Math.random() * projectsWithPairs.length)];
          const projectItems = mediaByProject.multiItem[selectedProject];
          
          // Use proper Fisher-Yates shuffle
          const shuffled = [...projectItems];
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          }
          
          const selectedItems = shuffled.slice(0, 2);
          setCurrentItems(selectedItems);
          setCurrentProject(selectedItems[0]?.project || '');
        }

        // Staggered fade in
        setTimeout(() => {
          setIsVisible(true);
        }, 100);
      }, 500); // Wait for fade out
    };

    // Initial load
    updateItems();

    // Set up interval
    const interval = setInterval(updateItems, cycleDuration);
    return () => clearInterval(interval);
  }, [media, mediaByProject, cycleDuration]);

  const renderMediaItem = (item: MediaItem, index: number) => {
    const isVideo = /\.(mp4|webm|ogg)$/i.test(item.name);
    const src = `/content/${item.path}`;

    if (isVideo) {
      return (
        <video
          key={src}
          autoPlay
          muted
          loop
          playsInline
          className="max-w-full max-h-full object-contain"
          style={{
            opacity: isVisible ? 1 : 0,
            transition: `opacity 500ms ease-in-out ${index * 200}ms`
          }}
        >
          <source src={src} type="video/mp4" />
        </video>
      );
    }

    return (
      <Image
        key={src}
        src={src}
        alt={item.name}
        width={1920}
        height={1080}
        className="max-w-full max-h-full object-contain"
        priority
        style={{
          opacity: isVisible ? 1 : 0,
          transition: `opacity 500ms ease-in-out ${index * 200}ms`
        }}
      />
    );
  };

  if (!media?.length) {
    return (
      <div className={styles.modeContainer}>
        <div className="flex items-center justify-center h-full text-white text-2xl">
          No media available
        </div>
      </div>
    );
  }

  if (!currentItems.length) {
    return (
      <div className={styles.modeContainer}>
        <div className="flex items-center justify-center h-full text-white text-2xl">
          Loading...
        </div>
      </div>
    );
  }

  const isSingleItem = currentItems.length === 1;

  return (
    <div className={`${styles.modeContainer} flex`}>
      <div className='w-14 flex items-center justify-center'>
        <h2 
          className={`${basel.className} text-white text-xl font-medium whitespace-nowrap rotate-90`}
          style={{
            opacity: isVisible ? 1 : 0,
            transition: 'opacity 500ms ease-in-out'
          }}
        >
          {currentProject.replace(/_/g, ' ')}
        </h2>
      </div>
      <div className={`flex h-full flexgrow`}>
        {isSingleItem ? (
          <div className={`w-full h-full overflow-hidden flex ${Math.random() < 0.5 ? 'items-start' : 'items-end'} ${Math.random() < 0.5 ? 'justify-start' : 'justify-end'}`}>
            {renderMediaItem(currentItems[0], 0)}
          </div>
        ) : (
          <>
            <div className="w-1/2 h-full overflow-hidden flex items-start justify-start">
              {currentItems[0] && renderMediaItem(currentItems[0], 0)}
            </div>
            <div className="w-1/2 h-full overflow-hidden flex items-end justify-end">
              {currentItems[1] && renderMediaItem(currentItems[1], 1)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

