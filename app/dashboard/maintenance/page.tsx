import { MaintenanceDashboard } from '@/maintenance/components/MaintenanceDashboard';

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-6xl mx-auto">
        <MaintenanceDashboard />
      </div>
    </div>
  );
}
