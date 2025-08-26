'use client';

import { useEffect } from 'react';
import { MaintenanceScheduler } from './scheduler';
import { MaintenanceConfig } from './types';

interface MaintenanceProviderProps {
  children: React.ReactNode;
  config?: Partial<MaintenanceConfig>;
}

export function MaintenanceProvider({ 
  children, 
  config = {} 
}: MaintenanceProviderProps) {
  useEffect(() => {
    // Default configuration optimized for digital signage
    const defaultConfig: MaintenanceConfig = {
      maintenanceHour: 4,        // 4 AM - safe time for digital signage
      enableBrowserRefresh: true, // Full refresh to reset everything
      refreshDelayMs: 3000,      // 3 second delay to complete cache operations
      clearBrowserCaches: true,  // Clear browser-side caches
      clearServerCaches: true,   // Clear server-side caches
      enabled: true,             // Enable by default
    };

    const finalConfig = { ...defaultConfig, ...config };

    console.log('🧹 Starting maintenance system with config:', finalConfig);
    
    // Start the maintenance scheduler
    MaintenanceScheduler.start(finalConfig);

    // Cleanup on unmount
    return () => {
      MaintenanceScheduler.stop();
    };
  }, [config]);

  return <>{children}</>;
}
