import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * Price Calculation Logic:
 * 1. Get customer's margin category (margin per kg)
 * 2. Get today's plant price for 11.8kg cylinder
 * 3. Calculate cost per kg: plantPrice / 11.8
 * 4. Add margin: (costPerKg + marginPerKg)
 * 5. Calculate final prices for all cylinder sizes:
 *    - 11.8kg: endPricePerKg × 11.8
 *    - 15kg: endPricePerKg × 15
 *    - 45.4kg: endPricePerKg × 45.4
 */

// GET /api/pricing/calculate?customerId=xxx&customerType=B2C
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const customerType = searchParams.get('customerType') || 'B2C';

    if (!customerId) {
      return NextResponse.json(
        { error: 'Validation Error', message: 'Customer ID is required' },
        { status: 400 }
      );
    }

    // Get customer with margin category
    let customer: any;
    let category: any;

    if (customerType === 'B2C') {
      customer = await prisma.b2CCustomer.findUnique({
        where: { id: customerId },
        include: { marginCategory: true }
      });
    } else {
      customer = await prisma.customer.findUnique({
        where: { id: customerId },
        include: { marginCategory: true }
      });
    }

    if (!customer) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Customer not found' },
        { status: 404 }
      );
    }

    category = customer.marginCategory;

    if (!category) {
      return NextResponse.json(
        { error: 'Configuration Error', message: 'Customer margin category not assigned' },
        { status: 400 }
      );
    }

    // Get today's plant price
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let plantPrice = await prisma.dailyPlantPrice.findUnique({
      where: { date: today }
    });

    if (!plantPrice) {
      // Get the most recent plant price
      plantPrice = await prisma.dailyPlantPrice.findFirst({
        orderBy: { date: 'desc' }
      });
    }

    if (!plantPrice) {
      return NextResponse.json(
        { error: 'Configuration Error', message: 'No plant price set for today' },
        { status: 400 }
      );
    }

    // Calculate prices
    const plantPrice118kg = parseFloat(plantPrice.plantPrice118kg.toString());
    const marginPerKg = parseFloat(category.marginPerKg.toString());
    
    const costPerKg = plantPrice118kg / 11.8;
    const endPricePerKg = costPerKg + marginPerKg;

    const prices = {
      plantPrice: {
        date: plantPrice.date,
        price118kg: plantPrice118kg,
        notes: plantPrice.notes
      },
      customer: {
        id: customer.id,
        name: customer.name,
        type: customerType
      },
      category: {
        id: category.id,
        name: category.name,
        marginPerKg: marginPerKg
      },
      calculation: {
        costPerKg: Math.round(costPerKg * 100) / 100,
        endPricePerKg: Math.round(endPricePerKg * 100) / 100
      },
      finalPrices: {
        domestic118kg: Math.round(endPricePerKg * 11.8),
        standard15kg: Math.round(endPricePerKg * 15),
        commercial454kg: Math.round(endPricePerKg * 45.4)
      }
    };

    return NextResponse.json(prices);
  } catch (error) {
    console.error('Error calculating prices:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to calculate prices' },
      { status: 500 }
    );
  }
}

// POST /api/pricing/calculate - Batch calculation with custom parameters
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { plantPrice118kg, marginPerKg } = body;

    if (!plantPrice118kg || !marginPerKg) {
      return NextResponse.json(
        { error: 'Validation Error', message: 'Plant price and margin per kg are required' },
        { status: 400 }
      );
    }

    const costPerKg = parseFloat(plantPrice118kg) / 11.8;
    const endPricePerKg = costPerKg + parseFloat(marginPerKg);

    const prices = {
      calculation: {
        costPerKg: Math.round(costPerKg * 100) / 100,
        endPricePerKg: Math.round(endPricePerKg * 100) / 100
      },
      finalPrices: {
        domestic118kg: Math.round(endPricePerKg * 11.8),
        standard15kg: Math.round(endPricePerKg * 15),
        commercial454kg: Math.round(endPricePerKg * 45.4)
      }
    };

    return NextResponse.json(prices);
  } catch (error) {
    console.error('Error calculating batch prices:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to calculate prices' },
      { status: 500 }
    );
  }
}
