import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSuperAdmin } from '@/lib/apiAuth';
import { databaseActionErrorMessage } from '@/lib/database-errors';
import {
  parseShopCatalogPayload,
  seedShopCatalogIfEmpty,
  serializeShopCatalogItem,
} from '@/lib/shop-catalog';

export async function GET() {
  try {
    const auth = await requireSuperAdmin();
    if (!auth.ok) return auth.response;

    await seedShopCatalogIfEmpty(
      (args) => prisma.shopCatalogItem.createMany({ data: args.data }),
      () => prisma.shopCatalogItem.count()
    );

    const items = await prisma.shopCatalogItem.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    return NextResponse.json({
      items: items.map(serializeShopCatalogItem),
    });
  } catch (error) {
    console.error('Admin shop catalog fetch error:', error);
    return NextResponse.json(
      { error: databaseActionErrorMessage(error, 'Failed to fetch shop items') },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin();
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const parsed = parseShopCatalogPayload(body);
    if ('error' in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const item = await prisma.shopCatalogItem.create({ data: parsed });
    return NextResponse.json(serializeShopCatalogItem(item), { status: 201 });
  } catch (error) {
    console.error('Admin shop catalog create error:', error);
    return NextResponse.json(
      { error: databaseActionErrorMessage(error, 'Failed to create shop item') },
      { status: 500 }
    );
  }
}
