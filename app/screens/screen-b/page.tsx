'use client';

import { useEffect, useState } from 'react';
import ModeManager from '../../../src/features/display/components/ModeManager';

export type ModeSequenceItem = {
  mode: string;
  duration?: number;
  mediaPath?: string;
};

export default function ScreenB() {
  const [sequence, setSequence] = useState<ModeSequenceItem[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSequence = async () => {
      try {
        const res = await fetch('/api/sequences?screen=screen-b');
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