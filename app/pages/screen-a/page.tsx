'use client';

import { useEffect, useState } from 'react';
import VerticalCarousel from '../../modes/VerticalCarousel';
import { MediaItem } from '../../types/media';

export default function ScreenA() {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMedia = async () => {
      try {
        const res = await fetch('/api/media?path=linked-content/posters&recursive=true');
        const data = await res.json();

        const files = (data.items?.filter((item: MediaItem) =>
          item.type === 'file' && /\.(jpg|jpeg|png|gif|webp|mp4)$/i.test(item.name)
        ) || [])
          .sort(() => Math.random() - 0.5);

        setMedia(files);
      } catch (err) {
        console.error('Error fetching media', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMedia();
  }, []);

  if (loading) return <div className="text-center p-10">Loading…</div>;
  if (!media.length) return <div className="text-center p-10">No media found.</div>;

  return <VerticalCarousel media={media} />;
}