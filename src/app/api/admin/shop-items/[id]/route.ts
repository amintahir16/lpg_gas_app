import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireSuperAdmin } from '@/lib/apiAuth';
import { parseShopCatalogPayload, serializeShopCatalogItem } from '@/lib/shop-catalog';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireSuperAdmin();
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const item = await prisma.shopCatalogItem.findUnique({ where: { id } });
    if (!item) {
      return NextResponse.json({ error: 'Shop item not found' }, { status: 404 });
    }
    return NextResponse.json(serializeShopCatalogItem(item));
  } catch (error) {
    console.error('Admin shop item fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch shop item' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireSuperAdmin();
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const body = await request.json();
    const parsed = parseShopCatalogPayload(body);
    if ('error' in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const item = await prisma.shopCatalogItem.update({
      where: { id },
      data: parsed,
    });
    return NextResponse.json(serializeShopCatalogItem(item));
  } catch (error) {
    console.error('Admin shop item update error:', error);
    return NextResponse.json({ error: 'Failed to update shop item' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireSuperAdmin();
    if (!auth.ok) return auth.response;

    const { id } = await params;
    await prisma.shopCatalogItem.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin shop item delete error:', error);
    return NextResponse.json({ error: 'Failed to delete shop item' }, { status: 500 });
  }
}
