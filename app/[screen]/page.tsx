'use client';

import { useEffect, useState, use } from 'react';
import { ModeManager, ModeSequenceItem } from '@/features/display';

interface ScreenPageProps {
  params: Promise<{
    screen: string;
  }>;
}

export default function ScreenPage({ params }: ScreenPageProps) {
  const resolvedParams = use(params);
  const [sequence, setSequence] = useState<ModeSequenceItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSequence = async () => {
      try {
        const res = await fetch(`/api/sequences?screen=${resolvedParams.screen}`);
        if (!res.ok) {
          throw new Error(`Failed to load sequence for ${resolvedParams.screen}`);
        }
        const data = await res.json();
        setSequence(data);
      } catch (err) {
        console.error('Error fetching sequence:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchSequence();
  }, [resolvedParams.screen]);

  if (loading) {
    return (
      <div className="flex items-center justify-center w-full h-screen bg-black text-white">
        <div className="text-2xl">Loading {resolvedParams.screen}...</div>
      </div>
    );
  }

  if (error || !sequence) {
    return (
      <div className="flex items-center justify-center w-full h-screen bg-black text-white">
        <div className="text-center">
          <div className="text-2xl mb-4">Failed to load {resolvedParams.screen}</div>
          <div className="text-sm text-gray-400">{error}</div>
        </div>
      </div>
    );
  }

  return <ModeManager sequence={sequence} />;
} 