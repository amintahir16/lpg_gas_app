const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function auditInventory() {
  try {
    console.log('🔍 Starting comprehensive inventory audit...\n');

    // 1. Check total cylinders
    console.log('📊 CYLINDER INVENTORY AUDIT');
    console.log('============================');
    
    const totalCylinders = await prisma.cylinder.count();
    console.log(`Total Cylinders in Database: ${totalCylinders}`);

    // 2. Check cylinders by type
    const cylindersByType = await prisma.cylinder.groupBy({
      by: ['cylinderType'],
      _count: { id: true }
    });

    console.log('\nCylinders by Type:');
    cylindersByType.forEach(type => {
      console.log(`  ${type.cylinderType}: ${type._count.id}`);
    });

    // 3. Check cylinders by status
    const cylindersByStatus = await prisma.cylinder.groupBy({
      by: ['currentStatus'],
      _count: { id: true }
    });

    console.log('\nCylinders by Status:');
    cylindersByStatus.forEach(status => {
      console.log(`  ${status.currentStatus}: ${status._count.id}`);
    });

    // 4. Check cylinders by type and status (detailed breakdown)
    const cylindersByTypeAndStatus = await prisma.cylinder.groupBy({
      by: ['cylinderType', 'currentStatus'],
      _count: { id: true }
    });

    console.log('\nDetailed Breakdown by Type and Status:');
    const types = ['DOMESTIC_11_8KG', 'STANDARD_15KG', 'COMMERCIAL_45_4KG'];
    
    types.forEach(type => {
      console.log(`\n${type}:`);
      const typeStats = cylindersByTypeAndStatus.filter(stat => stat.cylinderType === type);
      const full = typeStats.find(stat => stat.currentStatus === 'FULL')?._count.id || 0;
      const empty = typeStats.find(stat => stat.currentStatus === 'EMPTY')?._count.id || 0;
      const maintenance = typeStats.find(stat => stat.currentStatus === 'MAINTENANCE')?._count.id || 0;
      const withCustomer = typeStats.find(stat => stat.currentStatus === 'WITH_CUSTOMER')?._count.id || 0;
      const retired = typeStats.find(stat => stat.currentStatus === 'RETIRED')?._count.id || 0;
      
      console.log(`  Full: ${full}`);
      console.log(`  Empty: ${empty}`);
      console.log(`  Maintenance: ${maintenance}`);
      console.log(`  With Customer: ${withCustomer}`);
      console.log(`  Retired: ${retired}`);
      console.log(`  Total: ${full + empty + maintenance + withCustomer + retired}`);
    });

    // 5. Check store assignments
    console.log('\n🏪 STORE ASSIGNMENTS');
    console.log('====================');
    
    const cylindersInStores = await prisma.cylinder.count({
      where: { storeId: { not: null } }
    });
    console.log(`Cylinders assigned to stores: ${cylindersInStores}`);

    const storeBreakdown = await prisma.cylinder.groupBy({
      by: ['storeId'],
      _count: { id: true },
      where: { storeId: { not: null } }
    });

    console.log('\nCylinders by Store:');
    for (const storeStat of storeBreakdown) {
      const store = await prisma.store.findUnique({
        where: { id: storeStat.storeId }
      });
      console.log(`  ${store?.name || 'Unknown Store'}: ${storeStat._count.id}`);
    }

    // 6. Check vehicle assignments
    console.log('\n🚛 VEHICLE ASSIGNMENTS');
    console.log('======================');
    
    const cylindersInVehicles = await prisma.cylinder.count({
      where: { vehicleId: { not: null } }
    });
    console.log(`Cylinders assigned to vehicles: ${cylindersInVehicles}`);

    const vehicleBreakdown = await prisma.cylinder.groupBy({
      by: ['vehicleId'],
      _count: { id: true },
      where: { vehicleId: { not: null } }
    });

    console.log('\nCylinders by Vehicle:');
    for (const vehicleStat of vehicleBreakdown) {
      const vehicle = await prisma.vehicle.findUnique({
        where: { id: vehicleStat.vehicleId }
      });
      console.log(`  ${vehicle?.vehicleNumber || 'Unknown Vehicle'}: ${vehicleStat._count.id}`);
    }

    // 7. Check accessories
    console.log('\n🔧 ACCESSORIES AUDIT');
    console.log('====================');
    
    const regulators = await prisma.regulator.findMany();
    const gasPipes = await prisma.gasPipe.findMany();
    const stoves = await prisma.stove.findMany();

    console.log('\nRegulators:');
    regulators.forEach(reg => {
      console.log(`  ${reg.type}: ${reg.quantity} units (Total Cost: ${reg.totalCost})`);
    });

    console.log('\nGas Pipes:');
    gasPipes.forEach(pipe => {
      console.log(`  ${pipe.type}: ${pipe.quantity} meters (Total Cost: ${pipe.totalCost})`);
    });

    console.log('\nStoves:');
    stoves.forEach(stove => {
      console.log(`  ${stove.quality}: ${stove.quantity} units (Total Cost: ${stove.totalCost})`);
    });

    // 8. Check products
    console.log('\n📦 PRODUCTS AUDIT');
    console.log('==================');
    
    const products = await prisma.product.findMany();
    console.log(`Total Products: ${products.length}`);
    
    products.forEach(product => {
      console.log(`  ${product.name}: ${product.stockQuantity} ${product.unit} (Price: ${product.priceSoldToCustomer})`);
    });

    // 9. Check vendors
    console.log('\n🏢 VENDORS AUDIT');
    console.log('=================');
    
    const vendors = await prisma.vendor.findMany();
    console.log(`Total Vendors: ${vendors.length}`);
    
    for (const vendor of vendors) {
      const inventoryCount = await prisma.vendorInventory.count({
        where: { vendorId: vendor.id }
      });
      console.log(`  ${vendor.companyName}: ${inventoryCount} inventory items`);
    }

    // 10. Simulate API responses to check frontend display
    console.log('\n🖥️  FRONTEND DISPLAY SIMULATION');
    console.log('=================================');
    
    // Simulate the stats API response
    const cylinderTypeStats = await prisma.cylinder.groupBy({
      by: ['cylinderType', 'currentStatus'],
      _count: { id: true }
    });

    const processedStats = ['DOMESTIC_11_8KG', 'STANDARD_15KG', 'COMMERCIAL_45_4KG'].map(type => {
      const typeStats = cylinderTypeStats.filter(stat => stat.cylinderType === type);
      const full = typeStats.find(stat => stat.currentStatus === 'FULL')?._count.id || 0;
      const empty = typeStats.find(stat => stat.currentStatus === 'EMPTY')?._count.id || 0;
      
      return {
        type: type.replace('_', ' '),
        full,
        empty,
        total: full + empty
      };
    });

    console.log('\nFrontend should display:');
    processedStats.forEach(stat => {
      console.log(`  ${stat.type}: ${stat.total} total (${stat.full} Full, ${stat.empty} Empty)`);
    });

    // 11. Check for data inconsistencies
    console.log('\n⚠️  DATA CONSISTENCY CHECKS');
    console.log('============================');
    
    let issuesFound = 0;

    // Check if total cylinders match sum of all statuses
    const totalByStatus = cylindersByStatus.reduce((sum, stat) => sum + stat._count.id, 0);
    if (totalByStatus !== totalCylinders) {
      console.log(`❌ Total cylinders mismatch: ${totalCylinders} vs ${totalByStatus}`);
      issuesFound++;
    } else {
      console.log('✅ Total cylinders count is consistent');
    }

    // Check for cylinders with both store and vehicle assignment
    const cylindersWithBoth = await prisma.cylinder.count({
      where: {
        AND: [
          { storeId: { not: null } },
          { vehicleId: { not: null } }
        ]
      }
    });

    if (cylindersWithBoth > 0) {
      console.log(`❌ Found ${cylindersWithBoth} cylinders assigned to both store and vehicle`);
      issuesFound++;
    } else {
      console.log('✅ No cylinders assigned to both store and vehicle');
    }

    // Check for cylinders with invalid status
    const invalidStatusCylinders = await prisma.cylinder.count({
      where: {
        currentStatus: {
          notIn: ['FULL', 'EMPTY', 'MAINTENANCE', 'RETIRED', 'WITH_CUSTOMER']
        }
      }
    });

    if (invalidStatusCylinders > 0) {
      console.log(`❌ Found ${invalidStatusCylinders} cylinders with invalid status`);
      issuesFound++;
    } else {
      console.log('✅ All cylinders have valid status');
    }

    // 12. Summary
    console.log('\n📋 AUDIT SUMMARY');
    console.log('=================');
    console.log(`Total Cylinders: ${totalCylinders}`);
    console.log(`Cylinders in Stores: ${cylindersInStores}`);
    console.log(`Cylinders in Vehicles: ${cylindersInVehicles}`);
    console.log(`Cylinders with Customers: ${cylindersByStatus.find(s => s.currentStatus === 'WITH_CUSTOMER')?._count.id || 0}`);
    console.log(`Regulators: ${regulators.length} types`);
    console.log(`Gas Pipes: ${gasPipes.length} types`);
    console.log(`Stoves: ${stoves.length} types`);
    console.log(`Products: ${products.length}`);
    console.log(`Vendors: ${vendors.length}`);
    console.log(`Issues Found: ${issuesFound}`);

    if (issuesFound === 0) {
      console.log('\n✅ All inventory data is consistent and ready for frontend display!');
    } else {
      console.log('\n⚠️  Some issues were found that need attention.');
    }

  } catch (error) {
    console.error('❌ Error during inventory audit:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the audit
auditInventory();
