'use client';

import { TestMaintenanceButton } from '@/maintenance/components/TestMaintenanceButton';

export default function TestMaintenancePage() {
  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">🧪 Maintenance Testing</h1>
          <p className="text-gray-400">
            Test the 4am maintenance routine to verify cache clearing and browser refresh functionality.
          </p>
        </div>
        
        <TestMaintenanceButton />
        
        <div className="mt-8 p-4 bg-gray-900 rounded-lg">
          <h2 className="text-lg font-semibold text-white mb-3">What this test does:</h2>
          <ul className="text-gray-300 space-y-2 text-sm">
            <li>• ✅ Clear server-side metadata cache (via API call)</li>
            <li>• ✅ Clear browser caches (Cache API, localStorage)</li>
            <li>• ✅ Wait 3 seconds for operations to complete</li>
            <li>• ✅ Refresh the browser page (simulating the 4am behavior)</li>
            <li>• ✅ Log all activities to console</li>
          </ul>
        </div>
        
        <div className="mt-4 p-4 bg-blue-900/20 border border-blue-600 rounded-lg">
          <h2 className="text-lg font-semibold text-blue-300 mb-3">Testing Tips:</h2>
          <ul className="text-blue-200 space-y-2 text-sm">
            <li>• Open browser DevTools Console to see detailed logs</li>
            <li>• Check Network tab to see the cache clearing API calls</li>
            <li>• Notice the browser refresh happens automatically after success</li>
            <li>• Visit <code>/dashboard/maintenance</code> for full monitoring</li>
          </ul>
        </div>
        
        <div className="mt-8 text-center">
          <a 
            href="/dashboard/maintenance" 
            className="inline-block px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
          >
            Go to Full Maintenance Dashboard →
          </a>
        </div>
      </div>
    </div>
  );
}
