'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { MediaItem } from '../types/media';

type Props = {
  media: MediaItem[];
};

const NUM_COLUMNS = 5;


export default function Marquee({ media }: Props) {
  const MAX_MEDIA_ITEMS = 60;
  const limitedMedia = media.slice(0, MAX_MEDIA_ITEMS);
  const wallRef = useRef<HTMLDivElement>(null);
  const scrollOffsets = useRef<number[]>(Array(NUM_COLUMNS).fill(0));
  const speeds = useRef<number[]>(
    Array(NUM_COLUMNS)
      .fill(0)
      .map(() => 0.2 + Math.random() * 0.3)
  );
  const horizontal = useRef<number>(0);

  useEffect(() => {
    let frame: number;
    const animate = () => {
      horizontal.current += 0.1;
      if (wallRef.current) {
        wallRef.current.style.transform = `translateX(-${horizontal.current}px)`;
      }

      scrollOffsets.current.forEach((offset, colIndex) => {
        const col = wallRef.current?.children[colIndex] as HTMLElement;
        if (col) {
          scrollOffsets.current[colIndex] += speeds.current[colIndex];
          col.style.transform = `translateY(-${scrollOffsets.current[colIndex]}px)`;
        }
      });

      frame = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(frame);
  }, []);

  // distribute media into columns
  const columns = Array.from({ length: NUM_COLUMNS }, () => [] as MediaItem[]);
limitedMedia.forEach((item, i) => {
  columns[i % NUM_COLUMNS].push(item);
});

  return (
    <div className="overflow-hidden w-full h-screen relative bg-black">
      <div
        ref={wallRef}
        className="absolute flex gap-6 h-full will-change-transform"
        style={{ padding: '0 0vw' }} // pre-offset to avoid empty space early
      >
        {columns.map((column, colIndex) => (
          <div
            key={colIndex}
            className="flex flex-col gap-4 will-change-transform"
            style={{ minWidth: '240px' }}
          >
            {/* Double the content for seamless loop */}
            {[...column, ...column].map((item, i) => (
              <div key={i} className="relative w-full aspect-[4/5] bg-gray-900 overflow-hidden">
                {item.name.endsWith('.mp4') ? (
                  <video
                    src={`/content/${item.path}`}
                    className="w-full h-full object-cover"
                    muted
                    loop
                    autoPlay
                    playsInline
                  />
                ) : (
                  <Image
                    unoptimized
                    src={`/content/${item.path}`}
                    alt={item.name}
                    fill
                    className="object-cover"
                    sizes="240px"
                  />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}