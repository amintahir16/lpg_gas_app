import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const REGION_COOKIE_NAME = 'flamora_region_id';
const REGION_HEADER_NAME = 'x-region-id';

const routePermissions = {
    public: [
        '/login',
        '/register',
        '/api/auth',
        '/about',
        '/services',
        '/shop',
        '/blog',
        '/contact'
    ],

    admin: [
        '/dashboard',
        '/customers',
        '/inventory',
        '/financial',
        '/vendors',
        '/reports',
        '/settings',
        '/admin',
        '/api/customers',
        '/api/customers/b2b',
        '/api/cylinders',
        '/api/expenses',
        '/api/vendors',
        '/api/vendor-categories',
        '/api/reports',
        '/api/dashboard',
        '/api/settings',
        '/api/inventory',
        '/api/b2b-transactions',
        '/api/customers/b2b/transactions',
        '/api/admin/margin-categories',
        '/api/admin/plant-prices',
        '/api/admin/regions',
        '/api/regions',
        '/api/pricing'
    ],

    notifications: [
        '/api/notifications',
        '/api/notifications/stats',
        '/api/simple-notifications',
        '/api/test-notification'
    ],

    user: [
        '/customer',
        '/api/customer',
        '/api/rentals'
    ],

    vendor: [
        '/vendor',
        '/api/vendor'
    ]
};

const roleHierarchy = {
    'USER': ['USER'],
    'ADMIN': ['USER', 'ADMIN'],
    'SUPER_ADMIN': ['USER', 'ADMIN', 'SUPER_ADMIN'],
    'VENDOR': ['VENDOR']
};

// Routes that should be reachable by ADMIN/SUPER_ADMIN even when no region is
// selected yet (avoids redirect loops on /select-region itself).
const REGION_AGNOSTIC_PREFIXES = [
    '/select-region',
    '/api/select-region',
    '/api/admin/regions', // SUPER_ADMIN region CRUD
    '/api/regions',       // listing regions for switcher / select-region
    '/api/auth',
    '/api/notifications',
    '/api/simple-notifications',
];

function isRegionAgnostic(pathname: string): boolean {
    return REGION_AGNOSTIC_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/'));
}

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    if (pathname === '/') {
        return NextResponse.next();
    }

    if (routePermissions.public.some(route => pathname.startsWith(route))) {
        return NextResponse.next();
    }

    const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET
    });

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

    const userRole = token.role as string;

    const hasAccess = checkRouteAccess(pathname, userRole);

    if (!hasAccess) {
        if (pathname.startsWith('/api/')) {
            return NextResponse.json(
                { error: 'Forbidden', message: 'Insufficient permissions' },
                { status: 403 }
            );
        }

        const redirectUrl = getRedirectUrl(userRole);
        return NextResponse.redirect(new URL(redirectUrl, request.url));
    }

    // Region gating: only applies to ADMIN / SUPER_ADMIN — those are the roles
    // that operate on region-scoped data. USER / VENDOR pass through unchanged.
    const isAdminish = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
    let regionId = request.cookies.get(REGION_COOKIE_NAME)?.value || null;

    if (isAdminish) {
        // ADMINs are locked to a finite set of accessible regions; SUPER_ADMINs
        // can roam across all regions. The cookie is checked against this set
        // and reset to the primary if it drifts (e.g. an old cookie from a
        // region that was just revoked).
        const primaryRegionFromToken = (token as { regionId?: string | null }).regionId || null;
        const accessibleRegionIds = ((token as { regionIds?: string[] }).regionIds || []).filter(Boolean);

        if (userRole === 'ADMIN') {
            const allowed = accessibleRegionIds.length > 0
                ? accessibleRegionIds
                : (primaryRegionFromToken ? [primaryRegionFromToken] : []);

            if (regionId && !allowed.includes(regionId)) {
                // Stale cookie pointing at a region the admin no longer has
                // access to — fall back to primary (or first allowed).
                regionId = primaryRegionFromToken || allowed[0] || null;
            }

            // Auto-pick the only accessible region so single-branch admins skip
            // the picker entirely (preserving prior behaviour).
            if (!regionId && allowed.length === 1) {
                regionId = allowed[0];
            }
        }

        const needsRegion = !regionId && !isRegionAgnostic(pathname);
        if (needsRegion) {
            if (pathname.startsWith('/api/')) {
                return NextResponse.json(
                    {
                        error: 'NoRegion',
                        message: 'Please select a region before continuing.',
                    },
                    { status: 409 }
                );
            }
            const selectUrl = new URL('/select-region', request.url);
            selectUrl.searchParams.set('callbackUrl', pathname);
            return NextResponse.redirect(selectUrl);
        }
    }

    if (pathname.startsWith('/api/')) {
        const requestHeaders = new Headers(request.headers);
        requestHeaders.set('x-user-id', token.sub || '');
        requestHeaders.set('x-user-role', userRole);
        requestHeaders.set('x-user-email', token.email || '');
        if (regionId) {
            requestHeaders.set(REGION_HEADER_NAME, regionId);
        }

        const response = NextResponse.next({
            request: {
                headers: requestHeaders,
            },
        });

        // If we corrected an ADMIN's stale region cookie above, persist the fix.
        if (isAdminish && userRole === 'ADMIN' && regionId &&
            request.cookies.get(REGION_COOKIE_NAME)?.value !== regionId) {
            response.cookies.set(REGION_COOKIE_NAME, regionId, {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                maxAge: 60 * 60 * 24 * 30, // 30 days
            });
        }
        return response;
    }

    const response = NextResponse.next();
    if (isAdminish && userRole === 'ADMIN' && regionId &&
        request.cookies.get(REGION_COOKIE_NAME)?.value !== regionId) {
        response.cookies.set(REGION_COOKIE_NAME, regionId, {
            httpOnly: true,
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 30,
        });
    }
    return response;
}

function checkRouteAccess(pathname: string, userRole: string): boolean {
    if (userRole === 'SUPER_ADMIN') return true;

    if (routePermissions.notifications.some(route => pathname.startsWith(route))) {
        return true;
    }

    if (pathname.startsWith('/select-region') || pathname.startsWith('/api/select-region')) {
        return userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
    }

    if (routePermissions.admin.some(route => pathname.startsWith(route))) {
        return roleHierarchy[userRole as keyof typeof roleHierarchy]?.includes('ADMIN') || false;
    }

    if (routePermissions.user.some(route => pathname.startsWith(route))) {
        return roleHierarchy[userRole as keyof typeof roleHierarchy]?.includes('USER') || false;
    }

    if (routePermissions.vendor.some(route => pathname.startsWith(route))) {
        return userRole === 'VENDOR';
    }

    return false;
}

function getRedirectUrl(userRole: string): string {
    switch (userRole) {
        case 'ADMIN':
            return '/admin';
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
        '/((?!_next/static|_next/image|favicon.ico|public/|images/).*)',
    ],
};
