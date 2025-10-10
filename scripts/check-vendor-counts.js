const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkVendorCounts() {
  try {
    console.log('🔍 Checking Vendor Counts by Category...\n');
    
    const categories = await prisma.vendorCategoryConfig.findMany({
      include: {
        vendors: {
          where: { isActive: true },
          select: { id: true, name: true, companyName: true, isActive: true }
        }
      },
      orderBy: { sortOrder: 'asc' }
    });
    
    console.log('📊 Vendor Count by Category:');
    categories.forEach(cat => {
      console.log(`${cat.name}: ${cat.vendors.length} vendors`);
      if (cat.vendors.length > 0) {
        cat.vendors.forEach(v => {
          console.log(`  - ${v.name || v.companyName} (Active: ${v.isActive})`);
        });
      }
    });
    
    const totalVendors = await prisma.vendor.count({ where: { isActive: true } });
    console.log(`\nTotal Active Vendors: ${totalVendors}`);
    
    // Check if there are any vendors without categories
    const vendorsWithoutCategory = await prisma.vendor.findMany({
      where: { 
        isActive: true,
        categoryId: null
      },
      select: { id: true, name: true, companyName: true }
    });
    
    if (vendorsWithoutCategory.length > 0) {
      console.log(`\n⚠️  Vendors without categories: ${vendorsWithoutCategory.length}`);
      vendorsWithoutCategory.forEach(v => {
        console.log(`  - ${v.name || v.companyName}`);
      });
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    await prisma.$disconnect();
  }
}

checkVendorCounts();
