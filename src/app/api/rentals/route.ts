import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    // Expect: customerId, cylinderId, rentalDate, expectedReturnDate, rentalAmount
    const { customerId, cylinderId, rentalDate, expectedReturnDate, rentalAmount } = data;
    if (!customerId || !cylinderId || !rentalDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const rental = await prisma.cylinderRental.create({
      data: {
        customerId,
        cylinderId,
        rentalDate: new Date(rentalDate),
        expectedReturnDate: expectedReturnDate ? new Date(expectedReturnDate) : null,
        rentalAmount,
        status: 'ACTIVE',
        userId: customerId, // For demo, set userId same as customerId
      },
    });
    return NextResponse.json(rental);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}