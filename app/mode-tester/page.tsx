'use client';

import { useState, useEffect } from 'react';
import { ModeManager, ModeSequenceItem } from '@/features/display';
import { AVAILABLE_MODES, MEDIA_PATHS, DEFAULT_MODE_DURATIONS } from '@/shared/constants/modes';

export default function ModeTester() {
  const [selectedMode, setSelectedMode] = useState<string>(AVAILABLE_MODES[0]);
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [showControls, setShowControls] = useState(false);
  const [isLaunched, setIsLaunched] = useState(false);
  const [showNewModeInfo, setShowNewModeInfo] = useState(false);

  // Get default duration for selected mode
  const defaultDuration = DEFAULT_MODE_DURATIONS[selectedMode as keyof typeof DEFAULT_MODE_DURATIONS] || 30000;

  // Create a single-item sequence for the selected mode
  const testSequence: ModeSequenceItem[] = [
    {
      mode: selectedMode,
      duration: defaultDuration,
      mediaPath: selectedPath || undefined,
    }
  ];

  // Handle escape key to toggle controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowControls(!showControls);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showControls]);

  const launchMode = () => {
    setIsLaunched(true);
  };

  const resetMode = () => {
    setIsLaunched(false);
  };

  return (
    <div className="w-full h-screen bg-black relative">
      {/* Full Screen Mode Display */}
      {isLaunched ? (
        <div className="w-full h-full">
          <ModeManager 
            sequence={testSequence} 
            autoRotate={false}
            showControls={false}
          />
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-white text-center">
            <h1 className="text-4xl font-bold mb-4">Mode Tester</h1>
            <p className="text-xl mb-8">Configure your mode and click "Launch Mode" to test</p>
            <div className="bg-white/10 p-6 rounded-lg backdrop-blur-sm">
              <div className="text-left space-y-4">
                <div>
                  <label className="block text-white text-sm mb-2">Selected Mode:</label>
                  <div className="text-white font-medium">{selectedMode}</div>
                </div>
                <div>
                  <label className="block text-white text-sm mb-2">Content Source:</label>
                  <div className="text-white font-medium">{selectedPath || 'None'}</div>
                </div>
                <div>
                  <label className="block text-white text-sm mb-2">Duration:</label>
                  <div className="text-white font-medium">{defaultDuration / 1000}s</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Control Panel - Top Right */}
      <div className="fixed top-4 right-4 z-40 bg-black/60 text-white p-4 rounded-lg space-y-3">
        {/* Mode Selection */}
        <div>
          <label className="block text-xs text-gray-300 mb-1">Mode:</label>
          <select
            value={selectedMode}
            onChange={(e) => setSelectedMode(e.target.value)}
            className="bg-transparent text-white border border-white/30 rounded px-2 py-1 text-sm w-full"
          >
            {AVAILABLE_MODES.map((mode) => (
              <option key={mode} value={mode} className="bg-black text-white">
                {mode}
              </option>
            ))}
          </select>
        </div>

        {/* Content Source Selection */}
        <div>
          <label className="block text-xs text-gray-300 mb-1">Content Source:</label>
          <select
            value={selectedPath}
            onChange={(e) => setSelectedPath(e.target.value)}
            className="bg-transparent text-white border border-white/30 rounded px-2 py-1 text-sm w-full"
          >
            <option value="" className="bg-black text-white">-- No content --</option>
            {MEDIA_PATHS.map((path) => (
              <option key={path} value={path} className="bg-black text-white">
                {path}
              </option>
            ))}
          </select>
        </div>

        {/* Launch/Reset Button */}
        <div>
          {isLaunched ? (
            <button
              onClick={resetMode}
              className="w-full bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
            >
              Exit Mode
            </button>
          ) : (
            <button
              onClick={launchMode}
              className="w-full bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
            >
              Launch Mode
            </button>
          )}
        </div>
      </div>

      {/* Floating Control Button */}
      <button
        onClick={() => setShowControls(!showControls)}
        className="fixed top-4 left-4 z-40 bg-black/60 hover:bg-black/80 text-white px-4 py-2 rounded-lg font-medium transition-colors"
      >
        {showControls ? 'Hide Controls' : 'Show Controls'}
      </button>

      {/* Mode Info Display */}
      {isLaunched && (
        <div className="fixed bottom-4 left-4 z-40 bg-black/60 text-white px-4 py-2 rounded-lg">
          <div className="text-sm">
            <div><strong>Mode:</strong> {selectedMode}</div>
            <div><strong>Duration:</strong> {defaultDuration / 1000}s</div>
            <div><strong>Content:</strong> {selectedPath || 'None'}</div>
          </div>
        </div>
      )}

      {/* Create New Mode Button */}
      {!isLaunched && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40">
          <button
            onClick={() => setShowNewModeInfo(true)}
            className="text-gray-500 hover:text-white text-sm underline underline-offset-4 transition-colors"
          >
            Want to create a new mode?
          </button>
        </div>
      )}

      {/* New Mode Info Modal */}
      {showNewModeInfo && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Creating a New Mode</h2>
                <button
                  onClick={() => setShowNewModeInfo(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  &times;
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5 text-sm text-gray-700">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">1. Clone the repo</h3>
                <code className="block bg-gray-100 rounded px-3 py-2 text-xs">
                  git clone https://github.com/jonpackles/gretel-screens.git
                </code>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-1">2. Create your component</h3>
                <p>
                  Add a new file in <code className="bg-gray-100 px-1 rounded">src/features/display/modes/</code>.
                  See <code className="bg-gray-100 px-1 rounded">_ModeTemplate.tsx</code> in that folder for
                  a ready-to-copy template with both media-driven and data-driven patterns.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-1">3. Register it</h3>
                <p className="mb-2">
                  Add one line to <code className="bg-gray-100 px-1 rounded">src/features/display/modes/registry.ts</code>:
                </p>
                <code className="block bg-gray-100 rounded px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap">{`{ name: 'My Mode', component: MyMode, duration: 30000, mediaPath: 'linked-content/projects', variantSize: 'md' }`}</code>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-1">4. Test &amp; deploy</h3>
                <p>
                  Run <code className="bg-gray-100 px-1 rounded">npm run dev</code> locally,
                  then use this Mode Tester page to preview your new mode.
                  When ready, push to <code className="bg-gray-100 px-1 rounded">main</code> to deploy.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-blue-800 text-xs">
                <strong>Tip:</strong> Media items can be images or videos. Make sure your mode
                renders <code>&lt;video&gt;</code> for .mp4/.webm files and <code>&lt;img&gt;</code> for
                everything else. The template file has a helper for this.
              </div>
            </div>

            <div className="p-6 border-t border-gray-200">
              <button
                onClick={() => setShowNewModeInfo(false)}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overlay Controls Panel */}
      {showControls && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Advanced Settings</h2>
                <button
                  onClick={() => setShowControls(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Controls Content */}
            <div className="p-6 space-y-6">
              {/* Mode Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Mode:
                </label>
                <select
                  value={selectedMode}
                  onChange={(e) => setSelectedMode(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {AVAILABLE_MODES.map((mode) => (
                    <option key={mode} value={mode}>{mode}</option>
                  ))}
                </select>
              </div>

              {/* Content Source */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content Source:
                </label>
                <select
                  value={selectedPath}
                  onChange={(e) => setSelectedPath(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">-- No content --</option>
                  {MEDIA_PATHS.map((path) => (
                    <option key={path} value={path}>{path}</option>
                  ))}
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setSelectedMode(AVAILABLE_MODES[0]);
                    setSelectedPath('');
                  }}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
                >
                  Reset
                </button>
                
                <button
                  onClick={() => setShowControls(false)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Mode Information */}
            <div className="p-6 bg-gray-50 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Current Configuration</h3>
              <div className="grid grid-cols-1 gap-2 text-sm text-gray-600">
                <div>
                  <strong>Mode:</strong> {selectedMode}
                </div>
                <div>
                  <strong>Default Duration:</strong> {defaultDuration / 1000}s
                </div>
                <div>
                  <strong>Content Source:</strong> {selectedPath || 'None'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 