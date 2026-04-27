/**
 * Centralised auth / role helpers for API route handlers.
 *
 * The middleware (`src/middleware.ts`) is the first line of defence — it
 * rejects unauthenticated requests and gates entire path prefixes by role.
 * These helpers are defence-in-depth: every state-changing route should
 * call `requireAdmin` (or `requireSuperAdmin`) so that even if a path is
 * mis-routed or the middleware matcher changes, the handler still refuses
 * to act for non-admin sessions.
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import type { Session } from 'next-auth';
import { authOptions } from '@/lib/auth';

export type Role = 'USER' | 'ADMIN' | 'SUPER_ADMIN' | 'VENDOR';

export type AuthorizedSession = Session & {
  user: {
    id: string;
    email?: string | null;
    name?: string | null;
    role: Role;
  };
};

export type AuthResult =
  | { ok: true; session: AuthorizedSession }
  | { ok: false; response: NextResponse };

/** Return an authorized session for one of the allowed roles, or a 401/403. */
export async function requireRoles(allowed: Role[]): Promise<AuthResult> {
  const session = (await getServerSession(authOptions)) as AuthorizedSession | null;

  if (!session?.user?.id) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const role = (session.user.role as Role) || 'USER';
  if (!allowed.includes(role)) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }

  return { ok: true, session };
}

/** Allow ADMIN or SUPER_ADMIN. Most write routes should use this. */
export function requireAdmin() {
  return requireRoles(['ADMIN', 'SUPER_ADMIN']);
}

/** Allow only SUPER_ADMIN. Use for tenant-wide / privileged-management routes. */
export function requireSuperAdmin() {
  return requireRoles(['SUPER_ADMIN']);
}

/**
 * Cap a client-supplied `limit` query param to a sane maximum to prevent
 * unbounded list reads (memory DoS / data exfil).
 */
export function clampLimit(
  raw: string | number | null | undefined,
  fallback: number,
  max = 100
): number {
  const n = typeof raw === 'number' ? raw : parseInt(String(raw ?? ''), 10);
  if (!Number.isFinite(n) || n <= 0) return Math.min(fallback, max);
  return Math.min(Math.max(1, Math.floor(n)), max);
}
