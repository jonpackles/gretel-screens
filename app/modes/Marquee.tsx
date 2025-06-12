'use client';

import { useEffect, useState } from 'react';
import { MediaItem } from '../types/media';
import styles from './modes.module.scss';

type MarqueeProps = {
  media: MediaItem[];
};

export default function Marquee({ media }: MarqueeProps) {
  const [currentMedia, setCurrentMedia] = useState<MediaItem[]>([]);

  useEffect(() => {
    if (media.length > 0) {
      // Randomize and take up to 6 items
      const shuffled = [...media].sort(() => Math.random() - 0.5);
      setCurrentMedia(shuffled.slice(0, 6));
    }
  }, [media]);

  const renderMediaItem = (item: MediaItem, index: number) => {
    const isVideo = /\.(mp4|webm|ogg)$/i.test(item.name);
    const src = `/content/${item.path}`;

    const commonClasses = "object-cover h-full";

    if (isVideo) {
      return (
        <video
          key={`${item.path}-${index}`}
          className={commonClasses}
          autoPlay
          muted
          loop
          playsInline
        >
          <source src={src} type="video/mp4" />
        </video>
      );
    }

    return (
      <img
        key={`${item.path}-${index}`}
        src={src}
        alt={item.name}
        className={commonClasses}
      />
    );
  };

  if (!currentMedia.length) {
    return (
      <div className={`${styles.modeContainer} flex items-center justify-center`}>
        <div className="text-white text-2xl">Loading media...</div>
      </div>
    );
  }

  return (
    <div className={`${styles.modeContainer} bg-black`}>
      {/* Scrolling marquee */}
      <div className="flex animate-scroll h-full">
        {/* Duplicate items for seamless loop */}
        {[...currentMedia, ...currentMedia, ...currentMedia].map((item, index) => (
          <div 
            key={index}
            className="flex-shrink-0 h-full"
            style={{ 
              width: 'auto',
              aspectRatio: '16/9',
              minWidth: '300px'
            }}
          >
            {renderMediaItem(item, index)}
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-33.333%);
          }
        }
        
        .animate-scroll {
          animation: scroll 30s linear infinite;
        }
      `}</style>
    </div>
  );
}