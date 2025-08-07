import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/auth-utils';
import { z } from 'zod';

// Validation schemas
const createCustomerSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  email: z.string().email('Invalid email address').optional(),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  customerType: z.enum(['RESIDENTIAL', 'COMMERCIAL', 'INDUSTRIAL']),
  creditLimit: z.number().min(0).default(0),
});

const updateCustomerSchema = createCustomerSchema.partial();

// GET /api/customers - Get all customers with pagination and filtering
export async function GET(request: NextRequest) {
  try {
    // Check permissions
    await requirePermission({ resource: 'customer', action: 'read' });

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const customerType = searchParams.get('customerType') || '';
    const isActive = searchParams.get('isActive');

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (customerType) {
      where.customerType = customerType;
    }

    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    // Get customers with pagination
    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          ledger: {
            take: 5,
            orderBy: { createdAt: 'desc' },
          },
          cylinderRentals: {
            where: { status: 'ACTIVE' },
            take: 5,
          },
        },
      }),
      prisma.customer.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: customers,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error('GET /api/customers error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/customers - Create a new customer
export async function POST(request: NextRequest) {
  try {
    // Check permissions
    await requirePermission({ resource: 'customer', action: 'create' });

    const body = await request.json();
    
    // Validate input
    const validatedData = createCustomerSchema.parse(body);

    // Check if customer with same email already exists
    if (validatedData.email) {
      const existingCustomer = await prisma.customer.findFirst({
        where: { email: validatedData.email },
      });

      if (existingCustomer) {
        return NextResponse.json(
          { success: false, message: 'Customer with this email already exists' },
          { status: 409 }
        );
      }
    }

    // Generate unique customer code
    const customerCode = `CUST${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

    // Create customer
    const customer = await prisma.customer.create({
      data: {
        ...validatedData,
        code: customerCode,
      },
      include: {
        ledger: true,
        cylinderRentals: true,
      },
    });

    return NextResponse.json(
      { success: true, data: customer, message: 'Customer created successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/customers error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Validation error', 
          errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        },
        { status: 400 }
      );
    }
    
    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
