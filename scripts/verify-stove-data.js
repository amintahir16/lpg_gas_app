const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyStoveData() {
  try {
    console.log('🔍 Verifying stove data...\n');

    const stoves = await prisma.stove.findMany({
      orderBy: {
        quality: 'asc'
      }
    });

    if (stoves.length === 0) {
      console.log('❌ No stove data found in database');
      return;
    }

    console.log('📊 Current Stove Inventory:');
    console.log('================================');
    
    let totalStoves = 0;
    let totalValue = 0;

    stoves.forEach(stove => {
      console.log(`${stove.quality}: ${stove.quantity} pieces @ PKR ${stove.costPerPiece.toLocaleString()} = PKR ${stove.totalCost.toLocaleString()}`);
      totalStoves += stove.quantity;
      totalValue += parseFloat(stove.totalCost);
    });

    console.log('================================');
    console.log(`Total Stoves: ${totalStoves} pieces`);
    console.log(`Total Value: PKR ${totalValue.toLocaleString()}`);
    console.log(`\n✅ Found ${stoves.length} stove quality levels in database`);

  } catch (error) {
    console.error('❌ Error verifying stove data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyStoveData();
