const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkVendorData() {
  try {
    console.log('🔍 Checking Vendor Database Status...\n');

    const categoryCount = await prisma.vendorCategoryConfig.count();
    const vendorCount = await prisma.vendor.count();
    const purchaseCount = await prisma.vendorPurchase.count();
    const itemCount = await prisma.vendorItem.count();

    console.log('📊 Current Vendor Database Status:');
    console.log('- Vendor Categories:', categoryCount);
    console.log('- Vendors:', vendorCount);
    console.log('- Vendor Purchases:', purchaseCount);
    console.log('- Vendor Items:', itemCount);

    if (categoryCount > 0) {
      const categories = await prisma.vendorCategoryConfig.findMany({
        include: {
          vendors: {
            select: { id: true, name: true, companyName: true }
          }
        },
        orderBy: { sortOrder: 'asc' }
      });

      console.log('\n📝 Vendor Categories and Vendors:');
      categories.forEach(cat => {
        console.log(`\n🔹 ${cat.name} (${cat.vendors.length} vendors):`);
        cat.vendors.forEach(vendor => {
          console.log(`   - ${vendor.name || vendor.companyName}`);
        });
      });
    }

    if (purchaseCount > 0) {
      console.log('\n📦 Recent Vendor Purchases:');
      const recentPurchases = await prisma.vendorPurchase.findMany({
        include: {
          vendor: {
            select: { name: true, companyName: true, category: { select: { name: true } } }
          },
          items: true
        },
        orderBy: { createdAt: 'desc' },
        take: 3
      });

      recentPurchases.forEach(purchase => {
        console.log(`\n🔸 ${purchase.vendor.name || purchase.vendor.companyName} (${purchase.vendor.category.name})`);
        console.log(`   Invoice: ${purchase.invoiceNumber || 'N/A'}`);
        console.log(`   Total: PKR ${purchase.totalAmount.toLocaleString()}`);
        console.log(`   Items: ${purchase.items.length} items`);
        console.log(`   Date: ${purchase.purchaseDate.toLocaleDateString()}`);
      });
    }

    await prisma.$disconnect();
    console.log('\n✅ Database check completed successfully!');
  } catch (error) {
    console.error('❌ Error checking vendor data:', error.message);
    await prisma.$disconnect();
  }
}

checkVendorData();
