'use client';

import { useState, useEffect } from 'react';
import { MaintenanceScheduler, CacheManager, SystemHealth } from '../index';
import type { SystemHealthReport, MaintenanceLog } from '../types';
import { TestMaintenanceButton } from './TestMaintenanceButton';

export function MaintenanceDashboard() {
  const [healthReport, setHealthReport] = useState<SystemHealthReport | null>(null);
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeUntilNext, setTimeUntilNext] = useState({ hours: 0, minutes: 0, seconds: 0 });

  // Update countdown every second
  useEffect(() => {
    const updateCountdown = () => {
      setTimeUntilNext(MaintenanceScheduler.getTimeUntilNext());
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [report, maintenanceLogs] = await Promise.all([
          SystemHealth.generateReport(),
          Promise.resolve(CacheManager.getLogs())
        ]);
        setHealthReport(report);
        setLogs(maintenanceLogs);
      } catch (error) {
        console.error('Failed to load maintenance data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const runManualMaintenance = async () => {
    try {
      setIsLoading(true);
      await MaintenanceScheduler.runMaintenance();
      // Note: Browser will refresh, so this component will be unmounted
    } catch (error) {
      console.error('Manual maintenance failed:', error);
      setIsLoading(false);
    }
  };

  const clearCachesOnly = async () => {
    try {
      setIsLoading(true);
      await CacheManager.clearAllCaches();
      // Refresh data
      const [report, maintenanceLogs] = await Promise.all([
        SystemHealth.generateReport(),
        Promise.resolve(CacheManager.getLogs())
      ]);
      setHealthReport(report);
      setLogs(maintenanceLogs);
    } catch (error) {
      console.error('Cache clearing failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !healthReport) {
    return (
      <div className="p-6 bg-gray-900 text-white rounded-lg">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-700 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-700 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return '❓';
    }
  };

  return (
    <div className="p-6 bg-gray-900 text-white rounded-lg space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">System Maintenance</h2>
        <div className="flex gap-2">
          <button
            onClick={clearCachesOnly}
            disabled={isLoading}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded text-sm"
          >
            Clear Caches
          </button>
          <button
            onClick={runManualMaintenance}
            disabled={isLoading}
            className="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 rounded text-sm"
          >
            Run Maintenance
          </button>
        </div>
      </div>

      {/* Test Maintenance Button */}
      <TestMaintenanceButton />

      {/* Overall Status */}
      {healthReport && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-800 p-4 rounded">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{getStatusIcon(healthReport.overall)}</span>
              <div>
                <div className={`font-semibold ${getStatusColor(healthReport.overall)}`}>
                  {healthReport.overall.toUpperCase()}
                </div>
                <div className="text-sm text-gray-400">
                  {healthReport.summary.healthy}/{healthReport.checks.length} systems healthy
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 p-4 rounded">
            <div className="text-sm text-gray-400">Next Maintenance</div>
            <div className="text-lg font-mono">
              {timeUntilNext.hours.toString().padStart(2, '0')}:
              {timeUntilNext.minutes.toString().padStart(2, '0')}:
              {timeUntilNext.seconds.toString().padStart(2, '0')}
            </div>
          </div>

          <div className="bg-gray-800 p-4 rounded">
            <div className="text-sm text-gray-400">Recent Activity</div>
            <div className="text-lg">
              {logs.length > 0 ? (
                <span className={logs[0].success ? 'text-green-400' : 'text-red-400'}>
                  {logs[0].action} {logs[0].success ? '✅' : '❌'}
                </span>
              ) : (
                <span className="text-gray-500">No recent activity</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Health Checks */}
      {healthReport && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Health Checks</h3>
          <div className="space-y-2">
            {healthReport.checks.map((check, index) => (
              <div key={index} className="bg-gray-800 p-3 rounded flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{getStatusIcon(check.status)}</span>
                  <div>
                    <div className="font-medium">{check.name}</div>
                    <div className={`text-sm ${getStatusColor(check.status)}`}>
                      {check.message}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(check.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Logs */}
      {logs.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Recent Maintenance Logs</h3>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {logs.slice(0, 10).map((log, index) => (
              <div key={index} className="text-sm bg-gray-800 p-2 rounded flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>{log.success ? '✅' : '❌'}</span>
                  <span className="font-mono text-xs text-gray-400">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                  <span>{log.action}</span>
                </div>
                {log.details && (
                  <span className="text-xs text-gray-500 truncate max-w-xs">
                    {log.details}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Config Info */}
      <div className="text-xs text-gray-500 border-t border-gray-700 pt-4">
        <div>Maintenance scheduled daily at 4:00 AM</div>
        <div>Server cache clearing: ✅ • Browser cache clearing: ✅ • Auto-refresh: ✅</div>
      </div>
    </div>
  );
}
