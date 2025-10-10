const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testVendorCategoriesAPI() {
  console.log('🧪 Testing Vendor Categories API Logic...\n');

  try {
    // Simulate what the API does
    const categories = await prisma.vendorCategoryConfig.findMany({
      where: { isActive: true },
      include: {
        vendors: {
          where: { isActive: true },
          select: { id: true }
        }
      },
      orderBy: { sortOrder: 'asc' }
    });

    console.log('📊 Raw categories from DB:', categories.length);
    
    const categoriesWithCount = categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      icon: cat.icon,
      isActive: cat.isActive,
      sortOrder: cat.sortOrder,
      vendorCount: cat.vendors.length,
      createdAt: cat.createdAt,
      updatedAt: cat.updatedAt
    }));

    console.log('\n✅ Formatted response:');
    console.log(JSON.stringify({ categories: categoriesWithCount }, null, 2));

    console.log('\n📊 Summary:');
    categoriesWithCount.forEach(cat => {
      console.log(`  - ${cat.name}: ${cat.vendorCount} vendors`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

async function testVendorsAPI() {
  console.log('\n\n🧪 Testing Vendors API Logic...\n');

  try {
    const categoryId = await prisma.vendorCategoryConfig.findFirst({
      where: { slug: 'cylinder_purchase' }
    });

    if (!categoryId) {
      console.log('❌ No category found');
      return;
    }

    console.log(`Testing with category: ${categoryId.name} (${categoryId.id})\n`);

    const vendors = await prisma.vendor.findMany({
      where: {
        isActive: true,
        categoryId: categoryId.id
      },
      include: {
        category: true,
        purchases: {
          select: {
            totalAmount: true,
            paidAmount: true,
            balanceAmount: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log('📊 Vendors found:', vendors.length);
    
    const vendorsWithTotals = vendors.map(vendor => {
      const totalPurchases = vendor.purchases.reduce(
        (sum, p) => sum + Number(p.totalAmount), 0
      );
      const totalPaid = vendor.purchases.reduce(
        (sum, p) => sum + Number(p.paidAmount), 0
      );
      const totalBalance = vendor.purchases.reduce(
        (sum, p) => sum + Number(p.balanceAmount), 0
      );

      return {
        id: vendor.id,
        vendorCode: vendor.vendorCode,
        name: vendor.name,
        companyName: vendor.companyName,
        contactPerson: vendor.contactPerson,
        phone: vendor.phone,
        email: vendor.email,
        address: vendor.address,
        totalPurchases,
        totalPaid,
        totalBalance,
        category: vendor.category
      };
    });

    console.log('\n✅ Formatted vendors:');
    vendorsWithTotals.forEach(v => {
      console.log(`  - ${v.name || v.companyName || 'Unnamed'} (${v.vendorCode})`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

async function main() {
  await testVendorCategoriesAPI();
  await testVendorsAPI();
  console.log('\n✅ All tests complete!');
}

main()
  .catch((e) => {
    console.error('❌ Fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

