const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function assignDefaultMarginCategories() {
  try {
    console.log('🔧 Assigning default margin categories to existing customers...\n');

    // Get all margin categories
    const categories = await prisma.marginCategory.findMany({
      orderBy: { sortOrder: 'asc' }
    });

    console.log('📊 Available margin categories:');
    categories.forEach(cat => {
      console.log(`  • ${cat.name} (${cat.customerType}) - Rs ${cat.marginPerKg}/kg`);
    });

    // Find default categories
    const b2cDefaultCategory = categories.find(cat => 
      cat.customerType === 'B2C' && cat.name === 'All Homes'
    );
    
    const b2bDefaultCategory = categories.find(cat => 
      cat.customerType === 'B2B' && cat.name === '1 & 2C Demand Weekly'
    );

    if (!b2cDefaultCategory) {
      console.log('❌ B2C default category "All Homes" not found');
      return;
    }

    if (!b2bDefaultCategory) {
      console.log('❌ B2B default category "1 & 2C Demand Weekly" not found');
      return;
    }

    console.log(`\n🎯 Using default categories:`);
    console.log(`  B2C: ${b2cDefaultCategory.name} (Rs ${b2cDefaultCategory.marginPerKg}/kg)`);
    console.log(`  B2B: ${b2bDefaultCategory.name} (Rs ${b2bDefaultCategory.marginPerKg}/kg)`);

    // Update B2C customers without margin categories
    const b2cCustomers = await prisma.b2CCustomer.findMany({
      where: { marginCategoryId: null }
    });

    console.log(`\n📱 Found ${b2cCustomers.length} B2C customers without margin categories`);

    if (b2cCustomers.length > 0) {
      const b2cUpdateResult = await prisma.b2CCustomer.updateMany({
        where: { marginCategoryId: null },
        data: { marginCategoryId: b2cDefaultCategory.id }
      });
      console.log(`✅ Updated ${b2cUpdateResult.count} B2C customers with default category`);
    }

    // Update B2B customers without margin categories
    const b2bCustomers = await prisma.customer.findMany({
      where: { 
        marginCategoryId: null,
        type: 'B2B'
      }
    });

    console.log(`\n🏢 Found ${b2bCustomers.length} B2B customers without margin categories`);

    if (b2bCustomers.length > 0) {
      const b2bUpdateResult = await prisma.customer.updateMany({
        where: { 
          marginCategoryId: null,
          type: 'B2B'
        },
        data: { marginCategoryId: b2bDefaultCategory.id }
      });
      console.log(`✅ Updated ${b2bUpdateResult.count} B2B customers with default category`);
    }

    // Verify the assignments
    console.log('\n🔍 Verifying assignments...');
    
    const b2cWithCategories = await prisma.b2CCustomer.count({
      where: { marginCategoryId: { not: null } }
    });
    
    const b2bWithCategories = await prisma.customer.count({
      where: { 
        marginCategoryId: { not: null },
        type: 'B2B'
      }
    });

    const totalB2C = await prisma.b2CCustomer.count();
    const totalB2B = await prisma.customer.count({
      where: { type: 'B2B' }
    });

    console.log(`\n📊 Final Status:`);
    console.log(`  B2C customers with categories: ${b2cWithCategories}/${totalB2C}`);
    console.log(`  B2B customers with categories: ${b2bWithCategories}/${totalB2B}`);

    if (b2cWithCategories === totalB2C && b2bWithCategories === totalB2B) {
      console.log('\n🎉 All customers now have margin categories assigned!');
    } else {
      console.log('\n⚠️  Some customers still need manual category assignment');
    }

  } catch (error) {
    console.error('❌ Error assigning default margin categories:', error);
  } finally {
    await prisma.$disconnect();
  }
}

assignDefaultMarginCategories();
