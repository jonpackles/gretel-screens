'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { MediaItem } from '../types/media';
import styles from './modes.module.scss';

type SlideshowProps = {
  media: MediaItem[];
};

export default function Slideshow({ media }: SlideshowProps) {
  const [currentItems, setCurrentItems] = useState<MediaItem[]>([]);
  const [cycleDuration] = useState(4000); // 4 seconds
  
  useEffect(() => {
    if (!media?.length) return;

    const updateItems = () => {
      // Get 1-2 random items
      const shuffled = [...media].sort(() => Math.random() - 0.5);
      const itemCount = Math.random() > 0.7 ? 1 : 2; // 30% chance of single item
      setCurrentItems(shuffled.slice(0, itemCount));
    };

    // Initial load
    updateItems();

    // Set up interval
    const interval = setInterval(updateItems, cycleDuration);
    return () => clearInterval(interval);
  }, [media, cycleDuration]);

  const renderMediaItem = (item: MediaItem, verticalAlign: 'top' | 'bottom', horizontalAlign: 'left' | 'right') => {
    const isVideo = /\.(mp4|webm|ogg)$/i.test(item.name);
    const src = `/content/${item.path}`;

    // Determine alignment classes
    const alignmentClasses = {
      vertical: verticalAlign === 'top' ? 'items-start' : 'items-end',
      horizontal: horizontalAlign === 'left' ? 'justify-start' : 'justify-end'
    };

    if (isVideo) {
      return (
        <div className={`w-full h-full flex ${alignmentClasses.vertical} ${alignmentClasses.horizontal}`}>
          <video
            key={src}
            className="max-w-full max-h-full object-contain"
            autoPlay
            muted
            loop
            playsInline
          >
            <source src={src} type="video/mp4" />
          </video>
        </div>
      );
    }

    return (
      <div className={`w-full h-full flex ${alignmentClasses.vertical} ${alignmentClasses.horizontal}`}>
        <Image
          key={src}
          src={src}
          alt={item.name}
          width={1920}
          height={1080}
          className="max-w-full max-h-full object-contain"
          priority
          style={{
            width: 'auto',
            height: 'auto',
          }}
        />
      </div>
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
      {isSingleItem ? (
        // Single item takes full width and height
        <div className="w-full h-full overflow-hidden flex items-center justify-start">
          {renderMediaItem(currentItems[0], Math.random() < 0.5 ? 'top' : 'bottom', Math.random() < 0.5 ? 'left' : 'right')}
        </div>
      ) : (
        <>
          {/* Left Container - 50% width, full height */}
          <div className="w-1/2 h-full overflow-hidden justify-start">
            {currentItems[0] && renderMediaItem(currentItems[0], 'top', 'left')}
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