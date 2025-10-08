const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Sample B2C customers
const sampleCustomers = [
  {
    name: 'Amina Khan',
    phone: '03001234567',
    email: 'amina.khan@email.com',
    houseNumber: '220',
    sector: 'D2',
    street: '30',
    phase: '1',
    area: 'Hayatabad',
    city: 'Peshawar'
  },
  {
    name: 'Ahmed Ali',
    phone: '03119876543',
    email: 'ahmed.ali@email.com',
    houseNumber: '50',
    sector: 'E1',
    street: '6',
    phase: '1',
    area: 'Hayatabad',
    city: 'Peshawar'
  },
  {
    name: 'Fatima Hassan',
    phone: '03225551234',
    email: 'fatima.hassan@email.com',
    houseNumber: '36',
    sector: 'F7',
    street: '35',
    phase: '6',
    area: 'Hayatabad',
    city: 'Peshawar'
  },
  {
    name: 'Hassan Malik',
    phone: '03334445566',
    houseNumber: '125',
    sector: 'G3',
    street: '12',
    phase: '3',
    area: 'Hayatabad',
    city: 'Peshawar'
  },
  {
    name: 'Zainab Iqbal',
    phone: '03441112233',
    email: 'zainab.iqbal@email.com',
    houseNumber: '78',
    sector: 'C4',
    street: '20',
    phase: '4',
    area: 'Hayatabad',
    city: 'Peshawar'
  }
];

// Product pricing (with costs and selling prices)
const products = {
  gas: {
    DOMESTIC_11_8KG: { 
      selling: 2800, 
      cost: 2400,  // Rs 400 profit per cylinder
      security: 30000 
    },
    STANDARD_15KG: { 
      selling: 4560, 
      cost: 4000,  // Rs 560 profit per cylinder
      security: 50000 
    },
    COMMERCIAL_45_4KG: { 
      selling: 13680, 
      cost: 12000, // Rs 1,680 profit per cylinder
      security: 90000 
    }
  },
  accessories: {
    'Gas Pipe (ft)': { selling: 150, cost: 100 },
    'Regulator Adjustable': { selling: 1200, cost: 900 },
    'Regulator Ideal High Pressure': { selling: 1500, cost: 1100 },
    'Regulator 5 Star High Pressure': { selling: 1800, cost: 1300 },
    'Regulator 3 Star Low Pressure Q1': { selling: 1000, cost: 750 },
    'Regulator 3 Star Low Pressure Q2': { selling: 1100, cost: 800 },
    'Stove': { selling: 5000, cost: 3500 }
  }
};

// Sample transactions with realistic scenarios
const generateTransactions = (customer, customerIndex) => {
  const transactions = [];
  const baseDate = new Date('2024-11-01');
  
  // Transaction 1: Initial cylinder purchase with accessories
  transactions.push({
    date: new Date(baseDate.getTime() + customerIndex * 86400000), // Spread over days
    type: 'INITIAL_PURCHASE',
    gasItems: [
      {
        cylinderType: 'DOMESTIC_11_8KG',
        quantity: 1,
        ...products.gas.DOMESTIC_11_8KG
      }
    ],
    securityItems: [
      {
        cylinderType: 'DOMESTIC_11_8KG',
        quantity: 1,
        pricePerItem: products.gas.DOMESTIC_11_8KG.security,
        isReturn: false
      }
    ],
    accessoryItems: [
      {
        itemName: 'Gas Pipe (ft)',
        quantity: 10,
        ...products.accessories['Gas Pipe (ft)']
      },
      {
        itemName: 'Regulator Adjustable',
        quantity: 1,
        ...products.accessories['Regulator Adjustable']
      }
    ],
    deliveryCharges: 300,
    deliveryCost: 200 // Rs 100 profit on delivery
  });

  // Transaction 2: Gas refill (15 days later)
  transactions.push({
    date: new Date(baseDate.getTime() + (customerIndex + 15) * 86400000),
    type: 'REFILL',
    gasItems: [
      {
        cylinderType: 'DOMESTIC_11_8KG',
        quantity: 2,
        ...products.gas.DOMESTIC_11_8KG
      }
    ],
    deliveryCharges: 200,
    deliveryCost: 150
  });

  // Transaction 3: Gas refill with accessory (30 days later)
  if (customerIndex % 2 === 0) {
    transactions.push({
      date: new Date(baseDate.getTime() + (customerIndex + 30) * 86400000),
      type: 'REFILL_WITH_ACCESSORY',
      gasItems: [
        {
          cylinderType: 'DOMESTIC_11_8KG',
          quantity: 1,
          ...products.gas.DOMESTIC_11_8KG
        }
      ],
      accessoryItems: [
        {
          itemName: 'Stove',
          quantity: 1,
          ...products.accessories['Stove']
        }
      ],
      deliveryCharges: 300,
      deliveryCost: 200
    });
  }

  // Transaction 4: Cylinder return (for some customers, 60 days later)
  if (customerIndex % 3 === 0) {
    transactions.push({
      date: new Date(baseDate.getTime() + (customerIndex + 60) * 86400000),
      type: 'RETURN',
      securityItems: [
        {
          cylinderType: 'DOMESTIC_11_8KG',
          quantity: 1,
          pricePerItem: products.gas.DOMESTIC_11_8KG.security * 0.75, // 25% deduction
          isReturn: true
        }
      ]
    });
  }

  return transactions;
};

