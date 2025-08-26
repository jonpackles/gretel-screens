import { CacheManager } from './cache-manager';
import { MaintenanceScheduler } from './scheduler';

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

export class SystemHealth {
  /**
   * Run all health checks and generate a report
   */
  static async generateReport(): Promise<SystemHealthReport> {
    const checks: HealthCheck[] = [];
    const timestamp = new Date().toISOString();

    // Check cache health
    checks.push(await this.checkCacheHealth());
    
    // Check memory usage
    checks.push(this.checkMemoryUsage());
    
    // Check maintenance scheduler
    checks.push(this.checkMaintenanceScheduler());
    
    // Check browser capabilities
    checks.push(this.checkBrowserCapabilities());
    
    // Check network connectivity
    checks.push(await this.checkNetworkConnectivity());

    // Calculate summary
    const summary = {
      healthy: checks.filter(c => c.status === 'healthy').length,
      warnings: checks.filter(c => c.status === 'warning').length,
      errors: checks.filter(c => c.status === 'error').length,
    };

    // Determine overall health
    let overall: SystemHealthReport['overall'] = 'healthy';
    if (summary.errors > 0) {
      overall = 'error';
    } else if (summary.warnings > 0) {
      overall = 'warning';
    }

    return {
      overall,
      checks,
      summary,
      timestamp
    };
  }

  /**
   * Check cache system health
   */
  private static async checkCacheHealth(): Promise<HealthCheck> {
    try {
      const stats = await CacheManager.getCacheStats();
      
      let status: HealthCheck['status'] = 'healthy';
      let message = 'Cache system operating normally';
      
      // Warning if too many cache entries (might indicate cleanup issues)
      if (stats.serverCache.metadataEntries > 10000) {
        status = 'warning';
        message = `High cache entry count (${stats.serverCache.metadataEntries})`;
      }
      
      // Warning if too many browser caches
      if (stats.browserCache.totalCaches > 20) {
        status = 'warning';
        message = `Many browser caches (${stats.browserCache.totalCaches})`;
      }

      return {
        name: 'Cache Health',
        status,
        message,
        details: stats,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        name: 'Cache Health',
        status: 'error',
        message: `Cache health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Check memory usage
   */
  private static checkMemoryUsage(): HealthCheck {
    try {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
        const totalMB = Math.round(memory.totalJSHeapSize / 1024 / 1024);
        const limitMB = Math.round(memory.jsHeapSizeLimit / 1024 / 1024);
        
        const usagePercent = (usedMB / limitMB) * 100;
        
        let status: HealthCheck['status'] = 'healthy';
        let message = `Memory usage: ${usedMB}MB / ${limitMB}MB (${usagePercent.toFixed(1)}%)`;
        
        if (usagePercent > 80) {
          status = 'error';
          message = `High memory usage: ${usagePercent.toFixed(1)}%`;
        } else if (usagePercent > 60) {
          status = 'warning';
          message = `Moderate memory usage: ${usagePercent.toFixed(1)}%`;
        }

        return {
          name: 'Memory Usage',
          status,
          message,
          details: { usedMB, totalMB, limitMB, usagePercent },
          timestamp: new Date().toISOString()
        };
      } else {
        return {
          name: 'Memory Usage',
          status: 'warning',
          message: 'Memory API not available',
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      return {
        name: 'Memory Usage',
        status: 'error',
        message: `Memory check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Check maintenance scheduler status
   */
  private static checkMaintenanceScheduler(): HealthCheck {
    try {
      const config = MaintenanceScheduler.getConfig();
      const timeUntilNext = MaintenanceScheduler.getTimeUntilNext();
      
      let status: HealthCheck['status'] = 'healthy';
      let message = `Maintenance scheduled in ${timeUntilNext.hours}h ${timeUntilNext.minutes}m`;
      
      if (!config.enabled) {
        status = 'warning';
        message = 'Maintenance scheduler is disabled';
      }

      return {
        name: 'Maintenance Scheduler',
        status,
        message,
        details: { config, timeUntilNext },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        name: 'Maintenance Scheduler',
        status: 'error',
        message: `Scheduler check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Check browser capabilities
   */
  private static checkBrowserCapabilities(): HealthCheck {
    const capabilities = {
      cacheAPI: 'caches' in window,
      serviceWorker: 'serviceWorker' in navigator,
      webAssembly: 'WebAssembly' in window,
      getUserMedia: navigator.mediaDevices && 'getUserMedia' in navigator.mediaDevices,
      localStorage: 'localStorage' in window,
      indexedDB: 'indexedDB' in window,
    };

    const missing = Object.entries(capabilities)
      .filter(([_, available]) => !available)
      .map(([name, _]) => name);

    let status: HealthCheck['status'] = 'healthy';
    let message = 'All required browser features available';

    if (missing.length > 0) {
      status = missing.length > 2 ? 'error' : 'warning';
      message = `Missing browser features: ${missing.join(', ')}`;
    }

    return {
      name: 'Browser Capabilities',
      status,
      message,
      details: capabilities,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Check network connectivity
   */
  private static async checkNetworkConnectivity(): Promise<HealthCheck> {
    try {
      const startTime = Date.now();
      const response = await fetch('/api/media/cache', { 
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      const responseTime = Date.now() - startTime;

      let status: HealthCheck['status'] = 'healthy';
      let message = `API responsive (${responseTime}ms)`;

      if (!response.ok) {
        status = 'error';
        message = `API error: ${response.status} ${response.statusText}`;
      } else if (responseTime > 2000) {
        status = 'warning';
        message = `Slow API response (${responseTime}ms)`;
      }

      return {
        name: 'Network Connectivity',
        status,
        message,
        details: { responseTime, status: response.status },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        name: 'Network Connectivity',
        status: 'error',
        message: `Network check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get a quick health summary (for dashboard display)
   */
  static async getQuickStatus(): Promise<{
    status: 'healthy' | 'warning' | 'error';
    message: string;
  }> {
    try {
      const report = await this.generateReport();
      return {
        status: report.overall,
        message: `${report.summary.healthy}/${report.checks.length} systems healthy`
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Health check failed'
      };
    }
  }
}
