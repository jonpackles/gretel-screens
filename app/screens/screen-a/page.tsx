'use client';

import { useEffect, useState } from 'react';
import VerticalCarousel from '../../modes/VerticalCarousel';
import { MediaItem } from '../../types/media';
import ModeManager, { ModeSequenceItem } from '../../modes/ModeManager';
import { fetchSequence } from '../../../lib/fetchSequence';


export default function ScreenA() {
  const [sequence, setSequence] = useState<ModeSequenceItem[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSequence = async () => {
      try {
        const res = await fetch('/api/sequences?screen=screen-a');
        const data = await res.json();
        setSequence(data);
      } catch (err) {
        console.error('Error fetching sequence', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSequence();
  }, []);

  if (loading) return <div className="text-center p-10">Loading…</div>;
  if (!sequence) return <div className="text-center p-10">Failed to load sequence.</div>;

  return <ModeManager sequence={sequence} />;
}