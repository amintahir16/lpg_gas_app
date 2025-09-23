const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testPagination() {
  try {
    console.log('🧪 Testing Pagination Implementation...\n');

    // Test 1: Check total cylinders
    const totalCylinders = await prisma.cylinder.count();
    console.log(`Total cylinders in database: ${totalCylinders}`);

    // Test 2: Test pagination with different limits
    const limits = [50, 100, 200];
    
    for (const limit of limits) {
      console.log(`\nTesting with limit: ${limit}`);
      
      const totalPages = Math.ceil(totalCylinders / limit);
      console.log(`  Total pages: ${totalPages}`);
      
      // Test first page
      const firstPage = await prisma.cylinder.findMany({
        take: limit,
        skip: 0,
        orderBy: { createdAt: 'desc' }
      });
      console.log(`  First page: ${firstPage.length} cylinders`);
      
      // Test last page
      const lastPage = await prisma.cylinder.findMany({
        take: limit,
        skip: (totalPages - 1) * limit,
        orderBy: { createdAt: 'desc' }
      });
      console.log(`  Last page: ${lastPage.length} cylinders`);
    }

    // Test 3: Simulate API response
    console.log('\n📡 Simulating API Response:');
    
    const page = 1;
    const limit = 100;
    
    const cylinders = await prisma.cylinder.findMany({
      include: {
        store: { select: { name: true } },
        vehicle: { select: { vehicleNumber: true, driverName: true } }
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' }
    });

    const total = await prisma.cylinder.count();
    const pages = Math.ceil(total / limit);

    console.log(`  Page: ${page}`);
    console.log(`  Limit: ${limit}`);
    console.log(`  Total: ${total}`);
    console.log(`  Pages: ${pages}`);
    console.log(`  Cylinders returned: ${cylinders.length}`);
    console.log(`  Showing: ${((page - 1) * limit) + 1} to ${Math.min(page * limit, total)} of ${total}`);

    // Test 4: Test with filters
    console.log('\n🔍 Testing with filters:');
    
    const emptyCylinders = await prisma.cylinder.count({
      where: { currentStatus: 'EMPTY' }
    });
    
    const standardCylinders = await prisma.cylinder.count({
      where: { cylinderType: 'STANDARD_15KG' }
    });
    
    const emptyStandardCylinders = await prisma.cylinder.count({
      where: { 
        currentStatus: 'EMPTY',
        cylinderType: 'STANDARD_15KG'
      }
    });

    console.log(`  Empty cylinders: ${emptyCylinders}`);
    console.log(`  Standard cylinders: ${standardCylinders}`);
    console.log(`  Empty Standard cylinders: ${emptyStandardCylinders}`);

    // Test 5: Check if pagination will be needed
    console.log('\n📊 Pagination Analysis:');
    
    if (totalCylinders <= 100) {
      console.log(`  ✅ With limit 100: No pagination needed (${totalCylinders} ≤ 100)`);
    } else {
      const pagesNeeded = Math.ceil(totalCylinders / 100);
      console.log(`  📄 With limit 100: ${pagesNeeded} pages needed`);
      console.log(`  📄 Page 1: 1-100 cylinders`);
      console.log(`  📄 Page 2: 101-200 cylinders`);
      console.log(`  📄 Page 3: 201-${totalCylinders} cylinders`);
    }

    console.log('\n✅ Pagination test completed successfully!');

  } catch (error) {
    console.error('❌ Error testing pagination:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testPagination();
