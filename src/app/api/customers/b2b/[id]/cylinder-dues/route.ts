import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCylinderTypeDisplayName, normalizeTypeName } from '@/lib/cylinder-utils';
import { getActiveRegionId, regionScopedWhere } from '@/lib/region';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const regionId = getActiveRegionId(request);
    const { id: customerId } = await params;
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Get customer to find their name for location matching (region-scoped)
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, ...regionScopedWhere(regionId) },
      select: { name: true }
    });

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Get cylinders with this customer grouped by cylinderType, typeName, and capacity (region-scoped)
    const cylinderDues = await prisma.cylinder.groupBy({
      by: ['cylinderType', 'typeName', 'capacity'],
      where: {
        currentStatus: 'WITH_CUSTOMER',
        location: {
          contains: customer.name
        },
        ...regionScopedWhere(regionId),
      },
      _count: {
        id: true
      }
    });

    // Build transaction filter (region-scoped)
    const transactionWhere: any = { customerId, ...regionScopedWhere(regionId) };
    if (startDate || endDate) {
      transactionWhere.date = {};
      if (startDate) {
        transactionWhere.date.gte = new Date(startDate);
      }
      if (endDate) {
        const endDateObj = new Date(endDate);
        endDateObj.setHours(23, 59, 59, 999);
        transactionWhere.date.lte = endDateObj;
      }
    }

    // Fetch transactions with items to calculate cumulative stats
    const transactions = await prisma.b2BTransaction.findMany({
      where: transactionWhere,
      include: {
        items: true,
      },
    });

    // Helper to categorize items (replicated from report API for robustness)
    const categorizeItems = (items: any[]) => {
      const buybackItems: any[] = [];
      items.forEach(item => {
        // A buyback item is definitively identified by buybackRate being set
        const hasBuybackRateSet = item.buybackRate !== null && item.buybackRate !== undefined;
        if (hasBuybackRateSet) {
          buybackItems.push(item);
        }
      });
      return { buybackItems };
    };

    // Calculate cumulative stats per cylinder type
    const cumulativeStats = new Map<string, { buybackWeight: number, buybackCredit: number }>();

    transactions.forEach(transaction => {
      const { buybackItems } = categorizeItems(transaction.items || []);
      buybackItems.forEach((item: any) => {
        if (item.cylinderType) {
          const stats = cumulativeStats.get(item.cylinderType) || { buybackWeight: 0, buybackCredit: 0 };
          const qty = item.quantity ? Number(item.quantity) : 0;
          
          if (item.remainingKg) {
            stats.buybackWeight += Number(item.remainingKg) * qty;
          }
          if (item.totalPrice) {
            stats.buybackCredit += Number(item.totalPrice);
          }
          
          cumulativeStats.set(item.cylinderType, stats);
        }
      });
    });

    // Process cylinder dues with proper display names (same logic as inventory stats)
    const uniqueCombinations = [...new Set(
      cylinderDues.map(stat => {
        const normalizedTypeName = stat.typeName 
          ? stat.typeName.toLowerCase().trim() 
          : 'null';
        return `${stat.cylinderType}|||${stat.capacity?.toString() || 'null'}|||${normalizedTypeName}`;
      })
    )];

    // Ensure we include cylinder types that had buybacks but might not be currently "WITH_CUSTOMER"
    cumulativeStats.forEach((_, cylinderType) => {
      const exists = cylinderDues.some(d => d.cylinderType === cylinderType);
      if (!exists) {
        uniqueCombinations.push(`${cylinderType}|||null|||null`);
      }
    });

    const finalUniqueCombinations = [...new Set(uniqueCombinations)];

    const processedDues = finalUniqueCombinations.map(combination => {
      const [type, capacityStr, normalizedTypeNameLower] = combination.split('|||');
      const capacity = capacityStr !== 'null' ? parseFloat(capacityStr) : null;
      const normalizedTypeNameLowercase = normalizedTypeNameLower !== 'null' ? normalizedTypeNameLower : null;

      // Find all dues for this combination
      const duesForCombination = cylinderDues.filter(stat => {
        const statCapacityStr = stat.capacity?.toString() || 'null';
        const statTypeNameLower = stat.typeName 
          ? stat.typeName.toLowerCase().trim() 
          : 'null';
        return (
          stat.cylinderType === type &&
          statCapacityStr === capacityStr &&
          statTypeNameLower === normalizedTypeNameLowercase
        );
      });

      const totalCount = duesForCombination.reduce((sum, stat) => sum + stat._count.id, 0);

      // Get cumulative stats for this type
      const stats = cumulativeStats.get(type) || { buybackWeight: 0, buybackCredit: 0 };

      // Display logic
      let displayType: string;
      const normalizedTypeName = normalizeTypeName(normalizedTypeNameLowercase);
      const trimmedTypeName = normalizedTypeName ? String(normalizedTypeName).trim() : '';
      
      if (trimmedTypeName && trimmedTypeName !== '' && trimmedTypeName !== 'Cylinder') {
        displayType = `${trimmedTypeName} (${capacity !== null ? capacity : 'N/A'}kg)`;
      } else if (capacity !== null) {
        displayType = `Cylinder (${capacity}kg)`;
      } else {
        displayType = getCylinderTypeDisplayName(type);
      }

      return {
        cylinderType: type,
        displayName: displayType,
        count: totalCount,
        buybackWeight: stats.buybackWeight,
        buybackCredit: stats.buybackCredit
      };
    });

    // Deduplicate by display name and merge counts/stats
    const uniqueDuesMap = new Map<string, any>();
    processedDues.forEach(due => {
      const key = due.displayName;
      if (!uniqueDuesMap.has(key)) {
        uniqueDuesMap.set(key, due);
      } else {
        const existing = uniqueDuesMap.get(key)!;
        existing.count += due.count;
        existing.buybackWeight += due.buybackWeight;
        existing.buybackCredit += due.buybackCredit;
      }
    });

    const dues = Array.from(uniqueDuesMap.values());
    dues.sort((a, b) => a.displayName.localeCompare(b.displayName));

    return NextResponse.json({
      success: true,
      cylinderDues: dues
    });
  } catch (error) {
    console.error('Error fetching cylinder dues:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cylinder dues' },
      { status: 500 }
    );
  }
}

