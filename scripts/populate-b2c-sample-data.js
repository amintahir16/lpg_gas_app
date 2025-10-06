const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Sample B2C customers data
const sampleCustomers = [
  {
    name: 'Ahmed Khan',
    phone: '03001234567',
    email: 'ahmed.khan@email.com',
    address: 'House 220, Sector D2, Street 30, Phase 1, Hayatabad, Peshawar',
    houseNumber: '220',
    sector: 'D2',
    street: '30',
    phase: '1',
    area: 'Hayatabad',
    city: 'Peshawar',
    googleMapLocation: 'https://maps.google.com/?q=34.0151,71.5249'
  },
  {
    name: 'Fatima Ali',
    phone: '03123456789',
    email: 'fatima.ali@email.com',
    address: 'House 50, Sector E1, Street 6, Phase 1, Hayatabad, Peshawar',
    houseNumber: '50',
    sector: 'E1',
    street: '6',
    phase: '1',
    area: 'Hayatabad',
    city: 'Peshawar',
    googleMapLocation: 'https://maps.google.com/?q=34.0201,71.5299'
  },
  {
    name: 'Muhammad Hassan',
    phone: '03234567890',
    email: 'm.hassan@email.com',
    address: 'House 36, Sector F7, Street 35, Phase 6, Hayatabad, Peshawar',
    houseNumber: '36',
    sector: 'F7',
    street: '35',
    phase: '6',
    area: 'Hayatabad',
    city: 'Peshawar',
    googleMapLocation: 'https://maps.google.com/?q=34.0251,71.5349'
  },
  {
    name: 'Aisha Rahman',
    phone: '03345678901',
    email: 'aisha.rahman@email.com',
    address: 'House 85, Sector G2, Street 12, Phase 3, Hayatabad, Peshawar',
    houseNumber: '85',
    sector: 'G2',
    street: '12',
    phase: '3',
    area: 'Hayatabad',
    city: 'Peshawar',
    googleMapLocation: 'https://maps.google.com/?q=34.0301,71.5399'
  },
  {
    name: 'Omar Sheikh',
    phone: '03456789012',
    email: 'omar.sheikh@email.com',
    address: 'House 142, Sector H4, Street 8, Phase 2, Hayatabad, Peshawar',
    houseNumber: '142',
    sector: 'H4',
    street: '8',
    phase: '2',
    area: 'Hayatabad',
    city: 'Peshawar',
    googleMapLocation: 'https://maps.google.com/?q=34.0351,71.5449'
  },
  {
    name: 'Zainab Malik',
    phone: '03567890123',
    email: 'zainab.malik@email.com',
    address: 'House 78, Sector I6, Street 45, Phase 4, Hayatabad, Peshawar',
    houseNumber: '78',
    sector: 'I6',
    street: '45',
    phase: '4',
    area: 'Hayatabad',
    city: 'Peshawar',
    googleMapLocation: 'https://maps.google.com/?q=34.0401,71.5499'
  },
  {
    name: 'Hassan Butt',
    phone: '03678901234',
    email: 'hassan.butt@email.com',
    address: 'House 203, Sector J3, Street 22, Phase 5, Hayatabad, Peshawar',
    houseNumber: '203',
    sector: 'J3',
    street: '22',
    phase: '5',
    area: 'Hayatabad',
    city: 'Peshawar',
    googleMapLocation: 'https://maps.google.com/?q=34.0451,71.5549'
  },
  {
    name: 'Sara Ahmad',
    phone: '03789012345',
    email: 'sara.ahmad@email.com',
    address: 'House 95, Sector K7, Street 18, Phase 1, Hayatabad, Peshawar',
    houseNumber: '95',
    sector: 'K7',
    street: '18',
    phase: '1',
    area: 'Hayatabad',
    city: 'Peshawar',
    googleMapLocation: 'https://maps.google.com/?q=34.0501,71.5599'
  },
  {
    name: 'Tariq Hussain',
    phone: '03890123456',
    email: 'tariq.hussain@email.com',
    address: 'House 167, Sector L5, Street 33, Phase 3, Hayatabad, Peshawar',
    houseNumber: '167',
    sector: 'L5',
    street: '33',
    phase: '3',
    area: 'Hayatabad',
    city: 'Peshawar',
    googleMapLocation: 'https://maps.google.com/?q=34.0551,71.5649'
  },
  {
    name: 'Amina Khan',
    phone: '03901234567',
    email: 'amina.khan@email.com',
    address: 'House 44, Sector M2, Street 7, Phase 2, Hayatabad, Peshawar',
    houseNumber: '44',
    sector: 'M2',
    street: '7',
    phase: '2',
    area: 'Hayatabad',
    city: 'Peshawar',
    googleMapLocation: 'https://maps.google.com/?q=34.0601,71.5699'
  }
];

