const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixB2CCustomerProfits() {
  try {
    console.log('\n🔧 Fixing B2C Customer Profit Calculations');
    console.log('==========================================\n');
    console.log('This script will recalculate profits for all B2C customers');
    console.log('by excluding security deposits (which are refundable).\n');

    // Get all B2C customers with their transactions
    const customers = await prisma.b2CCustomer.findMany({
      include: {
        transactions: {
          include: {
            gasItems: true,
            securityItems: true,
            accessoryItems: true
          }
        }
      }
    });

    console.log(`Found ${customers.length} B2C customers\n`);

    let totalFixed = 0;
    let totalUnchanged = 0;
    const updates = [];

    for (const customer of customers) {
      // Calculate correct profit (gas + accessories only, NO security deposits)
      let correctProfit = 0;
      let gasRevenue = 0;
      let accessoryRevenue = 0;
      let securityTotal = 0;

      customer.transactions.forEach(txn => {
        const gas = txn.gasItems.reduce((sum, item) => sum + Number(item.totalPrice), 0);
        const accessories = txn.accessoryItems.reduce((sum, item) => sum + Number(item.totalPrice), 0);
        const security = txn.securityItems.reduce((sum, item) => sum + Number(item.totalPrice), 0);

        gasRevenue += gas;
        accessoryRevenue += accessories;
        securityTotal += security;
        correctProfit += gas + accessories; // Only these count as profit
      });

      const currentProfit = Number(customer.totalProfit);
      const difference = Math.abs(correctProfit - currentProfit);

      if (difference > 0.01) {
        // Profit needs correction
        updates.push({
          id: customer.id,
          name: customer.name,
          currentProfit,
          correctProfit,
          difference: correctProfit - currentProfit,
          gasRevenue,
          accessoryRevenue,
          securityTotal
        });
        totalFixed++;
      } else {
        totalUnchanged++;
      }
    }

    console.log('📊 ANALYSIS RESULTS');
    console.log('==========================================');
    console.log(`Customers needing correction: ${totalFixed}`);
    console.log(`Customers already correct: ${totalUnchanged}\n`);

    if (updates.length === 0) {
      console.log('✅ All B2C customers already have correct profit calculations!');
      console.log('   No updates needed.\n');
      return;
    }

    console.log('📋 CUSTOMERS TO BE UPDATED:');
    console.log('==========================================\n');

    updates.forEach((update, index) => {
      console.log(`${index + 1}. ${update.name}`);
      console.log(`   Current Profit:  Rs ${update.currentProfit.toFixed(2)}`);
      console.log(`   Correct Profit:  Rs ${update.correctProfit.toFixed(2)}`);
      console.log(`   Adjustment:      Rs ${update.difference.toFixed(2)} ${update.difference > 0 ? '(increase)' : '(decrease)'}`);
      console.log(`   Breakdown:`);
      console.log(`     Gas Revenue:       Rs ${update.gasRevenue.toFixed(2)}`);
      console.log(`     Accessory Revenue: Rs ${update.accessoryRevenue.toFixed(2)}`);
      console.log(`     Security (excluded): Rs ${update.securityTotal.toFixed(2)}`);
      console.log('');
    });

    console.log('\n🔄 Applying corrections...\n');

    // Update each customer's profit
    for (const update of updates) {
      await prisma.b2CCustomer.update({
        where: { id: update.id },
        data: { totalProfit: update.correctProfit }
      });
      console.log(`✅ Updated ${update.name}: Rs ${update.currentProfit.toFixed(2)} → Rs ${update.correctProfit.toFixed(2)}`);
    }

    console.log('\n✨ SUMMARY');
    console.log('==========================================');
    console.log(`Total customers updated: ${totalFixed}`);
    console.log(`Total customers unchanged: ${totalUnchanged}`);
    console.log('✅ All B2C customer profits have been corrected!\n');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixB2CCustomerProfits();

