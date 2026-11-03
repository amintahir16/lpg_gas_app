import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/apiAuth';
import { getDatabaseStorageInfo } from '@/lib/database-storage';

export const dynamic = 'force-dynamic';

/** GET /api/admin/database-storage — SUPER_ADMIN only. `?refresh=1` bypasses the 10-minute cache. */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin();
    if (!auth.ok) return auth.response;

    const refresh = request.nextUrl.searchParams.get('refresh') === '1';
    const storage = await getDatabaseStorageInfo({ refresh });
    return NextResponse.json({ storage });
  } catch (error) {
    console.error('Error reading database storage:', error);
    return NextResponse.json({ error: 'Failed to read database storage' }, { status: 500 });
  }
}
