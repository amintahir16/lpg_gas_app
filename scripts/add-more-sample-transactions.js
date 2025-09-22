const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addMoreSampleTransactions() {
  try {
    console.log('Adding more sample transactions for better testing...');

    // Get admin user
    const adminUser = await prisma.user.findFirst({
      where: { email: 'admin@lpg.com' }
    });

    // Get all B2B customers
    const customers = await prisma.customer.findMany({
      where: { type: 'B2B' }
    });

    console.log(`Found ${customers.length} B2B customers`);

    // Add more transactions for each customer
    for (const customer of customers) {
      // Add 2-4 more transactions per customer
      const additionalTransactions = Math.floor(Math.random() * 3) + 2;
      
      for (let i = 0; i < additionalTransactions; i++) {
        const transactionDate = new Date();
        transactionDate.setDate(transactionDate.getDate() - Math.floor(Math.random() * 60) - 30);
        
        const billSno = `B2B${transactionDate.toISOString().slice(0, 10).replace(/-/g, '')}${String(customers.indexOf(customer) + 1).padStart(2, '0')}${String(i + 10).padStart(2, '0')}`;
        
        // More realistic transaction types based on customer type
        let transactionType;
        const rand = Math.random();
        if (rand < 0.4) transactionType = 'SALE';
        else if (rand < 0.7) transactionType = 'PAYMENT';
        else if (rand < 0.9) transactionType = 'RETURN_EMPTY';
        else transactionType = 'BUYBACK';
        
        // Create transaction
        const transaction = await prisma.b2BTransaction.create({
          data: {
            transactionType: transactionType,
            billSno: billSno,
            customerId: customer.id,
            date: transactionDate,
            time: transactionDate,
            totalAmount: 0,
            paymentReference: transactionType === 'PAYMENT' ? `PAY-${billSno}` : null,
            notes: generateRealisticNotes(transactionType, customer.name, transactionDate),
            createdBy: adminUser.id,
          },
        });

        // Create realistic transaction items
        const items = generateRealisticTransactionItems(transactionType, customer.name);
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

        console.log(`Added ${transactionType} transaction for ${customer.name}: ${billSno} - ${formatCurrency(totalAmount)}`);
      }
    }

    console.log('\n✅ Additional sample transactions added successfully!');
    
  } catch (error) {
    console.error('Error adding sample transactions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

function generateRealisticNotes(transactionType, customerName, date) {
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                     'July', 'August', 'September', 'October', 'November', 'December'];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();
  
  const notes = {
    'SALE': [
      `Monthly gas supply for ${customerName} - ${month} ${year}`,
      `Regular delivery to ${customerName} kitchen`,
      `Bulk order for ${customerName} operations`,
      `Emergency gas delivery to ${customerName}`,
      `Scheduled delivery for ${customerName} - ${month} ${year}`,
      `Gas cylinders and accessories for ${customerName}`,
      `Fresh gas supply for ${customerName} restaurant`
    ],
    'PAYMENT': [
      `Payment received from ${customerName} - ${month} ${year}`,
      `Partial payment from ${customerName}`,
      `Full payment settlement from ${customerName}`,
      `Advance payment from ${customerName}`,
      `Outstanding balance payment from ${customerName}`,
      `Monthly payment from ${customerName}`,
      `Payment via bank transfer from ${customerName}`
    ],
    'BUYBACK': [
      `Gas buyback from ${customerName} - cylinders with remaining gas`,
      `Partial gas return from ${customerName} - ${month} ${year}`,
      `Buyback transaction for ${customerName} - 60% rate applied`,
      `Gas return with compensation from ${customerName}`,
      `Cylinder buyback from ${customerName} - remaining gas`,
      `Gas buyback from ${customerName} - ${month} ${year}`
    ],
    'RETURN_EMPTY': [
      `Empty cylinder return from ${customerName}`,
      `Cylinder collection from ${customerName} - ${month} ${year}`,
      `Empty gas cylinder return from ${customerName}`,
      `Scheduled cylinder pickup from ${customerName}`,
      `Empty cylinder collection from ${customerName}`,
      `Cylinder return from ${customerName} - ${month} ${year}`
    ]
  };
  
  const typeNotes = notes[transactionType] || ['Transaction'];
  return typeNotes[Math.floor(Math.random() * typeNotes.length)];
}

function generateRealisticTransactionItems(transactionType, customerName) {
  const items = [];
  
  if (transactionType === 'SALE') {
    // Gas cylinders with realistic quantities based on customer type
    const gasItems = [
      { type: 'DOMESTIC_11_8KG', name: 'Domestic Gas Cylinder (11.8kg)', price: 2500, maxQty: 8 },
      { type: 'STANDARD_15KG', name: 'Standard Gas Cylinder (15kg)', price: 3000, maxQty: 12 },
      { type: 'COMMERCIAL_45_4KG', name: 'Commercial Gas Cylinder (45.4kg)', price: 8000, maxQty: 5 }
    ];
    
    // Accessories with realistic quantities
    const accessories = [
      { name: 'Gas Pipe (ft)', price: 50, maxQty: 30 },
      { name: 'Stove', price: 2500, maxQty: 3 },
      { name: 'Regulator Adjustable', price: 800, maxQty: 5 },
      { name: 'Regulator Ideal High Pressure', price: 1200, maxQty: 4 },
      { name: 'Regulator 5 Star High Pressure', price: 1500, maxQty: 3 },
      { name: 'Regulator 3 Star Low Pressure Q1', price: 600, maxQty: 4 },
      { name: 'Regulator 3 Star Low Pressure Q2', price: 650, maxQty: 4 }
    ];
    
    // Add gas items (always include some)
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
    
    // Add accessories (sometimes)
    accessories.forEach(accessory => {
      const quantity = Math.random() < 0.6 ? Math.floor(Math.random() * accessory.maxQty) : 0;
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
    // Payment transactions with realistic amounts
    const amount = Math.floor(Math.random() * 80000) + 15000;
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
    // Buyback transactions with realistic remaining gas
    const gasTypes = ['DOMESTIC_11_8KG', 'STANDARD_15KG', 'COMMERCIAL_45_4KG'];
    const gasType = gasTypes[Math.floor(Math.random() * gasTypes.length)];
    const originalPrice = gasType === 'DOMESTIC_11_8KG' ? 2500 : gasType === 'STANDARD_15KG' ? 3000 : 8000;
    const quantity = Math.floor(Math.random() * 4) + 1;
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
    const quantity = Math.floor(Math.random() * 6) + 1;
    
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

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

addMoreSampleTransactions();
