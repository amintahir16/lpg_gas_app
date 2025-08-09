const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function populateMockData() {
  try {
    console.log('🗑️ Clearing existing data...');
    
    // Clear existing data in reverse order of dependencies
    await prisma.customerLedger.deleteMany();
    await prisma.cylinderRental.deleteMany();
    await prisma.supportRequest.deleteMany();
    await prisma.vendorSupportRequest.deleteMany();
    await prisma.vendorOrder.deleteMany();
    await prisma.invoice.deleteMany();
    await prisma.expense.deleteMany();
    await prisma.cylinder.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.vendor.deleteMany();
    await prisma.user.deleteMany();

    console.log('✅ Database cleared successfully');

    // Create users
    console.log('👥 Creating users...');
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@lpg.com',
        name: 'Admin User',
        password: await bcrypt.hash('admin123', 10),
        role: 'ADMIN'
      }
    });

    const superAdminUser = await prisma.user.create({
      data: {
        email: 'superadmin@lpg.com',
        name: 'Super Admin',
        password: await bcrypt.hash('superadmin123', 10),
        role: 'SUPER_ADMIN'
      }
    });

    const customerUser = await prisma.user.create({
      data: {
        email: 'customer@lpg.com',
        name: 'John Customer',
        password: await bcrypt.hash('customer123', 10),
        role: 'USER'
      }
    });

    const vendorUser = await prisma.user.create({
      data: {
        email: 'vendor@lpg.com',
        name: 'Vendor Supplier',
        password: await bcrypt.hash('vendor123', 10),
        role: 'VENDOR'
      }
    });

    console.log('✅ Users created successfully');

    // Create customers
    console.log('👤 Creating customers...');
    const customers = [];
    for (let i = 1; i <= 10; i++) {
      const customer = await prisma.customer.create({
        data: {
          code: `CUST${i.toString().padStart(3, '0')}`,
          firstName: `Customer${i}`,
          lastName: `Smith${i}`,
          email: `customer${i}@example.com`,
          phone: `+1-555-${(1000 + i).toString().padStart(4, '0')}`,
          address: `${100 + i} Main Street`,
          city: 'City',
          state: 'State',
          postalCode: '12345',
          customerType: ['RESIDENTIAL', 'COMMERCIAL', 'INDUSTRIAL'][i % 3],
          creditLimit: (i * 1000),
          userId: customerUser.id
        }
      });
      customers.push(customer);
    }

    console.log('✅ Customers created successfully');

    // Create vendors
    console.log('🏢 Creating vendors...');
    const vendors = [];
    for (let i = 1; i <= 5; i++) {
      const vendor = await prisma.vendor.create({
        data: {
          vendorCode: `VEND${i.toString().padStart(3, '0')}`,
          companyName: `Vendor Company ${i}`,
          contactPerson: `Contact Person ${i}`,
          email: `vendor${i}@example.com`,
          phone: `+1-555-${(2000 + i).toString().padStart(4, '0')}`,
          address: `${200 + i} Business Avenue`,
          taxId: `TAX${i.toString().padStart(6, '0')}`,
          paymentTerms: 30 + (i * 5)
        }
      });
      vendors.push(vendor);
    }

    console.log('✅ Vendors created successfully');

    // Create cylinders
    console.log('🔵 Creating cylinders...');
    const cylinders = [];
    for (let i = 1; i <= 20; i++) {
      const cylinder = await prisma.cylinder.create({
        data: {
          code: `CYL${i.toString().padStart(3, '0')}`,
          cylinderType: i % 2 === 0 ? 'KG_15' : 'KG_45',
          capacity: i % 2 === 0 ? 15.0 : 45.0,
          purchaseDate: new Date(2024, 0, 1),
          purchasePrice: i % 2 === 0 ? 150.0 : 450.0,
          currentStatus: ['AVAILABLE', 'RENTED', 'MAINTENANCE'][i % 3],
          location: `Location ${i}`,
          lastMaintenanceDate: new Date(2024, 6, 1),
          nextMaintenanceDate: new Date(2024, 9, 1)
        }
      });
      cylinders.push(cylinder);
    }

    console.log('✅ Cylinders created successfully');

    // Create cylinder rentals
    console.log('📦 Creating cylinder rentals...');
    for (let i = 0; i < 8; i++) {
      const customer = customers[i % customers.length];
      const cylinder = cylinders[i % cylinders.length];

      await prisma.cylinderRental.create({
        data: {
          customerId: customer.id,
          cylinderId: cylinder.id,
          userId: adminUser.id,
          rentalDate: new Date(2024, 7, 1 + i),
          returnDate: new Date(2024, 8, 1 + i),
          rentalAmount: (i + 1) * 50,
          status: ['ACTIVE', 'RETURNED', 'OVERDUE'][i % 3]
        }
      });
    }

    console.log('✅ Cylinder rentals created successfully');

    // Create expenses
    console.log('💰 Creating expenses...');
    const expenseCategories = ['SALARY', 'FUEL', 'MEALS', 'MAINTENANCE', 'UTILITIES', 'OTHER'];
    for (let i = 1; i <= 15; i++) {
      await prisma.expense.create({
        data: {
          description: `Expense ${i}`,
          amount: (i * 100) + (Math.random() * 500),
          category: expenseCategories[i % expenseCategories.length],
          expenseDate: new Date(2024, 7, i),
          userId: adminUser.id
        }
      });
    }

    console.log('✅ Expenses created successfully');

    // Create vendor orders
    console.log('📋 Creating vendor orders...');
    for (let i = 1; i <= 10; i++) {
      const vendor = vendors[i % vendors.length];
      await prisma.vendorOrder.create({
        data: {
          vendorId: vendor.id,
          orderDate: new Date(2024, 7, i),
          status: ['PENDING', 'APPROVED', 'COMPLETED'][i % 3],
          totalAmount: (i * 500) + (Math.random() * 1000),
          notes: `Order notes for order ${i}`
        }
      });
    }

    console.log('✅ Vendor orders created successfully');

    // Create invoices
    console.log('🧾 Creating invoices...');
    for (let i = 1; i <= 12; i++) {
      const vendor = vendors[i % vendors.length];
      await prisma.invoice.create({
        data: {
          invoiceNumber: `INV-${i.toString().padStart(4, '0')}`,
          vendorId: vendor.id,
          invoiceType: i % 2 === 0 ? 'SALE' : 'PURCHASE',
          invoiceDate: new Date(2024, 7, i),
          dueDate: new Date(2024, 8, i),
          totalAmount: (i * 300) + (Math.random() * 800),
          status: ['DRAFT', 'SENT', 'PAID', 'CANCELLED'][i % 4],
          userId: adminUser.id
        }
      });
    }

    console.log('✅ Invoices created successfully');

    // Create support requests
    console.log('🆘 Creating support requests...');
    const supportCategories = ['DELIVERY', 'BILLING', 'SAFETY', 'TECHNICAL', 'GENERAL'];
    const supportStatuses = ['PENDING', 'IN_PROGRESS', 'RESOLVED'];
    
    for (let i = 1; i <= 8; i++) {
      const customer = customers[i % customers.length];
      await prisma.supportRequest.create({
        data: {
          customerId: customer.id,
          subject: `Support Request ${i}`,
          description: `This is a detailed description for support request ${i}. Customer is experiencing issues with ${supportCategories[i % supportCategories.length].toLowerCase()} services.`,
          status: supportStatuses[i % supportStatuses.length],
          createdAt: new Date(2024, 7, i),
          updatedAt: new Date(2024, 7, i)
        }
      });
    }

    console.log('✅ Support requests created successfully');

    // Create vendor support requests
    console.log('🏢 Creating vendor support requests...');
    for (let i = 1; i <= 5; i++) {
      const vendor = vendors[i % vendors.length];
      await prisma.vendorSupportRequest.create({
        data: {
          vendorId: vendor.id,
          subject: `Vendor Support Request ${i}`,
          description: `This is a vendor support request ${i}. Vendor needs assistance with order processing and delivery coordination.`,
          status: supportStatuses[i % supportStatuses.length],
          createdAt: new Date(2024, 7, i),
          updatedAt: new Date(2024, 7, i)
        }
      });
    }

    console.log('✅ Vendor support requests created successfully');

    // Create customer ledger entries (payments)
    console.log('💳 Creating customer ledger entries...');
    for (let i = 0; i < 8; i++) {
      const customer = customers[i % customers.length];

      await prisma.customerLedger.create({
        data: {
          customerId: customer.id,
          transactionType: 'PAYMENT',
          amount: (i + 1) * 100,
          balanceBefore: i * 100, // Previous balance
          balanceAfter: (i + 1) * 100, // New balance after payment
          description: `Payment for rental services`
        }
      });
    }

    console.log('✅ Customer ledger entries created successfully');

    console.log('🎉 All mock data has been successfully populated!');
    console.log('\n📊 Summary:');
    console.log(`- Users: 4 (Admin, Super Admin, Customer, Vendor)`);
    console.log(`- Customers: ${customers.length}`);
    console.log(`- Vendors: ${vendors.length}`);
    console.log(`- Cylinders: ${cylinders.length}`);
    console.log(`- Cylinder Rentals: 8`);
    console.log(`- Expenses: 15`);
    console.log(`- Vendor Orders: 10`);
    console.log(`- Invoices: 12`);
    console.log(`- Support Requests: 8`);
    console.log(`- Vendor Support Requests: 5`);
    console.log(`- Customer Ledger Entries: 8`);

    console.log('\n🔑 Test Accounts:');
    console.log('- Admin: admin@lpg.com / admin123');
    console.log('- Super Admin: superadmin@lpg.com / superadmin123');
    console.log('- Customer: customer@lpg.com / customer123');
    console.log('- Vendor: vendor@lpg.com / vendor123');

  } catch (error) {
    console.error('❌ Error populating mock data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

populateMockData(); 