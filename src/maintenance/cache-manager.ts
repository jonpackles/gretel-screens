import { CacheStats, MaintenanceLog } from './types';

export class CacheManager {
  private static logs: MaintenanceLog[] = [];

  /**
   * Clear all server-side caches via API
   */
  static async clearServerCaches(): Promise<{ success: boolean; details?: string; error?: string }> {
    try {
      const response = await fetch('/api/media/cache', { 
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Cache clear API failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      this.log('scheduled', 'clear-server-cache', true, 
        `Cleared ${result.before?.entries || 0} cache entries`);
      
      return { 
        success: true, 
        details: `Server caches cleared successfully. Removed ${result.before?.entries || 0} entries.`
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.log('scheduled', 'clear-server-cache', false, undefined, errorMsg);
      
      return { 
        success: false, 
        error: `Failed to clear server caches: ${errorMsg}`
      };
    }
  }

  /**
   * Clear browser caches (Service Workers, Cache API, etc.)
   */
  static async clearBrowserCaches(): Promise<{ success: boolean; details?: string; error?: string }> {
    try {
      let clearedCaches = 0;
      
      // Clear Cache API caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        const deletePromises = cacheNames.map(name => caches.delete(name));
        await Promise.all(deletePromises);
        clearedCaches = cacheNames.length;
      }

      // Clear localStorage/sessionStorage (be selective)
      const keysToRemove = Object.keys(localStorage).filter(key => 
        key.startsWith('media-') || 
        key.startsWith('cache-') ||
        key.startsWith('metadata-')
      );
      keysToRemove.forEach(key => localStorage.removeItem(key));

      this.log('scheduled', 'clear-browser-cache', true, 
        `Cleared ${clearedCaches} browser caches and ${keysToRemove.length} localStorage entries`);

      return { 
        success: true, 
        details: `Browser caches cleared. Removed ${clearedCaches} caches and ${keysToRemove.length} localStorage entries.`
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.log('scheduled', 'clear-browser-cache', false, undefined, errorMsg);
      
      return { 
        success: false, 
        error: `Failed to clear browser caches: ${errorMsg}`
      };
    }
  }

  /**
   * Get cache statistics
   */
  static async getCacheStats(): Promise<CacheStats> {
    const stats: CacheStats = {
      serverCache: {
        metadataEntries: 0,
        directoryEntries: 0,
        totalSizeBytes: 0,
      },
      browserCache: {
        cacheNames: [],
        totalCaches: 0,
      }
    };

    try {
      // Get server cache stats
      const response = await fetch('/api/media/cache');
      if (response.ok) {
        const serverStats = await response.json();
        stats.serverCache = {
          metadataEntries: serverStats.cache?.entries || 0,
          directoryEntries: 0, // API doesn't expose this yet
          totalSizeBytes: serverStats.cache?.totalSize || 0,
        };
      }
    } catch (error) {
      console.warn('Failed to get server cache stats:', error);
    }

    try {
      // Get browser cache stats
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        stats.browserCache = {
          cacheNames,
          totalCaches: cacheNames.length,
        };
      }
    } catch (error) {
      console.warn('Failed to get browser cache stats:', error);
    }

    return stats;
  }

  /**
   * Manual cache clear (for testing/debugging)
   */
  static async clearAllCaches(): Promise<{ 
    serverResult: Awaited<ReturnType<typeof CacheManager.clearServerCaches>>;
    browserResult: Awaited<ReturnType<typeof CacheManager.clearBrowserCaches>>;
  }> {
    const [serverResult, browserResult] = await Promise.all([
      this.clearServerCaches(),
      this.clearBrowserCaches()
    ]);

    return { serverResult, browserResult };
  }

  /**
   * Get maintenance logs
   */
  static getLogs(): MaintenanceLog[] {
    return [...this.logs].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  /**
   * Clear maintenance logs
   */
  static clearLogs(): void {
    this.logs = [];
  }

  /**
   * Internal logging
   */
  private static log(
    type: MaintenanceLog['type'], 
    action: string, 
    success: boolean, 
    details?: string, 
    error?: string
  ): void {
    const log: MaintenanceLog = {
      timestamp: new Date().toISOString(),
      type,
      action,
      success,
      details,
      error
    };
    
    this.logs.push(log);
    
    // Keep only last 50 logs to prevent memory buildup
    if (this.logs.length > 50) {
      this.logs = this.logs.slice(-50);
    }

    // Console logging for debugging
    if (success) {
      console.log(`🧹 Maintenance: ${action} completed successfully`, details || '');
    } else {
      console.error(`❌ Maintenance: ${action} failed`, error || '');
    }
  }
}
