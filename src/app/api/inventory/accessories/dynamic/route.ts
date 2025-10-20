import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export interface DynamicAccessoryItem {
  id: string;
  name: string;
  quantity: number;
  pricePerItem: number; // Sale price (with markup)
  inventoryCost: number; // Actual inventory cost
  quality?: string;
  category: 'regulators' | 'gasPipes' | 'stoves';
  stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  costPerPiece?: number;
}

interface DynamicInventoryResponse {
  regulators: DynamicAccessoryItem[];
  gasPipes: DynamicAccessoryItem[];
  stoves: DynamicAccessoryItem[];
  lastUpdated: string;
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Fetching dynamic inventory data...');

    // Fetch all inventory data in parallel
    const [regulators, gasPipes, stoves] = await Promise.all([
      prisma.regulator.findMany({ orderBy: { type: 'asc' } }),
      prisma.gasPipe.findMany({ orderBy: { type: 'asc' } }),
      prisma.stove.findMany({ orderBy: { quality: 'asc' } }),
    ]);

    // Process regulators
    const processedRegulators: DynamicAccessoryItem[] = regulators.map(r => ({
      id: r.id,
      name: r.type,
      quantity: r.quantity,
      pricePerItem: Number(r.costPerPiece) * 1.2, // 20% markup for sale price
      inventoryCost: Number(r.costPerPiece), // Actual inventory cost
      category: 'regulators',
      stockStatus: r.quantity === 0 ? 'OUT_OF_STOCK' : (r.quantity <= 5 ? 'LOW_STOCK' : 'IN_STOCK'),
      costPerPiece: Number(r.costPerPiece),
    }));

    // Process gas pipes
    const processedGasPipes: DynamicAccessoryItem[] = gasPipes.map(gp => ({
      id: gp.id,
      name: gp.type,
      quantity: Number(gp.quantity),
      pricePerItem: Number(gp.totalCost) / Number(gp.quantity) * 1.2, // 20% markup
      inventoryCost: Number(gp.totalCost) / Number(gp.quantity), // Actual inventory cost per piece
      category: 'gasPipes',
      stockStatus: Number(gp.quantity) === 0 ? 'OUT_OF_STOCK' : (Number(gp.quantity) <= 10 ? 'LOW_STOCK' : 'IN_STOCK'),
    }));

    // Process stoves
    const processedStoves: DynamicAccessoryItem[] = stoves.map(s => ({
      id: s.id,
      name: s.quality,
      quantity: s.quantity,
      pricePerItem: Number(s.costPerPiece) * 1.2, // 20% markup
      inventoryCost: Number(s.costPerPiece), // Actual inventory cost
      category: 'stoves',
      quality: s.quality,
      stockStatus: s.quantity === 0 ? 'OUT_OF_STOCK' : (s.quantity <= 3 ? 'LOW_STOCK' : 'IN_STOCK'),
      costPerPiece: Number(s.costPerPiece),
    }));

    const response: DynamicInventoryResponse = {
      regulators: processedRegulators,
      gasPipes: processedGasPipes,
      stoves: processedStoves,
      lastUpdated: new Date().toISOString(),
    };

    console.log('✅ Dynamic inventory data fetched successfully:');
    console.log(`  - Regulators: ${processedRegulators.length} items`);
    console.log(`  - Gas Pipes: ${processedGasPipes.length} items`);
    console.log(`  - Stoves: ${processedStoves.length} items`);

    return NextResponse.json({ 
      success: true, 
      data: response 
    });

  } catch (error) {
    console.error('❌ Error fetching dynamic inventory:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch dynamic inventory data',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}
