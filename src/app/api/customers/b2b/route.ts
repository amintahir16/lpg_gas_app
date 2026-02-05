import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const type = searchParams.get('type') || 'B2B';

    // New Filters
    const filterStatus = searchParams.get('status') || 'ALL'; // 'ACTIVE' | 'INACTIVE' | 'ALL'
    const filterType = searchParams.get('customerType') || 'ALL'; // 'INDUSTRIAL' | 'RESTAURANT' | 'ALL'

    // Sorting
    const sortBy = searchParams.get('sortBy') || 'createdAt'; // 'RECEIVABLES' | 'CYLINDERS' | 'NAME' | 'createdAt'
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

    const skip = (page - 1) * limit;

    // 1. Base Filter (Search & Type)
    const whereClause: any = {
      type: type,

      // isActive was previously filtered here, but that hides manually 'Inactive' customers.
      // We now handle active/inactive logic via the complex filter below.
    };

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { contactPerson: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (filterType !== 'ALL') {
      whereClause.notes = {
        contains: `Customer Type: ${filterType}`,
      };
    }

    // 2. Fetch ALL matching customers first (needed for Active/Inactive filter which relies on relation)
    // We have to fetch ID and some fields to determine status if filtering by status.
    // Optimization: If NOT filtering by status, we can just paginate directly. 
    // BUT we need summary stats for everything effectively. 
    // To be robust, let's fetch essential data for filtering first.

    let allMatchingCustomers = await prisma.customer.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        contactPerson: true,
        phone: true,
        email: true,
        notes: true,
        ledgerBalance: true,
        domestic118kgDue: true,
        standard15kgDue: true,
        commercial454kgDue: true,

        address: true,
        creditLimit: true,
        paymentTermsDays: true,
        marginCategoryId: true,
        createdAt: true,
        isActive: true,
        // Fetch most recent transaction date for "Active" status check
        b2bTransactions: {
          take: 1,
          orderBy: { date: 'desc' },
          select: { date: true }
        }
      },
      orderBy: { createdAt: 'desc' } // Default sort for initial fetch
    });

    // 3. Apply "Active/Inactive" Filter in Memory (Complex Relation Logic)
    // Active = Last transaction within 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const enrichedCustomers = allMatchingCustomers.map(c => {
      const lastTxDate = c.b2bTransactions[0]?.date;
      const recentActivity = lastTxDate ? new Date(lastTxDate) >= sevenDaysAgo : false;
      // Customer is ACTIVE if they are manually set to active OR have recent activity
      const isEffectivelyActive = c.isActive || recentActivity;
      return { ...c, isEffectivelyActive };
    });

    let filteredCustomers = enrichedCustomers;
    if (filterStatus === 'ACTIVE') {
      filteredCustomers = enrichedCustomers.filter(c => c.isEffectivelyActive);
    } else if (filterStatus === 'INACTIVE') {
      filteredCustomers = enrichedCustomers.filter(c => !c.isEffectivelyActive);
    }

    // 4. Calculate Summary Statistics (On Filtered Data)
    const totalCustomers = filteredCustomers.length;

    const totalReceivables = filteredCustomers.reduce((sum, c) => {
      // Only count positive balance (Customer owes us)
      return sum + (Number(c.ledgerBalance) > 0 ? Number(c.ledgerBalance) : 0);
    }, 0);

    // --- Helper for Holdings Calculation (Hoisted for Sorting) ---
    const getHoldings = async (targetCustomers: { id: string, name: string }[]) => {
      if (targetCustomers.length === 0) return { map: {}, types: new Set<string>() };

      const customerIds = targetCustomers.map(c => c.id);

      // Optimization: constructing OR clause for names might be heavy if list is huge, 
      // but for PAGINATED (limit=10), it's fine.
      const locationMatches = targetCustomers.map(c => ({
        location: { contains: c.name, mode: 'insensitive' as const }
      }));
      const idMatches = customerIds.map(id => ({
        location: { contains: id }
      }));

      const assignedCylinders = await prisma.cylinder.findMany({
        where: {
          currentStatus: 'WITH_CUSTOMER',
          OR: [
            { cylinderRentals: { some: { customerId: { in: customerIds }, status: 'ACTIVE' } } },
            ...idMatches,
            ...locationMatches
          ]
        },
        select: {
          cylinderType: true,
          typeName: true,
          capacity: true,
          cylinderRentals: { where: { status: 'ACTIVE' }, select: { customerId: true } },
          location: true
        }
      });

      const map: Record<string, Record<string, number>> = {};
      const types = new Set<string>();

      assignedCylinders.forEach(cyl => {
        // Determine Holder
        let holderId = cyl.cylinderRentals[0]?.customerId;

        if (!holderId) {
          // Fallback to location matching
          const foundCustomer = targetCustomers.find(c =>
            (cyl.location && cyl.location.includes(c.id)) ||
            (cyl.location && c.name && cyl.location.toLowerCase().includes(c.name.toLowerCase()))
          );
          if (foundCustomer) holderId = foundCustomer.id;
        }

        if (holderId) {
          if (!map[holderId]) map[holderId] = {};

          // Determine Key (Use Raw Cylinder Type Code)
          let key = cyl.cylinderType;

          map[holderId][key] = (map[holderId][key] || 0) + 1;
          types.add(key);
        }
      });
      return { map, types };
    };

    // Calculate Total Profit for ALL filtered customers
    // This is an expensive operation so we try to be efficient by fetching only necessary fields
    // We need all SALE transactions for the filtered customers

    // First, get all customer IDs efficiently
    const allCustomerIds = filteredCustomers.map(c => c.id);

    // Fetch all SALE transactions for these customers with their items
    // Minimal selection for performance
    const profitTransactions = await prisma.b2BTransaction.findMany({
      where: {
        customerId: { in: allCustomerIds },
        transactionType: 'SALE'
      },
      select: {
        customerId: true,
        items: {
          select: {
            quantity: true,
            cylinderType: true,
            pricePerItem: true, // Selling Price
            costPrice: true,
            // We need to know if it's an accessory or gas item. 
            // CylinderType exists = Gas, else Accessory
          }
        }
      }
    });

    // Create a map of customer margin categories for quick lookup
    // filteredCustomers already has marginCategoryId. We need the actual margin values.
    // Let's fetch all margin categories once and map them.
    const uniqueMarginCategoryIds = Array.from(new Set(filteredCustomers.map(c => c.marginCategoryId).filter(Boolean)));
    const marginCategories = await prisma.marginCategory.findMany({
      where: { id: { in: uniqueMarginCategoryIds as string[] } },
      select: { id: true, marginPerKg: true }
    });

    const marginMap = new Map();
    marginCategories.forEach(mc => {
      marginMap.set(mc.id, Number(mc.marginPerKg));
    });

    // Map filtered customers to their margin category ID for O(1) lookup during transaction iteration
    const customerMarginMap = new Map();
    filteredCustomers.forEach(c => {
      customerMarginMap.set(c.id, c.marginCategoryId);
    });

    let totalProfit = 0;

    profitTransactions.forEach(tx => {
      const marginCategoryId = customerMarginMap.get(tx.customerId);
      const marginPerKg = marginCategoryId ? (marginMap.get(marginCategoryId) || 0) : 0;

      tx.items.forEach(item => {
        const itemQty = Number(item.quantity);

        if (item.cylinderType) {
          // Gas Item: Profit = Quantity * Capacity * MarginPerKg
          let capacity = 15; // default
          // Parse capacity
          const match = item.cylinderType.match(/(\d+)(?:_(\d+))?/);
          if (match) {
            const whole = match[1];
            const decimal = match[2];
            capacity = decimal ? parseFloat(`${whole}.${decimal}`) : parseFloat(whole);
          } else if (item.cylinderType.includes('kg')) {
            // Handle custom string like "Commercial (45.4kg)"
            const customMatch = item.cylinderType.match(/(\d+(?:\.\d+)?)kg/);
            if (customMatch) {
              capacity = parseFloat(customMatch[1]);
            }
          }

          totalProfit += (itemQty * capacity * marginPerKg);

        } else {
          // Accessory Item: Profit = (Selling - Cost) * Qty
          const sellingPrice = Number(item.pricePerItem);
          const costPrice = Number(item.costPrice || 0);

          if (costPrice > 0) {
            totalProfit += (sellingPrice - costPrice) * itemQty;
          } else {
            // Fallback: 20% margin
            totalProfit += (sellingPrice * 0.20) * itemQty;
          }
        }
      });
    });


    // 5. Apply Manual Sorting
    if (sortBy === 'RECEIVABLES') {
      filteredCustomers.sort((a, b) => {
        const valA = Number(a.ledgerBalance);
        const valB = Number(b.ledgerBalance);
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      });
    } else if (sortBy === 'CYLINDERS') {
      // Fetch physical holdings for ALL filtered customers to sort correctly
      // (Legacy due fields are obsolete, so we must count real cylinders)
      const allHoldingsData = await getHoldings(filteredCustomers.map(c => ({ id: c.id, name: c.name })));

      filteredCustomers.sort((a, b) => {
        const holdingsA = allHoldingsData.map[a.id] || {};
        const holdingsB = allHoldingsData.map[b.id] || {};

        const totalA = Object.values(holdingsA).reduce((sum, count) => sum + count, 0);
        const totalB = Object.values(holdingsB).reduce((sum, count) => sum + count, 0);

        return sortOrder === 'asc' ? totalA - totalB : totalB - totalA;
      });
    } else if (sortBy === 'NAME') {
      filteredCustomers.sort((a, b) => {
        return sortOrder === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      });
    } else {
      // Default/createdAt sort
      filteredCustomers.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      });
    }

    // 6. Pagination
    const pages = Math.ceil(totalCustomers / limit);
    const paginatedCustomers = filteredCustomers.slice(skip, skip + limit);

    // 7. Fetch Dynamic Holdings for Paginated Customers AND Global Summary
    // We need two things:
    // A) Holdings for the current page (Table display)
    // B) Total Cylinder Dues Summary (Top Cards) - This should be for ALL filtered customers, not just page.
    // However, fetching holdings for ALL customers might be heavy. 
    // The requirement says "Total Cylinders With Customers".
    // For now, let's rely on the `due` columns for specific types if possible, BUT user stressed dynamic.
    // We will do a separate aggregation for the Summary Card to be 100% accurate on dynamic types.

    // 7. Fetch Dynamic Holdings for Paginated Customers AND Global Summary
    const pageCustomerIds = paginatedCustomers.map(c => c.id);
    const allFilteredCustomerIds = filteredCustomers.map(c => c.id);

    // Parallel fetch: Page Holdings (Details), Total Summary Holdings (Aggregated), and Type Definitions
    const [pageHoldings, summaryCylinderStats, cylinderDefinitions] = await Promise.all([
      getHoldings(paginatedCustomers.map(c => ({ id: c.id, name: c.name }))),
      prisma.cylinder.findMany({
        where: {
          currentStatus: 'WITH_CUSTOMER',
          OR: [
            { cylinderRentals: { some: { customerId: { in: allFilteredCustomerIds }, status: 'ACTIVE' } } },
            ...allFilteredCustomerIds.map(id => ({ location: { contains: id } })),
            ...filteredCustomers.map(c => ({ location: { contains: c.name, mode: 'insensitive' as const } }))
          ]
        },
        select: { cylinderType: true }
      }),
      // Fetch definitions for all types
      prisma.cylinder.findMany({
        distinct: ['cylinderType'],
        select: { cylinderType: true, typeName: true, capacity: true }
      })
    ]);

    // Create Type Definitions Map for Frontend (matches B2C logic)
    const typeDefinitions: Record<string, { name: string, capacity: number }> = {};
    cylinderDefinitions.forEach(def => {
      let displayName = 'Cylinder';
      if (def.typeName && def.typeName.trim().toLowerCase() !== 'cylinder') {
        displayName = def.typeName.trim();
      } else {
        const upperType = def.cylinderType.toUpperCase();
        if (upperType.includes('DOMESTIC')) displayName = 'Domestic';
        else if (upperType.includes('STANDARD')) displayName = 'Standard';
        else if (upperType.includes('COMMERCIAL')) displayName = 'Commercial';
      }
      typeDefinitions[def.cylinderType] = {
        name: displayName,
        capacity: Number(def.capacity)
      };
    });

    // Standard Cylinder Map (Enums to Legacy Fields)
    const STANDARD_CYLINDER_MAP: Record<string, keyof typeof allMatchingCustomers[0]> = {
      'DOMESTIC_11_8KG': 'domestic118kgDue',
      'STANDARD_15KG': 'standard15kgDue',
      'COMMERCIAL_45_4KG': 'commercial454kgDue'
    };

    // Calculate Global Cylinder Summary (Count by Type)
    const totalCylindersSummary: Record<string, number> = {};
    const physicalSummary: Record<string, number> = {};

    // Use raw cylinderType as key - NO formatting here
    summaryCylinderStats.forEach(cyl => {
      const key = cyl.cylinderType;
      physicalSummary[key] = (physicalSummary[key] || 0) + 1;
    });

    // Merge logic
    Object.entries(physicalSummary).forEach(([type, count]) => {
      totalCylindersSummary[type] = (totalCylindersSummary[type] || 0) + count;
    });

    let totalCylindersCount = Object.values(totalCylindersSummary).reduce((a, b) => a + b, 0);

    // Enrich Paginated Customers with Holdings
    // For each customer, merge their specific physical holdings with their specific legacy dues
    const finalCustomers = paginatedCustomers.map(c => {
      const physicalHoldings = pageHoldings.map[c.id] || {};
      const mergedHoldings: Record<string, number> = { ...physicalHoldings };
      return {
        ...c,
        isActive: (c as any).isEffectivelyActive,
        holdings: mergedHoldings
      };
    });

    const uniqueCylinderTypes = Array.from(new Set([
      ...pageHoldings.types,
      ...Object.keys(totalCylindersSummary)
    ])).sort();

    return NextResponse.json({
      customers: finalCustomers,
      cylinderTypes: uniqueCylinderTypes,
      typeDefinitions, // Return definitions
      pagination: {
        page,
        limit,
        total: totalCustomers,
        pages,
      },
      summary: {
        totalCustomers,
        totalReceivables,
        totalCylinders: totalCylindersCount,
        cylinderBreakdown: totalCylindersSummary,
        totalProfit
      }
    });

  } catch (error) {
    console.error('Error fetching B2B customers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch B2B customers' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      contactPerson,
      email,
      phone,
      address,
      creditLimit,
      paymentTermsDays,
      notes,
      customerType,
      type = 'B2B',
      marginCategoryId
    } = body;

    // Combine customer type with notes
    const combinedNotes = customerType ?
      `Customer Type: ${customerType}${notes ? ` | ${notes}` : ''}` :
      notes;

    const customer = await prisma.customer.create({
      data: {
        name,
        contactPerson,
        email,
        phone,
        address,
        creditLimit: creditLimit ? parseFloat(creditLimit) : 0,
        paymentTermsDays: paymentTermsDays ? parseInt(paymentTermsDays) : 30,
        notes: combinedNotes,
        type,
        createdBy: session.user.id,
        marginCategoryId: marginCategoryId || null,
      },
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    console.error('Error creating B2B customer:', error);
    return NextResponse.json(
      { error: 'Failed to create B2B customer' },
      { status: 500 }
    );
  }
}
