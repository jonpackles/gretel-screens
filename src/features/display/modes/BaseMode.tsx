'use client';

import { ReactNode } from 'react';
import { MediaItem } from '@/shared/types/media';
import styles from './modes.module.scss';

interface BaseModeProps {
  children: ReactNode;
  className?: string;
  media?: MediaItem[];
  emptyMessage?: string;
}

export default function BaseMode({ children, className, media, emptyMessage = 'No media available' }: BaseModeProps) {
  if (media !== undefined && media.length === 0) {
    return (
      <div className={styles.modeContainer}>
        <div className="flex items-center justify-center w-full h-full text-white text-2xl">
          {emptyMessage}
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.modeContainer} ${className || ''}`}>
      {children}
    </div>
  );
}