// Sample transactions data
const sampleTransactions = [
  // Ahmed Khan transactions
  {
    customerIndex: 0,
    billSno: 'B2C-20241201001',
    date: new Date('2024-12-01'),
    time: new Date('2024-12-01T10:30:00'),
    gasItems: [
      { cylinderType: 'DOMESTIC_11_8KG', quantity: 1, pricePerItem: 2800, totalPrice: 2800 }
    ],
    securityItems: [
      { cylinderType: 'DOMESTIC_11_8KG', quantity: 1, pricePerItem: 30000, totalPrice: 30000, isReturn: false }
    ],
    accessoryItems: [
      { itemName: 'Gas Pipe (ft)', quantity: 20, pricePerItem: 150, totalPrice: 3000 },
      { itemName: 'Regulator Adjustable', quantity: 1, pricePerItem: 800, totalPrice: 800 }
    ],
    deliveryCharges: 200,
    paymentMethod: 'CASH',
    notes: 'First time customer setup'
  },
  {
    customerIndex: 0,
    billSno: 'B2C-20241215002',
    date: new Date('2024-12-15'),
    time: new Date('2024-12-15T14:20:00'),
    gasItems: [
      { cylinderType: 'DOMESTIC_11_8KG', quantity: 1, pricePerItem: 2850, totalPrice: 2850 }
    ],
    securityItems: [],
    accessoryItems: [
      { itemName: 'Stove', quantity: 1, pricePerItem: 2500, totalPrice: 2500 }
    ],
    deliveryCharges: 150,
    paymentMethod: 'CASH',
    notes: 'Regular refill with new stove'
  },

  // Fatima Ali transactions
  {
    customerIndex: 1,
    billSno: 'B2C-20241202003',
    date: new Date('2024-12-02'),
    time: new Date('2024-12-02T11:45:00'),
    gasItems: [
      { cylinderType: 'STANDARD_15KG', quantity: 1, pricePerItem: 3500, totalPrice: 3500 }
    ],
    securityItems: [
      { cylinderType: 'STANDARD_15KG', quantity: 1, pricePerItem: 50000, totalPrice: 50000, isReturn: false }
    ],
    accessoryItems: [
      { itemName: 'Gas Pipe (ft)', quantity: 25, pricePerItem: 150, totalPrice: 3750 },
      { itemName: 'Regulator 5 Star High Pressure', quantity: 1, pricePerItem: 1200, totalPrice: 1200 }
    ],
    deliveryCharges: 250,
    paymentMethod: 'CASH',
    notes: 'Commercial setup for restaurant'
  },
  {
    customerIndex: 1,
    billSno: 'B2C-20241210004',
    date: new Date('2024-12-10'),
    time: new Date('2024-12-10T09:15:00'),
    gasItems: [
      { cylinderType: 'STANDARD_15KG', quantity: 1, pricePerItem: 3600, totalPrice: 3600 }
    ],
    securityItems: [],
    accessoryItems: [
      { itemName: 'Gas Pipe (ft)', quantity: 10, pricePerItem: 150, totalPrice: 1500 }
    ],
    deliveryCharges: 200,
    paymentMethod: 'CASH',
    notes: 'Regular refill'
  },

  // Muhammad Hassan transactions
  {
    customerIndex: 2,
    billSno: 'B2C-20241203005',
    date: new Date('2024-12-03'),
    time: new Date('2024-12-03T16:30:00'),
    gasItems: [
      { cylinderType: 'DOMESTIC_11_8KG', quantity: 2, pricePerItem: 2800, totalPrice: 5600 }
    ],
    securityItems: [
      { cylinderType: 'DOMESTIC_11_8KG', quantity: 2, pricePerItem: 30000, totalPrice: 60000, isReturn: false }
    ],
    accessoryItems: [
      { itemName: 'Gas Pipe (ft)', quantity: 30, pricePerItem: 150, totalPrice: 4500 },
      { itemName: 'Regulator Ideal High Pressure', quantity: 2, pricePerItem: 900, totalPrice: 1800 }
    ],
    deliveryCharges: 300,
    paymentMethod: 'CASH',
    notes: 'Large family setup with 2 cylinders'
  },
  {
    customerIndex: 2,
    billSno: 'B2C-20241218006',
    date: new Date('2024-12-18'),
    time: new Date('2024-12-18T13:45:00'),
    gasItems: [
      { cylinderType: 'DOMESTIC_11_8KG', quantity: 1, pricePerItem: 2850, totalPrice: 2850 }
    ],
    securityItems: [],
    accessoryItems: [],
    deliveryCharges: 150,
    paymentMethod: 'CASH',
    notes: 'Single cylinder refill'
  },

  // Aisha Rahman transactions
  {
    customerIndex: 3,
    billSno: 'B2C-20241204007',
    date: new Date('2024-12-04'),
    time: new Date('2024-12-04T12:00:00'),
    gasItems: [
      { cylinderType: 'DOMESTIC_11_8KG', quantity: 1, pricePerItem: 2800, totalPrice: 2800 }
    ],
    securityItems: [
      { cylinderType: 'DOMESTIC_11_8KG', quantity: 1, pricePerItem: 30000, totalPrice: 30000, isReturn: false }
    ],
    accessoryItems: [
      { itemName: 'Gas Pipe (ft)', quantity: 15, pricePerItem: 150, totalPrice: 2250 },
      { itemName: 'Regulator 3 Star Low Pressure Q1', quantity: 1, pricePerItem: 750, totalPrice: 750 }
    ],
    deliveryCharges: 180,
    paymentMethod: 'CASH',
    notes: 'Standard home setup'
  },

  // Omar Sheikh transactions
  {
    customerIndex: 4,
    billSno: 'B2C-20241205008',
    date: new Date('2024-12-05'),
    time: new Date('2024-12-05T15:20:00'),
    gasItems: [
      { cylinderType: 'COMMERCIAL_45_4KG', quantity: 1, pricePerItem: 8500, totalPrice: 8500 }
    ],
    securityItems: [
      { cylinderType: 'COMMERCIAL_45_4KG', quantity: 1, pricePerItem: 90000, totalPrice: 90000, isReturn: false }
    ],
    accessoryItems: [
      { itemName: 'Gas Pipe (ft)', quantity: 50, pricePerItem: 150, totalPrice: 7500 },
      { itemName: 'Regulator 5 Star High Pressure', quantity: 2, pricePerItem: 1200, totalPrice: 2400 }
    ],
    deliveryCharges: 400,
    paymentMethod: 'CASH',
    notes: 'Industrial setup for manufacturing unit'
  },
  {
    customerIndex: 4,
    billSno: 'B2C-20241212009',
    date: new Date('2024-12-12'),
    time: new Date('2024-12-12T10:30:00'),
    gasItems: [
      { cylinderType: 'COMMERCIAL_45_4KG', quantity: 1, pricePerItem: 8600, totalPrice: 8600 }
    ],
    securityItems: [],
    accessoryItems: [
      { itemName: 'Gas Pipe (ft)', quantity: 20, pricePerItem: 150, totalPrice: 3000 }
    ],
    deliveryCharges: 350,
    paymentMethod: 'CASH',
    notes: 'Regular commercial refill'
  },

  // Zainab Malik transactions
  {
    customerIndex: 5,
    billSno: 'B2C-20241206010',
    date: new Date('2024-12-06'),
    time: new Date('2024-12-06T14:15:00'),
    gasItems: [
      { cylinderType: 'STANDARD_15KG', quantity: 1, pricePerItem: 3500, totalPrice: 3500 }
    ],
    securityItems: [
      { cylinderType: 'STANDARD_15KG', quantity: 1, pricePerItem: 50000, totalPrice: 50000, isReturn: false }
    ],
    accessoryItems: [
      { itemName: 'Gas Pipe (ft)', quantity: 20, pricePerItem: 150, totalPrice: 3000 },
      { itemName: 'Stove', quantity: 1, pricePerItem: 2500, totalPrice: 2500 },
      { itemName: 'Regulator Adjustable', quantity: 1, pricePerItem: 800, totalPrice: 800 }
    ],
    deliveryCharges: 200,
    paymentMethod: 'CASH',
    notes: 'Complete kitchen setup'
  },

  // Hassan Butt transactions
  {
    customerIndex: 6,
    billSno: 'B2C-20241207011',
    date: new Date('2024-12-07'),
    time: new Date('2024-12-07T11:30:00'),
    gasItems: [
      { cylinderType: 'DOMESTIC_11_8KG', quantity: 1, pricePerItem: 2800, totalPrice: 2800 }
    ],
    securityItems: [
      { cylinderType: 'DOMESTIC_11_8KG', quantity: 1, pricePerItem: 30000, totalPrice: 30000, isReturn: false }
    ],
    accessoryItems: [
      { itemName: 'Gas Pipe (ft)', quantity: 18, pricePerItem: 150, totalPrice: 2700 },
      { itemName: 'Regulator 3 Star Low Pressure Q2', quantity: 1, pricePerItem: 750, totalPrice: 750 }
    ],
    deliveryCharges: 180,
    paymentMethod: 'CASH',
    notes: 'Standard home setup'
  },
  {
    customerIndex: 6,
    billSno: 'B2C-20241214012',
    date: new Date('2024-12-14'),
    time: new Date('2024-12-14T16:45:00'),
    gasItems: [
      { cylinderType: 'DOMESTIC_11_8KG', quantity: 1, pricePerItem: 2850, totalPrice: 2850 }
    ],
    securityItems: [],
    accessoryItems: [
      { itemName: 'Gas Pipe (ft)', quantity: 5, pricePerItem: 150, totalPrice: 750 }
    ],
    deliveryCharges: 150,
    paymentMethod: 'CASH',
    notes: 'Regular refill with pipe extension'
  },

  // Sara Ahmad transactions
  {
    customerIndex: 7,
    billSno: 'B2C-20241208013',
    date: new Date('2024-12-08'),
    time: new Date('2024-12-08T13:20:00'),
    gasItems: [
      { cylinderType: 'DOMESTIC_11_8KG', quantity: 1, pricePerItem: 2800, totalPrice: 2800 }
    ],
    securityItems: [
      { cylinderType: 'DOMESTIC_11_8KG', quantity: 1, pricePerItem: 30000, totalPrice: 30000, isReturn: false }
    ],
    accessoryItems: [
      { itemName: 'Gas Pipe (ft)', quantity: 22, pricePerItem: 150, totalPrice: 3300 },
      { itemName: 'Regulator Adjustable', quantity: 1, pricePerItem: 800, totalPrice: 800 }
    ],
    deliveryCharges: 200,
    paymentMethod: 'CASH',
    notes: 'New home setup'
  },

  // Tariq Hussain transactions
  {
    customerIndex: 8,
    billSno: 'B2C-20241209014',
    date: new Date('2024-12-09'),
    time: new Date('2024-12-09T10:00:00'),
    gasItems: [
      { cylinderType: 'STANDARD_15KG', quantity: 1, pricePerItem: 3500, totalPrice: 3500 }
    ],
    securityItems: [
      { cylinderType: 'STANDARD_15KG', quantity: 1, pricePerItem: 50000, totalPrice: 50000, isReturn: false }
    ],
    accessoryItems: [
      { itemName: 'Gas Pipe (ft)', quantity: 30, pricePerItem: 150, totalPrice: 4500 },
      { itemName: 'Regulator Ideal High Pressure', quantity: 1, pricePerItem: 900, totalPrice: 900 }
    ],
    deliveryCharges: 250,
    paymentMethod: 'CASH',
    notes: 'Restaurant setup'
  },
  {
    customerIndex: 8,
    billSno: 'B2C-20241216015',
    date: new Date('2024-12-16'),
    time: new Date('2024-12-16T14:30:00'),
    gasItems: [
      { cylinderType: 'STANDARD_15KG', quantity: 1, pricePerItem: 3600, totalPrice: 3600 }
    ],
    securityItems: [],
    accessoryItems: [
      { itemName: 'Gas Pipe (ft)', quantity: 10, pricePerItem: 150, totalPrice: 1500 }
    ],
    deliveryCharges: 200,
    paymentMethod: 'CASH',
    notes: 'Regular restaurant refill'
  },

  // Amina Khan transactions
  {
    customerIndex: 9,
    billSno: 'B2C-20241211016',
    date: new Date('2024-12-11'),
    time: new Date('2024-12-11T15:45:00'),
    gasItems: [
      { cylinderType: 'DOMESTIC_11_8KG', quantity: 1, pricePerItem: 2800, totalPrice: 2800 }
    ],
    securityItems: [
      { cylinderType: 'DOMESTIC_11_8KG', quantity: 1, pricePerItem: 30000, totalPrice: 30000, isReturn: false }
    ],
    accessoryItems: [
      { itemName: 'Gas Pipe (ft)', quantity: 16, pricePerItem: 150, totalPrice: 2400 },
      { itemName: 'Regulator 3 Star Low Pressure Q1', quantity: 1, pricePerItem: 750, totalPrice: 750 }
    ],
    deliveryCharges: 170,
    paymentMethod: 'CASH',
    notes: 'Small family setup'
  },
  {
    customerIndex: 9,
    billSno: 'B2C-20241217017',
    date: new Date('2024-12-17'),
    time: new Date('2024-12-17T12:15:00'),
    gasItems: [
      { cylinderType: 'DOMESTIC_11_8KG', quantity: 1, pricePerItem: 2850, totalPrice: 2850 }
    ],
    securityItems: [],
    accessoryItems: [],
    deliveryCharges: 150,
    paymentMethod: 'CASH',
    notes: 'Simple refill'
  }
];

