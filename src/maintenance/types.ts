export interface MaintenanceConfig {
  /** Hour (0-23) when daily maintenance should run */
  maintenanceHour: number;
  /** Whether to perform full browser refresh after cache clearing */
  enableBrowserRefresh: boolean;
  /** Delay in milliseconds before browser refresh */
  refreshDelayMs: number;
  /** Whether to clear browser caches (Service Workers, etc.) */
  clearBrowserCaches: boolean;
  /** Whether to clear server-side caches via API */
  clearServerCaches: boolean;
  /** Whether maintenance is enabled */
  enabled: boolean;
}

export interface MaintenanceLog {
  timestamp: string;
  type: 'scheduled' | 'manual' | 'error';
  action: string;
  success: boolean;
  details?: string;
  error?: string;
}

export interface CacheStats {
  serverCache: {
    metadataEntries: number;
    directoryEntries: number;
    totalSizeBytes: number;
  };
  browserCache: {
    cacheNames: string[];
    totalCaches: number;
  };
}

export interface HealthCheck {
  name: string;
  status: 'healthy' | 'warning' | 'error';
  message: string;
  details?: any;
  timestamp: string;
}

export interface SystemHealthReport {
  overall: 'healthy' | 'warning' | 'error';
  checks: HealthCheck[];
  summary: {
    healthy: number;
    warnings: number;
    errors: number;
  };
  timestamp: string;
}
