'use client';

import { useEffect, useState } from 'react';
import Mosaic from '../../modes/Mosaic';
import Paths from '../../modes/Paths';
import Glass from '../../modes/Glass';
import { MediaItem } from '../../types/media';

export default function Page() {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {

    
    const fetchMedia = async () => {
      try {
        const res = await fetch('/api/media?path=linked-content/projects&recursive=true');
        const data = await res.json();
        const videos = data.items?.filter((item: MediaItem) =>
          item.type === 'file' &&
          item.name.endsWith('.mp4') &&
          !item.name.startsWith('_hide_')
        ) || [];
        setMedia(videos);
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

  const randomVideos = Array.from({ length: 20}, () => media[Math.floor(Math.random() * media.length)]);

  // return <Mosaic media={randomVideos} maskSource={'pose'} />;
  return <Glass />;
 
}