// Add some cylinder returns (security deposits being returned)
const returnTransactions = [
  {
    customerIndex: 2, // Muhammad Hassan
    billSno: 'B2C-20241220018',
    date: new Date('2024-12-20'),
    time: new Date('2024-12-20T11:30:00'),
    gasItems: [],
    securityItems: [
      { cylinderType: 'DOMESTIC_11_8KG', quantity: 1, pricePerItem: 22500, totalPrice: 22500, isReturn: true } // 25% deduction
    ],
    accessoryItems: [],
    deliveryCharges: 0,
    paymentMethod: 'CASH',
    notes: 'Returning 1 cylinder - 25% deduction applied'
  },
  {
    customerIndex: 6, // Hassan Butt
    billSno: 'B2C-20241221019',
    date: new Date('2024-12-21'),
    time: new Date('2024-12-21T14:20:00'),
    gasItems: [],
    securityItems: [
      { cylinderType: 'DOMESTIC_11_8KG', quantity: 1, pricePerItem: 22500, totalPrice: 22500, isReturn: true } // 25% deduction
    ],
    accessoryItems: [],
    deliveryCharges: 0,
    paymentMethod: 'CASH',
    notes: 'Customer moving - returning cylinder with 25% deduction'
  }
];

async function populateB2CData() {
  try {
    console.log('🚀 Starting B2C sample data population...');

    // Clear existing B2C data
    console.log('🧹 Clearing existing B2C data...');
    await prisma.b2CTransactionAccessoryItem.deleteMany();
    await prisma.b2CTransactionSecurityItem.deleteMany();
    await prisma.b2CTransactionGasItem.deleteMany();
    await prisma.b2CTransaction.deleteMany();
    await prisma.b2CCylinderHolding.deleteMany();
    await prisma.b2CCustomer.deleteMany();

    // Create customers
    console.log('👥 Creating B2C customers...');
    const createdCustomers = [];
    for (const customerData of sampleCustomers) {
      const customer = await prisma.b2CCustomer.create({
        data: customerData
      });
      createdCustomers.push(customer);
      console.log(`✅ Created customer: ${customer.name}`);
    }

    // Create transactions
    console.log('💰 Creating transactions...');
    const allTransactions = [...sampleTransactions, ...returnTransactions];
    
    for (const transactionData of allTransactions) {
      const customer = createdCustomers[transactionData.customerIndex];
      
      // Calculate totals
      const gasTotal = transactionData.gasItems.reduce((sum, item) => sum + item.totalPrice, 0);
      const securityTotal = transactionData.securityItems.reduce((sum, item) => sum + item.totalPrice, 0);
      const accessoryTotal = transactionData.accessoryItems.reduce((sum, item) => sum + item.totalPrice, 0);
      const totalAmount = gasTotal + securityTotal + accessoryTotal;
      const finalAmount = totalAmount + transactionData.deliveryCharges;

      // Create transaction
      const transaction = await prisma.b2CTransaction.create({
        data: {
          billSno: transactionData.billSno,
          customerId: customer.id,
          date: transactionData.date,
          time: transactionData.time,
          totalAmount,
          deliveryCharges: transactionData.deliveryCharges,
          finalAmount,
          paymentMethod: transactionData.paymentMethod,
          notes: transactionData.notes
        }
      });

      // Create gas items
      if (transactionData.gasItems.length > 0) {
        await prisma.b2CTransactionGasItem.createMany({
          data: transactionData.gasItems.map(item => ({
            transactionId: transaction.id,
            cylinderType: item.cylinderType,
            quantity: item.quantity,
            pricePerItem: item.pricePerItem,
            totalPrice: item.totalPrice
          }))
        });
      }

      // Create security items and cylinder holdings
      if (transactionData.securityItems.length > 0) {
        await prisma.b2CTransactionSecurityItem.createMany({
          data: transactionData.securityItems.map(item => ({
            transactionId: transaction.id,
            cylinderType: item.cylinderType,
            quantity: item.quantity,
            pricePerItem: item.pricePerItem,
            totalPrice: item.totalPrice,
            isReturn: item.isReturn,
            deductionRate: item.isReturn ? 0.25 : 0
          }))
        });

        // Create cylinder holdings for new deposits (not returns)
        for (const item of transactionData.securityItems) {
          if (!item.isReturn) {
            await prisma.b2CCylinderHolding.create({
              data: {
                customerId: customer.id,
                cylinderType: item.cylinderType,
                quantity: item.quantity,
                securityAmount: item.pricePerItem,
                issueDate: transactionData.date
              }
            });
          } else {
            // For returns, mark existing holdings as returned
            const holdings = await prisma.b2CCylinderHolding.findMany({
              where: {
                customerId: customer.id,
                cylinderType: item.cylinderType,
                isReturned: false
              },
              orderBy: { issueDate: 'asc' }
            });

            let remainingQuantity = item.quantity;
            for (const holding of holdings) {
              if (remainingQuantity <= 0) break;
              
              const returnQuantity = Math.min(remainingQuantity, holding.quantity);
              const deduction = holding.securityAmount * 0.25;
              
              await prisma.b2CCylinderHolding.update({
                where: { id: holding.id },
                data: {
                  returnDate: transactionData.date,
                  isReturned: true,
                  returnDeduction: deduction
                }
              });
              
              remainingQuantity -= returnQuantity;
            }
          }
        }
      }

      // Create accessory items
      if (transactionData.accessoryItems.length > 0) {
        await prisma.b2CTransactionAccessoryItem.createMany({
          data: transactionData.accessoryItems.map(item => ({
            transactionId: transaction.id,
            itemName: item.itemName,
            quantity: item.quantity,
            pricePerItem: item.pricePerItem,
            totalPrice: item.totalPrice
          }))
        });
      }

      // Update customer's total profit (only gas sales, not security deposits)
      await prisma.b2CCustomer.update({
        where: { id: customer.id },
        data: {
          totalProfit: {
            increment: gasTotal + accessoryTotal // Only count actual sales, not security deposits
          }
        }
      });

      console.log(`✅ Created transaction: ${transaction.billSno} for ${customer.name}`);
    }

    // Generate summary
    const totalCustomers = await prisma.b2CCustomer.count();
    const totalTransactions = await prisma.b2CTransaction.count();
    const totalProfit = await prisma.b2CCustomer.aggregate({
      _sum: { totalProfit: true }
    });
    const cylinderHoldings = await prisma.b2CCylinderHolding.aggregate({
      where: { isReturned: false },
      _sum: { quantity: true }
    });

    console.log('\n🎉 B2C Sample Data Population Complete!');
    console.log('📊 Summary:');
    console.log(`   👥 Total Customers: ${totalCustomers}`);
    console.log(`   💰 Total Transactions: ${totalTransactions}`);
    console.log(`   💵 Total Profit: Rs ${(totalProfit._sum.totalProfit || 0).toFixed(2)}`);
    console.log(`   🔥 Cylinders in Market: ${cylinderHoldings._sum.quantity || 0}`);
    console.log('\n🚀 Your B2C system is ready for testing!');
    console.log('   Visit: http://localhost:3000/customers/b2c');

  } catch (error) {
    console.error('❌ Error populating B2C data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

populateB2CData()
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
