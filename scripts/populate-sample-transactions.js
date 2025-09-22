const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function populateSampleTransactions() {
  console.log('🚀 Populating sample transactions for all customers...');

  try {
    // Get all customers and products
    const customers = await prisma.customer.findMany();
    const products = await prisma.product.findMany();
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@lpg-gas.com' },
    });

    if (customers.length === 0 || products.length === 0 || !adminUser) {
      console.log('❌ Missing required data. Please run setup-basic-b2b-data.js first.');
      return;
    }

    console.log(`📊 Found ${customers.length} customers and ${products.length} products`);

    // Sample transaction data for each customer
    const transactionData = [
      {
        customerName: 'Kandahaar Restaurant',
        transactions: [
          {
            type: 'SALE',
            items: [
              { productName: 'Domestic (11.8kg)', quantity: 3, price: 5000, cylinderType: 'Domestic (11.8kg)' },
              { productName: 'Regulator', quantity: 2, price: 1500 },
            ],
            notes: 'Regular weekly delivery'
          },
          {
            type: 'PAYMENT',
            amount: 10000,
            paymentRef: 'BANK-001',
            notes: 'Partial payment received'
          },
          {
            type: 'SALE',
            items: [
              { productName: 'Standard (15kg)', quantity: 2, price: 6500, cylinderType: 'Standard (15kg)' },
              { productName: 'Gas Pipe (1 meter)', quantity: 10, price: 300 },
            ],
            notes: 'Additional order for busy weekend'
          },
          {
            type: 'BUYBACK',
            items: [
              { productName: 'Domestic (11.8kg)', quantity: 1, price: 5000, cylinderType: 'Domestic (11.8kg)', condition: 'PARTIAL', remainingKg: 4 }
            ],
            notes: 'Customer returned cylinder with remaining gas'
          },
          {
            type: 'RETURN_EMPTY',
            items: [
              { productName: 'Domestic (11.8kg)', quantity: 2, cylinderType: 'Domestic (11.8kg)' }
            ],
            notes: 'Empty cylinders returned'
          },
          {
            type: 'PAYMENT',
            amount: 15000,
            paymentRef: 'CASH-001',
            notes: 'Cash payment received'
          }
        ]
      },
      {
        customerName: 'Food Bazar',
        transactions: [
          {
            type: 'SALE',
            items: [
              { productName: 'Standard (15kg)', quantity: 4, price: 6500, cylinderType: 'Standard (15kg)' },
              { productName: 'Stove (2 Burner)', quantity: 2, price: 2500 },
              { productName: 'Regulator', quantity: 4, price: 1500 },
            ],
            notes: 'New outlet setup order'
          },
          {
            type: 'SALE',
            items: [
              { productName: 'Domestic (11.8kg)', quantity: 5, price: 5000, cylinderType: 'Domestic (11.8kg)' },
            ],
            notes: 'Regular domestic cylinder order'
          },
          {
            type: 'PAYMENT',
            amount: 20000,
            paymentRef: 'BANK-002',
            notes: 'Monthly payment'
          },
          {
            type: 'RETURN_EMPTY',
            items: [
              { productName: 'Standard (15kg)', quantity: 2, cylinderType: 'Standard (15kg)' },
              { productName: 'Domestic (11.8kg)', quantity: 3, cylinderType: 'Domestic (11.8kg)' }
            ],
            notes: 'Empty cylinders collected'
          }
        ]
      },
      {
        customerName: 'Pizza Box',
        transactions: [
          {
            type: 'SALE',
            items: [
              { productName: 'Commercial (45.4kg)', quantity: 1, price: 18000, cylinderType: 'Commercial (45.4kg)' },
              { productName: 'Regulator', quantity: 1, price: 1500 },
            ],
            notes: 'Commercial cylinder for pizza ovens'
          },
          {
            type: 'SALE',
            items: [
              { productName: 'Domestic (11.8kg)', quantity: 2, price: 5000, cylinderType: 'Domestic (11.8kg)' },
            ],
            notes: 'Backup cylinders for busy periods'
          },
          {
            type: 'PAYMENT',
            amount: 25000,
            paymentRef: 'CHECK-001',
            notes: 'Payment by check'
          },
          {
            type: 'BUYBACK',
            items: [
              { productName: 'Commercial (45.4kg)', quantity: 1, price: 18000, cylinderType: 'Commercial (45.4kg)', condition: 'FULL' }
            ],
            notes: 'Customer returned full cylinder - no longer needed'
          }
        ]
      },
      {
        customerName: 'Industrial Gas Co.',
        transactions: [
          {
            type: 'SALE',
            items: [
              { productName: 'Commercial (45.4kg)', quantity: 3, price: 18000, cylinderType: 'Commercial (45.4kg)' },
              { productName: 'Gas Pipe (1 meter)', quantity: 50, price: 300 },
            ],
            notes: 'Large industrial order'
          },
          {
            type: 'SALE',
            items: [
              { productName: 'Standard (15kg)', quantity: 6, price: 6500, cylinderType: 'Standard (15kg)' },
            ],
            notes: 'Additional cylinders for expansion'
          },
          {
            type: 'PAYMENT',
            amount: 30000,
            paymentRef: 'WIRE-001',
            notes: 'Wire transfer payment'
          },
          {
            type: 'RETURN_EMPTY',
            items: [
              { productName: 'Commercial (45.4kg)', quantity: 2, cylinderType: 'Commercial (45.4kg)' },
              { productName: 'Standard (15kg)', quantity: 4, cylinderType: 'Standard (15kg)' }
            ],
            notes: 'Empty cylinders returned for refill'
          }
        ]
      },
      {
        customerName: 'Metro Restaurant',
        transactions: [
          {
            type: 'SALE',
            items: [
              { productName: 'Standard (15kg)', quantity: 2, price: 6500, cylinderType: 'Standard (15kg)' },
              { productName: 'Regulator', quantity: 2, price: 1500 },
              { productName: 'Stove (2 Burner)', quantity: 1, price: 2500 },
            ],
            notes: 'Fine dining restaurant setup'
          },
          {
            type: 'SALE',
            items: [
              { productName: 'Domestic (11.8kg)', quantity: 3, price: 5000, cylinderType: 'Domestic (11.8kg)' },
            ],
            notes: 'Additional cylinders for busy service'
          },
          {
            type: 'PAYMENT',
            amount: 12000,
            paymentRef: 'CARD-001',
            notes: 'Credit card payment'
          },
          {
            type: 'BUYBACK',
            items: [
              { productName: 'Standard (15kg)', quantity: 1, price: 6500, cylinderType: 'Standard (15kg)', condition: 'PARTIAL', remainingKg: 8 }
            ],
            notes: 'Returned cylinder with some gas remaining'
          }
        ]
      }
    ];

    let transactionCount = 0;
    let billSequence = 1;

    for (const customerData of transactionData) {
      const customer = customers.find(c => c.name === customerData.customerName);
      if (!customer) {
        console.log(`⚠️ Customer not found: ${customerData.customerName}`);
        continue;
      }

      console.log(`\n📝 Creating transactions for ${customer.name}...`);

      for (const txData of customerData.transactions) {
        const today = new Date();
        const date = new Date(today.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000); // Random date within last 30 days
        
        const billSno = `BILL-${date.toISOString().slice(0, 10).replace(/-/g, '')}-${String(billSequence).padStart(6, '0')}`;
        billSequence++;

        try {
          const transaction = await prisma.b2BTransaction.create({
            data: {
              transactionType: txData.type,
              billSno,
              customerId: customer.id,
              date: date,
              time: date,
              totalAmount: txData.amount || 0,
              paymentReference: txData.paymentRef || null,
              notes: txData.notes,
              createdBy: adminUser.id,
            },
          });

          // Create transaction items
          if (txData.items && Array.isArray(txData.items)) {
            for (const itemData of txData.items) {
              const product = products.find(p => p.name === itemData.productName);
              
              await prisma.b2BTransactionItem.create({
                data: {
                  transactionId: transaction.id,
                  productId: product?.id,
                  productName: itemData.productName,
                  quantity: itemData.quantity,
                  pricePerItem: itemData.price || 0,
                  totalPrice: (itemData.price || 0) * itemData.quantity,
                  cylinderType: itemData.cylinderType || null,
                  returnedCondition: itemData.condition || null,
                  remainingKg: itemData.remainingKg || null,
                  originalSoldPrice: txData.type === 'BUYBACK' ? itemData.price : null,
                  buybackRate: txData.type === 'BUYBACK' ? 0.60 : null,
                  buybackPricePerItem: txData.type === 'BUYBACK' ? (itemData.price * 0.60) : null,
                  buybackTotal: txData.type === 'BUYBACK' ? (itemData.price * 0.60 * itemData.quantity) : null,
                },
              });
            }
          }

          // Update customer ledger balance and cylinder due counts
          let ledgerChange = 0;
          let domesticChange = 0;
          let standardChange = 0;
          let commercialChange = 0;

          switch (txData.type) {
            case 'SALE':
              ledgerChange = txData.amount || (txData.items ? txData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0) : 0);
              if (txData.items) {
                txData.items.forEach(item => {
                  if (item.cylinderType === 'Domestic (11.8kg)') domesticChange += item.quantity;
                  else if (item.cylinderType === 'Standard (15kg)') standardChange += item.quantity;
                  else if (item.cylinderType === 'Commercial (45.4kg)') commercialChange += item.quantity;
                });
              }
              break;
            case 'PAYMENT':
              ledgerChange = -(txData.amount || 0);
              break;
            case 'BUYBACK':
              const buybackTotal = txData.items ? txData.items.reduce((sum, item) => sum + (item.price * 0.60 * item.quantity), 0) : 0;
              ledgerChange = -buybackTotal;
              if (txData.items) {
                txData.items.forEach(item => {
                  if (item.cylinderType === 'Domestic (11.8kg)') domesticChange -= item.quantity;
                  else if (item.cylinderType === 'Standard (15kg)') standardChange -= item.quantity;
                  else if (item.cylinderType === 'Commercial (45.4kg)') commercialChange -= item.quantity;
                });
              }
              break;
            case 'RETURN_EMPTY':
              if (txData.items) {
                txData.items.forEach(item => {
                  if (item.cylinderType === 'Domestic (11.8kg)') domesticChange -= item.quantity;
                  else if (item.cylinderType === 'Standard (15kg)') standardChange -= item.quantity;
                  else if (item.cylinderType === 'Commercial (45.4kg)') commercialChange -= item.quantity;
                });
              }
              break;
          }

          await prisma.customer.update({
            where: { id: customer.id },
            data: {
              ledgerBalance: parseFloat(customer.ledgerBalance.toString()) + ledgerChange,
              domestic118kgDue: Math.max(0, customer.domestic118kgDue + domesticChange),
              standard15kgDue: Math.max(0, customer.standard15kgDue + standardChange),
              commercial454kgDue: Math.max(0, customer.commercial454kgDue + commercialChange),
            },
          });

          // Update inventory for sales and returns
          if (txData.items && Array.isArray(txData.items)) {
            for (const itemData of txData.items) {
              const product = products.find(p => p.name === itemData.productName);
              if (product) {
                let stockChange = 0;
                let newStockType = product.stockType;

                if (txData.type === 'SALE') {
                  stockChange = -itemData.quantity;
                } else if (txData.type === 'RETURN_EMPTY') {
                  stockChange = itemData.quantity;
                  newStockType = 'EMPTY';
                } else if (txData.type === 'BUYBACK') {
                  stockChange = itemData.quantity;
                  if (itemData.condition === 'PARTIAL') {
                    newStockType = 'PARTIAL';
                  } else if (itemData.condition === 'FULL') {
                    newStockType = 'FILLED';
                  }
                }

                await prisma.product.update({
                  where: { id: product.id },
                  data: {
                    stockQuantity: parseFloat(product.stockQuantity.toString()) + stockChange,
                    stockType: newStockType,
                    remainingKg: txData.type === 'BUYBACK' && itemData.condition === 'PARTIAL' ? itemData.remainingKg : null,
                  },
                });
              }
            }
          }

          transactionCount++;
          console.log(`✅ Created ${txData.type} transaction: ${billSno}`);

        } catch (error) {
          console.error(`❌ Error creating transaction for ${customer.name}:`, error.message);
        }
      }
    }

    console.log(`\n🎉 Sample transactions populated successfully!`);
    console.log(`📊 Summary:`);
    console.log(`- Created ${transactionCount} transactions`);
    console.log(`- Updated customer ledger balances`);
    console.log(`- Updated cylinder due counts`);
    console.log(`- Updated inventory levels`);
    console.log(`\n🚀 Your B2B Customer Management System now has realistic transaction history!`);

  } catch (error) {
    console.error('❌ Error populating sample transactions:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script if executed directly
if (require.main === module) {
  populateSampleTransactions()
    .then(() => {
      console.log('✅ Sample transactions populated successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Failed to populate sample transactions:', error);
      process.exit(1);
    });
}

module.exports = { populateSampleTransactions };
