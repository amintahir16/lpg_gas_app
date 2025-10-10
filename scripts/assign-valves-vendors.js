const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function assignValvesVendors() {
  try {
    console.log('🔧 Assigning vendors to Valves Purchase category...\n');

    // Get the Valves Purchase category
    const valvesCategory = await prisma.vendorCategoryConfig.findFirst({
      where: { slug: 'valves_purchase' }
    });

    if (!valvesCategory) {
      console.log('❌ Valves Purchase category not found!');
      return;
    }

    console.log(`Found Valves Purchase category: ${valvesCategory.name}`);

    // Get vendors without categories
    const vendorsWithoutCategory = await prisma.vendor.findMany({
      where: { 
        isActive: true,
        categoryId: null
      }
    });

    console.log(`Found ${vendorsWithoutCategory.length} vendors without categories:`);
    vendorsWithoutCategory.forEach(v => {
      console.log(`  - ${v.name || v.companyName}`);
    });

    if (vendorsWithoutCategory.length === 0) {
      console.log('✅ All vendors already have categories assigned.');
      return;
    }

    // Assign vendors to Valves Purchase category
    const updateResult = await prisma.vendor.updateMany({
      where: { 
        isActive: true,
        categoryId: null
      },
      data: {
        categoryId: valvesCategory.id
      }
    });

    console.log(`\n✅ Successfully assigned ${updateResult.count} vendors to Valves Purchase category.`);

    // Verify the assignment
    const updatedVendors = await prisma.vendor.findMany({
      where: { 
        isActive: true,
        categoryId: valvesCategory.id
      },
      include: { category: true }
    });

    console.log('\n📝 Vendors now in Valves Purchase category:');
    updatedVendors.forEach(v => {
      console.log(`  - ${v.name || v.companyName}`);
    });

    await prisma.$disconnect();
    console.log('\n🎉 Vendor assignment completed successfully!');
  } catch (error) {
    console.error('❌ Error assigning vendors:', error);
    await prisma.$disconnect();
  }
}

assignValvesVendors();
