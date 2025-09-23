const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixCylinderAssignments() {
  try {
    console.log('🔧 Fixing cylinder assignment inconsistencies...\n');

    // Find cylinders assigned to both store and vehicle
    const cylindersWithBoth = await prisma.cylinder.findMany({
      where: {
        AND: [
          { storeId: { not: null } },
          { vehicleId: { not: null } }
        ]
      },
      include: {
        store: { select: { name: true } },
        vehicle: { select: { vehicleNumber: true } }
      }
    });

    console.log(`Found ${cylindersWithBoth.length} cylinders assigned to both store and vehicle`);

    if (cylindersWithBoth.length > 0) {
      console.log('\nFixing assignments...');
      
      for (const cylinder of cylindersWithBoth) {
        // Priority: If cylinder is WITH_CUSTOMER, remove both assignments
        // Otherwise, keep store assignment and remove vehicle assignment
        if (cylinder.currentStatus === 'WITH_CUSTOMER') {
          await prisma.cylinder.update({
            where: { id: cylinder.id },
            data: {
              storeId: null,
              vehicleId: null,
              location: 'Customer Location'
            }
          });
          console.log(`  ${cylinder.code}: Removed both assignments (with customer)`);
        } else {
          await prisma.cylinder.update({
            where: { id: cylinder.id },
            data: {
              vehicleId: null
            }
          });
          console.log(`  ${cylinder.code}: Kept store assignment, removed vehicle assignment`);
        }
      }
    }

    // Verify the fix
    const remainingIssues = await prisma.cylinder.count({
      where: {
        AND: [
          { storeId: { not: null } },
          { vehicleId: { not: null } }
        ]
      }
    });

    if (remainingIssues === 0) {
      console.log('\n✅ All cylinder assignment inconsistencies have been fixed!');
    } else {
      console.log(`\n⚠️  ${remainingIssues} cylinders still have both assignments`);
    }

    // Show updated statistics
    console.log('\n📊 Updated Statistics:');
    const totalCylinders = await prisma.cylinder.count();
    const cylindersInStores = await prisma.cylinder.count({
      where: { storeId: { not: null } }
    });
    const cylindersInVehicles = await prisma.cylinder.count({
      where: { vehicleId: { not: null } }
    });
    const cylindersWithCustomers = await prisma.cylinder.count({
      where: { currentStatus: 'WITH_CUSTOMER' }
    });

    console.log(`Total Cylinders: ${totalCylinders}`);
    console.log(`Cylinders in Stores: ${cylindersInStores}`);
    console.log(`Cylinders in Vehicles: ${cylindersInVehicles}`);
    console.log(`Cylinders with Customers: ${cylindersWithCustomers}`);

  } catch (error) {
    console.error('❌ Error fixing cylinder assignments:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixCylinderAssignments();
