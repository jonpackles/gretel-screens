import Image from 'next/image';
import LazyVideo from '@/shared/components/LazyVideo';
import { FileItem } from '../../types';

interface MediaItemProps {
  item: FileItem;
  index: number;
  pendingVisibilityChange?: 'visible' | 'hidden';
  isFocused: boolean;
  onFocus: () => void;
}

export function MediaItem({ item, index, pendingVisibilityChange, isFocused, onFocus }: MediaItemProps) {
  const effectiveVisibility = pendingVisibilityChange ?? item.visibility ?? 'visible';
  const isHidden = effectiveVisibility === 'hidden';
  const isStaged = !!pendingVisibilityChange;

  return (
    <div
      tabIndex={0}
      onFocus={onFocus}
      className={`relative aspect-square overflow-hidden bg-gray-100 transition-all outline-none focus:ring-2 focus:ring-yellow-400 rounded ${
        isHidden ? 'opacity-50 grayscale' : ''
      } ${isStaged ? 'ring-2 ring-yellow-500' : ''} ${isFocused ? 'outline outline-blue-500' : ''}`}
    >
      {/\.mp4$/i.test(item.name) ? (
        <LazyVideo
          src={`/content/${item.path}`}
          className="w-full h-full object-cover"
        />
      ) : (
        <Image
          unoptimized
          src={`/content/${item.path}`}
          alt={item.name}
          fill
          loading="lazy"
          className="object-cover"
          sizes="(max-width: 768px) 25vw, (max-width: 1024px) 20vw, 15vw"
        />
      )}

      {isStaged && (
        <div className="absolute bottom-1 right-1 bg-yellow-400 text-black text-xs px-2 py-0.5 rounded">
          Pending
        </div>
      )}

      <div className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1 py-0.5 rounded text-center">
        {item.name.replace(/\.[^/.]+$/, '').substring(0, 20)}
      </div>
    </div>
  );
} 