async function resetB2CData() {
  console.log('🔄 Starting B2C Data Reset with Cost Prices...\n');

  try {
    // Step 1: Delete existing B2C data
    console.log('🗑️  Deleting existing B2C data...');
    
    await prisma.b2CTransactionAccessoryItem.deleteMany({});
    console.log('   ✅ Deleted accessory items');
    
    await prisma.b2CTransactionSecurityItem.deleteMany({});
    console.log('   ✅ Deleted security items');
    
    await prisma.b2CTransactionGasItem.deleteMany({});
    console.log('   ✅ Deleted gas items');
    
    await prisma.b2CTransaction.deleteMany({});
    console.log('   ✅ Deleted transactions');
    
    await prisma.b2CCylinderHolding.deleteMany({});
    console.log('   ✅ Deleted cylinder holdings');
    
    await prisma.b2CCustomer.deleteMany({});
    console.log('   ✅ Deleted customers\n');

    // Step 2: Create new sample customers with transactions
    console.log('📊 Creating new sample data with cost tracking...\n');

    for (let i = 0; i < sampleCustomers.length; i++) {
      const customerData = sampleCustomers[i];
      console.log(`Creating customer: ${customerData.name}`);

      // Create customer
      const customer = await prisma.b2CCustomer.create({
        data: {
          name: customerData.name,
          phone: customerData.phone,
          email: customerData.email,
          address: `H.No: ${customerData.houseNumber}, Sector: ${customerData.sector}, St: ${customerData.street}, Ph: ${customerData.phase}, ${customerData.area}`,
          houseNumber: customerData.houseNumber,
          sector: customerData.sector,
          street: customerData.street,
          phase: customerData.phase,
          area: customerData.area,
          city: customerData.city,
          totalProfit: 0
        }
      });

      // Generate and create transactions
      const transactions = generateTransactions(customerData, i);
      let customerTotalProfit = 0;

      for (const txnData of transactions) {
        const dateStr = txnData.date.toISOString().split('T')[0].replace(/-/g, '');
        
        // Get or create bill sequence
        let billSequence = await prisma.billSequence.findUnique({
          where: { date: new Date(txnData.date.toISOString().split('T')[0]) }
        });

        if (!billSequence) {
          billSequence = await prisma.billSequence.create({
            data: {
              date: new Date(txnData.date.toISOString().split('T')[0]),
              sequence: 1
            }
          });
        } else {
          billSequence = await prisma.billSequence.update({
            where: { date: new Date(txnData.date.toISOString().split('T')[0]) },
            data: { sequence: { increment: 1 } }
          });
        }

        const billSno = `B2C-${dateStr}-${billSequence.sequence.toString().padStart(4, '0')}`;

        // Calculate totals
        const gasTotal = (txnData.gasItems || []).reduce((sum, item) => 
          sum + (item.selling * item.quantity), 0);
        const gasCost = (txnData.gasItems || []).reduce((sum, item) => 
          sum + (item.cost * item.quantity), 0);
        
        const securityTotal = (txnData.securityItems || []).reduce((sum, item) => 
          sum + (item.pricePerItem * item.quantity), 0);
        
        const accessoryTotal = (txnData.accessoryItems || []).reduce((sum, item) => 
          sum + (item.selling * item.quantity), 0);
        const accessoryCost = (txnData.accessoryItems || []).reduce((sum, item) => 
          sum + (item.cost * item.quantity), 0);

        // Calculate security return profit
        const securityReturnProfit = (txnData.securityItems || []).reduce((sum, item) => {
          if (item.isReturn) {
            const originalSecurity = item.pricePerItem / 0.75;
            const deduction = originalSecurity * 0.25;
            return sum + (deduction * item.quantity);
          }
          return sum;
        }, 0);

        const totalAmount = gasTotal + securityTotal + accessoryTotal;
        const finalAmount = totalAmount + (txnData.deliveryCharges || 0);
        const totalCost = gasCost + accessoryCost;
        const deliveryCost = txnData.deliveryCost || 0;
        
        const gasProfit = gasTotal - gasCost;
        const accessoryProfit = accessoryTotal - accessoryCost;
        const deliveryProfit = (txnData.deliveryCharges || 0) - deliveryCost;
        const actualProfit = gasProfit + accessoryProfit + deliveryProfit + securityReturnProfit;

        // Create transaction
        const transaction = await prisma.b2CTransaction.create({
          data: {
            billSno,
            customerId: customer.id,
            date: txnData.date,
            time: new Date(`2000-01-01T${10 + i}:${30 + i}:00`),
            totalAmount,
            deliveryCharges: txnData.deliveryCharges || 0,
            finalAmount,
            totalCost,
            deliveryCost,
            actualProfit,
            paymentMethod: 'CASH',
            notes: `${txnData.type} transaction`
          }
        });

        // Create gas items
        if (txnData.gasItems) {
          for (const item of txnData.gasItems) {
            await prisma.b2CTransactionGasItem.create({
              data: {
                transactionId: transaction.id,
                cylinderType: item.cylinderType,
                quantity: item.quantity,
                pricePerItem: item.selling,
                totalPrice: item.selling * item.quantity,
                costPrice: item.cost,
                totalCost: item.cost * item.quantity,
                profitMargin: (item.selling - item.cost) * item.quantity
              }
            });
          }
        }

        // Create security items and cylinder holdings
        if (txnData.securityItems) {
          for (const item of txnData.securityItems) {
            await prisma.b2CTransactionSecurityItem.create({
              data: {
                transactionId: transaction.id,
                cylinderType: item.cylinderType,
                quantity: item.quantity,
                pricePerItem: item.pricePerItem,
                totalPrice: item.pricePerItem * item.quantity,
                isReturn: item.isReturn,
                deductionRate: item.isReturn ? 0.25 : 0
              }
            });

            if (!item.isReturn) {
              // Create cylinder holding
              await prisma.b2CCylinderHolding.create({
                data: {
                  customerId: customer.id,
                  cylinderType: item.cylinderType,
                  quantity: item.quantity,
                  securityAmount: item.pricePerItem,
                  issueDate: txnData.date
                }
              });
            } else {
              // Mark holdings as returned
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
                
                const deduction = holding.securityAmount * 0.25;
                
                await prisma.b2CCylinderHolding.update({
                  where: { id: holding.id },
                  data: {
                    returnDate: txnData.date,
                    isReturned: true,
                    returnDeduction: deduction
                  }
                });
                
                remainingQuantity -= holding.quantity;
              }
            }
          }
        }

        // Create accessory items
        if (txnData.accessoryItems) {
          for (const item of txnData.accessoryItems) {
            await prisma.b2CTransactionAccessoryItem.create({
              data: {
                transactionId: transaction.id,
                itemName: item.itemName,
                quantity: item.quantity,
                pricePerItem: item.selling,
                totalPrice: item.selling * item.quantity,
                costPrice: item.cost,
                totalCost: item.cost * item.quantity,
                profitMargin: (item.selling - item.cost) * item.quantity
              }
            });
          }
        }

        customerTotalProfit += actualProfit;

        console.log(`   ✅ ${txnData.type}: Rs ${finalAmount.toFixed(2)} (Profit: Rs ${actualProfit.toFixed(2)})`);
      }

      // Update customer total profit
      await prisma.b2CCustomer.update({
        where: { id: customer.id },
        data: { totalProfit: customerTotalProfit }
      });

      console.log(`   💰 Total Profit: Rs ${customerTotalProfit.toFixed(2)}\n`);
    }

    // Step 3: Summary
    console.log('═══════════════════════════════════════════════════');
    console.log('📊 SUMMARY');
    console.log('═══════════════════════════════════════════════════');

    const totalCustomers = await prisma.b2CCustomer.count();
    const totalTransactions = await prisma.b2CTransaction.count();
    const totalProfit = await prisma.b2CCustomer.aggregate({
      _sum: { totalProfit: true }
    });
    const activeCylinders = await prisma.b2CCylinderHolding.count({
      where: { isReturned: false }
    });

    console.log(`Customers Created:       ${totalCustomers}`);
    console.log(`Transactions Created:    ${totalTransactions}`);
    console.log(`Total Profit Generated:  Rs ${Number(totalProfit._sum.totalProfit || 0).toFixed(2)}`);
    console.log(`Active Cylinders:        ${activeCylinders}`);
    console.log('\n✅ B2C data reset complete with cost tracking!\n');

    console.log('💡 PROFIT BREAKDOWN:');
    console.log('   - Gas margins tracked (selling - cost)');
    console.log('   - Accessory margins tracked (selling - cost)');
    console.log('   - Security deductions tracked (25% on returns)');
    console.log('   - Delivery profits tracked (charged - cost)');
    console.log('\n🎯 All transactions include proper cost prices!');

  } catch (error) {
    console.error('❌ Error resetting B2C data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
resetB2CData()
  .then(() => {
    console.log('\n🎉 Success! Your B2C data is ready for testing!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Failed to reset B2C data:', error);
    process.exit(1);
  });
