'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import MediaDisplay from '@/components/MediaDisplay';
import { MediaItem } from '../types/media';
import styles from './VerticalCarousel.module.scss';

interface VerticalCarouselProps {
  media: MediaItem[];
}

export default function VerticalCarousel({ media }: VerticalCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const extendedMedia = [...media, media[0]];

  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex((i) => i + 1);
      }, 400); // delay scroll for 400ms after scaling down
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

  useEffect(() => {
    if (currentIndex !== media.length) {
      const timeout = setTimeout(() => {
        setIsTransitioning(false);
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [currentIndex, media.length]);

  return (
    <div className={styles.carouselWrapper} ref={containerRef}>
      <div
        className={styles.innerTrack}
        style={{
          transform: `translateY(-${(100 / extendedMedia.length) * currentIndex}%)`,
          transition: isTransitioning ? 'transform 0.5s ease' : 'none'
        }}
      >
        {extendedMedia.map((item, i) => (
          <div
            key={`${item.path}-${i}`}
            className={`${styles.poster} ${
              i === currentIndex
                ? isTransitioning
                  ? styles.exiting
                  : styles.active
                : i === (currentIndex + 1) % extendedMedia.length && !isTransitioning
                  ? styles.entering
                  : styles.inactive
            }`}
          >
            <MediaDisplay
              item={item}
              className="object-contain max-h-[95vh] max-w-[95vw]"
              containerClassName="w-[85vw] aspect-[2/3] max-h-[95vh]"
              fill
            />
          </div>
        ))}
      </div>
    </div>
  );
}