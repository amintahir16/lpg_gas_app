'use client';

import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import Footer from './Footer';

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  
  // Check if the current route is an admin/authenticated route
  const isAdminRoute = pathname?.startsWith('/dashboard') || 
                     pathname?.startsWith('/settings') || 
                     pathname?.startsWith('/admin') ||
                     pathname?.startsWith('/api') ||
                     pathname?.startsWith('/auth') ||
                     pathname?.startsWith('/vendor') ||
                     pathname?.startsWith('/customer') ||
                     pathname?.startsWith('/customers') ||
                     pathname?.startsWith('/inventory') ||
                     pathname?.startsWith('/financial') ||
                     pathname?.startsWith('/vendors') ||
                     pathname?.startsWith('/reports') ||
                     pathname?.startsWith('/test-notifications') ||
                     pathname?.startsWith('/login') ||
                     pathname?.startsWith('/register');

  // Only show Navbar and Footer for landing pages (public routes)
  if (isAdminRoute) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />
      <main>{children}</main>
      <Footer />
    </>
  );
} 