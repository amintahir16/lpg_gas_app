const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function deleteOldCategories() {
  try {
    console.log('🗑️  Deleting Old Margin Categories...\n');

    // Old categories to delete
    const oldCategories = [
      { name: 'Standard B2B', customerType: 'B2B' },
      { name: 'Premium B2B', customerType: 'B2B' },
      { name: 'Wholesale B2B', customerType: 'B2B' },
      { name: 'Standard B2C', customerType: 'B2C' },
      { name: 'Premium B2C', customerType: 'B2C' }
    ];

    // Get default categories for reassignment
    const allHomesCategory = await prisma.marginCategory.findFirst({
      where: {
        name: 'All Homes',
        customerType: 'B2C',
        isActive: true
      }
    });

    const defaultB2BCategory = await prisma.marginCategory.findFirst({
      where: {
        name: '1 & 2C Demand Weekly',
        customerType: 'B2B',
        isActive: true
      }
    });

    if (!allHomesCategory) {
      console.log('❌ Default B2C category "All Homes" not found');
      return;
    }

    if (!defaultB2BCategory) {
      console.log('❌ Default B2B category "1 & 2C Demand Weekly" not found');
      return;
    }

    // Process each old category
    for (const oldCat of oldCategories) {
      const category = await prisma.marginCategory.findFirst({
        where: {
          name: oldCat.name,
          customerType: oldCat.customerType
        },
        include: {
          _count: {
            select: {
              b2bCustomers: true,
              b2cCustomers: true
            }
          }
        }
      });

      if (!category) {
        console.log(`ℹ️  Category "${oldCat.name}" not found, skipping...`);
        continue;
      }

      const customerCount = oldCat.customerType === 'B2B' 
        ? category._count.b2bCustomers 
        : category._count.b2cCustomers;

      if (customerCount > 0) {
        console.log(`\n🔄 Reassigning ${customerCount} ${oldCat.customerType} customers from "${oldCat.name}"...`);

        if (oldCat.customerType === 'B2B') {
          // Reassign B2B customers
          const updateResult = await prisma.customer.updateMany({
            where: {
              marginCategoryId: category.id,
              type: 'B2B'
            },
            data: {
              marginCategoryId: defaultB2BCategory.id
            }
          });
          console.log(`✅ Reassigned ${updateResult.count} B2B customers to "${defaultB2BCategory.name}"`);
        } else {
          // Reassign B2C customers
          const updateResult = await prisma.b2CCustomer.updateMany({
            where: {
              marginCategoryId: category.id
            },
            data: {
              marginCategoryId: allHomesCategory.id
            }
          });
          console.log(`✅ Reassigned ${updateResult.count} B2C customers to "${allHomesCategory.name}"`);
        }
      }

      // Delete the category
      console.log(`\n🗑️  Deleting category: "${oldCat.name}"...`);
      await prisma.marginCategory.delete({
        where: { id: category.id }
      });
      console.log(`✅ Deleted: "${oldCat.name}"`);
    }

    // Display final summary
    console.log('\n\n📊 Final Margin Categories:');
    console.log('============================\n');
    
    const finalCategories = await prisma.marginCategory.findMany({
      where: { isActive: true },
      orderBy: [
        { customerType: 'asc' },
        { sortOrder: 'asc' }
      ],
      include: {
        _count: {
          select: {
            b2cCustomers: true,
            b2bCustomers: true
          }
        }
      }
    });

    const b2cCategories = finalCategories.filter(c => c.customerType === 'B2C');
    const b2bCategories = finalCategories.filter(c => c.customerType === 'B2B');

    console.log('🏠 B2C Categories:');
    b2cCategories.forEach(cat => {
      console.log(`   • ${cat.name}: Rs ${cat.marginPerKg}/kg (${cat._count.b2cCustomers} customers)`);
    });

    console.log('\n🏢 B2B Categories:');
    b2bCategories.forEach(cat => {
      console.log(`   • ${cat.name}: Rs ${cat.marginPerKg}/kg (${cat._count.b2bCustomers} customers)`);
    });

    console.log('\n✅ Old categories deleted successfully!');

  } catch (error) {
    console.error('❌ Error deleting old categories:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

deleteOldCategories();

