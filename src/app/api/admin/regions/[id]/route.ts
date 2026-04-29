import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getAssignedAppUserCountsByRegion } from '@/lib/region';

type Ctx = { params: Promise<{ id: string }> };

// GET /api/admin/regions/[id]
export async function GET(_request: NextRequest, ctx: Ctx) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const role = session.user.role;
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await ctx.params;
    const region = await prisma.region.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            customers: true,
            b2cCustomers: true,
            cylinders: true,
            b2bTransactions: true,
            b2cTransactions: true,
            expenses: true,
          },
        },
      },
    });

    if (!region) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    const userCountMap = await getAssignedAppUserCountsByRegion([region.id]);

    const regionWithCounts = {
      ...region,
      _count: {
        ...region._count,
        users: userCountMap.get(region.id) ?? 0,
      },
    };

    if (role === 'ADMIN') {
      const assigned = (session.user as { regionId?: string | null }).regionId;
      if (assigned !== region.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    return NextResponse.json(regionWithCounts);
  } catch (error) {
    console.error('GET /api/admin/regions/[id] failed:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/regions/[id] - SUPER_ADMIN only
export async function PATCH(request: NextRequest, ctx: Ctx) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Only SUPER_ADMIN can edit regions.' },
        { status: 403 }
      );
    }

    const { id } = await ctx.params;
    const existing = await prisma.region.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, code, address, phone, description, isActive, isDefault, sortOrder } = body || {};

    if (name && typeof name === 'string' && name.trim() !== existing.name) {
      const conflict = await prisma.region.findUnique({ where: { name: name.trim() } });
      if (conflict && conflict.id !== id) {
        return NextResponse.json(
          { error: 'Conflict', message: 'Another region already uses this name.' },
          { status: 409 }
        );
      }
    }

    if (code && typeof code === 'string' && code.trim() !== (existing.code || '')) {
      const conflict = await prisma.region.findUnique({ where: { code: code.trim() } });
      if (conflict && conflict.id !== id) {
        return NextResponse.json(
          { error: 'Conflict', message: 'Another region already uses this code.' },
          { status: 409 }
        );
      }
    }

    if (isDefault === true) {
      await prisma.region.updateMany({
        where: { isDefault: true, NOT: { id } },
        data: { isDefault: false },
      });
    }

    const data: Record<string, unknown> = {};
    if (typeof name === 'string') data.name = name.trim();
    if (typeof code === 'string') data.code = code.trim() || null;
    if (typeof address === 'string') data.address = address.trim() || null;
    if (typeof phone === 'string') data.phone = phone.trim() || null;
    if (typeof description === 'string') data.description = description.trim() || null;
    if (typeof isActive === 'boolean') data.isActive = isActive;
    if (typeof isDefault === 'boolean') data.isDefault = isDefault;
    if (typeof sortOrder === 'number' && Number.isFinite(sortOrder)) data.sortOrder = sortOrder;

    const updated = await prisma.region.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH /api/admin/regions/[id] failed:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/regions/[id] - SUPER_ADMIN only
// Refuses to delete if any data is still attached. SUPER_ADMIN must reassign first.
export async function DELETE(_request: NextRequest, ctx: Ctx) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Only SUPER_ADMIN can delete regions.' },
        { status: 403 }
      );
    }

    const { id } = await ctx.params;
    const existing = await prisma.region.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            customers: true,
            b2cCustomers: true,
            cylinders: true,
            b2bTransactions: true,
            b2cTransactions: true,
            expenses: true,
            officeExpenses: true,
            salaryRecords: true,
            dailyPlantPrices: true,
            products: true,
            customItems: true,
            stores: true,
            vehicles: true,
            purchaseEntries: true,
            vendorPayments: true,
            vendorOrders: true,
            vendorInventories: true,
            vendorFinancialReports: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    if (existing.isDefault) {
      return NextResponse.json(
        { error: 'Conflict', message: 'Cannot delete the default region. Mark another region as default first.' },
        { status: 409 }
      );
    }

    const counts = existing._count as Record<string, number>;
    const totalReferences = Object.values(counts).reduce((sum, n) => sum + (n || 0), 0);
    if (totalReferences > 0) {
      return NextResponse.json(
        {
          error: 'Conflict',
          message: 'This region still has data attached. Reassign or remove the data before deleting.',
          counts,
        },
        { status: 409 }
      );
    }

    await prisma.region.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/admin/regions/[id] failed:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
