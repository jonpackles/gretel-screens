'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems = [
    {
      name: 'Content',
      href: '/dashboard/content',
      description: 'Manage media files and projects'
    },
    {
      name: 'Sequences',
      href: '/dashboard/sequences',
      description: 'Configure screen sequences'
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header Navigation */}
      <div className="border-b border-gray-200 bg-white">
        <div className="px-6 py-4">
          {/* <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-500 mt-1">Manage your screen content and sequences</p>
            </div>
          </div> */}
          
          {/* Navigation Tabs */}
          <div className="mt-6">
            <nav className="flex space-x-8">
              {navItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`group inline-flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                      isActive
                        ? 'border-black text-gray-900'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Page Content */}
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
} 