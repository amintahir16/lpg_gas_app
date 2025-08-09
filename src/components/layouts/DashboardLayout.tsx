'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { 
  HomeIcon, 
  UsersIcon, 
  CubeIcon, 
  CurrencyDollarIcon, 
  BuildingOfficeIcon, 
  ChartBarIcon,
  CogIcon,
  BellIcon,
  Bars3Icon,
  XMarkIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  roles: string[];
}

const navigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon, roles: ['ADMIN', 'SUPER_ADMIN'] },
  { name: 'Customers', href: '/customers', icon: UsersIcon, roles: ['ADMIN', 'SUPER_ADMIN'] },
  { name: 'Inventory', href: '/inventory', icon: CubeIcon, roles: ['ADMIN', 'SUPER_ADMIN'] },
  { name: 'Financial', href: '/financial', icon: CurrencyDollarIcon, roles: ['ADMIN', 'SUPER_ADMIN'] },
  { name: 'Vendors', href: '/vendors', icon: BuildingOfficeIcon, roles: ['ADMIN', 'SUPER_ADMIN'] },
  { name: 'Reports', href: '/reports', icon: ChartBarIcon, roles: ['ADMIN', 'SUPER_ADMIN'] },
  { name: 'Settings', href: '/settings', icon: CogIcon, roles: ['ADMIN', 'SUPER_ADMIN'] },
];

const customerNavigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/customer/dashboard', icon: HomeIcon, roles: ['USER'] },
  { name: 'My Rentals', href: '/customer/rentals', icon: CubeIcon, roles: ['USER'] },
  { name: 'Payments', href: '/customer/payments', icon: CurrencyDollarIcon, roles: ['USER'] },
  { name: 'Support', href: '/customer/support', icon: CogIcon, roles: ['USER'] },
  { name: 'Profile', href: '/customer/profile', icon: UserCircleIcon, roles: ['USER'] },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState(0); // Real notification count
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Show loading while checking authentication
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (status === 'unauthenticated') {
    return null;
  }

  const userRole = session?.user?.role || 'USER';
  const isCustomer = userRole === 'USER';
  const currentNavigation = isCustomer ? customerNavigation : navigation;

  const handleLogout = () => {
    signOut({ callbackUrl: '/login' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white/95 backdrop-blur-sm shadow-xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 border-r border-gray-200",
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Sidebar Header */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-gray-200 bg-white/80">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center shadow-sm">
              <CubeIcon className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">
              LPG Gas
            </h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-500 hover:text-gray-700"
          >
            <XMarkIcon className="w-5 h-5" />
          </Button>
        </div>
        
        {/* Navigation */}
        <nav className="mt-8 px-4">
          <div className="space-y-1">
            {currentNavigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200",
                    isActive
                      ? "bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border-r-2 border-blue-600 shadow-sm"
                      : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className={cn(
                    "mr-3 h-5 w-5 flex-shrink-0",
                    isActive ? "text-blue-600" : "text-gray-500 group-hover:text-gray-600"
                  )} />
                  {item.name}
                  {item.badge && (
                    <Badge variant="secondary" className="ml-auto">
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User Profile Section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white/80 backdrop-blur-sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-full flex items-center justify-center shadow-sm">
              <span className="text-white text-sm font-semibold">
                {session?.user?.name?.charAt(0) || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {session?.user?.name || 'User'}
              </p>
              <p className="text-xs text-gray-500 truncate capitalize font-medium">
                {userRole.toLowerCase()}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              title="Logout"
            >
              <ArrowRightOnRectangleIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Top Navigation Bar */}
        <div className="sticky top-0 z-30 flex h-16 items-center justify-between px-4 bg-white/95 backdrop-blur-sm shadow-sm border-b border-gray-200">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <Bars3Icon className="w-5 h-5" />
            </Button>
            <h2 className="ml-4 text-lg font-semibold text-gray-900 lg:hidden">
              {currentNavigation.find(item => item.href === pathname)?.name || 'Dashboard'}
            </h2>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <Button variant="ghost" size="icon" className="relative text-gray-500 hover:text-gray-700">
              <BellIcon className="w-5 h-5" />
              {notifications > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs"
                >
                  {notifications}
                </Badge>
              )}
            </Button>

            {/* User Menu */}
            <div className="hidden lg:flex items-center space-x-3">
              <span className="text-sm font-medium text-gray-700">
                Welcome, {session?.user?.name}
              </span>
              <Button variant="outline" size="sm" onClick={handleLogout} className="font-medium">
                Logout
              </Button>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <main className="p-6">
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-white/95 backdrop-blur-sm border-t border-gray-200 mt-auto">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="text-sm text-gray-500 mb-4 md:mb-0 font-medium">
                © 2024 LPG Gas Cylinder Business App. All rights reserved.
              </div>
              <div className="flex space-x-6">
                <a href="#" className="text-sm text-gray-500 hover:text-gray-700 transition-colors font-medium">
                  Privacy Policy
                </a>
                <a href="#" className="text-sm text-gray-500 hover:text-gray-700 transition-colors font-medium">
                  Terms of Service
                </a>
                <a href="#" className="text-sm text-gray-500 hover:text-gray-700 transition-colors font-medium">
                  Contact Support
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
