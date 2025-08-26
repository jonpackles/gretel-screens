import { MaintenanceConfig, MaintenanceLog } from './types';
import { CacheManager } from './cache-manager';

export class MaintenanceScheduler {
  private static timeoutId: NodeJS.Timeout | null = null;
  private static config: MaintenanceConfig = {
    maintenanceHour: 4, // 4 AM
    enableBrowserRefresh: true,
    refreshDelayMs: 3000, // 3 seconds delay before refresh
    clearBrowserCaches: true,
    clearServerCaches: true,
    enabled: true,
  };

  /**
   * Start the maintenance scheduler
   */
  static start(customConfig?: Partial<MaintenanceConfig>): void {
    // Update config if provided
    if (customConfig) {
      this.config = { ...this.config, ...customConfig };
    }

    if (!this.config.enabled) {
      console.log('🧹 Maintenance scheduler is disabled');
      return;
    }

    this.stop(); // Clear any existing timeout
    this.scheduleNext();
    
    console.log(`🕐 Maintenance scheduler started. Next maintenance at ${this.config.maintenanceHour}:00 AM`);
  }

  /**
   * Stop the maintenance scheduler
   */
  static stop(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
      console.log('🛑 Maintenance scheduler stopped');
    }
  }

  /**
   * Run maintenance immediately (manual trigger)
   */
  static async runMaintenance(): Promise<MaintenanceLog> {
    const startTime = Date.now();
    
    console.log('🧹 Starting manual maintenance...');
    
    try {
      const results = [];
      
      // Step 1: Clear server caches
      if (this.config.clearServerCaches) {
        console.log('🗂️ Clearing server caches...');
        const serverResult = await CacheManager.clearServerCaches();
        results.push(`Server: ${serverResult.success ? '✅' : '❌'} ${serverResult.details || serverResult.error}`);
      }

      // Step 2: Clear browser caches  
      if (this.config.clearBrowserCaches) {
        console.log('🌐 Clearing browser caches...');
        const browserResult = await CacheManager.clearBrowserCaches();
        results.push(`Browser: ${browserResult.success ? '✅' : '❌'} ${browserResult.details || browserResult.error}`);
      }

      // Step 3: Schedule browser refresh if enabled
      if (this.config.enableBrowserRefresh) {
        console.log(`🔄 Browser refresh scheduled in ${this.config.refreshDelayMs}ms...`);
        setTimeout(() => {
          console.log('🔄 Performing maintenance browser refresh...');
          window.location.reload();
        }, this.config.refreshDelayMs);
        results.push('🔄 Browser refresh scheduled');
      }

      const duration = Date.now() - startTime;
      const details = `Completed in ${duration}ms. ${results.join('; ')}`;
      
      console.log(`✅ Maintenance completed successfully: ${details}`);
      
      return {
        timestamp: new Date().toISOString(),
        type: 'manual',
        action: 'full-maintenance',
        success: true,
        details
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      const duration = Date.now() - startTime;
      
      console.error(`❌ Maintenance failed after ${duration}ms:`, errorMsg);
      
      return {
        timestamp: new Date().toISOString(),
        type: 'manual',
        action: 'full-maintenance',
        success: false,
        error: errorMsg
      };
    }
  }

  /**
   * Get current configuration
   */
  static getConfig(): MaintenanceConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  static updateConfig(newConfig: Partial<MaintenanceConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };
    
    console.log('⚙️ Maintenance config updated:', {
      old: oldConfig,
      new: this.config
    });

    // Restart scheduler if it was running and config changed
    if (this.timeoutId && (
      oldConfig.maintenanceHour !== this.config.maintenanceHour ||
      oldConfig.enabled !== this.config.enabled
    )) {
      this.start();
    }
  }

  /**
   * Get time until next maintenance
   */
  static getTimeUntilNext(): { hours: number; minutes: number; seconds: number } {
    const now = new Date();
    const nextMaintenance = new Date();
    
    nextMaintenance.setHours(this.config.maintenanceHour, 0, 0, 0);
    
    // If maintenance time has passed today, schedule for tomorrow
    if (nextMaintenance <= now) {
      nextMaintenance.setDate(nextMaintenance.getDate() + 1);
    }
    
    const diffMs = nextMaintenance.getTime() - now.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
    
    return { hours, minutes, seconds };
  }

  /**
   * Schedule the next maintenance run
   */
  private static scheduleNext(): void {
    const now = new Date();
    const nextMaintenance = new Date();
    
    nextMaintenance.setHours(this.config.maintenanceHour, 0, 0, 0);
    
    // If maintenance time has passed today, schedule for tomorrow
    if (nextMaintenance <= now) {
      nextMaintenance.setDate(nextMaintenance.getDate() + 1);
    }
    
    const msUntilMaintenance = nextMaintenance.getTime() - now.getTime();
    
    console.log(`⏰ Next maintenance scheduled for: ${nextMaintenance.toLocaleString()}`);
    console.log(`⏱️ Time until maintenance: ${Math.round(msUntilMaintenance / 1000 / 60)} minutes`);
    
    this.timeoutId = setTimeout(async () => {
      console.log('🕐 Scheduled maintenance time reached...');
      
      try {
        await this.runMaintenance();
      } catch (error) {
        console.error('❌ Scheduled maintenance failed:', error);
      }
      
      // Schedule the next maintenance for tomorrow
      this.scheduleNext();
    }, msUntilMaintenance);
  }
}
