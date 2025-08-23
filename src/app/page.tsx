'use client';

import { useSession } from 'next-auth/react';
import LandingPage from '@/components/pages/LandingPage';

export default function RootPage() {
  const { data: session, status } = useSession();

  // Show loading while checking authentication
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Always show landing page (for both authenticated and non-authenticated users)
  // The LandingPage component will handle showing appropriate buttons based on auth state
  return <LandingPage />;
}
