const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function enhanceSampleData() {
  console.log('🚀 Enhancing sample data for comprehensive testing...');

  try {
    // Get admin user
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@lpg-gas.com' },
    });

    if (!adminUser) {
      console.log('❌ Admin user not found. Please run setup-basic-b2b-data.js first.');
      return;
    }

    // Get all customers and products
    const customers = await prisma.customer.findMany();
    const products = await prisma.product.findMany();

    console.log(`📊 Found ${customers.length} customers and ${products.length} products`);

    // Add more comprehensive transactions for testing
    const enhancedTransactions = [
      {
        customerName: 'Kandahaar Restaurant',
        transactions: [
          {
            type: 'SALE',
            items: [
              { productName: 'Domestic (11.8kg)', quantity: 5, price: 5000, cylinderType: 'Domestic (11.8kg)' },
              { productName: 'Regulator', quantity: 3, price: 1500 },
              { productName: 'Gas Pipe (1 meter)', quantity: 20, price: 300 },
            ],
            notes: 'Large order for busy weekend'
          },
          {
            type: 'PAYMENT',
            amount: 25000,
            paymentRef: 'BANK-TRANSFER-001',
            notes: 'Bank transfer payment received'
          },
          {
            type: 'SALE',
            items: [
              { productName: 'Standard (15kg)', quantity: 3, price: 6500, cylinderType: 'Standard (15kg)' },
              { productName: 'Stove (2 Burner)', quantity: 2, price: 2500 },
            ],
            notes: 'Additional cylinders for expansion'
          },
          {
            type: 'BUYBACK',
            items: [
              { productName: 'Domestic (11.8kg)', quantity: 2, price: 5000, cylinderType: 'Domestic (11.8kg)', condition: 'PARTIAL', remainingKg: 3.5 }
            ],
            notes: 'Returned cylinders with remaining gas'
          },
          {
            type: 'RETURN_EMPTY',
            items: [
              { productName: 'Domestic (11.8kg)', quantity: 3, cylinderType: 'Domestic (11.8kg)' },
              { productName: 'Standard (15kg)', quantity: 2, cylinderType: 'Standard (15kg)' }
            ],
            notes: 'Empty cylinders collected'
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
              { productName: 'Commercial (45.4kg)', quantity: 2, price: 18000, cylinderType: 'Commercial (45.4kg)' },
              { productName: 'Regulator', quantity: 2, price: 1500 },
              { productName: 'Gas Pipe (1 meter)', quantity: 30, price: 300 },
            ],
            notes: 'Commercial setup for new location'
          },
          {
            type: 'SALE',
            items: [
              { productName: 'Domestic (11.8kg)', quantity: 8, price: 5000, cylinderType: 'Domestic (11.8kg)' },
              { productName: 'Stove (1 Burner)', quantity: 5, price: 1800 },
            ],
            notes: 'Domestic cylinders for residential customers'
          },
          {
            type: 'PAYMENT',
            amount: 35000,
            paymentRef: 'CHECK-001',
            notes: 'Payment by check'
          },
          {
            type: 'BUYBACK',
            items: [
              { productName: 'Commercial (45.4kg)', quantity: 1, price: 18000, cylinderType: 'Commercial (45.4kg)', condition: 'FULL' }
            ],
            notes: 'Returned full cylinder - no longer needed'
          },
          {
            type: 'RETURN_EMPTY',
            items: [
              { productName: 'Domestic (11.8kg)', quantity: 5, cylinderType: 'Domestic (11.8kg)' }
            ],
            notes: 'Empty domestic cylinders returned'
          }
        ]
      },
      {
        customerName: 'Pizza Box',
        transactions: [
          {
            type: 'SALE',
            items: [
              { productName: 'Commercial (45.4kg)', quantity: 3, price: 18000, cylinderType: 'Commercial (45.4kg)' },
              { productName: 'Regulator', quantity: 3, price: 1500 },
              { productName: 'Gas Pipe (1 meter)', quantity: 25, price: 300 },
            ],
            notes: 'Commercial cylinders for pizza ovens'
          },
          {
            type: 'SALE',
            items: [
              { productName: 'Standard (15kg)', quantity: 4, price: 6500, cylinderType: 'Standard (15kg)' },
              { productName: 'Stove (2 Burner)', quantity: 3, price: 2500 },
            ],
            notes: 'Standard cylinders for backup'
          },
          {
            type: 'PAYMENT',
            amount: 40000,
            paymentRef: 'WIRE-TRANSFER-001',
            notes: 'Wire transfer payment'
          },
          {
            type: 'BUYBACK',
            items: [
              { productName: 'Standard (15kg)', quantity: 2, price: 6500, cylinderType: 'Standard (15kg)', condition: 'PARTIAL', remainingKg: 7.5 }
            ],
            notes: 'Returned standard cylinders with remaining gas'
          },
          {
            type: 'RETURN_EMPTY',
            items: [
              { productName: 'Commercial (45.4kg)', quantity: 2, cylinderType: 'Commercial (45.4kg)' },
              { productName: 'Standard (15kg)', quantity: 1, cylinderType: 'Standard (15kg)' }
            ],
            notes: 'Empty cylinders collected'
          }
        ]
      },
      {
        customerName: 'Industrial Gas Co.',
        transactions: [
          {
            type: 'SALE',
            items: [
              { productName: 'Commercial (45.4kg)', quantity: 5, price: 18000, cylinderType: 'Commercial (45.4kg)' },
              { productName: 'Standard (15kg)', quantity: 10, price: 6500, cylinderType: 'Standard (15kg)' },
              { productName: 'Gas Pipe (1 meter)', quantity: 100, price: 300 },
              { productName: 'Regulator', quantity: 15, price: 1500 },
            ],
            notes: 'Large industrial order for new facility'
          },
          {
            type: 'SALE',
            items: [
              { productName: 'Domestic (11.8kg)', quantity: 20, price: 5000, cylinderType: 'Domestic (11.8kg)' },
              { productName: 'Stove (1 Burner)', quantity: 10, price: 1800 },
              { productName: 'Stove (2 Burner)', quantity: 5, price: 2500 },
            ],
            notes: 'Domestic setup for employee housing'
          },
          {
            type: 'PAYMENT',
            amount: 60000,
            paymentRef: 'BANK-TRANSFER-002',
            notes: 'Bank transfer for large order'
          },
          {
            type: 'BUYBACK',
            items: [
              { productName: 'Commercial (45.4kg)', quantity: 2, price: 18000, cylinderType: 'Commercial (45.4kg)', condition: 'PARTIAL', remainingKg: 15.2 }
            ],
            notes: 'Returned commercial cylinders with remaining gas'
          },
          {
            type: 'RETURN_EMPTY',
            items: [
              { productName: 'Commercial (45.4kg)', quantity: 3, cylinderType: 'Commercial (45.4kg)' },
              { productName: 'Standard (15kg)', quantity: 8, cylinderType: 'Standard (15kg)' },
              { productName: 'Domestic (11.8kg)', quantity: 15, cylinderType: 'Domestic (11.8kg)' }
            ],
            notes: 'Large collection of empty cylinders'
          }
        ]
      },
      {
        customerName: 'Metro Restaurant',
        transactions: [
          {
            type: 'SALE',
            items: [
              { productName: 'Standard (15kg)', quantity: 6, price: 6500, cylinderType: 'Standard (15kg)' },
              { productName: 'Regulator', quantity: 6, price: 1500 },
              { productName: 'Stove (2 Burner)', quantity: 4, price: 2500 },
              { productName: 'Gas Pipe (1 meter)', quantity: 40, price: 300 },
            ],
            notes: 'Fine dining restaurant complete setup'
          },
          {
            type: 'SALE',
            items: [
              { productName: 'Domestic (11.8kg)', quantity: 4, price: 5000, cylinderType: 'Domestic (11.8kg)' },
              { productName: 'Stove (1 Burner)', quantity: 2, price: 1800 },
            ],
            notes: 'Additional cylinders for busy service periods'
          },
          {
            type: 'PAYMENT',
            amount: 30000,
            paymentRef: 'CREDIT-CARD-001',
            notes: 'Credit card payment'
          },
          {
            type: 'BUYBACK',
            items: [
              { productName: 'Standard (15kg)', quantity: 3, price: 6500, cylinderType: 'Standard (15kg)', condition: 'PARTIAL', remainingKg: 8.5 }
            ],
            notes: 'Returned standard cylinders with remaining gas'
          },
          {
            type: 'RETURN_EMPTY',
            items: [
              { productName: 'Standard (15kg)', quantity: 2, cylinderType: 'Standard (15kg)' },
              { productName: 'Domestic (11.8kg)', quantity: 3, cylinderType: 'Domestic (11.8kg)' }
            ],
            notes: 'Empty cylinders returned'
          }
        ]
      }
    ];

    let transactionCount = 0;
    let billSequence = 1000; // Start from a higher number to avoid conflicts

    for (const customerData of enhancedTransactions) {
      const customer = customers.find(c => c.name === customerData.customerName);
      if (!customer) {
        console.log(`⚠️ Customer not found: ${customerData.customerName}`);
        continue;
      }

      console.log(`\n📝 Adding enhanced transactions for ${customer.name}...`);

      for (const txData of customerData.transactions) {
        const today = new Date();
        const date = new Date(today.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000); // Random date within last 7 days
        
        const billSno = `BILL-${date.toISOString().slice(0, 10).replace(/-/g, '')}-${String(billSequence).padStart(6, '0')}`;
        billSequence++;

        try {
          // Calculate total amount for sales
          let totalAmount = 0;
          if (txData.type === 'SALE' && txData.items) {
            totalAmount = txData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
          } else if (txData.type === 'PAYMENT') {
            totalAmount = txData.amount || 0;
          } else if (txData.type === 'BUYBACK' && txData.items) {
            totalAmount = txData.items.reduce((sum, item) => sum + (item.price * 0.60 * item.quantity), 0);
          }

          const transaction = await prisma.b2BTransaction.create({
            data: {
              transactionType: txData.type,
              billSno,
              customerId: customer.id,
              date: date,
              time: date,
              totalAmount: totalAmount,
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
              ledgerChange = totalAmount;
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
              ledgerChange = -totalAmount;
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
          console.log(`✅ Created ${txData.type} transaction: ${billSno} - ${totalAmount} PKR`);

        } catch (error) {
          console.error(`❌ Error creating transaction for ${customer.name}:`, error.message);
        }
      }
    }

    console.log(`\n🎉 Enhanced sample data populated successfully!`);
    console.log(`📊 Summary:`);
    console.log(`- Created ${transactionCount} new transactions`);
    console.log(`- Updated customer ledger balances`);
    console.log(`- Updated cylinder due counts`);
    console.log(`- Updated inventory levels`);
    console.log(`\n🚀 Your B2B Customer Management System now has comprehensive test data!`);

  } catch (error) {
    console.error('❌ Error enhancing sample data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script if executed directly
if (require.main === module) {
  enhanceSampleData()
    .then(() => {
      console.log('✅ Sample data enhancement completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Failed to enhance sample data:', error);
      process.exit(1);
    });
}

module.exports = { enhanceSampleData };
