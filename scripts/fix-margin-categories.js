const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixMarginCategories() {
  try {
    console.log('🔧 Fixing Margin Categories...\n');

    // Correct categories as per specification
    const correctCategories = {
      B2C: [
        {
          name: 'All Homes',
          customerType: 'B2C',
          marginPerKg: 65,
          description: 'Standard margin for all residential customers',
          sortOrder: 1
        }
      ],
      B2B: [
        {
          name: '1 & 2C Demand Weekly',
          customerType: 'B2B',
          marginPerKg: 32,
          description: 'Small commercial customers with 1-2 cylinder weekly demand',
          sortOrder: 1
        },
        {
          name: '3C Demand Weekly',
          customerType: 'B2B',
          marginPerKg: 28,
          description: 'Medium commercial customers with 3 cylinder weekly demand',
          sortOrder: 2
        },
        {
          name: '4C & above demand weekly',
          customerType: 'B2B',
          marginPerKg: 23,
          description: 'Large commercial customers with 4+ cylinder weekly demand',
          sortOrder: 3
        },
        {
          name: 'Majority 15kg Customers',
          customerType: 'B2B',
          marginPerKg: 45,
          description: 'Commercial customers primarily using 15kg cylinders',
          sortOrder: 4
        },
        {
          name: 'Special 15kg Customers',
          customerType: 'B2B',
          marginPerKg: 35,
          description: 'Special commercial customers with 15kg cylinder preference',
          sortOrder: 5
        }
      ]
    };

    // Get all existing categories
    const allCategories = await prisma.marginCategory.findMany({
      include: {
        _count: {
          select: {
            b2cCustomers: true,
            b2bCustomers: true
          }
        }
      }
    });

    console.log('📋 Existing Categories:');
    allCategories.forEach(cat => {
      console.log(`  • ${cat.name} (${cat.customerType}): Rs ${cat.marginPerKg}/kg - ${cat._count.b2cCustomers + cat._count.b2bCustomers} customers`);
    });

    // Step 1: Handle incorrect categories (deactivate or delete)
    const incorrectB2BCategories = ['Standard B2B', 'Premium B2B', 'Wholesale B2B'];
    const incorrectB2CCategories = ['Standard B2C', 'Premium B2C'];
    const allIncorrectCategories = [
      ...incorrectB2BCategories.map(name => ({ name, customerType: 'B2B' })),
      ...incorrectB2CCategories.map(name => ({ name, customerType: 'B2C' }))
    ];
    
    for (const { name, customerType } of allIncorrectCategories) {
      const incorrectCategory = await prisma.marginCategory.findFirst({
        where: {
          name: name,
          customerType: customerType
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

      if (incorrectCategory) {
        const customerCount = customerType === 'B2B' 
          ? incorrectCategory._count.b2bCustomers 
          : incorrectCategory._count.b2cCustomers;
        
        if (customerCount > 0) {
          console.log(`\n⚠️  Category "${name}" has ${customerCount} customers assigned. Deactivating instead of deleting.`);
          await prisma.marginCategory.update({
            where: { id: incorrectCategory.id },
            data: { isActive: false }
          });
          console.log(`✅ Deactivated: ${name}`);
        } else {
          console.log(`\n🗑️  Deleting category: ${name}`);
          await prisma.marginCategory.delete({
            where: { id: incorrectCategory.id }
          });
          console.log(`✅ Deleted: ${name}`);
        }
      }
    }

    // Step 2: Ensure all correct categories exist with correct margins
    const allCorrectCategories = [...correctCategories.B2C, ...correctCategories.B2B];

    for (const categoryData of allCorrectCategories) {
      const existingCategory = await prisma.marginCategory.findFirst({
        where: {
          name: categoryData.name,
          customerType: categoryData.customerType
        }
      });

      if (existingCategory) {
        // Check if margin is correct
        if (parseFloat(existingCategory.marginPerKg.toString()) !== categoryData.marginPerKg) {
          console.log(`\n🔄 Updating category: ${categoryData.name}`);
          console.log(`   Old margin: Rs ${existingCategory.marginPerKg}/kg`);
          console.log(`   New margin: Rs ${categoryData.marginPerKg}/kg`);
          
          await prisma.marginCategory.update({
            where: { id: existingCategory.id },
            data: {
              marginPerKg: categoryData.marginPerKg,
              description: categoryData.description,
              sortOrder: categoryData.sortOrder,
              isActive: true
            }
          });
          console.log(`✅ Updated: ${categoryData.name}`);
        } else {
          // Just ensure it's active and has correct sort order
          if (!existingCategory.isActive || existingCategory.sortOrder !== categoryData.sortOrder) {
            await prisma.marginCategory.update({
              where: { id: existingCategory.id },
              data: {
                isActive: true,
                sortOrder: categoryData.sortOrder,
                description: categoryData.description
              }
            });
            console.log(`✅ Activated/Updated: ${categoryData.name}`);
          } else {
            console.log(`✅ Already correct: ${categoryData.name}`);
          }
        }
      } else {
        console.log(`\n➕ Creating category: ${categoryData.name}`);
        await prisma.marginCategory.create({
          data: categoryData
        });
        console.log(`✅ Created: ${categoryData.name} (${categoryData.customerType}) - Rs ${categoryData.marginPerKg}/kg`);
      }
    }

    // Step 3: Display final summary
    console.log('\n\n📊 Final Margin Categories Summary:');
    console.log('=====================================\n');
    
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
    if (b2cCategories.length === 0) {
      console.log('   (none)');
    } else {
      b2cCategories.forEach(cat => {
        console.log(`   • ${cat.name}: Rs ${cat.marginPerKg}/kg (${cat._count.b2cCustomers} customers)`);
      });
    }

    console.log('\n🏢 B2B Categories:');
    if (b2bCategories.length === 0) {
      console.log('   (none)');
    } else {
      b2bCategories.forEach(cat => {
        console.log(`   • ${cat.name}: Rs ${cat.marginPerKg}/kg (${cat._count.b2bCustomers} customers)`);
      });
    }

    console.log('\n✅ Margin categories fixed successfully!');

  } catch (error) {
    console.error('❌ Error fixing margin categories:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixMarginCategories();

