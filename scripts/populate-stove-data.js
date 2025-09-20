const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function populateStoveData() {
  try {
    console.log('🚀 Starting stove data population...');

    // Clear existing stove data
    await prisma.stove.deleteMany({});
    console.log('✅ Cleared existing stove data');

    // Sample stove data with different quality levels and costs
    const stoveData = [
      {
        quality: 'Quality 1',
        quantity: 10,
        costPerPiece: 2500.00, // Higher quality = higher cost
        totalCost: 25000.00
      },
      {
        quality: 'Quality 2',
        quantity: 10,
        costPerPiece: 2200.00,
        totalCost: 22000.00
      },
      {
        quality: 'Quality 3',
        quantity: 10,
        costPerPiece: 1800.00,
        totalCost: 18000.00
      },
      {
        quality: 'Quality 4',
        quantity: 5,
        costPerPiece: 1500.00,
        totalCost: 7500.00
      },
      {
        quality: 'Quality 5',
        quantity: 5,
        costPerPiece: 1200.00,
        totalCost: 6000.00
      }
    ];

    // Insert stove data
    for (const stove of stoveData) {
      await prisma.stove.create({
        data: stove
      });
      console.log(`✅ Added ${stove.quality}: ${stove.quantity} pieces at PKR ${stove.costPerPiece} each`);
    }

    // Calculate and display totals
    const totalStoves = stoveData.reduce((sum, stove) => sum + stove.quantity, 0);
    const totalValue = stoveData.reduce((sum, stove) => sum + stove.totalCost, 0);

    console.log('\n📊 Stove Inventory Summary:');
    console.log('================================');
    stoveData.forEach(stove => {
      console.log(`${stove.quality}: ${stove.quantity} pieces - PKR ${stove.totalCost.toLocaleString()}`);
    });
    console.log('================================');
    console.log(`Total Stoves: ${totalStoves} pieces`);
    console.log(`Total Value: PKR ${totalValue.toLocaleString()}`);

    console.log('\n🎉 Stove data population completed successfully!');

  } catch (error) {
    console.error('❌ Error populating stove data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the population script
populateStoveData()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
