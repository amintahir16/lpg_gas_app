const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testExpenses() {
  try {
    console.log('Testing expenses functionality...');
    
    // Test 1: Check if expenses table exists
    console.log('\n1. Checking expenses table...');
    const expenseCount = await prisma.expense.count();
    console.log(`✓ Expenses table exists with ${expenseCount} records`);
    
    // Test 2: Check if we can create an expense
    console.log('\n2. Testing expense creation...');
    
    // First, get a user to associate with the expense
    const user = await prisma.user.findFirst();
    if (!user) {
      console.log('✗ No users found. Please create a user first.');
      return;
    }
    
    const testExpense = await prisma.expense.create({
      data: {
        category: 'FUEL',
        amount: 50.00,
        description: 'Test fuel expense',
        expenseDate: new Date(),
        userId: user.id,
        status: 'PENDING'
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    console.log('✓ Expense created successfully:', {
      id: testExpense.id,
      category: testExpense.category,
      amount: testExpense.amount.toString(),
      description: testExpense.description,
      status: testExpense.status
    });
    
    // Test 3: Test fetching expenses
    console.log('\n3. Testing expense fetching...');
    const expenses = await prisma.expense.findMany({
      where: { userId: user.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { expenseDate: 'desc' },
      take: 5
    });
    
    console.log(`✓ Found ${expenses.length} expenses for user ${user.name}`);
    
    // Clean up test expense
    await prisma.expense.delete({
      where: { id: testExpense.id }
    });
    console.log('✓ Test expense cleaned up');
    
    console.log('\n✅ All expense tests passed! The functionality should work.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.code === 'P2002') {
      console.log('This might be a unique constraint violation.');
    } else if (error.code === 'P2025') {
      console.log('Record not found - this might be expected.');
    } else if (error.message.includes('Unknown arg')) {
      console.log('Schema mismatch - you may need to run: npx prisma generate');
    }
  } finally {
    await prisma.$disconnect();
  }
}

testExpenses();
