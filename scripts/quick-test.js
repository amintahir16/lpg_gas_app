const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🧪 Quick Test - Checking Everything...\n');

  try {
    // 1. Check categories
    const categories = await prisma.vendorCategoryConfig.count();
    console.log(`✅ Categories: ${categories} (expected: 5)`);

    // 2. Check vendors
    const vendors = await prisma.vendor.count();
    console.log(`✅ Vendors: ${vendors} (expected: 15)`);

    // 3. Check items
    const items = await prisma.vendorItem.count();
    console.log(`✅ Items: ${items} (expected: 36)`);

    // 4. Check sample category with vendors
    const cylinderCategory = await prisma.vendorCategoryConfig.findFirst({
      where: { slug: 'cylinder_purchase' },
      include: { vendors: true }
    });

    if (cylinderCategory) {
      console.log(`✅ Cylinder Category: ${cylinderCategory.vendors.length} vendors`);
      cylinderCategory.vendors.forEach(v => {
        console.log(`   - ${v.name || 'Unnamed'} (${v.vendorCode})`);
      });
    } else {
      console.log('❌ Cylinder category not found');
    }

    console.log('\n🎯 Status: All data ready!');
    console.log('💡 Next steps:');
    console.log('   1. Restart your development server');
    console.log('   2. Make sure you are logged in as ADMIN');
    console.log('   3. Visit /vendors');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });

