const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function setupB2BCustomers() {
  console.log('🚀 Setting up B2B Customer Management System...');

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
        createdBy: 'admin-user-id',
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
        createdBy: 'admin-user-id',
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
        createdBy: 'admin-user-id',
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
        createdBy: 'admin-user-id',
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

    // Create sample transactions
    const allCustomers = await prisma.customer.findMany();
    const allProducts = await prisma.product.findMany();
    
    if (allCustomers.length > 0 && allProducts.length > 0) {
      console.log('💰 Creating sample transactions...');
      
      // Sample Sale Transaction
      const billSno1 = `BILL-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-000001`;
      const saleTransaction = await prisma.b2BTransaction.create({
        data: {
          transactionType: 'SALE',
          billSno: billSno1,
          customerId: allCustomers[0].id,
          date: new Date(),
          time: new Date(),
          totalAmount: 11500,
          notes: 'Sample sale transaction',
          createdBy: 'admin-user-id',
        },
      });

      // Add sale items
      await prisma.b2BTransactionItem.createMany({
        data: [
          {
            transactionId: saleTransaction.id,
            productId: allProducts[0].id, // Domestic cylinder
            productName: allProducts[0].name,
            quantity: 2,
            pricePerItem: 5000,
            totalPrice: 10000,
            cylinderType: 'Domestic (11.8kg)',
          },
          {
            transactionId: saleTransaction.id,
            productId: allProducts[3].id, // Regulator
            productName: allProducts[3].name,
            quantity: 1,
            pricePerItem: 1500,
            totalPrice: 1500,
          },
        ],
      });

      // Update customer ledger balance
      await prisma.customer.update({
        where: { id: allCustomers[0].id },
        data: {
          ledgerBalance: allCustomers[0].ledgerBalance + 11500,
          domestic118kgDue: allCustomers[0].domestic118kgDue + 2,
        },
      });

      // Update product stock
      await prisma.product.update({
        where: { id: allProducts[0].id },
        data: { stockQuantity: allProducts[0].stockQuantity - 2 },
      });
      await prisma.product.update({
        where: { id: allProducts[3].id },
        data: { stockQuantity: allProducts[3].stockQuantity - 1 },
      });

      console.log(`✅ Created sale transaction: ${billSno1}`);

      // Sample Payment Transaction
      const billSno2 = `BILL-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-000002`;
      const paymentTransaction = await prisma.b2BTransaction.create({
        data: {
          transactionType: 'PAYMENT',
          billSno: billSno2,
          customerId: allCustomers[0].id,
          date: new Date(),
          time: new Date(),
          totalAmount: 5000,
          paymentReference: 'BANK-001',
          notes: 'Partial payment received',
          createdBy: 'admin-user-id',
        },
      });

      // Update customer ledger balance
      await prisma.customer.update({
        where: { id: allCustomers[0].id },
        data: {
          ledgerBalance: allCustomers[0].ledgerBalance + 11500 - 5000, // Sale - Payment
        },
      });

      console.log(`✅ Created payment transaction: ${billSno2}`);

      // Sample Buyback Transaction
      const billSno3 = `BILL-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-000003`;
      const buybackTransaction = await prisma.b2BTransaction.create({
        data: {
          transactionType: 'BUYBACK',
          billSno: billSno3,
          customerId: allCustomers[0].id,
          date: new Date(),
          time: new Date(),
          totalAmount: 3000,
          notes: 'Buyback of partial cylinder',
          createdBy: 'admin-user-id',
        },
      });

      // Add buyback items
      await prisma.b2BTransactionItem.createMany({
        data: [
          {
            transactionId: buybackTransaction.id,
            productId: allProducts[0].id,
            productName: allProducts[0].name,
            quantity: 1,
            pricePerItem: 5000,
            totalPrice: 5000,
            cylinderType: 'Domestic (11.8kg)',
            returnedCondition: 'PARTIAL',
            remainingKg: 5,
            originalSoldPrice: 5000,
            buybackRate: 0.60,
            buybackPricePerItem: 3000,
            buybackTotal: 3000,
          },
        ],
      });

      // Update customer ledger balance and cylinder due
      await prisma.customer.update({
        where: { id: allCustomers[0].id },
        data: {
          ledgerBalance: allCustomers[0].ledgerBalance + 11500 - 5000 - 3000, // Sale - Payment - Buyback
          domestic118kgDue: Math.max(0, allCustomers[0].domestic118kgDue + 2 - 1), // Sale +2, Buyback -1
        },
      });

      // Update product stock (add partial cylinder back)
      await prisma.product.update({
        where: { id: allProducts[0].id },
        data: { 
          stockQuantity: allProducts[0].stockQuantity - 2 + 1, // Sale -2, Buyback +1
          stockType: 'PARTIAL',
          remainingKg: 5,
        },
      });

      console.log(`✅ Created buyback transaction: ${billSno3}`);
    }

    console.log('🎉 B2B Customer Management System setup completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`- Created ${customers.length} B2B customers`);
    console.log(`- Created ${products.length} products`);
    console.log('- Created sample transactions (Sale, Payment, Buyback)');
    console.log('\n🚀 You can now use the B2B Customer Management system!');

  } catch (error) {
    console.error('❌ Error setting up B2B customers:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the setup if this script is executed directly
if (require.main === module) {
  setupB2BCustomers()
    .then(() => {
      console.log('✅ Setup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Setup failed:', error);
      process.exit(1);
    });
}

module.exports = { setupB2BCustomers };
