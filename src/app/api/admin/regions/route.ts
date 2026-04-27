import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/admin/regions
// Lists regions. ADMIN gets only their assigned region; SUPER_ADMIN gets all.
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = session.user.role;
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const where: { isActive?: boolean; id?: string } = {};
    if (!includeInactive) where.isActive = true;

    if (role === 'ADMIN') {
      const assigned = (session.user as { regionId?: string | null }).regionId;
      if (!assigned) {
        return NextResponse.json([]);
      }
      where.id = assigned;
    }

    const regions = await prisma.region.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: {
            users: true,
            customers: true,
            b2cCustomers: true,
            cylinders: true,
          },
        },
      },
    });

    return NextResponse.json(regions);
  } catch (error) {
    console.error('GET /api/admin/regions failed:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch regions' },
      { status: 500 }
    );
  }
}

// POST /api/admin/regions - SUPER_ADMIN only
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Only SUPER_ADMIN can create regions.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      code,
      address,
      phone,
      description,
      isActive = true,
      isDefault = false,
      sortOrder = 0,
    } = body || {};

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Validation Error', message: 'Region name is required (min 2 chars).' },
        { status: 400 }
      );
    }

    const existing = await prisma.region.findUnique({ where: { name: name.trim() } });
    if (existing) {
      return NextResponse.json(
        { error: 'Conflict', message: 'A region with this name already exists.' },
        { status: 409 }
      );
    }

    if (code && typeof code === 'string' && code.trim().length > 0) {
      const dup = await prisma.region.findUnique({ where: { code: code.trim() } });
      if (dup) {
        return NextResponse.json(
          { error: 'Conflict', message: 'A region with this code already exists.' },
          { status: 409 }
        );
      }
    }

    if (isDefault) {
      // Only one default at a time.
      await prisma.region.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const created = await prisma.region.create({
      data: {
        name: name.trim(),
        code: code?.trim() || null,
        address: address?.trim() || null,
        phone: phone?.trim() || null,
        description: description?.trim() || null,
        isActive: !!isActive,
        isDefault: !!isDefault,
        sortOrder: Number.isFinite(sortOrder) ? Number(sortOrder) : 0,
        createdBy: session.user.id,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/regions failed:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to create region' },
      { status: 500 }
    );
  }
}
