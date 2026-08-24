import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getActiveRegionId, regionScopedWhere } from '@/lib/region';

export const dynamic = 'force-dynamic';

export interface RecentPurchaseItem {
  id: string;
  itemName: string;
  itemDescription?: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  status: string;
}

export interface RecentPurchaseResponse {
  id: string;
  invoiceNumber: string | null;
  purchaseDate: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: 'PAID' | 'PARTIAL' | 'PENDING';
  status: string;
  category: string;
  categoryName?: string;
  categorySlug?: string;
  notes?: string | null;
  recordedBy?: string | null;
  vendor: {
    id: string;
    companyName: string;
    vendorCode: string;
    contactPerson?: string | null;
    category?: {
      id: string;
      name: string;
      slug?: string | null;
    } | null;
  };
  items: RecentPurchaseItem[];
  paymentCount: number;
}

// GET - Ultra-efficient retrieval of the last 5 active vendor purchases
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const regionId = getActiveRegionId(request);
    const regionScope = regionScopedWhere(regionId);

    const { searchParams } = new URL(request.url);
    const limitParam = parseInt(searchParams.get('limit') || '5', 10);
    const limit = Math.min(Math.max(1, isNaN(limitParam) ? 5 : limitParam), 20);
    const categoryId = searchParams.get('categoryId');

    // 1. Primary single-roundtrip query for batched active purchases
    const batchWhere: any = {
      status: 'ACTIVE',
      undoneAt: null,
      ...regionScope,
    };

    if (categoryId) {
      batchWhere.vendor = { categoryId };
    }

    const batches = await prisma.vendorPurchaseBatch.findMany({
      where: batchWhere,
      take: limit,
      orderBy: { purchaseDate: 'desc' },
      select: {
        id: true,
        invoiceNumber: true,
        purchaseDate: true,
        totalAmount: true,
        status: true,
        notes: true,
        category: true,
        vendor: {
          select: {
            id: true,
            companyName: true,
            vendorCode: true,
            contactPerson: true,
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        purchaseEntries: {
          where: {
            status: { not: 'CANCELLED' },
            ...regionScope,
          },
          select: {
            id: true,
            itemName: true,
            itemDescription: true,
            quantity: true,
            unitPrice: true,
            totalPrice: true,
            status: true,
          },
        },
        payments: {
          where: {
            status: 'COMPLETED',
            ...regionScope,
          },
          select: {
            id: true,
            amount: true,
            method: true,
            paymentDate: true,
          },
        },
        createdByUser: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    const recentPurchases: RecentPurchaseResponse[] = batches.map((batch) => {
      const items: RecentPurchaseItem[] = (batch.purchaseEntries || []).map((entry) => ({
        id: entry.id,
        itemName: entry.itemName,
        itemDescription: entry.itemDescription,
        quantity: Number(entry.quantity),
        unitPrice: Number(entry.unitPrice),
        totalPrice: Number(entry.totalPrice),
        status: entry.status,
      }));

      // Calculate total amount from entries if totalAmount is zero or missing
      const calculatedTotal =
        Number(batch.totalAmount) > 0
          ? Number(batch.totalAmount)
          : items.reduce((sum, it) => sum + it.totalPrice, 0);

      let paidAmount = (batch.payments || []).reduce(
        (sum, p) => sum + Number(p.amount),
        0
      );

      const allEntriesPaid = items.length > 0 && items.every((e) => e.status === 'PAID');
      const anyEntryPaid = items.some((e) => e.status === 'PAID' || e.status === 'PARTIAL');

      if (allEntriesPaid && paidAmount < calculatedTotal) {
        paidAmount = calculatedTotal;
      }

      const balanceAmount = Math.max(0, calculatedTotal - paidAmount);

      let paymentStatus: 'PAID' | 'PARTIAL' | 'PENDING' = 'PENDING';
      if (paidAmount >= calculatedTotal && calculatedTotal > 0) {
        paymentStatus = 'PAID';
      } else if (allEntriesPaid) {
        paymentStatus = 'PAID';
      } else if (paidAmount > 0 || anyEntryPaid) {
        paymentStatus = 'PARTIAL';
      }

      return {
        id: batch.id,
        invoiceNumber: batch.invoiceNumber,
        purchaseDate: batch.purchaseDate.toISOString(),
        totalAmount: calculatedTotal,
        paidAmount,
        balanceAmount,
        paymentStatus,
        status: batch.status,
        category: String(batch.category),
        categoryName: batch.vendor?.category?.name,
        categorySlug: batch.vendor?.category?.slug,
        notes: batch.notes,
        recordedBy: batch.createdByUser?.name || batch.createdByUser?.email || null,
        vendor: {
          id: batch.vendor.id,
          companyName: batch.vendor.companyName,
          vendorCode: batch.vendor.vendorCode,
          contactPerson: batch.vendor.contactPerson,
          category: batch.vendor.category,
        },
        items,
        paymentCount: batch.payments?.length || 0,
      };
    });

    // 2. Legacy fallback for systems with unbatched entries (runs only if fewer than requested limit found)
    if (recentPurchases.length < limit) {
      const remainingLimit = limit - recentPurchases.length;
      const existingBatchIds = new Set(batches.map((b) => b.id));

      const legacyWhere: any = {
        purchaseBatchId: null,
        status: { not: 'CANCELLED' },
        ...regionScope,
      };

      if (categoryId) {
        legacyWhere.vendors = { categoryId };
      }

      const legacyEntries = await prisma.purchaseEntry.findMany({
        where: legacyWhere,
        take: remainingLimit * 3, // slightly larger to group multi-items under same invoice
        orderBy: { purchaseDate: 'desc' },
        select: {
          id: true,
          itemName: true,
          itemDescription: true,
          quantity: true,
          unitPrice: true,
          totalPrice: true,
          status: true,
          purchaseDate: true,
          invoiceNumber: true,
          notes: true,
          category: true,
          vendors: {
            select: {
              id: true,
              companyName: true,
              vendorCode: true,
              contactPerson: true,
              category: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      // Group legacy entries by vendorId + invoiceNumber / date
      const legacyGroups = new Map<string, typeof legacyEntries>();
      for (const entry of legacyEntries) {
        const key = `${entry.vendors.id}__${entry.invoiceNumber || entry.id}`;
        if (!legacyGroups.has(key)) {
          legacyGroups.set(key, []);
        }
        legacyGroups.get(key)!.push(entry);
      }

      for (const [, entries] of legacyGroups) {
        if (recentPurchases.length >= limit) break;
        const first = entries[0];
        const items: RecentPurchaseItem[] = entries.map((e) => ({
          id: e.id,
          itemName: e.itemName,
          itemDescription: e.itemDescription,
          quantity: Number(e.quantity),
          unitPrice: Number(e.unitPrice),
          totalPrice: Number(e.totalPrice),
          status: e.status,
        }));

        const totalAmount = items.reduce((sum, it) => sum + it.totalPrice, 0);

        recentPurchases.push({
          id: `legacy_${first.id}`,
          invoiceNumber: first.invoiceNumber,
          purchaseDate: first.purchaseDate.toISOString(),
          totalAmount,
          paidAmount: 0,
          balanceAmount: totalAmount,
          paymentStatus: first.status === 'PAID' ? 'PAID' : first.status === 'PARTIAL' ? 'PARTIAL' : 'PENDING',
          status: 'ACTIVE',
          category: String(first.category),
          categoryName: first.vendors?.category?.name,
          categorySlug: first.vendors?.category?.slug,
          notes: first.notes,
          recordedBy: first.user?.name || first.user?.email || null,
          vendor: {
            id: first.vendors.id,
            companyName: first.vendors.companyName,
            vendorCode: first.vendors.vendorCode,
            contactPerson: first.vendors.contactPerson,
            category: first.vendors.category,
          },
          items,
          paymentCount: 0,
        });
      }
    }

    return NextResponse.json({
      purchases: recentPurchases.slice(0, limit),
      count: Math.min(recentPurchases.length, limit),
    });
  } catch (error) {
    console.error('Error fetching recent vendor purchases:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch recent purchases',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
