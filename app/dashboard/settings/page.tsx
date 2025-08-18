'use client';

import { useState, useEffect } from 'react';

interface GlobalSettings {
  hideOverlays: boolean;
  autoRotate: boolean;
  debugMode: boolean;
  highQuality: boolean;
  preloadNext: boolean;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<GlobalSettings>({
    hideOverlays: false,
    autoRotate: true,
    debugMode: false,
    highQuality: true,
    preloadNext: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
        setMessage('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Save settings
  const saveSettings = async (newSettings: Partial<GlobalSettings>) => {
    setSaving(true);
    try {
      const updatedSettings = { ...settings, ...newSettings };
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSettings),
      });

      if (res.ok) {
        setSettings(updatedSettings);
        setMessage('Settings saved successfully');
        
        // Broadcast settings update to all displays
        try {
          const channel = new BroadcastChannel('global-settings-updates');
          channel.postMessage({ type: 'settings-updated', settings: updatedSettings });
          channel.close();
        } catch (error) {
          console.error('Failed to broadcast settings update:', error);
        }
        
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Failed to save settings');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      setMessage('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: keyof GlobalSettings, value: boolean) => {
    saveSettings({ [key]: value });
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Global Settings</h1>
          {saving && (
            <div className="text-sm text-blue-600">Saving...</div>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Configure global settings that affect all screen displays
        </p>
      </div>

      {/* Settings Sections */}
      <div className="space-y-8">
        
        {/* Display Settings */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Display Settings</h2>
          <div className="space-y-4">
            
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Hide All Overlays</label>
                <p className="text-xs text-gray-500">Remove all text overlays and UI elements from Mosaic and PoseHouse modes</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={settings.hideOverlays}
                  onChange={(e) => updateSetting('hideOverlays', e.target.checked)}
                  disabled={saving}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Auto-Rotation</label>
                <p className="text-xs text-gray-500">Enable automatic mode switching based on configured sequences</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={settings.autoRotate}
                  onChange={(e) => updateSetting('autoRotate', e.target.checked)}
                  disabled={saving}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Debug Mode</label>
                <p className="text-xs text-gray-500">Show debug information and console logs in display modes</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={settings.debugMode}
                  onChange={(e) => updateSetting('debugMode', e.target.checked)}
                  disabled={saving}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

          </div>
        </div>

        {/* Performance Settings */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Performance Settings</h2>
          <div className="space-y-4">
            
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">High Quality Mode</label>
                <p className="text-xs text-gray-500">Use higher resolution media variants (may impact performance)</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={settings.highQuality}
                  onChange={(e) => updateSetting('highQuality', e.target.checked)}
                  disabled={saving}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Preload Next Mode</label>
                <p className="text-xs text-gray-500">Preload content for smoother transitions between modes</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={settings.preloadNext}
                  onChange={(e) => updateSetting('preloadNext', e.target.checked)}
                  disabled={saving}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

          </div>
        </div>

        {/* System Actions */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">System Actions</h2>
          <div className="space-y-4">
            
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Clear All Caches</label>
                <p className="text-xs text-gray-500">Clear media cache and force reload of all content</p>
              </div>
              <button 
                className="px-4 py-2 bg-orange-100 text-orange-800 hover:bg-orange-200 rounded text-sm font-medium"
                onClick={() => setMessage('Cache clearing not implemented yet')}
              >
                Clear Cache
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Restart All Screens</label>
                <p className="text-xs text-gray-500">Force restart all screen displays and reload sequences</p>
              </div>
              <button 
                className="px-4 py-2 bg-red-100 text-red-800 hover:bg-red-200 rounded text-sm font-medium"
                onClick={() => setMessage('Screen restart not implemented yet')}
              >
                Restart Screens
              </button>
            </div>

          </div>
        </div>

      </div>

      {/* Status Message */}
      {message && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-800 text-sm">{message}</p>
        </div>
      )}
    </div>
  );
}
