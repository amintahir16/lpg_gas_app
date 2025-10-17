const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function initializeMarginCategories() {
  try {
    console.log('Initializing margin categories...');

    // Default margin categories based on your requirements
    const defaultCategories = [
      // B2C Categories
      {
        name: 'All Homes',
        customerType: 'B2C',
        marginPerKg: 65,
        description: 'Standard margin for all residential customers',
        sortOrder: 1
      },
      
      // B2B Categories
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
    ];

    // Create categories
    for (const categoryData of defaultCategories) {
      const existingCategory = await prisma.marginCategory.findFirst({
        where: {
          name: categoryData.name,
          customerType: categoryData.customerType
        }
      });

      if (existingCategory) {
        console.log(`Category already exists: ${categoryData.name} (${categoryData.customerType})`);
        continue;
      }

      const category = await prisma.marginCategory.create({
        data: categoryData
      });

      console.log(`Created category: ${category.name} (${category.customerType}) - Rs ${category.marginPerKg}/kg`);
    }

    console.log('Margin categories initialized successfully!');
    
    // Display summary
    const categories = await prisma.marginCategory.findMany({
      orderBy: [
        { customerType: 'asc' },
        { sortOrder: 'asc' }
      ]
    });

    console.log('\n📊 Margin Categories Summary:');
    console.log('================================');
    
    const b2cCategories = categories.filter(c => c.customerType === 'B2C');
    const b2bCategories = categories.filter(c => c.customerType === 'B2B');
    
    console.log('\n🏠 B2C Categories:');
    b2cCategories.forEach(cat => {
      console.log(`  • ${cat.name}: Rs ${cat.marginPerKg}/kg`);
    });
    
    console.log('\n🏢 B2B Categories:');
    b2bCategories.forEach(cat => {
      console.log(`  • ${cat.name}: Rs ${cat.marginPerKg}/kg`);
    });

  } catch (error) {
    console.error('Error initializing margin categories:', error);
  } finally {
    await prisma.$disconnect();
  }
}

initializeMarginCategories();
