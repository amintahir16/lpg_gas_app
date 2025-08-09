const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addVendorData() {
  try {
    console.log('🏢 Adding vendor data for testing...');
    
    // Check existing vendors
    const existingVendors = await prisma.vendor.findMany();
    console.log(`Current vendors: ${existingVendors.length}`);
    
    if (existingVendors.length === 0) {
      console.log('No vendors found. Creating test vendors...');
      
      // Create vendors with specific emails that match test users
      const vendors = [
        {
          vendorCode: 'VEND001',
          companyName: 'Gas Supply Co.',
          contactPerson: 'John Smith',
          email: 'vendor@lpg.com', // This matches the vendor user email
          phone: '+1-555-123-4567',
          address: '200 Business Avenue, Industrial District, City, State 12345',
          taxId: 'TAX000001',
          paymentTerms: 30
        },
        {
          vendorCode: 'VEND002',
          companyName: 'Cylinder Manufacturing Ltd.',
          contactPerson: 'Jane Doe',
          email: 'jane@cylinder.com',
          phone: '+1-555-123-4568',
          address: '201 Business Avenue, Industrial District, City, State 12345',
          taxId: 'TAX000002',
          paymentTerms: 45
        },
        {
          vendorCode: 'VEND003',
          companyName: 'LPG Equipment Corp.',
          contactPerson: 'Mike Johnson',
          email: 'mike@lpg.com',
          phone: '+1-555-123-4569',
          address: '202 Business Avenue, Industrial District, City, State 12345',
          taxId: 'TAX000003',
          paymentTerms: 60
        },
        {
          vendorCode: 'VEND004',
          companyName: 'Safety Equipment Inc.',
          contactPerson: 'Lisa Brown',
          email: 'lisa@safety.com',
          phone: '+1-555-123-4570',
          address: '203 Business Avenue, Industrial District, City, State 12345',
          taxId: 'TAX000004',
          paymentTerms: 75
        }
      ];
      
      for (const vendorData of vendors) {
        await prisma.vendor.create({
          data: vendorData
        });
        console.log(`✅ Created vendor: ${vendorData.companyName} (${vendorData.email})`);
      }
      
    } else {
      console.log('Vendors already exist. Checking if vendor@lpg.com exists...');
      
      // Check if vendor@lpg.com exists
      const vendorUser = await prisma.vendor.findFirst({
        where: {
          email: 'vendor@lpg.com'
        }
      });
      
      if (!vendorUser) {
        console.log('Adding vendor@lpg.com vendor data...');
        await prisma.vendor.create({
          data: {
            vendorCode: 'VEND005',
            companyName: 'Gas Supply Co.',
            contactPerson: 'John Smith',
            email: 'vendor@lpg.com',
            phone: '+1-555-123-4567',
            address: '200 Business Avenue, Industrial District, City, State 12345',
            taxId: 'TAX000005',
            paymentTerms: 30
          }
        });
        console.log('✅ Added vendor@lpg.com vendor data');
      } else {
        console.log('✅ vendor@lpg.com vendor data already exists');
      }
    }
    
    // Also add some vendor orders and invoices for testing vendor payments
    console.log('📋 Adding vendor orders and invoices...');
    
    const vendors = await prisma.vendor.findMany();
    if (vendors.length > 0) {
      const vendor = vendors[0]; // Use first vendor
      
      // Add vendor orders
      await prisma.vendorOrder.createMany({
        data: [
          {
            vendorId: vendor.id,
            orderDate: new Date(),
            status: 'PENDING',
            totalAmount: 1500,
            notes: 'Order for gas cylinders'
          },
          {
            vendorId: vendor.id,
            orderDate: new Date(),
            status: 'APPROVED',
            totalAmount: 2000,
            notes: 'Order for safety equipment'
          },
          {
            vendorId: vendor.id,
            orderDate: new Date(),
            status: 'COMPLETED',
            totalAmount: 3000,
            notes: 'Order for maintenance supplies'
          }
        ]
      });
      console.log('✅ Added 3 vendor orders');
      
      // Add invoices
      await prisma.invoice.createMany({
        data: [
          {
            invoiceNumber: 'INV-0001',
            vendorId: vendor.id,
            invoiceType: 'PURCHASE',
            invoiceDate: new Date(),
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            totalAmount: 750,
            status: 'SENT',
            userId: (await prisma.user.findFirst()).id
          },
          {
            invoiceNumber: 'INV-0002',
            vendorId: vendor.id,
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
    
    console.log('🎉 Vendor data setup completed!');
    console.log('🔑 Test with vendor@lpg.com / vendor123');
    
  } catch (error) {
    console.error('❌ Error adding vendor data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addVendorData(); 