import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getAccessibleRegionsForUser } from '@/lib/region';

const REGION_COOKIE_NAME = 'flamora_region_id';

// GET /api/select-region
// Returns the regions the current user is allowed to enter.
// - SUPER_ADMIN: all active regions
// - ADMIN: their primary region + any additional regions assigned via UserRegion
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = session.user.role;
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const cookieStore = await cookies();
    const activeRegionId = cookieStore.get(REGION_COOKIE_NAME)?.value || null;

    let regions;
    let assignedRegionId: string | null = null;
    if (role === 'SUPER_ADMIN') {
      regions = await prisma.region.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        select: {
          id: true,
          name: true,
          code: true,
          address: true,
          phone: true,
          description: true,
          isDefault: true,
        },
      });
    } else {
      const accessible = await getAccessibleRegionsForUser(session.user.id);
      assignedRegionId = accessible.primary;
      if (accessible.ids.length === 0) {
        return NextResponse.json({
          regions: [],
          assignedRegionId: null,
          role,
          message:
            'Your account is not assigned to any branch yet. Please contact a Super Administrator.',
        });
      }
      const found = await prisma.region.findMany({
        where: { id: { in: accessible.ids }, isActive: true },
        select: {
          id: true,
          name: true,
          code: true,
          address: true,
          phone: true,
          description: true,
          isDefault: true,
        },
      });
      // Preserve the canonical order: primary first, then the rest in
      // assignment order (the helper already de-duplicated).
      const orderIndex = new Map(accessible.ids.map((id, i) => [id, i]));
      regions = found.sort(
        (a, b) => (orderIndex.get(a.id) ?? 0) - (orderIndex.get(b.id) ?? 0)
      );
    }

    return NextResponse.json({
      regions,
      assignedRegionId,
      activeRegionId,
      role,
    });
  } catch (error) {
    console.error('GET /api/select-region failed:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// POST /api/select-region { regionId }
// Sets the active region cookie. ADMINs can only choose their assigned region.
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const role = session.user.role;
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const regionId: string | undefined = body?.regionId;
    if (!regionId || typeof regionId !== 'string') {
      return NextResponse.json(
        { error: 'Validation Error', message: 'regionId is required' },
        { status: 400 }
      );
    }

    const region = await prisma.region.findUnique({ where: { id: regionId } });
    if (!region || !region.isActive) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Region not found or inactive.' },
        { status: 404 }
      );
    }

    if (role === 'ADMIN') {
      const accessible = await getAccessibleRegionsForUser(session.user.id);
      if (!accessible.ids.includes(regionId)) {
        return NextResponse.json(
          {
            error: 'Forbidden',
            message: 'You can only access branches assigned to you.',
          },
          { status: 403 }
        );
      }
    }

    const response = NextResponse.json({ ok: true, regionId, regionName: region.name });
    response.cookies.set(REGION_COOKIE_NAME, regionId, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  } catch (error) {
    console.error('POST /api/select-region failed:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// DELETE /api/select-region — clear active region cookie so the user is sent
// back to the picker on next navigation. SUPER_ADMINs can always clear; ADMINs
// can clear only if they have more than one accessible branch (otherwise
// clearing would just immediately auto-pick again).
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = session.user.role;
    if (role !== 'SUPER_ADMIN' && role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Only ADMINs can clear the active region.' },
        { status: 403 }
      );
    }

    if (role === 'ADMIN') {
      const accessible = await getAccessibleRegionsForUser(session.user.id);
      if (accessible.ids.length <= 1) {
        return NextResponse.json(
          {
            error: 'Forbidden',
            message: 'You are assigned to a single branch and cannot switch.',
          },
          { status: 403 }
        );
      }
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.delete(REGION_COOKIE_NAME);
    return response;
  } catch (error) {
    console.error('DELETE /api/select-region failed:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
