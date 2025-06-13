'use client';

import React from 'react';
import Image from 'next/image';
import LazyVideo from './LazyVideo';
import { MediaItem } from '../types/media';

interface MediaDisplayProps {
  item: MediaItem;
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
  priority?: boolean;
  lazyVideo?: boolean;
}

export default function MediaDisplay({
  item,
  width = 400,
  height = 400,
  className = '',
  style = {},
  priority = false,
  lazyVideo = true,
}: MediaDisplayProps) {
  const isVideo = /\.(mp4|webm|ogg)$/i.test(item.name);
  const src = `/content/${item.path}`;

  if (isVideo) {
    if (lazyVideo) {
      return (
        <div style={{ ...style, width, height }}>
          <LazyVideo
            src={src}
            className={className}
          />
        </div>
      );
    } else {
      return (
        <video
          src={src}
          className={className}
          style={{ ...style, width, height }}
          autoPlay
          loop
          muted
          playsInline
        />
      );
    }
  }

  return (
    <Image
      src={src}
      alt={item.name}
      width={width}
      height={height}
      className={className}
      style={style}
      priority={priority}
      unoptimized
    />
  );
}