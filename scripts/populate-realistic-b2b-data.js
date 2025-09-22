const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function populateRealisticB2BData() {
  try {
    console.log('Creating realistic B2B customer data with transactions...');

    // Get admin user
    const adminUser = await prisma.user.findFirst({
      where: { email: 'admin@lpg.com' }
    });

    if (!adminUser) {
      console.log('Creating admin user...');
      const newAdmin = await prisma.user.create({
        data: {
          email: 'admin@lpg.com',
          name: 'Admin User',
          password: 'hashed_password',
          role: 'ADMIN',
        },
      });
      adminUser = newAdmin;
    }

    // Realistic B2B customers with detailed information
    const b2bCustomers = [
      {
        name: 'Pizza Box Restaurant',
        contactPerson: 'Ahmed Ali Khan',
        phone: '+92-300-1234567',
        email: 'ahmed@pizzabox.com',
        address: '123 Main Street, Block 6, PECHS, Karachi',
        creditLimit: 75000,
        paymentTermsDays: 30,
        ledgerBalance: 25000,
        domestic118kgDue: 3,
        standard15kgDue: 8,
        commercial454kgDue: 2,
        notes: 'Regular customer since 2020. Good payment history. High volume pizza restaurant with 3 locations.',
        type: 'B2B',
        createdBy: adminUser.id,
      },
      {
        name: 'Kandahar Restaurant & Catering',
        contactPerson: 'Muhammad Hassan',
        phone: '+92-301-2345678',
        email: 'hassan@kandahar.com',
        address: '456 Commercial Area, Gulberg, Lahore',
        creditLimit: 120000,
        paymentTermsDays: 45,
        ledgerBalance: 45000,
        domestic118kgDue: 5,
        standard15kgDue: 12,
        commercial454kgDue: 4,
        notes: 'Premium restaurant with wedding hall. Extended payment terms due to large orders. VIP customer.',
        type: 'B2B',
        createdBy: adminUser.id,
      },
      {
        name: 'Food Bazar Supermarket',
        contactPerson: 'Fatima Khan',
        phone: '+92-302-3456789',
        email: 'fatima@foodbazar.com',
        address: '789 Market Street, F-8, Islamabad',
        creditLimit: 50000,
        paymentTermsDays: 30,
        ledgerBalance: 15000,
        domestic118kgDue: 2,
        standard15kgDue: 5,
        commercial454kgDue: 1,
        notes: 'Supermarket chain with 2 branches. Regular small orders. New customer since 2023.',
        type: 'B2B',
        createdBy: adminUser.id,
      },
      {
        name: 'Industrial Kitchen Solutions Ltd.',
        contactPerson: 'Ali Raza',
        phone: '+92-303-4567890',
        email: 'ali@industrialkitchen.com',
        address: '321 Industrial Zone, Faisalabad',
        creditLimit: 200000,
        paymentTermsDays: 60,
        ledgerBalance: 85000,
        domestic118kgDue: 0,
        standard15kgDue: 20,
        commercial454kgDue: 8,
        notes: 'Large industrial food processing company. Bulk orders for commercial kitchens. Major client.',
        type: 'B2B',
        createdBy: adminUser.id,
      },
      {
        name: 'Cafe Express Chain',
        contactPerson: 'Sara Ahmed',
        phone: '+92-304-5678901',
        email: 'sara@cafeexpress.com',
        address: '654 Coffee Street, DHA Phase 2, Rawalpindi',
        creditLimit: 60000,
        paymentTermsDays: 30,
        ledgerBalance: 18000,
        domestic118kgDue: 3,
        standard15kgDue: 6,
        commercial454kgDue: 0,
        notes: 'Coffee shop chain with 5 locations. Consistent monthly orders. Good payment record.',
        type: 'B2B',
        createdBy: adminUser.id,
      },
      {
        name: 'Royal Palace Hotel',
        contactPerson: 'Muhammad Usman',
        phone: '+92-305-6789012',
        email: 'usman@royalpalace.com',
        address: '987 Hotel Road, Saddar, Karachi',
        creditLimit: 150000,
        paymentTermsDays: 45,
        ledgerBalance: 35000,
        domestic118kgDue: 4,
        standard15kgDue: 10,
        commercial454kgDue: 3,
        notes: '5-star hotel with banquet halls. High-end client with premium service requirements.',
        type: 'B2B',
        createdBy: adminUser.id,
      },
      {
        name: 'Spice Garden Restaurant',
        contactPerson: 'Ayesha Malik',
        phone: '+92-306-7890123',
        email: 'ayesha@spicegarden.com',
        address: '147 Food Street, Anarkali, Lahore',
        creditLimit: 40000,
        paymentTermsDays: 30,
        ledgerBalance: 8000,
        domestic118kgDue: 1,
        standard15kgDue: 3,
        commercial454kgDue: 0,
        notes: 'Traditional Pakistani restaurant. Family business with moderate orders.',
        type: 'B2B',
        createdBy: adminUser.id,
      },
      {
        name: 'Fast Food City',
        contactPerson: 'Hassan Ali',
        phone: '+92-307-8901234',
        email: 'hassan@fastfoodcity.com',
        address: '258 Mall Road, Liberty Market, Lahore',
        creditLimit: 80000,
        paymentTermsDays: 30,
        ledgerBalance: 22000,
        domestic118kgDue: 2,
        standard15kgDue: 7,
        commercial454kgDue: 1,
        notes: 'Fast food chain with drive-through. High volume, quick turnover. Reliable customer.',
        type: 'B2B',
        createdBy: adminUser.id,
      },
      {
        name: 'Bakery & Confectionery House',
        contactPerson: 'Zainab Sheikh',
        phone: '+92-308-9012345',
        email: 'zainab@bakeryhouse.com',
        address: '369 Baker Street, Clifton, Karachi',
        creditLimit: 35000,
        paymentTermsDays: 30,
        ledgerBalance: 12000,
        domestic118kgDue: 2,
        standard15kgDue: 4,
        commercial454kgDue: 0,
        notes: 'Artisan bakery with wedding cake orders. Seasonal business with peak periods.',
        type: 'B2B',
        createdBy: adminUser.id,
      },
      {
        name: 'Corporate Canteen Services',
        contactPerson: 'Omar Farooq',
        phone: '+92-309-0123456',
        email: 'omar@corporatecanteen.com',
        address: '741 Business District, Blue Area, Islamabad',
        creditLimit: 100000,
        paymentTermsDays: 45,
        ledgerBalance: 28000,
        domestic118kgDue: 3,
        standard15kgDue: 8,
        commercial454kgDue: 2,
        notes: 'Corporate catering for offices and banks. Contract-based business with regular orders.',
        type: 'B2B',
        createdBy: adminUser.id,
      }
    ];

    // Create B2B customers
    const createdCustomers = [];
    for (const customerData of b2bCustomers) {
      const existingCustomer = await prisma.customer.findFirst({
        where: { 
          name: customerData.name,
          type: 'B2B'
        }
      });

      let customer;
      if (existingCustomer) {
        customer = await prisma.customer.update({
          where: { id: existingCustomer.id },
          data: customerData,
        });
        console.log(`Updated B2B customer: ${customerData.name}`);
      } else {
        customer = await prisma.customer.create({
          data: customerData,
        });
        console.log(`Created B2B customer: ${customerData.name}`);
      }
      createdCustomers.push(customer);
    }

    // Create sample transactions for each customer
    console.log('\nCreating sample transactions...');
    
    for (let i = 0; i < createdCustomers.length; i++) {
      const customer = createdCustomers[i];
      const customerIndex = i + 1;
      
      // Create 3-5 transactions per customer
      const transactionCount = Math.floor(Math.random() * 3) + 3;
      
      for (let j = 0; j < transactionCount; j++) {
        const transactionDate = new Date();
        transactionDate.setDate(transactionDate.getDate() - Math.floor(Math.random() * 30));
        
        const billSno = `B2B${transactionDate.toISOString().slice(0, 10).replace(/-/g, '')}${String(customerIndex).padStart(2, '0')}${String(j + 1).padStart(2, '0')}`;
        
        // Random transaction type
        const transactionTypes = ['SALE', 'PAYMENT', 'BUYBACK', 'RETURN_EMPTY'];
        const transactionType = transactionTypes[Math.floor(Math.random() * transactionTypes.length)];
        
        // Create transaction
        const transaction = await prisma.b2BTransaction.create({
          data: {
            transactionType: transactionType,
            billSno: billSno,
            customerId: customer.id,
            date: transactionDate,
            time: transactionDate,
            totalAmount: 0, // Will be calculated from items
            paymentReference: transactionType === 'PAYMENT' ? `PAY-${billSno}` : null,
            notes: generateTransactionNotes(transactionType, customer.name),
            createdBy: adminUser.id,
          },
        });

        // Create transaction items based on type
        const items = generateTransactionItems(transactionType, customerIndex);
        let totalAmount = 0;

        for (const item of items) {
          const transactionItem = await prisma.b2BTransactionItem.create({
            data: {
              transactionId: transaction.id,
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              pricePerItem: item.pricePerItem,
              totalPrice: item.totalPrice,
              cylinderType: item.cylinderType,
              returnedCondition: item.returnedCondition,
              remainingKg: item.remainingKg,
              originalSoldPrice: item.originalSoldPrice,
              buybackRate: item.buybackRate,
              buybackPricePerItem: item.buybackPricePerItem,
              buybackTotal: item.buybackTotal,
            },
          });
          totalAmount += item.totalPrice;
        }

        // Update transaction with total amount
        await prisma.b2BTransaction.update({
          where: { id: transaction.id },
          data: { totalAmount: totalAmount },
        });

        console.log(`Created ${transactionType} transaction for ${customer.name}: ${billSno}`);
      }
    }

    console.log('\n✅ Realistic B2B customer data populated successfully!');
    console.log(`Created ${createdCustomers.length} customers with sample transactions.`);
    
  } catch (error) {
    console.error('Error creating realistic B2B data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

function generateTransactionNotes(transactionType, customerName) {
  const notes = {
    'SALE': [
      `Regular gas delivery to ${customerName}`,
      `Monthly gas supply for ${customerName}`,
      `Bulk order for ${customerName} kitchen operations`,
      `Emergency gas delivery to ${customerName}`,
      `Scheduled delivery for ${customerName}`
    ],
    'PAYMENT': [
      `Payment received from ${customerName}`,
      `Partial payment from ${customerName}`,
      `Full payment settlement from ${customerName}`,
      `Advance payment from ${customerName}`,
      `Outstanding balance payment from ${customerName}`
    ],
    'BUYBACK': [
      `Gas buyback from ${customerName} - cylinders with remaining gas`,
      `Partial gas return from ${customerName}`,
      `Buyback transaction for ${customerName} - 60% rate applied`,
      `Gas return with compensation from ${customerName}`,
      `Cylinder buyback from ${customerName}`
    ],
    'RETURN_EMPTY': [
      `Empty cylinder return from ${customerName}`,
      `Cylinder collection from ${customerName}`,
      `Empty gas cylinder return from ${customerName}`,
      `Scheduled cylinder pickup from ${customerName}`,
      `Empty cylinder collection from ${customerName}`
    ]
  };
  
  const typeNotes = notes[transactionType] || ['Transaction'];
  return typeNotes[Math.floor(Math.random() * typeNotes.length)];
}

function generateTransactionItems(transactionType, customerIndex) {
  const items = [];
  
  if (transactionType === 'SALE') {
    // Gas cylinders
    const gasItems = [
      { type: 'DOMESTIC_11_8KG', name: 'Domestic Gas Cylinder (11.8kg)', price: 2500, maxQty: 5 },
      { type: 'STANDARD_15KG', name: 'Standard Gas Cylinder (15kg)', price: 3000, maxQty: 8 },
      { type: 'COMMERCIAL_45_4KG', name: 'Commercial Gas Cylinder (45.4kg)', price: 8000, maxQty: 3 }
    ];
    
    // Accessories
    const accessories = [
      { name: 'Gas Pipe (ft)', price: 50, maxQty: 20 },
      { name: 'Stove', price: 2500, maxQty: 2 },
      { name: 'Regulator Adjustable', price: 800, maxQty: 3 },
      { name: 'Regulator Ideal High Pressure', price: 1200, maxQty: 2 },
      { name: 'Regulator 5 Star High Pressure', price: 1500, maxQty: 2 }
    ];
    
    // Add gas items
    gasItems.forEach(gas => {
      const quantity = Math.floor(Math.random() * gas.maxQty) + 1;
      if (quantity > 0) {
        items.push({
          productName: gas.name,
          quantity: quantity,
          pricePerItem: gas.price,
          totalPrice: quantity * gas.price,
          cylinderType: gas.type,
          returnedCondition: null,
          remainingKg: null,
          originalSoldPrice: null,
          buybackRate: null,
          buybackPricePerItem: null,
          buybackTotal: null,
        });
      }
    });
    
    // Add accessories
    accessories.forEach(accessory => {
      const quantity = Math.floor(Math.random() * accessory.maxQty);
      if (quantity > 0) {
        items.push({
          productName: accessory.name,
          quantity: quantity,
          pricePerItem: accessory.price,
          totalPrice: quantity * accessory.price,
          cylinderType: null,
          returnedCondition: null,
          remainingKg: null,
          originalSoldPrice: null,
          buybackRate: null,
          buybackPricePerItem: null,
          buybackTotal: null,
        });
      }
    });
    
  } else if (transactionType === 'PAYMENT') {
    // Payment transactions have no items, just amount
    const amount = Math.floor(Math.random() * 50000) + 10000;
    items.push({
      productName: 'Payment Received',
      quantity: 1,
      pricePerItem: amount,
      totalPrice: amount,
      cylinderType: null,
      returnedCondition: null,
      remainingKg: null,
      originalSoldPrice: null,
      buybackRate: null,
      buybackPricePerItem: null,
      buybackTotal: null,
    });
    
  } else if (transactionType === 'BUYBACK') {
    // Buyback transactions
    const gasTypes = ['DOMESTIC_11_8KG', 'STANDARD_15KG', 'COMMERCIAL_45_4KG'];
    const gasType = gasTypes[Math.floor(Math.random() * gasTypes.length)];
    const originalPrice = gasType === 'DOMESTIC_11_8KG' ? 2500 : gasType === 'STANDARD_15KG' ? 3000 : 8000;
    const quantity = Math.floor(Math.random() * 3) + 1;
    const remainingKg = gasType === 'DOMESTIC_11_8KG' ? Math.random() * 11.8 : 
                       gasType === 'STANDARD_15KG' ? Math.random() * 15 : Math.random() * 45.4;
    const totalKg = gasType === 'DOMESTIC_11_8KG' ? 11.8 : gasType === 'STANDARD_15KG' ? 15 : 45.4;
    const remainingPercentage = remainingKg / totalKg;
    const buybackAmount = originalPrice * remainingPercentage * 0.6;
    const buybackTotal = buybackAmount * quantity;
    
    items.push({
      productName: `${gasType.replace('_', ' ')} Cylinder`,
      quantity: quantity,
      pricePerItem: buybackAmount,
      totalPrice: buybackTotal,
      cylinderType: gasType,
      returnedCondition: 'PARTIAL',
      remainingKg: remainingKg,
      originalSoldPrice: originalPrice,
      buybackRate: 0.6,
      buybackPricePerItem: buybackAmount,
      buybackTotal: buybackTotal,
    });
    
  } else if (transactionType === 'RETURN_EMPTY') {
    // Empty return transactions
    const gasTypes = ['DOMESTIC_11_8KG', 'STANDARD_15KG', 'COMMERCIAL_45_4KG'];
    const gasType = gasTypes[Math.floor(Math.random() * gasTypes.length)];
    const quantity = Math.floor(Math.random() * 5) + 1;
    
    items.push({
      productName: `${gasType.replace('_', ' ')} Cylinder (Empty)`,
      quantity: quantity,
      pricePerItem: 0,
      totalPrice: 0,
      cylinderType: gasType,
      returnedCondition: 'EMPTY',
      remainingKg: 0,
      originalSoldPrice: null,
      buybackRate: null,
      buybackPricePerItem: null,
      buybackTotal: null,
    });
  }
  
  return items;
}

populateRealisticB2BData();
