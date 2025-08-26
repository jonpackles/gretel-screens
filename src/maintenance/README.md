# Maintenance System

A comprehensive maintenance and stability system for the digital signage application. This system provides automated cache clearing, health monitoring, and scheduled maintenance to prevent the cache-related issues that cause media display problems.

## Problem Solved

This system addresses the specific issue where:
- MediaPipe metadata cache expires after 96 hours
- Stale cache causes Paths mode to not display media
- Manual browser refresh was required to fix the issue

## Features

### 🕐 Automated Scheduling
- Configurable daily maintenance time (default: 4 AM)
- Automatic cache clearing and browser refresh
- Resilient scheduling that survives browser restarts

### 🧹 Cache Management
- Clear server-side metadata and directory caches
- Clear browser caches (Cache API, localStorage)
- Granular control over what gets cleared
- Cache statistics and monitoring

### 🏥 Health Monitoring
- Memory usage tracking
- Cache system health checks
- Browser capability verification
- Network connectivity tests
- Comprehensive health reports

### 📊 Logging & Diagnostics
- Maintenance activity logs
- Success/failure tracking
- Performance metrics
- Debug information

## Quick Start

### Basic Integration

Add to your main app component:

\`\`\`typescript
import { MaintenanceScheduler } from '@/maintenance';
import { useEffect } from 'react';

export default function App() {
  useEffect(() => {
    // Start the maintenance scheduler
    MaintenanceScheduler.start({
      maintenanceHour: 4,        // 4 AM
      enableBrowserRefresh: true,
      clearServerCaches: true,
      clearBrowserCaches: true,
    });

    return () => {
      MaintenanceScheduler.stop();
    };
  }, []);

  // ... rest of your app
}
\`\`\`

### Manual Maintenance

For testing or emergency cache clearing:

\`\`\`typescript
import { MaintenanceScheduler, CacheManager } from '@/maintenance';

// Run full maintenance immediately
await MaintenanceScheduler.runMaintenance();

// Or just clear caches without browser refresh
await CacheManager.clearAllCaches();
\`\`\`

### Health Monitoring

Check system health:

\`\`\`typescript
import { SystemHealth } from '@/maintenance';

// Get full health report
const report = await SystemHealth.generateReport();
console.log('System health:', report.overall);

// Get quick status for dashboard
const status = await SystemHealth.getQuickStatus();
\`\`\`

## Configuration Options

\`\`\`typescript
interface MaintenanceConfig {
  maintenanceHour: number;       // Hour (0-23) for daily maintenance
  enableBrowserRefresh: boolean; // Whether to refresh browser
  refreshDelayMs: number;        // Delay before refresh (ms)
  clearBrowserCaches: boolean;   // Clear browser caches
  clearServerCaches: boolean;    // Clear server caches
  enabled: boolean;              // Enable/disable maintenance
}
\`\`\`

## API Integration

The system uses your existing cache clearing API:
- \`DELETE /api/media/cache\` - Clear server caches
- \`GET /api/media/cache\` - Get cache statistics

## Files

- \`scheduler.ts\` - Main scheduling logic and maintenance orchestration
- \`cache-manager.ts\` - Cache clearing and management utilities
- \`system-health.ts\` - Health monitoring and diagnostics
- \`types.ts\` - TypeScript type definitions
- \`index.ts\` - Main exports

## Benefits for Digital Signage

✅ **Prevents 96-hour cache expiry issues**  
✅ **Runs during safe hours (4 AM)**  
✅ **No user intervention required**  
✅ **Comprehensive logging for debugging**  
✅ **Health monitoring for proactive issues**  
✅ **Graceful fallbacks and error handling**

## Monitoring

The system logs all activities to console and maintains internal logs:

\`\`\`typescript
import { CacheManager } from '@/maintenance';

// Get recent maintenance logs
const logs = CacheManager.getLogs();
logs.forEach(log => {
  console.log(\`\${log.timestamp}: \${log.action} - \${log.success ? '✅' : '❌'}\`);
});
\`\`\`

This maintenance system ensures your digital signage runs reliably 24/7 without manual intervention!
