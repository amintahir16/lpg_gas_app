const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testNullVendorNames() {
  try {
    console.log('🔍 Checking for vendors with null names...\n');
    
    const vendors = await prisma.vendor.findMany({
      select: {
        id: true,
        name: true,
        companyName: true,
        vendorCode: true,
        category: {
          select: { name: true }
        }
      },
      where: { isActive: true }
    });
    
    console.log('📊 Vendor Name Analysis:');
    let nullNameCount = 0;
    let nullBothCount = 0;
    
    vendors.forEach(vendor => {
      const hasName = vendor.name !== null && vendor.name !== '';
      const hasCompanyName = vendor.companyName !== null && vendor.companyName !== '';
      
      if (!hasName && !hasCompanyName) {
        nullBothCount++;
        console.log(`❌ ${vendor.vendorCode} - No name or company name (${vendor.category?.name || 'No Category'})`);
      } else if (!hasName) {
        nullNameCount++;
        console.log(`⚠️  ${vendor.vendorCode} - No name, using company name: "${vendor.companyName}" (${vendor.category?.name || 'No Category'})`);
      } else {
        console.log(`✅ ${vendor.vendorCode} - Name: "${vendor.name}" (${vendor.category?.name || 'No Category'})`);
      }
    });
    
    console.log(`\n📈 Summary:`);
    console.log(`- Total vendors: ${vendors.length}`);
    console.log(`- Vendors with names: ${vendors.length - nullNameCount - nullBothCount}`);
    console.log(`- Vendors with null names: ${nullNameCount}`);
    console.log(`- Vendors with no name/company: ${nullBothCount}`);
    
    if (nullBothCount > 0) {
      console.log(`\n⚠️  Recommendation: Update vendors with no name or company name`);
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    await prisma.$disconnect();
  }
}

testNullVendorNames();
