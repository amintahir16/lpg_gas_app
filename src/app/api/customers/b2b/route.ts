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

    const skip = (page - 1) * limit;

    // Build where clause for search
    const whereClause = {
      type: type,
      isActive: true,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { contactPerson: { contains: search, mode: 'insensitive' as const } },
          { phone: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    // Get customers with pagination
    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.customer.count({ where: whereClause }),
    ]);

    // Fetch dynamic cylinder holdings
    // We need to know:
    // 1. All unique cylinder types currently held by customers (to build table columns)
    // 2. The counts per type for each customer in the current page

    const customerIds = customers.map(c => c.id);

    // Fetch all cylinders currently assigned to these customers
    const assignedCylinders = await prisma.cylinder.findMany({
      where: {
        currentStatus: 'WITH_CUSTOMER',
        OR: [
          {
            cylinderRentals: {
              some: {
                customerId: { in: customerIds },
                status: 'ACTIVE'
              }
            }
          },
          {
            // For location based matching, we need to iterate or use specific query. 
            // Since 'location' is a string that might contain the ID.
            // Efficient way: Fetch all WITH_CUSTOMER cylinders, then process in JS? 
            // Or rely on database? 'contains' on a list of IDs is tricky without iterate.
            // But we can simplify: 
            // Most valid assignments should be via CylinderRental. 
            // The location fallback is for safety. 
            // Let's rely on finding any cylinder where location contains ANY of the IDs.
            // Using OR with many 'contains' might be slow but safe for small page size (10).
            OR: customerIds.map(id => ({ location: { contains: id } }))
          }
        ]
      },
      select: {
        id: true,
        cylinderType: true,
        location: true,
        cylinderRentals: {
          where: { status: 'ACTIVE' },
          select: { customerId: true }
        }
      }
    });

    // Process holdings
    // Map: CustomerID -> { [Type]: Count }
    const customerHoldingsMap: Record<string, Record<string, number>> = {};
    const allTypesSet = new Set<string>();

    assignedCylinders.forEach(cylinder => {
      // Determine which customer holds this cylinder
      let holderId: string | null = null;

      // Check active rental first
      const activeRental = cylinder.cylinderRentals.find(r => customerIds.includes(r.customerId));
      if (activeRental) {
        holderId = activeRental.customerId;
      } else {
        // Fallback to location check
        holderId = customerIds.find(id => cylinder.location?.includes(id)) || null;
      }

      if (holderId) {
        if (!customerHoldingsMap[holderId]) {
          customerHoldingsMap[holderId] = {};
        }

        const type = cylinder.cylinderType;
        customerHoldingsMap[holderId][type] = (customerHoldingsMap[holderId][type] || 0) + 1;

        allTypesSet.add(type);
      }
    });

    const uniqueCylinderTypes = Array.from(allTypesSet).sort();

    // Attach holdings to customer objects (or return separately)
    // Since `customers` is Prisma object, let's return a separate map or enriched objects
    const enrichedCustomers = customers.map(customer => ({
      ...customer,
      holdings: customerHoldingsMap[customer.id] || {}
    }));

    const pages = Math.ceil(total / limit);

    return NextResponse.json({
      customers: enrichedCustomers,
      cylinderTypes: uniqueCylinderTypes,
      pagination: {
        page,
        limit,
        total,
        pages,
      },
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
