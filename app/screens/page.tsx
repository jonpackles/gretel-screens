'use client';

import { useEffect, useState } from 'react';

interface ModeSequenceItem {
  mode: string;
  duration?: number;
  mediaPath?: string;
}

export default function ScreensPage() {
  const [mounted, setMounted] = useState(false);
  const [screenASequence, setScreenASequence] = useState<ModeSequenceItem[]>([]);
  const [screenBSequence, setScreenBSequence] = useState<ModeSequenceItem[]>([]);
  const [screenAIndex, setScreenAIndex] = useState(0);
  const [screenBIndex, setScreenBIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actualScreenAMode, setActualScreenAMode] = useState<string>('');
  const [actualScreenBMode, setActualScreenBMode] = useState<string>('');

  useEffect(() => {
    const fetchSequences = async () => {
      try {
        // Fetch Screen A sequence
        const screenARes = await fetch('/api/sequences?screen=screen-a');
        const screenAData = screenARes.ok ? await screenARes.json() : [];
        setScreenASequence(screenAData);

        // Fetch Screen B sequence  
        const screenBRes = await fetch('/api/sequences?screen=screen-b');
        const screenBData = screenBRes.ok ? await screenBRes.json() : [];
        setScreenBSequence(screenBData);
      } catch (error) {
        console.error('Failed to load sequences:', error);
      } finally {
        setLoading(false);
        setMounted(true);
      }
    };

    fetchSequences();
  }, []);

  // Listen for mode updates from the iframes
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'MODE_CHANGED') {
        if (event.data.screen === 'screen-a') {
          setActualScreenAMode(event.data.mode);
          // Update our index to match
          const index = screenASequence.findIndex(item => item.mode === event.data.mode);
          if (index !== -1) setScreenAIndex(index);
        } else if (event.data.screen === 'screen-b') {
          setActualScreenBMode(event.data.mode);
          // Update our index to match
          const index = screenBSequence.findIndex(item => item.mode === event.data.mode);
          if (index !== -1) setScreenBIndex(index);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [screenASequence, screenBSequence]);

  const nextModeA = () => {
    if (screenASequence.length > 0) {
      setScreenAIndex((prev) => (prev + 1) % screenASequence.length);
      // Send message to Screen A iframe to advance mode
      const iframe = document.querySelector('iframe[title="Screen A"]') as HTMLIFrameElement;
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'NEXT_MODE' }, '*');
      }
    }
  };

  const prevModeA = () => {
    if (screenASequence.length > 0) {
      setScreenAIndex((prev) => (prev - 1 + screenASequence.length) % screenASequence.length);
      // Send message to Screen A iframe to go to previous mode
      const iframe = document.querySelector('iframe[title="Screen A"]') as HTMLIFrameElement;
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'PREV_MODE' }, '*');
      }
    }
  };

  const nextModeB = () => {
    if (screenBSequence.length > 0) {
      setScreenBIndex((prev) => (prev + 1) % screenBSequence.length);
      // Send message to Screen B iframe to advance mode
      const iframe = document.querySelector('iframe[title="Screen B"]') as HTMLIFrameElement;
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'NEXT_MODE' }, '*');
      }
    }
  };

  const prevModeB = () => {
    if (screenBSequence.length > 0) {
      setScreenBIndex((prev) => (prev - 1 + screenBSequence.length) % screenBSequence.length);
      // Send message to Screen B iframe to go to previous mode
      const iframe = document.querySelector('iframe[title="Screen B"]') as HTMLIFrameElement;
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'PREV_MODE' }, '*');
      }
    }
  };

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading screens...</div>
      </div>
    );
  }

  // Get current modes from sequences
  const currentScreenAMode = screenASequence[screenAIndex];
  const currentScreenBMode = screenBSequence[screenBIndex];

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-8">
      <div className="flex gap-12 items-end">
        {/* Screen A - Portrait */}
        <div className="relative">
          <div className="w-96 h-[600px] bg-gray-200 border-2 border-gray-300 overflow-hidden">
            <iframe
              src="/screen-a"
              className="border-0 origin-top-left"
              style={{
                width: '1080px',
                height: '1920px',
                transform: 'scale(0.354)'
              }}
              title="Screen A"
            />
          </div>
          <div className="text-white text-center mt-3">
            <div className="text-base mb-2">screen a</div>
            <div className="text-sm text-gray-300 mb-3">
              {actualScreenAMode || (currentScreenAMode ? currentScreenAMode.mode : 'No sequence')}
            </div>
            {screenASequence.length > 0 && (
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={prevModeA}
                  className="w-8 h-8 bg-gray-700 hover:bg-gray-600 text-white rounded-full flex items-center justify-center transition-colors"
                  title="Previous mode in sequence"
                >
                  ←
                </button>
                <span className="text-xs text-gray-400 min-w-[3rem]">
                  {screenAIndex + 1} / {screenASequence.length}
                </span>
                <button
                  onClick={nextModeA}
                  className="w-8 h-8 bg-gray-700 hover:bg-gray-600 text-white rounded-full flex items-center justify-center transition-colors"
                  title="Next mode in sequence"
                >
                  →
                </button>
              </div>
            )}
            {screenASequence.length === 0 && (
              <div className="text-xs text-gray-500">No sequence configured</div>
            )}
          </div>
        </div>

        {/* Screen B - Landscape */}
        <div className="relative">
          <div className="w-[600px] h-80 bg-gray-200 border-2 border-gray-300 overflow-hidden">
            <iframe
              src="/screen-b"
              className="border-0 origin-top-left"
              style={{
                width: '1920px',
                height: '1080px',
                transform: 'scale(0.3125)'
              }}
              title="Screen B"
            />
          </div>
          <div className="text-white text-center mt-3">
            <div className="text-base mb-2">screen b</div>
            <div className="text-sm text-gray-300 mb-3">
              {actualScreenBMode || (currentScreenBMode ? currentScreenBMode.mode : 'No sequence')}
            </div>
            {screenBSequence.length > 0 && (
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={prevModeB}
                  className="w-8 h-8 bg-gray-700 hover:bg-gray-600 text-white rounded-full flex items-center justify-center transition-colors"
                  title="Previous mode in sequence"
                >
                  ←
                </button>
                <span className="text-xs text-gray-400 min-w-[3rem]">
                  {screenBIndex + 1} / {screenBSequence.length}
                </span>
                <button
                  onClick={nextModeB}
                  className="w-8 h-8 bg-gray-700 hover:bg-gray-600 text-white rounded-full flex items-center justify-center transition-colors"
                  title="Next mode in sequence"
                >
                  →
                </button>
              </div>
            )}
            {screenBSequence.length === 0 && (
              <div className="text-xs text-gray-500">No sequence configured</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
