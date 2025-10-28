const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function reconcileCylinderCounts() {
  try {
    console.log('🔍 Starting cylinder reconciliation for B2B customers...\n');

    // Get all B2B customers
    const customers = await prisma.customer.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        domestic118kgDue: true,
        standard15kgDue: true,
        commercial454kgDue: true,
      }
    });

    console.log(`Found ${customers.length} active B2B customers\n`);

    for (const customer of customers) {
      console.log(`\n📊 Analyzing customer: ${customer.name}`);
      console.log(`Current profile counts:`);
      console.log(`  - Domestic (11.8kg): ${customer.domestic118kgDue || 0}`);
      console.log(`  - Standard (15kg): ${customer.standard15kgDue || 0}`);
      console.log(`  - Commercial (45.4kg): ${customer.commercial454kgDue || 0}`);

      // Count actual cylinders with this customer
      const cylindersWithCustomer = await prisma.cylinder.findMany({
        where: {
          currentStatus: 'WITH_CUSTOMER',
          location: { contains: customer.name }
        },
        select: {
          cylinderType: true,
          id: true
        }
      });

      // Count by type
      const actualCounts = {
        DOMESTIC_11_8KG: cylindersWithCustomer.filter(c => c.cylinderType === 'DOMESTIC_11_8KG').length,
        STANDARD_15KG: cylindersWithCustomer.filter(c => c.cylinderType === 'STANDARD_15KG').length,
        COMMERCIAL_45_4KG: cylindersWithCustomer.filter(c => c.cylinderType === 'COMMERCIAL_45_4KG').length,
      };

      console.log(`Actual inventory counts:`);
      console.log(`  - Domestic (11.8kg): ${actualCounts.DOMESTIC_11_8KG}`);
      console.log(`  - Standard (15kg): ${actualCounts.STANDARD_15KG}`);
      console.log(`  - Commercial (45.4kg): ${actualCounts.COMMERCIAL_45_4KG}`);

      // Check for mismatches
      const mismatches = [];
      if ((customer.domestic118kgDue || 0) !== actualCounts.DOMESTIC_11_8KG) {
        mismatches.push({
          type: 'DOMESTIC_11_8KG',
          profile: customer.domestic118kgDue || 0,
          actual: actualCounts.DOMESTIC_11_8KG
        });
      }
      if ((customer.standard15kgDue || 0) !== actualCounts.STANDARD_15KG) {
        mismatches.push({
          type: 'STANDARD_15KG',
          profile: customer.standard15kgDue || 0,
          actual: actualCounts.STANDARD_15KG
        });
      }
      if ((customer.commercial454kgDue || 0) !== actualCounts.COMMERCIAL_45_4KG) {
        mismatches.push({
          type: 'COMMERCIAL_45_4KG',
          profile: customer.commercial454kgDue || 0,
          actual: actualCounts.COMMERCIAL_45_4KG
        });
      }

      if (mismatches.length > 0) {
        console.log(`❌ MISMATCHES FOUND:`);
        mismatches.forEach(mismatch => {
          console.log(`  - ${mismatch.type}: Profile shows ${mismatch.profile}, Inventory shows ${mismatch.actual}`);
        });

        // Ask for confirmation to fix
        console.log(`\n🔧 Would you like to fix these mismatches? (This will update the customer profile to match inventory)`);
        console.log(`   This is safe because inventory is the source of truth.`);
        
        // For now, let's just log the fix that would be applied
        console.log(`\n📝 Fix that would be applied:`);
        console.log(`   UPDATE customer SET`);
        console.log(`     domestic118kgDue = ${actualCounts.DOMESTIC_11_8KG},`);
        console.log(`     standard15kgDue = ${actualCounts.STANDARD_15KG},`);
        console.log(`     commercial454kgDue = ${actualCounts.COMMERCIAL_45_4KG}`);
        console.log(`   WHERE id = '${customer.id}';`);
        
      } else {
        console.log(`✅ No mismatches found - counts are accurate!`);
      }
    }

    console.log(`\n🎯 Reconciliation analysis complete!`);
    console.log(`\nTo fix mismatches, run this script with --fix flag:`);
    console.log(`node scripts/fix-cylinder-reconciliation.js --fix`);

  } catch (error) {
    console.error('❌ Error during reconciliation:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function fixCylinderCounts() {
  try {
    console.log('🔧 Fixing cylinder counts for B2B customers...\n');

    const customers = await prisma.customer.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        domestic118kgDue: true,
        standard15kgDue: true,
        commercial454kgDue: true,
      }
    });

    let fixedCount = 0;

    for (const customer of customers) {
      // Count actual cylinders with this customer
      const cylindersWithCustomer = await prisma.cylinder.findMany({
        where: {
          currentStatus: 'WITH_CUSTOMER',
          location: { contains: customer.name }
        },
        select: {
          cylinderType: true
        }
      });

      const actualCounts = {
        DOMESTIC_11_8KG: cylindersWithCustomer.filter(c => c.cylinderType === 'DOMESTIC_11_8KG').length,
        STANDARD_15KG: cylindersWithCustomer.filter(c => c.cylinderType === 'STANDARD_15KG').length,
        COMMERCIAL_45_4KG: cylindersWithCustomer.filter(c => c.cylinderType === 'COMMERCIAL_45_4KG').length,
      };

      // Check if update is needed
      const needsUpdate = 
        (customer.domestic118kgDue || 0) !== actualCounts.DOMESTIC_11_8KG ||
        (customer.standard15kgDue || 0) !== actualCounts.STANDARD_15KG ||
        (customer.commercial454kgDue || 0) !== actualCounts.COMMERCIAL_45_4KG;

      if (needsUpdate) {
        await prisma.customer.update({
          where: { id: customer.id },
          data: {
            domestic118kgDue: actualCounts.DOMESTIC_11_8KG,
            standard15kgDue: actualCounts.STANDARD_15KG,
            commercial454kgDue: actualCounts.COMMERCIAL_45_4KG,
          }
        });

        console.log(`✅ Fixed ${customer.name}:`);
        console.log(`   Domestic: ${customer.domestic118kgDue || 0} → ${actualCounts.DOMESTIC_11_8KG}`);
        console.log(`   Standard: ${customer.standard15kgDue || 0} → ${actualCounts.STANDARD_15KG}`);
        console.log(`   Commercial: ${customer.commercial454kgDue || 0} → ${actualCounts.COMMERCIAL_45_4KG}`);
        
        fixedCount++;
      }
    }

    console.log(`\n🎉 Reconciliation complete! Fixed ${fixedCount} customers.`);

  } catch (error) {
    console.error('❌ Error during fix:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Check command line arguments
const args = process.argv.slice(2);
if (args.includes('--fix')) {
  fixCylinderCounts();
} else {
  reconcileCylinderCounts();
}
