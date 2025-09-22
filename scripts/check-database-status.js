const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDatabaseStatus() {
  console.log('🔍 Checking Database Status...\n');

  try {
    const customers = await prisma.customer.count();
    const products = await prisma.product.count();
    const transactions = await prisma.b2BTransaction.count();
    const transactionItems = await prisma.b2BTransactionItem.count();
    
    console.log('📊 Current Database Status:');
    console.log(`- Customers: ${customers}`);
    console.log(`- Products: ${products}`);
    console.log(`- Transactions: ${transactions}`);
    console.log(`- Transaction Items: ${transactionItems}`);
    
    if (customers > 0) {
      console.log('\n📝 Sample Customer Data:');
      const customerSample = await prisma.customer.findFirst({
        include: {
          transactions: {
            include: { items: true },
            orderBy: { createdAt: 'desc' },
            take: 3
          }
        }
      });
      
      console.log(`- Name: ${customerSample.name}`);
      console.log(`- Ledger Balance: ${customerSample.ledgerBalance}`);
      console.log(`- Cylinders Due: 11.8kg(${customerSample.domestic118kgDue}), 15kg(${customerSample.standard15kgDue}), 45.4kg(${customerSample.commercial454kgDue})`);
      console.log(`- Recent Transactions: ${customerSample.transactions.length}`);
      
      if (customerSample.transactions.length > 0) {
        console.log('\n📋 Recent Transaction Types:');
        customerSample.transactions.forEach((tx, index) => {
          console.log(`  ${index + 1}. ${tx.transactionType} - ${tx.billSno} - ${tx.totalAmount} PKR`);
        });
      }
    }

    if (products > 0) {
      console.log('\n🏭 Product Inventory:');
      const productsList = await prisma.product.findMany({
        take: 5,
        orderBy: { name: 'asc' }
      });
      
      productsList.forEach(product => {
        console.log(`- ${product.name}: ${product.stockQuantity} ${product.stockType} (${product.category})`);
      });
    }

    if (transactions > 0) {
      console.log('\n💰 Transaction Summary:');
      const transactionTypes = await prisma.b2BTransaction.groupBy({
        by: ['transactionType'],
        _count: { transactionType: true },
        _sum: { totalAmount: true }
      });
      
      transactionTypes.forEach(type => {
        console.log(`- ${type.transactionType}: ${type._count.transactionType} transactions, Total: ${type._sum.totalAmount || 0} PKR`);
      });
    }

    console.log('\n✅ Database Status Check Complete!');
    
  } catch (error) {
    console.error('❌ Error checking database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseStatus();
