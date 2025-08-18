import { useState, useEffect } from 'react';

export interface GlobalSettings {
  hideOverlays: boolean;
  autoRotate: boolean;
  debugMode: boolean;
  highQuality: boolean;
  preloadNext: boolean;
}

const DEFAULT_SETTINGS: GlobalSettings = {
  hideOverlays: false,
  autoRotate: true,
  debugMode: false,
  highQuality: true,
  preloadNext: true,
};

export function useGlobalSettings() {
  const [settings, setSettings] = useState<GlobalSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
        }
      } catch (error) {
        console.error('Failed to load global settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Listen for settings updates via broadcast
  useEffect(() => {
    const handleBroadcast = (event: MessageEvent) => {
      if (event.data.type === 'settings-updated') {
        setSettings(event.data.settings);
        console.log('🔄 Global settings updated via broadcast:', event.data.settings);
      }
    };

    try {
      const channel = new BroadcastChannel('global-settings-updates');
      channel.addEventListener('message', handleBroadcast);
      
      return () => {
        channel.removeEventListener('message', handleBroadcast);
        channel.close();
      };
    } catch (error) {
      console.error('BroadcastChannel not supported:', error);
      return () => {};
    }
  }, []);

  return { settings, loading };
}
