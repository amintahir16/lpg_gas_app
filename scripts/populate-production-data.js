const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function populateProductionData() {
  try {
    console.log('🚀 Populating production data for new models...');
    
    // Check if we have existing data
    const userCount = await prisma.user.count();
    console.log(`Current users: ${userCount}`);
    
    if (userCount === 0) {
      console.log('No existing data found. Creating basic production data...');
      
      // Create admin user
      const adminUser = await prisma.user.create({
        data: {
          email: 'admin@lpg.com',
          name: 'Admin User',
          password: await bcrypt.hash('admin123', 10),
          role: 'ADMIN'
        }
      });

      // Create vendor user
      const vendorUser = await prisma.user.create({
        data: {
          email: 'vendor@lpg.com',
          name: 'Vendor User',
          password: await bcrypt.hash('vendor123', 10),
          role: 'VENDOR'
        }
      });

      // Create customer user
      const customerUser = await prisma.user.create({
        data: {
          email: 'customer@lpg.com',
          name: 'Customer User',
          password: await bcrypt.hash('customer123', 10),
          role: 'USER'
        }
      });

      // Create vendor
      const vendor = await prisma.vendor.create({
        data: {
          vendorCode: 'VEND001',
          companyName: 'Gas Supply Co.',
          contactPerson: 'John Smith',
          email: 'vendor@lpg.com',
          phone: '+1-555-123-4567',
          address: '200 Business Avenue, Industrial District, City, State 12345',
          taxId: 'TAX000001',
          paymentTerms: 30
        }
      });

      // Create vendor bank details
      await prisma.vendorBankDetails.create({
        data: {
          vendorId: vendor.id,
          accountName: 'Gas Supply Co.',
          accountNumber: '1234567890',
          bankName: 'First National Bank',
          swiftCode: 'FNBNUS33',
          routingNumber: '021000021'
        }
      });

      // Create customer
      const customer = await prisma.customer.create({
        data: {
          code: 'CUST001',
          firstName: 'John',
          lastName: 'Customer',
          email: 'customer@lpg.com',
          phone: '+1-555-0001',
          address: '123 Customer Street',
          city: 'Customer City',
          state: 'Customer State',
          postalCode: '12345',
          customerType: 'RESIDENTIAL',
          creditLimit: 1000,
          userId: customerUser.id
        }
      });

      // Create cylinders
      const cylinders = [];
      for (let i = 1; i <= 5; i++) {
        const cylinder = await prisma.cylinder.create({
          data: {
            code: `CYL${i.toString().padStart(3, '0')}`,
            cylinderType: i % 2 === 0 ? 'KG_15' : 'KG_45',
            capacity: i % 2 === 0 ? 15.0 : 45.0,
            purchaseDate: new Date(2024, 0, 1),
            purchasePrice: i % 2 === 0 ? 150.0 : 450.0,
            currentStatus: 'AVAILABLE',
            location: `Warehouse A`,
            lastMaintenanceDate: new Date(2024, 6, 1),
            nextMaintenanceDate: new Date(2024, 9, 1)
          }
        });
        cylinders.push(cylinder);
      }

      // Create vendor inventory items
      for (let i = 0; i < cylinders.length; i++) {
        await prisma.vendorInventory.create({
          data: {
            vendorId: vendor.id,
            cylinderId: cylinders[i].id,
            name: `${cylinders[i].cylinderType} Gas Cylinder`,
            category: 'Cylinders',
            quantity: 1,
            unitPrice: cylinders[i].cylinderType === 'KG_15' ? 150.00 : 450.00,
            status: 'IN_STOCK',
            description: `${cylinders[i].cylinderType} gas cylinder for commercial use`
          }
        });
      }

      // Create additional inventory items
      await prisma.vendorInventory.create({
        data: {
          vendorId: vendor.id,
          name: 'Safety Equipment',
          category: 'Equipment',
          quantity: 50,
          unitPrice: 25.00,
          status: 'IN_STOCK',
          description: 'Safety equipment for gas handling'
        }
      });

      await prisma.vendorInventory.create({
        data: {
          vendorId: vendor.id,
          name: 'Regulators',
          category: 'Equipment',
          quantity: 30,
          unitPrice: 35.00,
          status: 'LOW_STOCK',
          description: 'Gas regulators for cylinder connections'
        }
      });

      // Create vendor payments
      for (let i = 1; i <= 3; i++) {
        await prisma.vendorPayment.create({
          data: {
            vendorId: vendor.id,
            amount: (i * 500) + (Math.random() * 1000),
            paymentDate: new Date(2024, 7, i),
            method: 'BANK_TRANSFER',
            status: i === 1 ? 'COMPLETED' : 'PENDING',
            description: `Payment for order ${i}`,
            reference: `PAY-${i.toString().padStart(4, '0')}`
          }
        });
      }

      // Create support requests
      await prisma.supportRequest.create({
        data: {
          customerId: customer.id,
          subject: 'Delivery Issue',
          description: 'I have not received my gas cylinder delivery as scheduled.',
          status: 'PENDING',
          priority: 'MEDIUM',
          category: 'DELIVERY'
        }
      });

      await prisma.supportRequest.create({
        data: {
          customerId: customer.id,
          subject: 'Billing Question',
          description: 'I have a question about my recent invoice.',
          status: 'IN_PROGRESS',
          priority: 'LOW',
          category: 'BILLING'
        }
      });

      // Create system settings
      const systemSettings = [
        { key: 'companyName', value: 'LPG Gas Supply Co.', category: 'GENERAL' },
        { key: 'contactEmail', value: 'admin@lpg.com', category: 'GENERAL' },
        { key: 'contactPhone', value: '+1 (555) 123-4567', category: 'GENERAL' },
        { key: 'address', value: '123 Gas Street, Industrial District, City, State 12345', category: 'GENERAL' },
        { key: 'businessHours', value: 'Monday - Friday: 8AM - 6PM, Saturday: 9AM - 2PM', category: 'GENERAL' },
        { key: 'deliveryRadius', value: '50', category: 'OPERATIONS' },
        { key: 'defaultCreditLimit', value: '1000', category: 'FINANCIAL' },
        { key: 'taxRate', value: '8.5', category: 'FINANCIAL' },
        { key: 'currency', value: 'USD', category: 'FINANCIAL' },
        { key: 'timezone', value: 'America/New_York', category: 'GENERAL' },
        { key: 'maintenanceInterval', value: '90', category: 'OPERATIONS' },
        { key: 'safetyInspectionInterval', value: '180', category: 'OPERATIONS' }
      ];

      for (const setting of systemSettings) {
        await prisma.systemSettings.create({
          data: {
            key: setting.key,
            value: setting.value,
            category: setting.category,
            description: `System setting for ${setting.key}`
          }
        });
      }

      console.log('✅ Production data created successfully!');
      console.log('\n📊 Summary:');
      console.log('- Users: 3 (Admin, Vendor, Customer)');
      console.log('- Vendors: 1 with bank details');
      console.log('- Customers: 1');
      console.log('- Cylinders: 5');
      console.log('- Vendor Inventory: 7 items');
      console.log('- Vendor Payments: 3');
      console.log('- Support Requests: 2');
      console.log('- System Settings: 12');
      
      console.log('\n🔑 Test Accounts:');
      console.log('- Admin: admin@lpg.com / admin123');
      console.log('- Vendor: vendor@lpg.com / vendor123');
      console.log('- Customer: customer@lpg.com / customer123');

    } else {
      console.log('✅ Existing data found. Skipping data creation.');
    }

  } catch (error) {
    console.error('❌ Error populating production data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

populateProductionData(); 