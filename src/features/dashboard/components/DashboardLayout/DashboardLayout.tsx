'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DashboardNavItem } from '../../types';

const navItems: DashboardNavItem[] = [
  {
    name: 'Content',
    href: '/dashboard/content',
    description: 'Manage media files and projects'
  },
  {
    name: 'Sequences',
    href: '/dashboard/sequences',
    description: 'Configure screen sequences'
  },
  {
    name: 'Inform',
    href: '/dashboard/inform',
    description: 'Monitor Google Calendar & Sheets data'
  },
  {
    name: 'Settings',
    href: '/dashboard/settings',
    description: 'Global display settings and controls'
  }
];

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header Navigation */}
      <div className="border-b border-gray-200 bg-white">
        <div className="px-6 py-4">
          {/* Navigation Tabs */}
          <div className="">
            <nav className="flex space-x-8 gap-x-8">
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