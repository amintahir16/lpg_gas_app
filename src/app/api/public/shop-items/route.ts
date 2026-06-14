import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { seedShopCatalogIfEmpty, serializeShopCatalogItem } from '@/lib/shop-catalog';

export async function GET() {
  try {
    await seedShopCatalogIfEmpty(
      (args) => prisma.shopCatalogItem.createMany({ data: args.data }),
      () => prisma.shopCatalogItem.count()
    );

    const items = await prisma.shopCatalogItem.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    return NextResponse.json({
      items: items.map(serializeShopCatalogItem),
    });
  } catch (error) {
    console.error('Public shop catalog fetch error:', error);
    return NextResponse.json({ error: 'Failed to load shop items' }, { status: 500 });
  }
}
