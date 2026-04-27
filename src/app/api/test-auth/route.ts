import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/apiAuth';

/**
 * Diagnostic endpoint — only reachable in development. In production this
 * route returns 404 so we don't expose any auth scaffolding.
 */
export async function GET(_request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return new NextResponse(null, { status: 404 });
  }

  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  return NextResponse.json({
    success: true,
    message: 'Authentication working',
    user: {
      id: auth.session.user.id,
      role: auth.session.user.role,
      email: auth.session.user.email,
    },
  });
}
