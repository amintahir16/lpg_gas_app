const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function setupBasicB2BData() {
  console.log('🚀 Setting up basic B2B Customer Management System data...');

  try {
    // Create a sample admin user first
    console.log('👤 Creating admin user...');
    let adminUser;
    try {
      adminUser = await prisma.user.create({
        data: {
          email: 'admin@lpg-gas.com',
          name: 'System Administrator',
          password: 'admin123', // In production, this should be hashed
          role: 'ADMIN',
        },
      });
      console.log(`✅ Created admin user: ${adminUser.email}`);
    } catch (error) {
      // User might already exist, try to find it
      adminUser = await prisma.user.findUnique({
        where: { email: 'admin@lpg-gas.com' },
      });
      if (adminUser) {
        console.log(`✅ Found existing admin user: ${adminUser.email}`);
      } else {
        throw error;
      }
    }

    // Create sample B2B customers
    const customers = [
      {
        name: 'Kandahaar Restaurant',
        contactPerson: 'Ahmad Khan',
        phone: '+92-300-1234567',
        email: 'ahmad@kandahaar.com',
        address: 'Main Street, Karachi, Pakistan',
        creditLimit: 100000,
        paymentTermsDays: 30,
        notes: 'Premium restaurant with high volume gas consumption',
        createdBy: adminUser.id,
      },
      {
        name: 'Food Bazar',
        contactPerson: 'Muhammad Ali',
        phone: '+92-301-2345678',
        email: 'm.ali@foodbazar.pk',
        address: 'Commercial Area, Lahore, Pakistan',
        creditLimit: 75000,
        paymentTermsDays: 30,
        notes: 'Chain of restaurants across Lahore',
        createdBy: adminUser.id,
      },
      {
        name: 'Pizza Box',
        contactPerson: 'Sara Ahmed',
        phone: '+92-302-3456789',
        email: 'sara@pizzabox.com.pk',
        address: 'Gulberg, Islamabad, Pakistan',
        creditLimit: 50000,
        paymentTermsDays: 30,
        notes: 'Fast food chain specializing in pizza',
        createdBy: adminUser.id,
      },
      {
        name: 'Industrial Gas Co.',
        contactPerson: 'Engineer Hassan',
        phone: '+92-303-4567890',
        email: 'hassan@industrialgas.pk',
        address: 'Industrial Zone, Faisalabad, Pakistan',
        creditLimit: 200000,
        paymentTermsDays: 45,
        notes: 'Large industrial customer with heavy gas usage',
        createdBy: adminUser.id,
      },
      {
        name: 'Metro Restaurant',
        contactPerson: 'Farhan Sheikh',
        phone: '+92-304-5678901',
        email: 'farhan@metrorestaurant.pk',
        address: 'Defence, Karachi, Pakistan',
        creditLimit: 80000,
        paymentTermsDays: 30,
        notes: 'Fine dining restaurant in Defence area',
        createdBy: adminUser.id,
      },
    ];

    console.log('📝 Creating B2B customers...');
    for (const customerData of customers) {
      const customer = await prisma.customer.create({
        data: customerData,
      });
      console.log(`✅ Created customer: ${customer.name}`);
    }

    // Create sample products
    const products = [
      {
        name: 'Domestic (11.8kg)',
        category: 'GAS_CYLINDER',
        unit: 'pc',
        stockQuantity: 100,
        stockType: 'FILLED',
        priceSoldToCustomer: 5000,
        lowStockThreshold: 10,
      },
      {
        name: 'Standard (15kg)',
        category: 'GAS_CYLINDER',
        unit: 'pc',
        stockQuantity: 150,
        stockType: 'FILLED',
        priceSoldToCustomer: 6500,
        lowStockThreshold: 15,
      },
      {
        name: 'Commercial (45.4kg)',
        category: 'GAS_CYLINDER',
        unit: 'pc',
        stockQuantity: 50,
        stockType: 'FILLED',
        priceSoldToCustomer: 18000,
        lowStockThreshold: 5,
      },
      {
        name: 'Regulator',
        category: 'ACCESSORY',
        unit: 'pc',
        stockQuantity: 200,
        stockType: 'FILLED',
        priceSoldToCustomer: 1500,
        lowStockThreshold: 20,
      },
      {
        name: 'Gas Pipe (1 meter)',
        category: 'ACCESSORY',
        unit: 'meter',
        stockQuantity: 500,
        stockType: 'FILLED',
        priceSoldToCustomer: 300,
        lowStockThreshold: 50,
      },
      {
        name: 'Stove (2 Burner)',
        category: 'ACCESSORY',
        unit: 'pc',
        stockQuantity: 75,
        stockType: 'FILLED',
        priceSoldToCustomer: 2500,
        lowStockThreshold: 10,
      },
    ];

    console.log('📦 Creating products...');
    for (const productData of products) {
      const product = await prisma.product.create({
        data: productData,
      });
      console.log(`✅ Created product: ${product.name}`);
    }

    console.log('🎉 Basic B2B Customer Management System data setup completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`- Created 1 admin user`);
    console.log(`- Created ${customers.length} B2B customers`);
    console.log(`- Created ${products.length} products`);
    console.log('\n🚀 You can now access the B2B Customer Management system at /customers');

  } catch (error) {
    console.error('❌ Error setting up B2B customers:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the setup if this script is executed directly
if (require.main === module) {
  setupBasicB2BData()
    .then(() => {
      console.log('✅ Setup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Setup failed:', error);
      process.exit(1);
    });
}

module.exports = { setupBasicB2BData };
