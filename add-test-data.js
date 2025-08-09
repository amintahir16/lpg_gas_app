const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function addTestData() {
  try {
    console.log('🚀 Adding test data for new features...');
    
    // Check if we have existing data
    const userCount = await prisma.user.count();
    console.log(`Current users: ${userCount}`);
    
    if (userCount === 0) {
      console.log('No existing data found. Creating basic test data...');
      
      // Create a test user
      const testUser = await prisma.user.create({
        data: {
          email: 'test@lpg.com',
          name: 'Test User',
          password: await bcrypt.hash('test123', 10),
          role: 'USER'
        }
      });
      
      // Create a test customer
      const testCustomer = await prisma.customer.create({
        data: {
          code: 'CUST001',
          firstName: 'Test',
          lastName: 'Customer',
          email: 'test@lpg.com',
          phone: '+1-555-0001',
          address: '123 Test Street',
          city: 'Test City',
          state: 'Test State',
          postalCode: '12345',
          customerType: 'RESIDENTIAL',
          creditLimit: 1000,
          userId: testUser.id
        }
      });
      
      // Create a test vendor
      const testVendor = await prisma.vendor.create({
        data: {
          vendorCode: 'VEND001',
          companyName: 'Test Vendor Co.',
          contactPerson: 'Test Contact',
          email: 'vendor@test.com',
          phone: '+1-555-0002',
          address: '456 Vendor Street',
          taxId: 'TAX000001',
          paymentTerms: 30
        }
      });
      
      // Create test support requests
      await prisma.supportRequest.create({
        data: {
          customerId: testCustomer.id,
          subject: 'Test Support Request',
          description: 'This is a test support request for testing the new API.',
          status: 'PENDING'
        }
      });
      
      // Create test vendor orders
      await prisma.vendorOrder.create({
        data: {
          vendorId: testVendor.id,
          orderDate: new Date(),
          status: 'PENDING',
          totalAmount: 1000,
          notes: 'Test vendor order'
        }
      });
      
      // Create test invoices
      await prisma.invoice.create({
        data: {
          invoiceNumber: 'INV-0001',
          vendorId: testVendor.id,
          invoiceType: 'PURCHASE',
          invoiceDate: new Date(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          totalAmount: 500,
          status: 'DRAFT',
          userId: testUser.id
        }
      });
      
      console.log('✅ Test data created successfully!');
      console.log('🔑 Test Account: test@lpg.com / test123');
      
    } else {
      console.log('Existing data found. Adding additional test data...');
      
      // Get existing customer and vendor
      const existingCustomer = await prisma.customer.findFirst();
      const existingVendor = await prisma.vendor.findFirst();
      
      if (existingCustomer) {
        // Add more support requests
        await prisma.supportRequest.createMany({
          data: [
            {
              customerId: existingCustomer.id,
              subject: 'Delivery Issue',
              description: 'Cylinder delivery was delayed. Need assistance.',
              status: 'PENDING'
            },
            {
              customerId: existingCustomer.id,
              subject: 'Billing Question',
              description: 'Have questions about the recent invoice.',
              status: 'IN_PROGRESS'
            },
            {
              customerId: existingCustomer.id,
              subject: 'Safety Concern',
              description: 'Need safety inspection for gas cylinder.',
              status: 'RESOLVED'
            }
          ]
        });
        console.log('✅ Added 3 support requests');
      }
      
      if (existingVendor) {
        // Add more vendor orders
        await prisma.vendorOrder.createMany({
          data: [
            {
              vendorId: existingVendor.id,
              orderDate: new Date(),
              status: 'PENDING',
              totalAmount: 1500,
              notes: 'Order for gas cylinders'
            },
            {
              vendorId: existingVendor.id,
              orderDate: new Date(),
              status: 'APPROVED',
              totalAmount: 2000,
              notes: 'Order for safety equipment'
            },
            {
              vendorId: existingVendor.id,
              orderDate: new Date(),
              status: 'COMPLETED',
              totalAmount: 3000,
              notes: 'Order for maintenance supplies'
            }
          ]
        });
        console.log('✅ Added 3 vendor orders');
        
        // Add more invoices
        await prisma.invoice.createMany({
          data: [
            {
              invoiceNumber: 'INV-0002',
              vendorId: existingVendor.id,
              invoiceType: 'PURCHASE',
              invoiceDate: new Date(),
              dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              totalAmount: 750,
              status: 'SENT',
              userId: (await prisma.user.findFirst()).id
            },
            {
              invoiceNumber: 'INV-0003',
              vendorId: existingVendor.id,
              invoiceType: 'SALE',
              invoiceDate: new Date(),
              dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              totalAmount: 1200,
              status: 'PAID',
              userId: (await prisma.user.findFirst()).id
            }
          ]
        });
        console.log('✅ Added 2 invoices');
      }
      
      console.log('✅ Additional test data added successfully!');
    }
    
  } catch (error) {
    console.error('❌ Error adding test data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addTestData(); 