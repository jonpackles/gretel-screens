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
      setCurrentItems(shuffled.slice(0, count));
    };

    pickRandom();
    const interval = setInterval(pickRandom, 8000); // every 8s
    return () => clearInterval(interval);
  }, [media]);

  // Log current items whenever they change
  useEffect(() => {
    if (currentItems.length > 0) {
      console.log('Currently showing media items:', currentItems);
    }
  }, [currentItems]);

  return (
    <div className={`flex items-center justify-center w-full h-screen gap-8 px-8`}>
      {currentItems.map(item =>
        item.name.match(/\.(mp4)$/i) ? (
          <video
            key={item.path}
            src={`/content/${item.path}`}
            className="max-h-[80vh] max-w-[50vw] object-contain"
            autoPlay
            muted
            loop
            playsInline
          />
        ) : (
          <div key={item.path} className="relative max-h-[80vh] max-w-[65vw] aspect-auto">
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
              fill
              className="object-contain"
              sizes="(max-width: 768px) 80vw, 40vw"
            />
          </div>
        )
      )}
    </div>
  );
}