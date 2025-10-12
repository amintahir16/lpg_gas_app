import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { generateCylinderCodes } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { quantity, itemName, vendorId } = await request.json();

    if (!quantity || !itemName) {
      return NextResponse.json(
        { error: 'Quantity and item name are required' },
        { status: 400 }
      );
    }

    // Get existing codes to avoid duplicates
    let existingNumbers = new Set<number>();
    
    try {
      const existingCodes = await prisma.vendorPurchaseItem.findMany({
        where: {
          cylinderCodes: {
            not: null
          }
        },
        select: {
          cylinderCodes: true
        }
      });

      // Extract all existing numbers
      existingCodes.forEach(item => {
        if (item.cylinderCodes) {
          const codes = item.cylinderCodes.split(',').map(code => code.trim());
          codes.forEach(code => {
            // Extract number from any format (D01, S02, C03, etc.)
            const match = code.match(/^[DSC]\d+$/);
            if (match) {
              const number = parseInt(code.substring(1));
              if (!isNaN(number)) {
                existingNumbers.add(number);
              }
            }
          });
        }
      });
    } catch (dbError) {
      console.error('Database query error:', dbError);
      // Continue with empty set if database query fails
    }

    // Generate new codes starting from the next available number
    let nextNumber = 1;
    while (existingNumbers.has(nextNumber)) {
      nextNumber++;
    }

    // Use the utility function to generate codes
    const generatedCodes = generateCylinderCodes(itemName, quantity, nextNumber);

    const cylinderCodesString = generatedCodes.join(', ');

    console.log('Generated cylinder codes:', {
      itemName,
      quantity,
      prefix,
      generatedCodes,
      cylinderCodesString
    });

    return NextResponse.json({ 
      cylinderCodes: cylinderCodesString,
      individualCodes: generatedCodes 
    });

  } catch (error) {
    console.error('Error generating cylinder codes:', error);
    
    // Provide fallback codes even if API fails
    const fallbackCodes = [];
    const prefix = itemName.includes('Domestic') ? 'D' :
                  itemName.includes('Standard') ? 'S' : 'C';
    for (let i = 1; i <= quantity; i++) {
      fallbackCodes.push(`${prefix}${i.toString().padStart(2, '0')}`);
    }
    
    return NextResponse.json({
      cylinderCodes: fallbackCodes.join(', '),
      individualCodes: fallbackCodes,
      warning: 'Generated fallback codes due to API error'
    });
  }
}
