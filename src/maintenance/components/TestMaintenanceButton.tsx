'use client';

import { useState } from 'react';
import { MaintenanceScheduler } from '../scheduler';

export function TestMaintenanceButton() {
  const [isRunning, setIsRunning] = useState(false);
  const [lastResult, setLastResult] = useState<string>('');

  const runTestMaintenance = async () => {
    setIsRunning(true);
    setLastResult('');
    
    try {
      console.log('🧪 TEST: Starting maintenance...');
      const result = await MaintenanceScheduler.runMaintenance();
      
      if (result.success) {
        setLastResult(`✅ Success: ${result.details}`);
        console.log('🧪 TEST: Maintenance completed successfully');
      } else {
        setLastResult(`❌ Failed: ${result.error}`);
        console.log('🧪 TEST: Maintenance failed');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setLastResult(`❌ Error: ${errorMsg}`);
      console.error('🧪 TEST: Maintenance error:', error);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="p-4 bg-yellow-900/20 border border-yellow-600 rounded-lg">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-yellow-400 text-xl">🧪</span>
        <div>
          <h3 className="text-lg font-semibold text-yellow-300">Test Maintenance</h3>
          <p className="text-sm text-yellow-200/80">
            Run the 4am maintenance routine immediately for testing
          </p>
        </div>
      </div>
      
      <div className="flex gap-3 items-center">
        <button
          onClick={runTestMaintenance}
          disabled={isRunning}
          className={`
            px-4 py-2 rounded font-medium text-sm transition-colors
            ${isRunning 
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
              : 'bg-yellow-600 hover:bg-yellow-700 text-white'
            }
          `}
        >
          {isRunning ? (
            <>
              <span className="inline-block animate-spin mr-2">⏳</span>
              Running...
            </>
          ) : (
            <>🚀 Run Test Maintenance</>
          )}
        </button>
        
        {lastResult && (
          <div className="text-sm font-mono">
            {lastResult}
          </div>
        )}
      </div>
      
      {isRunning && (
        <div className="mt-3 text-xs text-yellow-200/60">
          Note: Browser will refresh in a few seconds if successful...
        </div>
      )}
    </div>
  );
}
