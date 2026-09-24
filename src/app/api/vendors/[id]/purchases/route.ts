import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { InventoryIntegrationService } from '@/lib/inventory-integration';
import { getActiveRegionId, regionScopedWhere } from '@/lib/region';
import { ActivityAction, logActivity } from '@/lib/activityLogger';

// GET all purchases for a vendor
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found in database' }, { status: 401 });
    }

    const regionId = getActiveRegionId(request);
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = {
      vendorId: id,
      ...regionScopedWhere(regionId),
    };

    if (startDate && endDate) {
      where.purchaseDate = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const purchases = await prisma.purchaseEntry.findMany({
      where,
      include: {
        purchaseBatch: {
          select: {
            id: true,
            status: true,
            undoReason: true,
            undoneAt: true,
            undoneBy: true,
          },
        },
      },
      orderBy: { purchaseDate: 'desc' }
    });

    return NextResponse.json({ purchases });
  } catch (error) {
    console.error('Error fetching purchases:', error);
    return NextResponse.json(
      { error: 'Failed to fetch purchases' },
      { status: 500 }
    );
  }
}

// POST - Create new purchase
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found in database' }, { status: 401 });
    }

    const regionId = getActiveRegionId(request);
    const { id } = await params;
    const body = await request.json();
    const { items, invoiceNumber, notes, purchaseDate, paidAmount, paymentMethod, totalAmount: requestTotalAmount } = body;

    console.log('Received purchase data:', {
      vendorId: id,
      invoiceNumber,
      itemsCount: items?.length,
      notes,
      purchaseDate,
      paidAmount,
      paymentMethod,
      requestTotalAmount
    });

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'At least one item is required' },
        { status: 400 }
      );
    }

    const resolvedPurchaseDate = purchaseDate ? new Date(purchaseDate) : new Date();
    if (Number.isNaN(resolvedPurchaseDate.getTime())) {
      return NextResponse.json({ error: 'Invalid purchase date/time' }, { status: 400 });
    }

    // Calculate total from items with 2-decimal precision (no roundoff)
    const calculatedItemsTotal = Math.round(
      items.reduce(
        (sum: number, item: any) => sum + Number(item.totalPrice || 0),
        0
      ) * 100
    ) / 100;

    // Use requested totalAmount if provided, otherwise calculatedItemsTotal
    const totalAmount = (requestTotalAmount !== undefined && requestTotalAmount !== null && !isNaN(Number(requestTotalAmount)))
      ? Math.round(Number(requestTotalAmount) * 100) / 100
      : calculatedItemsTotal;

    // If totalAmount was adjusted relative to items, adjust items' totalPrice proportionally
    // so sum(items.totalPrice) identically equals totalAmount (ensuring reports, balances, and entries match 100%)
    let processedItems = items;
    if (Math.abs(totalAmount - calculatedItemsTotal) > 0.001 && items.length > 0) {
      if (items.length === 1) {
        const single = items[0];
        const unitPrice = Number(single.quantity) > 0
          ? Math.round((totalAmount / Number(single.quantity)) * 100) / 100
          : Number(single.unitPrice);
        processedItems = [{
          ...single,
          totalPrice: totalAmount,
          unitPrice
        }];
      } else if (calculatedItemsTotal > 0) {
        const ratio = totalAmount / calculatedItemsTotal;
        let runningTotal = 0;
        processedItems = items.map((it: any, idx: number) => {
          if (idx === items.length - 1) {
            const lastTotal = Math.round((totalAmount - runningTotal) * 100) / 100;
            const unitPrice = Number(it.quantity) > 0
              ? Math.round((lastTotal / Number(it.quantity)) * 100) / 100
              : Number(it.unitPrice);
            return {
              ...it,
              totalPrice: lastTotal,
              unitPrice
            };
          }
          const itTotal = Math.round(Number(it.totalPrice) * ratio * 100) / 100;
          runningTotal += itTotal;
          const unitPrice = Number(it.quantity) > 0
            ? Math.round((itTotal / Number(it.quantity)) * 100) / 100
            : Number(it.unitPrice);
          return {
            ...it,
            totalPrice: itTotal,
            unitPrice
          };
        });
      }
    }

    const paid = Number(paidAmount || 0);
    const balance = totalAmount - paid;
    const pendingAmount = Math.max(0, totalAmount - paid);

    // Determine individual purchase entry status: if pending amount <= 10, considered PAID
    let entryStatus: 'PENDING' | 'PAID' | 'PARTIAL' = 'PENDING';
    if (pendingAmount <= 10) entryStatus = 'PAID';
    else if (paid > 0) entryStatus = 'PARTIAL';
    else entryStatus = 'PENDING';

    console.log('Creating purchase with invoice number:', invoiceNumber);

    // Use database transaction to ensure purchase, payment, and inventory updates succeed together
    const purchase = await prisma.$transaction(async (tx) => {
      const vendor = await tx.vendor.findUnique({
        where: { id },
        include: { category: true }
      });

      if (!vendor) {
        throw new Error('Vendor not found');
      }

      const getCategoryEnum = (slug: string | null | undefined): string => {
        if (!slug) return 'GAS_PURCHASE';

        const slugLower = slug.toLowerCase();
        if (slugLower.includes('cylinder') || slugLower === 'cylinder_purchase') {
          return 'CYLINDER_PURCHASE';
        } else if (slugLower.includes('gas') || slugLower === 'gas_purchase') {
          return 'GAS_PURCHASE';
        } else if (slugLower.includes('vaporizer') || slugLower === 'vaporizer_purchase') {
          return 'VAPORIZER_PURCHASE';
        } else if (slugLower.includes('accessories') || slugLower === 'accessories_purchase') {
          return 'ACCESSORIES_PURCHASE';
        } else if (slugLower.includes('valve') || slugLower === 'valves_purchase') {
          return 'VALVES_PURCHASE';
        }
        return 'GAS_PURCHASE';
      };

      const categoryEnum = getCategoryEnum(vendor.category?.slug);

      const batch = await tx.vendorPurchaseBatch.create({
        data: {
          vendorId: id,
          invoiceNumber: invoiceNumber || null,
          category: categoryEnum as any,
          purchaseDate: resolvedPurchaseDate,
          totalAmount,
          notes: notes || null,
          status: 'ACTIVE',
          createdBy: session.user.id,
          ...(regionId ? { regionId } : {}),
        },
      });

      const purchaseEntries = await Promise.all(
        processedItems.map((item: any) => {
          let itemDescription = item.itemDescription || null;
          if (categoryEnum === 'ACCESSORIES_PURCHASE') {
            if (item.category) {
              itemDescription = item.category;
            } else {
              console.log('⚠️ Category not provided in item data for accessories purchase:', item.itemName);
            }
          }

          return tx.purchaseEntry.create({
            data: {
              vendorId: id,
              userId: session.user.id,
              category: categoryEnum as any,
              itemName: item.itemName,
              itemDescription: itemDescription,
              quantity: Number(item.quantity),
              unitPrice: Number(item.unitPrice),
              totalPrice: Number(item.totalPrice),
              status: entryStatus as any,
              purchaseDate: resolvedPurchaseDate,
              invoiceNumber,
              notes,
              purchaseBatchId: batch.id,
              ...(regionId ? { regionId } : {}),
            }
          });
        })
      );

      let payment = null;
      if (paid > 0) {
        payment = await tx.vendorPayment.create({
          data: {
            vendorId: id,
            amount: paid,
            paymentDate: resolvedPurchaseDate,
            method: (paymentMethod || 'CASH') as any,
            status: 'COMPLETED',
            description: `Payment for invoice ${invoiceNumber}`,
            createdBy: session.user.id,
            purchaseBatchId: batch.id,
            ...(regionId ? { regionId } : {}),
          }
        });
      }

      const inventoryEffects = await InventoryIntegrationService.processPurchaseItems(
        items,
        vendor.category?.slug,
        regionId,
        tx,
      );

      if (inventoryEffects.length > 0) {
        await tx.purchaseInventoryEffect.createMany({
          data: inventoryEffects.map((effect) => ({
            purchaseBatchId: batch.id,
            effectType: effect.effectType,
            entityType: effect.entityType,
            entityId: effect.entityId,
            itemName: effect.itemName,
            quantity: effect.quantity,
            beforeState: effect.beforeState ?? undefined,
            afterState: effect.afterState ?? undefined,
          })),
        });
      }

      console.log('✅ Inventory integration completed successfully');

      return {
        batch,
        purchaseEntries,
        payment,
        totalAmount,
        paidAmount: paid,
        balanceAmount: balance,
        inventoryEffectCount: inventoryEffects.length,
      };
    });

    console.log('Purchase created and inventory updated successfully:', {
      purchaseEntriesCount: purchase.purchaseEntries.length,
      invoiceNumber,
      totalAmount: purchase.totalAmount,
      batchId: purchase.batch.id,
    });

    const vendorLabel = await prisma.vendor.findUnique({
      where: { id },
      select: { companyName: true, vendorCode: true },
    });

    await logActivity({
      userId: session.user.id,
      action: ActivityAction.VENDOR_PURCHASE_CREATED,
      entityType: 'VENDOR_PURCHASE',
      entityId: purchase.batch.id,
      details: `Created purchase for "${vendorLabel?.companyName || 'vendor'}" • Invoice: ${invoiceNumber || 'N/A'} • Amount: Rs ${Number(purchase.totalAmount).toLocaleString()}${paid > 0 ? ` • Paid: Rs ${paid.toLocaleString()}` : ''}`,
      link: `/vendors/${id}`,
      regionId,
      metadata: {
        vendorId: id,
        purchaseBatchId: purchase.batch.id,
        invoiceNumber: invoiceNumber || null,
        totalAmount: Number(purchase.totalAmount),
        paidAmount: paid,
        entryCount: purchase.purchaseEntries.length,
        inventoryEffectCount: purchase.inventoryEffectCount,
      },
    });

    return NextResponse.json({
      purchase,
      message: 'Purchase created and inventory updated successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating purchase:', error);
    const message = error instanceof Error ? error.message : 'Failed to create purchase';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
