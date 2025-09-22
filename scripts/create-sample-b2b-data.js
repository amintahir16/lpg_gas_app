const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createSampleData() {
  try {
    console.log('Creating sample B2B customer data...');

    // Get the first available user for createdBy field
    const existingUser = await prisma.user.findFirst({
      select: { id: true }
    });

    if (!existingUser) {
      throw new Error('No users found in database. Please create a user first.');
    }

    const systemUserId = existingUser.id;
    console.log(`Using user ID: ${systemUserId}`);

    // Create sample customers
    const customers = [
      {
        name: 'Kandahaar Restaurant',
        contactPerson: 'Ahmed Khan',
        phone: '0300-1234567',
        email: 'ahmed@kandahaar.com',
        address: 'Main Road, Karachi',
        creditLimit: 50000,
        paymentTermsDays: 30,
        notes: 'Regular customer, good payment history'
      },
      {
        name: 'Food Bazar',
        contactPerson: 'Sara Ahmed',
        phone: '0311-9876543',
        email: 'sara@foodbazar.pk',
        address: 'Gulshan-e-Iqbal, Karachi',
        creditLimit: 75000,
        paymentTermsDays: 45,
        notes: 'Bulk orders, medium payment terms'
      },
      {
        name: 'Pizza Box',
        contactPerson: 'Muhammad Ali',
        phone: '0321-5555555',
        email: 'ali@pizzabox.com',
        address: 'DHA Phase 2, Karachi',
        creditLimit: 30000,
        paymentTermsDays: 30,
        notes: 'New customer, standard terms'
      },
      {
        name: 'Industrial Gas Co',
        contactPerson: 'Hassan Sheikh',
        phone: '0333-7777777',
        email: 'hassan@industrialgas.pk',
        address: 'Industrial Area, Karachi',
        creditLimit: 100000,
        paymentTermsDays: 60,
        notes: 'Large industrial customer, extended terms'
      },
      {
        name: 'City Restaurant',
        contactPerson: 'Fatima Khan',
        phone: '0344-8888888',
        email: 'fatima@cityrestaurant.pk',
        address: 'Clifton, Karachi',
        creditLimit: 40000,
        paymentTermsDays: 30,
        notes: 'Premium restaurant, good credit'
      }
    ];

    const createdCustomers = [];
    for (const customerData of customers) {
      const customer = await prisma.customer.create({
        data: {
          ...customerData,
          createdBy: systemUserId
        }
      });
      createdCustomers.push(customer);
      console.log(`Created customer: ${customer.name}`);
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
        lowStockThreshold: 10
      },
      {
        name: 'Standard (15kg)',
        category: 'GAS_CYLINDER',
        unit: 'pc',
        stockQuantity: 80,
        stockType: 'FILLED',
        priceSoldToCustomer: 6000,
        lowStockThreshold: 8
      },
      {
        name: 'Commercial (45.4kg)',
        category: 'GAS_CYLINDER',
        unit: 'pc',
        stockQuantity: 50,
        stockType: 'FILLED',
        priceSoldToCustomer: 15000,
        lowStockThreshold: 5
      },
      {
        name: 'Regulator',
        category: 'ACCESSORY',
        unit: 'pc',
        stockQuantity: 50,
        stockType: 'FILLED',
        priceSoldToCustomer: 1500,
        lowStockThreshold: 10
      }
    ];

    const createdProducts = [];
    for (const productData of products) {
      const product = await prisma.product.create({
        data: productData
      });
      createdProducts.push(product);
      console.log(`Created product: ${product.name}`);
    }

    // Create sample transactions with unique bill numbers
    const transactions = [
      // Sale 1: Kandahaar Restaurant
      {
        customerId: createdCustomers[0].id,
        transactionType: 'SALE',
        billSno: `BILL-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-000001`,
        date: new Date('2025-09-20'),
        time: new Date('2025-09-20T10:30:00'),
        totalAmount: 11500,
        notes: 'Regular order - 2 Domestic cylinders + 1 Regulator',
        createdBy: systemUserId,
        items: [
          {
            productId: createdProducts[0].id,
            productName: 'Domestic (11.8kg)',
            quantity: 2,
            pricePerItem: 5000,
            totalPrice: 10000,
            cylinderType: 'Domestic (11.8kg)'
          },
          {
            productId: createdProducts[3].id,
            productName: 'Regulator',
            quantity: 1,
            pricePerItem: 1500,
            totalPrice: 1500,
            cylinderType: null
          }
        ]
      },
      // Sale 2: Food Bazar
      {
        customerId: createdCustomers[1].id,
        transactionType: 'SALE',
        billSno: `BILL-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-000002`,
        date: new Date('2025-09-20'),
        time: new Date('2025-09-20T14:15:00'),
        totalAmount: 18000,
        notes: 'Bulk order - 3 Standard cylinders',
        createdBy: systemUserId,
        items: [
          {
            productId: createdProducts[1].id,
            productName: 'Standard (15kg)',
            quantity: 3,
            pricePerItem: 6000,
            totalPrice: 18000,
            cylinderType: 'Standard (15kg)'
          }
        ]
      },
      // Payment 1: Kandahaar Restaurant
      {
        customerId: createdCustomers[0].id,
        transactionType: 'PAYMENT',
        billSno: `BILL-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-000003`,
        date: new Date('2025-09-21'),
        time: new Date('2025-09-21T09:00:00'),
        totalAmount: 5000,
        paymentReference: 'BANK-001',
        notes: 'Partial payment received',
        createdBy: systemUserId,
        items: [
          {
            productName: 'Payment',
            quantity: 1,
            pricePerItem: 5000,
            totalPrice: 5000,
            cylinderType: null
          }
        ]
      },
      // Buyback 1: Kandahaar Restaurant
      {
        customerId: createdCustomers[0].id,
        transactionType: 'BUYBACK',
        billSno: `BILL-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-000004`,
        date: new Date('2025-09-21'),
        time: new Date('2025-09-21T16:30:00'),
        totalAmount: 3000,
        notes: 'Buyback transaction for returned cylinder with remaining gas',
        createdBy: systemUserId,
        items: [
          {
            productId: createdProducts[0].id,
            productName: 'Domestic (11.8kg)',
            quantity: 1,
            pricePerItem: 5000,
            totalPrice: 5000,
            cylinderType: 'Domestic (11.8kg)',
            returnedCondition: 'PARTIAL',
            remainingKg: 5,
            originalSoldPrice: 5000,
            buybackRate: 0.60,
            buybackPricePerItem: 3000,
            buybackTotal: 3000
          }
        ]
      },
      // Return Empty 1: Kandahaar Restaurant
      {
        customerId: createdCustomers[0].id,
        transactionType: 'RETURN_EMPTY',
        billSno: `BILL-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-000005`,
        date: new Date('2025-09-21'),
        time: new Date('2025-09-21T16:35:00'),
        totalAmount: 0,
        notes: 'Empty cylinder return transaction',
        createdBy: systemUserId,
        items: [
          {
            productId: createdProducts[0].id,
            productName: 'Domestic (11.8kg)',
            quantity: 1,
            pricePerItem: 0,
            totalPrice: 0,
            cylinderType: 'Domestic (11.8kg)',
            returnedCondition: 'EMPTY'
          }
        ]
      },
      // Sale 3: Pizza Box
      {
        customerId: createdCustomers[2].id,
        transactionType: 'SALE',
        billSno: `BILL-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-000006`,
        date: new Date('2025-09-22'),
        time: new Date('2025-09-22T11:00:00'),
        totalAmount: 7500,
        notes: 'First order - 1 Domestic + 1 Regulator',
        createdBy: systemUserId,
        items: [
          {
            productId: createdProducts[0].id,
            productName: 'Domestic (11.8kg)',
            quantity: 1,
            pricePerItem: 5000,
            totalPrice: 5000,
            cylinderType: 'Domestic (11.8kg)'
          },
          {
            productId: createdProducts[3].id,
            productName: 'Regulator',
            quantity: 1,
            pricePerItem: 1500,
            totalPrice: 1500,
            cylinderType: null
          }
        ]
      },
      // Sale 4: Industrial Gas Co
      {
        customerId: createdCustomers[3].id,
        transactionType: 'SALE',
        billSno: `BILL-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-000007`,
        date: new Date('2025-09-22'),
        time: new Date('2025-09-22T15:45:00'),
        totalAmount: 30000,
        notes: 'Large industrial order - 2 Commercial cylinders',
        createdBy: systemUserId,
        items: [
          {
            productId: createdProducts[2].id,
            productName: 'Commercial (45.4kg)',
            quantity: 2,
            pricePerItem: 15000,
            totalPrice: 30000,
            cylinderType: 'Commercial (45.4kg)'
          }
        ]
      },
      // Payment 2: Food Bazar
      {
        customerId: createdCustomers[1].id,
        transactionType: 'PAYMENT',
        billSno: `BILL-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-000008`,
        date: new Date('2025-09-23'),
        time: new Date('2025-09-23T10:00:00'),
        totalAmount: 18000,
        paymentReference: 'CHECK-123',
        notes: 'Full payment for last order',
        createdBy: systemUserId,
        items: [
          {
            productName: 'Payment',
            quantity: 1,
            pricePerItem: 18000,
            totalPrice: 18000,
            cylinderType: null
          }
        ]
      },
      // Sale 5: City Restaurant
      {
        customerId: createdCustomers[4].id,
        transactionType: 'SALE',
        billSno: `BILL-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-000009`,
        date: new Date('2025-09-23'),
        time: new Date('2025-09-23T14:30:00'),
        totalAmount: 12000,
        notes: 'Premium order - 2 Standard cylinders',
        createdBy: systemUserId,
        items: [
          {
            productId: createdProducts[1].id,
            productName: 'Standard (15kg)',
            quantity: 2,
            pricePerItem: 6000,
            totalPrice: 12000,
            cylinderType: 'Standard (15kg)'
          }
        ]
      },
      // Payment 3: Kandahaar Restaurant (final payment)
      {
        customerId: createdCustomers[0].id,
        transactionType: 'PAYMENT',
        billSno: `BILL-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-000010`,
        date: new Date('2025-09-24'),
        time: new Date('2025-09-24T09:30:00'),
        totalAmount: 6500,
        paymentReference: 'CASH-001',
        notes: 'Final payment - cash',
        createdBy: systemUserId,
        items: [
          {
            productName: 'Payment',
            quantity: 1,
            pricePerItem: 6500,
            totalPrice: 6500,
            cylinderType: null
          }
        ]
      }
    ];

    for (const transactionData of transactions) {
      const { items, ...transactionInfo } = transactionData;
      
      const transaction = await prisma.b2BTransaction.create({
        data: {
          ...transactionInfo,
          items: {
            create: items.map(item => ({
              ...item,
              productId: item.productId || null
            }))
          }
        }
      });
      
      console.log(`Created transaction: ${transaction.billSno}`);
    }

    // Update customer ledger balances based on transactions
    for (const customer of createdCustomers) {
      const sales = await prisma.b2BTransaction.aggregate({
        where: {
          customerId: customer.id,
          transactionType: 'SALE',
          voided: false
        },
        _sum: { totalAmount: true }
      });

      const payments = await prisma.b2BTransaction.aggregate({
        where: {
          customerId: customer.id,
          transactionType: 'PAYMENT',
          voided: false
        },
        _sum: { totalAmount: true }
      });

      const buybacks = await prisma.b2BTransaction.aggregate({
        where: {
          customerId: customer.id,
          transactionType: 'BUYBACK',
          voided: false
        },
        _sum: { totalAmount: true }
      });

      const totalSales = sales._sum.totalAmount?.toNumber() || 0;
      const totalPayments = payments._sum.totalAmount?.toNumber() || 0;
      const totalBuybacks = buybacks._sum.totalAmount?.toNumber() || 0;

      const ledgerBalance = totalSales - totalPayments - totalBuybacks;

      await prisma.customer.update({
        where: { id: customer.id },
        data: { ledgerBalance }
      });

      console.log(`Updated ledger balance for ${customer.name}: ${ledgerBalance}`);
    }

    console.log('Sample B2B data created successfully!');
    console.log('\nSummary:');
    console.log(`- ${customers.length} customers created`);
    console.log(`- ${products.length} products created`);
    console.log(`- ${transactions.length} transactions created`);
    console.log('\nSample customers with their current balances:');
    
    for (const customer of createdCustomers) {
      const updatedCustomer = await prisma.customer.findUnique({
        where: { id: customer.id },
        select: { name: true, ledgerBalance: true }
      });
      console.log(`- ${updatedCustomer?.name}: ${updatedCustomer?.ledgerBalance.toNumber()} PKR`);
    }

  } catch (error) {
    console.error('Error creating sample data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createSampleData();
