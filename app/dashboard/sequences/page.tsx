'use client';

import { useState, useEffect } from 'react';
import { ModeSequenceItem } from '@/features/display';
import { AVAILABLE_MODES, AVAILABLE_SCREENS, MEDIA_PATHS } from '@/shared/constants/modes';

export default function SequenceEditor() {
  const [selectedScreen, setSelectedScreen] = useState<string>(AVAILABLE_SCREENS[0]);
  const [sequence, setSequence] = useState<ModeSequenceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Load sequence for selected screen
  useEffect(() => {
    const loadSequence = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/sequences?screen=${selectedScreen}`);
        if (res.ok) {
          const data = await res.json();
          setSequence(data || []);
        } else {
          setSequence([]);
        }
      } catch (error) {
        console.error('Failed to load sequence:', error);
        setSequence([]);
      } finally {
        setLoading(false);
      }
    };

    loadSequence();
  }, [selectedScreen]);

  const addMode = () => {
    setSequence([
      ...sequence,
      {
        mode: AVAILABLE_MODES[0],
        duration: 600000, // 10 minutes in milliseconds
        mediaPath: undefined
      }
    ]);
  };

  const removeMode = (index: number) => {
    setSequence(sequence.filter((_, i) => i !== index));
  };

  const updateMode = (index: number, field: keyof ModeSequenceItem, value: string | number | undefined) => {
    const updated = [...sequence];
    if (field === 'duration') {
      // Convert minutes to milliseconds for storage
      updated[index] = { ...updated[index], [field]: value ? Number(value) * 60000 : undefined };
    } else {
      updated[index] = { ...updated[index], [field]: value || undefined };
    }
    setSequence(updated);
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...sequence];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    setSequence(updated);
  };

  const moveDown = (index: number) => {
    if (index === sequence.length - 1) return;
    const updated = [...sequence];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    setSequence(updated);
  };

  const saveSequence = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/sequences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          screen: selectedScreen,
          sequence: sequence
        })
      });

      if (res.ok) {
        setMessage('Sequence saved successfully!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Failed to save sequence');
      }
    } catch (error) {
      console.error('Save error:', error);
      setMessage('Failed to save sequence');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex bg-white">
      {/* Sidebar */}
      <div className="w-[240px] border-r border-gray-200 p-6 space-y-2 overflow-y-auto h-screen">
        <h2 className="text-sm text-gray-500 uppercase tracking-wide mb-4">Screens</h2>
        {AVAILABLE_SCREENS.map((screen: string) => (
          <div
            key={screen}
            onClick={() => setSelectedScreen(screen)}
            className={`block w-full text-left text-sm px-2 py-1 rounded overflow-hidden cursor-pointer ${
              selectedScreen === screen
                ? 'bg-black text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            {screen.charAt(0).toUpperCase() + screen.slice(1)}
          </div>
        ))}
      </div>

      {/* Main content */}
      <div className="flex-1 p-10">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading sequence...</div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-semibold">
                {selectedScreen.charAt(0).toUpperCase() + selectedScreen.slice(1)} Sequence
              </h1>
              <div className="space-x-2">
                <button
                  onClick={addMode}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded shadow"
                >
                  Add Mode
                </button>
                <button
                  onClick={saveSequence}
                  disabled={saving || sequence.length === 0}
                  className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded shadow disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save Sequence'}
                </button>
              </div>
            </div>

            {/* Success/Error Message */}
            {message && (
              <div className={`mb-4 px-4 py-2 rounded ${
                message.includes('success') ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'
              }`}>
                {message}
              </div>
            )}

            {/* Sequence Items */}
            <div className="space-y-4 mb-8">
              {sequence.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-6 bg-white shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Mode {index + 1}</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => moveUp(index)}
                        disabled={index === 0}
                        className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => moveDown(index)}
                        disabled={index === sequence.length - 1}
                        className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => removeMode(index)}
                        className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Mode Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Mode:</label>
                      <select
                        value={item.mode}
                        onChange={(e) => updateMode(index, 'mode', e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {AVAILABLE_MODES.map((mode: string) => (
                          <option key={mode} value={mode}>{mode}</option>
                        ))}
                      </select>
                    </div>

                    {/* Duration */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Duration (minutes):</label>
                      <input
                        type="number"
                        step="0.1"
                        value={item.duration ? (item.duration / 60000).toString() : ''}
                        onChange={(e) => updateMode(index, 'duration', e.target.value)}
                        placeholder="e.g. 10"
                        className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    {/* Media Path */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Media Path (optional):</label>
                      <select
                        value={item.mediaPath || ''}
                        onChange={(e) => updateMode(index, 'mediaPath', e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">-- Select media path --</option>
                        {MEDIA_PATHS.map((path: string) => (
                          <option key={path} value={path}>{path}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}

              {sequence.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-lg mb-2">No modes in sequence</div>
                  <div className="text-sm">Click "Add Mode" to get started.</div>
                </div>
              )}
            </div>

            {/* Sequence Preview */}
            {sequence.length > 0 && (
              <div className="mt-8 border border-gray-200 rounded-lg p-6 bg-gray-50">
                <h3 className="text-lg font-medium text-gray-900 mb-4">JSON Preview:</h3>
                <pre className="text-sm overflow-x-auto bg-white p-4 rounded border border-gray-200 text-gray-800">
                  {JSON.stringify(sequence, null, 2)}
                </pre>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
} 