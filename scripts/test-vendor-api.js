const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Testing Vendor System Data...\n');

  // Test categories
  const categories = await prisma.vendorCategoryConfig.findMany({
    where: { isActive: true },
    include: {
      vendors: {
        where: { isActive: true }
      }
    }
  });

  console.log('📊 Categories in Database:');
  console.log(`Total: ${categories.length}\n`);
  
  categories.forEach(cat => {
    console.log(`✓ ${cat.name} (${cat.slug})`);
    console.log(`  Vendors: ${cat.vendors.length}`);
    console.log(`  Sort Order: ${cat.sortOrder}`);
    console.log('');
  });

  // Test vendors
  const vendors = await prisma.vendor.findMany({
    where: { isActive: true },
    include: {
      category: true,
      items: { where: { isActive: true } }
    }
  });

  console.log('👥 Vendors in Database:');
  console.log(`Total: ${vendors.length}\n`);

  vendors.forEach(vendor => {
    console.log(`✓ ${vendor.name} (${vendor.vendorCode})`);
    console.log(`  Category: ${vendor.category?.name || 'None'}`);
    console.log(`  Items: ${vendor.items.length}`);
    console.log('');
  });

  // Test items
  const items = await prisma.vendorItem.findMany({
    where: { isActive: true }
  });

  console.log('📦 Items in Database:');
  console.log(`Total: ${items.length}\n`);

  // Summary
  console.log('=====================================');
  console.log('📊 SUMMARY:');
  console.log(`   Categories: ${categories.length}`);
  console.log(`   Vendors: ${vendors.length}`);
  console.log(`   Items: ${items.length}`);
  console.log('=====================================\n');

  if (categories.length === 0) {
    console.log('❌ No categories found! Run: node scripts/init-vendor-categories.js');
  }
  if (vendors.length === 0) {
    console.log('❌ No vendors found! Run: node scripts/init-sample-vendors.js');
  }

  console.log('✅ Test complete!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

