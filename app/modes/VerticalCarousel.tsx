'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import MediaDisplay from '@/components/MediaDisplay';
import { MediaItem } from '../types/media';
import styles from './VerticalCarousel.module.scss';
import modeStyles from './modes.module.scss';

interface VerticalCarouselProps {
  media: MediaItem[];
}

export default function VerticalCarousel({ media }: VerticalCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const extendedMedia = [...media, media[0]];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((i) => i + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, [media.length]);

  useEffect(() => {
    if (currentIndex === media.length) {
      setTimeout(() => {
        setCurrentIndex(0);
      }, 500); // allow time for scroll transition
    }
  }, [currentIndex, media.length]);

  return (
    <div className={`${modeStyles.modeContainer} ${styles.carouselWrapper}`} ref={containerRef}>
      <div
        className={styles.innerTrack}
        style={{
          transform: `translateY(-${(100 / extendedMedia.length) * currentIndex}%)`,
        }}
      >
        {extendedMedia.map((item, i) => (
          <div
            key={`${item.path}-${i}`}
            className={styles.poster}
          >
            <MediaDisplay
              item={item}
              className="object-cover w-screen h-screen"
              containerClassName="w-screen h-screen"
              fill
            />
          </div>
        ))}
      </div>
    </div>
  );
}