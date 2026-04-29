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

    // Pages / routes accessible to ADMIN and SUPER_ADMIN.
    // The `/api/` catch-all is intentional: only ADMIN/SUPER_ADMIN can sign in
    // (enforced in `src/lib/auth.ts`), and individual API routes do their own
    // role/permission checks on top of this gate.
    admin: [
        '/dashboard',
        '/customers',
        '/inventory',
        '/vendors',
        '/reports',
        '/admin',
        '/financial',
        '/settings',
        '/team',
        '/api/'
    ],

    // Routes any authenticated user (regardless of role) may hit.
    notifications: [
        '/api/notifications',
        '/api/simple-notifications'
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
    // Page shell for creating regions — must load without flamora_region_id (SPA
    // navigation hits proxy the same way as full requests).
    '/admin/regions',
    '/api/admin/regions', // SUPER_ADMIN region CRUD
    '/api/regions',       // listing regions for switcher / select-region
    '/api/auth',
    '/api/notifications',
    '/api/simple-notifications',
];

function isRegionAgnostic(pathname: string): boolean {
    return REGION_AGNOSTIC_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/'));
}

/**
 * Next.js 16 renamed the `middleware` file convention to `proxy` (see
 * https://nextjs.org/docs/messages/middleware-to-proxy). The file MUST be
 * named `proxy.ts` AND export a function named `proxy` for it to run.
 *
 * This is the only place where the inbound JWT is verified end-to-end and
 * where we strip and re-inject the `x-user-id`, `x-user-role`,
 * `x-user-email`, and `x-region-id` headers from the verified token. Every
 * downstream API route is allowed to trust those headers because *this*
 * function is the gate that produced them.
 */
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
        const primaryRegionFromToken = (token as { regionId?: string | null }).regionId || null;
        const accessibleRegionIds = ((token as { regionIds?: string[] }).regionIds || []).filter(Boolean);

        if (userRole === 'ADMIN') {
            const allowed = accessibleRegionIds.length > 0
                ? accessibleRegionIds
                : (primaryRegionFromToken ? [primaryRegionFromToken] : []);

            if (regionId && !allowed.includes(regionId)) {
                regionId = primaryRegionFromToken || allowed[0] || null;
            }

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
        // Build a fresh header set from the inbound request, then OVERWRITE the
        // user/region identity headers with values derived from the verified
        // JWT. Crucially we strip any client-supplied `x-user-*` / `x-region-id`
        // headers first so an attacker cannot smuggle them through.
        const requestHeaders = new Headers(request.headers);
        requestHeaders.delete('x-user-id');
        requestHeaders.delete('x-user-role');
        requestHeaders.delete('x-user-email');
        requestHeaders.delete(REGION_HEADER_NAME);

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
