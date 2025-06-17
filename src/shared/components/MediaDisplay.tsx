'use client';

import Image from 'next/image';
import { MediaItem } from '../types/media';

interface MediaDisplayProps {
  item: MediaItem;
  className?: string;
  containerClassName?: string;
  fill?: boolean;
}

export default function MediaDisplay({
  item,
  className = '',
  containerClassName = '',
  fill = false
}: MediaDisplayProps) {
  const isVideo = item.name.match(/\.(mp4)$/i);

  if (isVideo) {
    return (
      <video
        src={`/content/${item.path}`}
        className={className}
        autoPlay
        muted
        loop
        playsInline
      />
    );
  }

  return fill ? (
    <div className={`relative ${containerClassName}`}>
      <Image
        src={`/content/${item.path}`}
        alt={item.name}
        fill
        className={className}
      />
    </div>
  ) : (
    <Image
      src={`/content/${item.path}`}
      alt={item.name}
      width={item.dimensions?.width ?? 0}
      height={item.dimensions?.height ?? 0}
      className={className}
    />
  );
}