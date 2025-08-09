const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function populateMockData() {
  try {
    console.log('🌱 Starting comprehensive database population...');

    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await prisma.customerLedger.deleteMany();
    await prisma.cylinderRental.deleteMany();
    await prisma.supportRequest.deleteMany();
    await prisma.vendorSupportRequest.deleteMany();
    await prisma.vendorOrder.deleteMany();
    await prisma.invoice.deleteMany();
    await prisma.expense.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.cylinder.deleteMany();
    await prisma.vendor.deleteMany();
    await prisma.user.deleteMany();

    console.log('✅ Existing data cleared');

    // Create users
    console.log('👥 Creating users...');
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@lpg.com',
        name: 'Admin User',
        password: await bcrypt.hash('admin123', 10),
        role: 'ADMIN',
        isActive: true
      }
    });

    const superAdminUser = await prisma.user.create({
      data: {
        email: 'superadmin@lpg.com',
        name: 'Super Admin',
        password: await bcrypt.hash('super123', 10),
        role: 'SUPER_ADMIN',
        isActive: true
      }
    });

    const customerUser = await prisma.user.create({
      data: {
        email: 'customer@lpg.com',
        name: 'John Customer',
        password: await bcrypt.hash('customer123', 10),
        role: 'USER',
        isActive: true
      }
    });

    const vendorUser = await prisma.user.create({
      data: {
        email: 'vendor@lpg.com',
        name: 'Vendor Supplier',
        password: await bcrypt.hash('vendor123', 10),
        role: 'VENDOR',
        isActive: true
      }
    });

    console.log('✅ Users created');

    // Create customers
    console.log('👤 Creating customers...');
    const customers = [];
    const customerNames = [
      { firstName: 'John', lastName: 'Smith', email: 'john.smith@email.com', phone: '+1234567890' },
      { firstName: 'Sarah', lastName: 'Johnson', email: 'sarah.johnson@email.com', phone: '+1234567891' },
      { firstName: 'Michael', lastName: 'Brown', email: 'michael.brown@email.com', phone: '+1234567892' },
      { firstName: 'Emily', lastName: 'Davis', email: 'emily.davis@email.com', phone: '+1234567893' },
      { firstName: 'David', lastName: 'Wilson', email: 'david.wilson@email.com', phone: '+1234567894' },
      { firstName: 'Lisa', lastName: 'Anderson', email: 'lisa.anderson@email.com', phone: '+1234567895' },
      { firstName: 'Robert', lastName: 'Taylor', email: 'robert.taylor@email.com', phone: '+1234567896' },
      { firstName: 'Jennifer', lastName: 'Martinez', email: 'jennifer.martinez@email.com', phone: '+1234567897' }
    ];

    for (let i = 0; i < customerNames.length; i++) {
      const customer = await prisma.customer.create({
        data: {
          code: `CUST${String(i + 1).padStart(3, '0')}`,
          firstName: customerNames[i].firstName,
          lastName: customerNames[i].lastName,
          email: customerNames[i].email,
          phone: customerNames[i].phone,
          address: `${100 + i} Main Street`,
          city: 'City',
          state: 'State',
          postalCode: '12345',
          customerType: ['RESIDENTIAL', 'COMMERCIAL', 'INDUSTRIAL'][i % 3],
          creditLimit: (i + 1) * 500,
          isActive: true,
          userId: i === 0 ? customerUser.id : adminUser.id // First customer linked to customer user
        }
      });
      customers.push(customer);
    }

    console.log('✅ Customers created');

    // Create vendors
    console.log('🏢 Creating vendors...');
    const vendors = [];
    const vendorData = [
      { companyName: 'Gas Supply Co.', contactPerson: 'John Smith', email: 'john@gassupply.com', phone: '+1234567890' },
      { companyName: 'Cylinder Manufacturing Ltd.', contactPerson: 'Jane Doe', email: 'jane@cylinder.com', phone: '+1234567891' },
      { companyName: 'LPG Equipment Corp.', contactPerson: 'Mike Johnson', email: 'mike@lpg.com', phone: '+1234567892' },
      { companyName: 'Safety Equipment Inc.', contactPerson: 'Lisa Brown', email: 'lisa@safety.com', phone: '+1234567893' }
    ];

    for (let i = 0; i < vendorData.length; i++) {
      const vendor = await prisma.vendor.create({
        data: {
          vendorCode: `VEND${String(i + 1).padStart(3, '0')}`,
          companyName: vendorData[i].companyName,
          contactPerson: vendorData[i].contactPerson,
          email: vendorData[i].email,
          phone: vendorData[i].phone,
          address: `${200 + i} Business Ave`,
          taxId: `TAX${String(i + 1).padStart(6, '0')}`,
          paymentTerms: 30 + (i * 15),
          isActive: true
        }
      });
      vendors.push(vendor);
    }

    console.log('✅ Vendors created');

    // Create cylinders
    console.log('🔵 Creating cylinders...');
    const cylinders = [];
    const cylinderTypes = ['KG_15', 'KG_45'];
    const locations = ['Warehouse A', 'Warehouse B', 'Warehouse C'];
    const statuses = ['AVAILABLE', 'RENTED', 'MAINTENANCE', 'RETIRED'];

    for (let i = 0; i < 20; i++) {
      const cylinder = await prisma.cylinder.create({
        data: {
          code: `CYL${String(i + 1).padStart(3, '0')}`,
          cylinderType: cylinderTypes[i % 2],
          capacity: cylinderTypes[i % 2] === 'KG_15' ? 15 : 45,
          location: locations[i % 3],
          currentStatus: statuses[i % 4],
          purchaseDate: new Date(2023, 0, 1 + i),
          purchasePrice: cylinderTypes[i % 2] === 'KG_15' ? 150 : 450,
          lastMaintenanceDate: i % 3 === 0 ? new Date(2024, 0, 1 + i) : null,
          nextMaintenanceDate: i % 3 === 0 ? new Date(2024, 6, 1 + i) : null
        }
      });
      cylinders.push(cylinder);
    }

    console.log('✅ Cylinders created');

    // Create expenses
    console.log('💰 Creating expenses...');
    const expenseCategories = ['FUEL', 'SALARY', 'MAINTENANCE', 'UTILITIES', 'OTHER'];
    const expenseDescriptions = [
      'Gas for delivery vehicles',
      'Employee salaries',
      'Equipment maintenance',
      'Office utilities',
      'Office supplies',
      'Business travel',
      'Miscellaneous expenses'
    ];

    for (let i = 0; i < 15; i++) {
      await prisma.expense.create({
        data: {
          category: expenseCategories[i % expenseCategories.length],
          description: expenseDescriptions[i % expenseDescriptions.length],
          amount: (i + 1) * 100 + Math.random() * 500,
          expenseDate: new Date(2024, 0, 1 + i),
          userId: adminUser.id
        }
      });
    }

    console.log('✅ Expenses created');

    // Create cylinder rentals (for customer testing)
    console.log('📦 Creating cylinder rentals...');
    for (let i = 0; i < 10; i++) {
      const customer = customers[i % customers.length];
      const cylinder = cylinders[i % cylinders.length];
      
      await prisma.cylinderRental.create({
        data: {
          customerId: customer.id,
          cylinderId: cylinder.id,
          userId: adminUser.id,
          rentalDate: new Date(2024, 0, 1 + i),
          expectedReturnDate: new Date(2024, 1, 1 + i),
          actualReturnDate: i % 3 === 0 ? new Date(2024, 1, 1 + i) : null,
          rentalAmount: cylinder.cylinderType === 'KG_15' ? 150 : 300,
          status: ['ACTIVE', 'RETURNED', 'OVERDUE'][i % 3]
        }
      });
    }

    console.log('✅ Cylinder rentals created');

    // Create customer ledger entries (for payments testing)
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

    console.log('✅ Customer ledger entries created');

    // Create invoices
    console.log('🧾 Creating invoices...');
    for (let i = 0; i < 8; i++) {
      const customer = customers[i % customers.length];
      
      await prisma.invoice.create({
        data: {
          invoiceNumber: `INV-${String(i + 1).padStart(4, '0')}`,
          customerId: customer.id,
          vendorId: vendors[i % vendors.length].id,
          invoiceType: ['SALE', 'PURCHASE'][i % 2],
          totalAmount: (i + 1) * 500,
          taxAmount: (i + 1) * 50,
          discountAmount: (i + 1) * 25,
          finalAmount: (i + 1) * 525,
          status: ['DRAFT', 'SENT', 'PAID', 'CANCELLED'][i % 4],
          dueDate: new Date(2024, 1, 1 + i),
          paidDate: i % 3 === 0 ? new Date(2024, 1, 1 + i) : null,
          notes: `Invoice notes for invoice ${i + 1}`,
          userId: adminUser.id
        }
      });
    }

    console.log('✅ Invoices created');

    // Create vendor orders
    console.log('📋 Creating vendor orders...');
    for (let i = 0; i < 5; i++) {
      const vendor = vendors[i % vendors.length];
      
      await prisma.vendorOrder.create({
        data: {
          vendorId: vendor.id,
          orderDate: new Date(2024, 0, 1 + i),
          status: ['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'][i % 4],
          totalAmount: (i + 1) * 1000,
          notes: `Order notes for order ${i + 1}`
        }
      });
    }

    console.log('✅ Vendor orders created');

    // Create support requests
    console.log('🆘 Creating support requests...');
    const supportSubjects = [
      'Cylinder delivery issue',
      'Payment problem',
      'Account access issue',
      'Billing question',
      'Service request'
    ];

    for (let i = 0; i < 6; i++) {
      const customer = customers[i % customers.length];
      
      await prisma.supportRequest.create({
        data: {
          customerId: customer.id,
          subject: supportSubjects[i % supportSubjects.length],
          description: `Support request description for request ${i + 1}`,
          status: ['PENDING', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'][i % 4]
        }
      });
    }

    console.log('✅ Support requests created');

    console.log('🎉 Comprehensive database population completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`- Users: 4 (Admin, Super Admin, Customer, Vendor)`);
    console.log(`- Customers: ${customers.length} (First customer linked to customer user)`);
    console.log(`- Vendors: ${vendors.length}`);
    console.log(`- Cylinders: ${cylinders.length}`);
    console.log(`- Expenses: 15`);
    console.log(`- Rentals: 10 (for customer testing)`);
    console.log(`- Customer Ledger Entries: 8 (for payment testing)`);
    console.log(`- Invoices: 8`);
    console.log(`- Vendor Orders: 5`);
    console.log(`- Support Requests: 6`);

    console.log('\n🔑 Test Accounts:');
    console.log(`- Admin: admin@lpg.com / admin123`);
    console.log(`- Super Admin: superadmin@lpg.com / super123`);
    console.log(`- Customer: customer@lpg.com / customer123 (linked to first customer)`);
    console.log(`- Vendor: vendor@lpg.com / vendor123`);

  } catch (error) {
    console.error('❌ Error populating database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

populateMockData(); 