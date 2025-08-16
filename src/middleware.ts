import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Define route permissions
const routePermissions = {
  // Public routes
  public: ['/login', '/register', '/api/auth'],
  
  // Admin only routes
  admin: [
    '/dashboard',
    '/customers',
    '/inventory', 
    '/financial',
    '/vendors',
    '/reports',
    '/settings',
    '/api/customers',
    '/api/cylinders',
    '/api/expenses',
    '/api/vendors',
    '/api/reports',
    '/api/dashboard',
    '/api/settings'
  ],
  
  // User routes (accessible by USER, ADMIN, SUPER_ADMIN)
  user: [
    '/customer',
    '/api/customer',
    '/api/rentals'
  ],
  
  // Vendor routes
  vendor: [
    '/vendor',
    '/api/vendor'
  ]
};

// Role hierarchy
const roleHierarchy = {
  'USER': ['USER'],
  'ADMIN': ['USER', 'ADMIN'],
  'SUPER_ADMIN': ['USER', 'ADMIN', 'SUPER_ADMIN'],
  'VENDOR': ['VENDOR']
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Allow public routes
  if (routePermissions.public.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }
  
  // Get token from NextAuth
  const token = await getToken({ 
    req: request,
    secret: process.env.NEXTAUTH_SECRET 
  });
  
  // Redirect to login if no token
  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // Check role-based access
  const userRole = token.role as string;
  
  // Check if user has access to the requested route
  const hasAccess = checkRouteAccess(pathname, userRole);
  
  if (!hasAccess) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Insufficient permissions' },
        { status: 403 }
      );
    }
    
    // Redirect to appropriate dashboard based on role
    const redirectUrl = getRedirectUrl(userRole);
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  }
  
  // Add user info to headers for API routes
  if (pathname.startsWith('/api/')) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', token.sub || '');
    requestHeaders.set('x-user-role', userRole);
    requestHeaders.set('x-user-email', token.email || '');
    
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }
  
  return NextResponse.next();
}

function checkRouteAccess(pathname: string, userRole: string): boolean {
  // SUPER_ADMIN has access to everything
  if (userRole === 'SUPER_ADMIN') return true;
  
  // Check admin routes
  if (routePermissions.admin.some(route => pathname.startsWith(route))) {
    return roleHierarchy[userRole as keyof typeof roleHierarchy]?.includes('ADMIN') || false;
  }
  
  // Check user routes
  if (routePermissions.user.some(route => pathname.startsWith(route))) {
    return roleHierarchy[userRole as keyof typeof roleHierarchy]?.includes('USER') || false;
  }
  
  // Check vendor routes
  if (routePermissions.vendor.some(route => pathname.startsWith(route))) {
    return userRole === 'VENDOR';
  }
  
  // Default deny
  return false;
}

function getRedirectUrl(userRole: string): string {
  switch (userRole) {
    case 'ADMIN':
    case 'SUPER_ADMIN':
      return '/dashboard';
    case 'USER':
      return '/customer/dashboard';
    case 'VENDOR':
      return '/vendor/dashboard';
    default:
      return '/login';
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
