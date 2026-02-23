import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || '';
    const customerType = searchParams.get('customerType') || 'ALL';

    // Build where clause
    const where: any = {
      currentStatus: 'WITH_CUSTOMER'
    };

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
        {
          cylinderRentals: {
            some: {
              customer: {
                OR: [
                  { name: { contains: search, mode: 'insensitive' } },
                  { contactPerson: { contains: search, mode: 'insensitive' } }
                ]
              }
            }
          }
        }
      ];
    }

    // Build type filter condition
    if (type && type !== 'ALL') {
      if (type.includes('(') && type.includes('kg)')) {
        const nameMatch = type.match(/^([^(]+)\s*\((\d+\.?\d*)kg\)/);
        if (nameMatch) {
          const extractedTypeName = nameMatch[1].trim();
          const capacity = parseFloat(nameMatch[2]);
          where.typeName = extractedTypeName;
          where.capacity = capacity;
        } else {
          where.cylinderType = type;
        }
      } else {
        where.cylinderType = type;
      }
    }

    // Get cylinders with customers
    const cylinders = await prisma.cylinder.findMany({
      where,
      include: {
        cylinderRentals: {
          where: {
            status: 'ACTIVE'
          },
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                contactPerson: true,
                phone: true,
                email: true,
                address: true
              }
            }
          },
          orderBy: {
            rentalDate: 'desc'
          },
          take: 1 // Get the latest rental
        }
      }
    });

    // Extract unique customer names from B2C cylinders (no rentals)
    const b2cCylinders = cylinders.filter(c => c.cylinderRentals.length === 0);
    const customerNames = new Set<string>();
    b2cCylinders.forEach(cyl => {
      const location = cyl.location || '';
      if (location.includes('Customer:')) {
        const customerName = location.split('Customer:')[1]?.trim();
        if (customerName) {
          customerNames.add(customerName);
        }
      }
    });

    // Batch fetch all customers
    const customerMap = new Map<string, any>();

    if (customerNames.size > 0) {
      const [b2bCustomers, b2cCustomers] = await Promise.all([
        prisma.customer.findMany({
          where: {
            OR: Array.from(customerNames).map(name => ({
              name: { contains: name, mode: 'insensitive' }
            }))
          },
          select: {
            id: true,
            name: true,
            contactPerson: true,
            phone: true,
            email: true,
            address: true
          }
        }),
        prisma.b2CCustomer.findMany({
          where: {
            OR: Array.from(customerNames).map(name => ({
              name: { contains: name, mode: 'insensitive' }
            }))
          },
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            address: true
          }
        })
      ]);

      // Build customer map (B2B first, then B2C)
      b2bCustomers.forEach(c => customerMap.set(c.name.toLowerCase(), { data: c, isB2B: true }));
      b2cCustomers.forEach(c => {
        if (!customerMap.has(c.name.toLowerCase())) { // Don't override if already matched as B2B
          const mapped = {
            id: c.id,
            name: c.name,
            contactPerson: c.name,
            phone: c.phone,
            email: c.email,
            address: c.address
          };
          customerMap.set(c.name.toLowerCase(), { data: mapped, isB2B: false });
        }
      });
    }

    // Process the data to match the expected format
    const customerCylinders = cylinders.map((cylinder) => {
      // Check if it has B2B rental
      if (cylinder.cylinderRentals.length > 0) {
        return {
          id: cylinder.id,
          code: cylinder.code,
          cylinderType: cylinder.cylinderType,
          typeName: cylinder.typeName,
          currentStatus: cylinder.currentStatus,
          customer: cylinder.cylinderRentals[0].customer,
          rental: {
            id: cylinder.cylinderRentals[0].id,
            rentalDate: cylinder.cylinderRentals[0].rentalDate,
            expectedReturnDate: cylinder.cylinderRentals[0].expectedReturnDate,
            rentalAmount: cylinder.cylinderRentals[0].rentalAmount,
            depositAmount: cylinder.cylinderRentals[0].depositAmount,
            status: cylinder.cylinderRentals[0].status
          },
          isB2B: true
        };
      } else {
        // B2C cylinder - parse customer name from location
        const location = cylinder.location || '';
        let customerName = '';

        // Extract customer name from location like "Customer: Restaurant Elite" or "B2C Customer: Sara Ali"
        if (location.includes('Customer:')) {
          customerName = location.split('Customer:')[1]?.trim() || '';
        }

        const customerEntry = customerName ? customerMap.get(customerName.toLowerCase()) : null;
        const customerInfo = customerEntry ? customerEntry.data : null;
        const actualIsB2B = customerEntry ? customerEntry.isB2B : false; // Use the stored flag

        return {
          id: cylinder.id,
          code: cylinder.code,
          cylinderType: cylinder.cylinderType,
          typeName: cylinder.typeName,
          currentStatus: cylinder.currentStatus,
          customer: customerInfo || {
            id: '',
            name: customerName || 'Unknown Customer',
            contactPerson: customerName || 'Unknown',
            phone: '',
            email: '',
            address: ''
          },
          rental: {
            id: '',
            rentalDate: new Date().toISOString(),
            expectedReturnDate: undefined,
            rentalAmount: undefined,
            depositAmount: undefined,
            status: 'ACTIVE'
          },
          isB2B: actualIsB2B
        };
      }
    });

    // Apply customer type filter (B2B vs B2C)
    const filteredCylinders = customerType !== 'ALL' ?
      customerCylinders.filter(item => {
        if (customerType === 'B2B') return item.isB2B === true;
        if (customerType === 'B2C') return item.isB2B === false;
        return true;
      }) :
      customerCylinders;

    return NextResponse.json({
      success: true,
      customerCylinders: filteredCylinders
    });
  } catch (error) {
    console.error('Error fetching customer cylinders:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch customer cylinders' },
      { status: 500 }
    );
  }
}
