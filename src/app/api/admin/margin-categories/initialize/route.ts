import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { initializeDefaultCategories } from '@/lib/margin-categories';

/**
 * POST /api/admin/margin-categories/initialize
 * Manually initialize default margin categories
 * 
 * Query params:
 * - customerType: 'B2C' | 'B2B' | 'ALL' (default: 'ALL')
 * 
 * This endpoint allows admins to manually trigger category initialization
 * via UI buttons. It's idempotent - safe to call multiple times.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Admin access required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const customerTypeParam = searchParams.get('customerType');
    
    // Validate customerType parameter
    const customerType = customerTypeParam === 'B2C' || customerTypeParam === 'B2B' 
      ? customerTypeParam 
      : 'ALL';

    // Initialize categories
    const result = await initializeDefaultCategories(customerType);

    return NextResponse.json({
      success: true,
      message: `Categories initialized successfully. Created: ${result.created}, Updated: ${result.updated}`,
      created: result.created,
      updated: result.updated,
      customerType: customerType === 'ALL' ? 'B2C and B2B' : customerType,
    }, { status: 200 });
  } catch (error) {
    console.error('Error initializing categories:', error);
    return NextResponse.json(
      { 
        error: 'Internal Server Error', 
        message: 'Failed to initialize categories',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

