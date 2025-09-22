const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function populateB2BCustomers() {
  try {
    console.log('Creating B2B customers...');

    // Create a sample user for B2B customers
    const user = await prisma.user.upsert({
      where: { email: 'admin@lpg.com' },
      update: {},
      create: {
        email: 'admin@lpg.com',
        name: 'Admin User',
        password: 'hashed_password', // In real app, this would be properly hashed
        role: 'ADMIN',
      },
    });

    // Sample B2B customers
    const b2bCustomers = [
      {
        name: 'Pizza Box',
        contactPerson: 'Ahmed Ali',
        phone: '+92-300-1234567',
        email: 'ahmed@pizzabox.com',
        address: '123 Main Street, Karachi',
        creditLimit: 50000,
        paymentTermsDays: 30,
        ledgerBalance: 15000,
        domestic118kgDue: 2,
        standard15kgDue: 5,
        commercial454kgDue: 1,
        notes: 'Regular customer, good payment history',
        type: 'B2B',
        createdBy: user.id,
      },
      {
        name: 'Kandahaar Rest.',
        contactPerson: 'Muhammad Hassan',
        phone: '+92-301-2345678',
        email: 'hassan@kandahaar.com',
        address: '456 Commercial Area, Lahore',
        creditLimit: 75000,
        paymentTermsDays: 45,
        ledgerBalance: 25000,
        domestic118kgDue: 3,
        standard15kgDue: 8,
        commercial454kgDue: 2,
        notes: 'High volume customer, extended payment terms',
        type: 'B2B',
        createdBy: user.id,
      },
      {
        name: 'Food Bazar',
        contactPerson: 'Fatima Khan',
        phone: '+92-302-3456789',
        email: 'fatima@foodbazar.com',
        address: '789 Market Street, Islamabad',
        creditLimit: 30000,
        paymentTermsDays: 30,
        ledgerBalance: 5000,
        domestic118kgDue: 1,
        standard15kgDue: 3,
        commercial454kgDue: 0,
        notes: 'New customer, small operation',
        type: 'B2B',
        createdBy: user.id,
      },
      {
        name: 'Industrial Kitchen Ltd.',
        contactPerson: 'Ali Raza',
        phone: '+92-303-4567890',
        email: 'ali@industrialkitchen.com',
        address: '321 Industrial Zone, Faisalabad',
        creditLimit: 100000,
        paymentTermsDays: 60,
        ledgerBalance: 45000,
        domestic118kgDue: 0,
        standard15kgDue: 12,
        commercial454kgDue: 5,
        notes: 'Large industrial customer, bulk orders',
        type: 'B2B',
        createdBy: user.id,
      },
      {
        name: 'Cafe Express',
        contactPerson: 'Sara Ahmed',
        phone: '+92-304-5678901',
        email: 'sara@cafeexpress.com',
        address: '654 Coffee Street, Rawalpindi',
        creditLimit: 20000,
        paymentTermsDays: 30,
        ledgerBalance: 8000,
        domestic118kgDue: 2,
        standard15kgDue: 4,
        commercial454kgDue: 0,
        notes: 'Coffee shop chain, multiple locations',
        type: 'B2B',
        createdBy: user.id,
      }
    ];

    // Create B2B customers
    for (const customerData of b2bCustomers) {
      const existingCustomer = await prisma.customer.findFirst({
        where: { 
          name: customerData.name,
          type: 'B2B'
        }
      });

      if (existingCustomer) {
        await prisma.customer.update({
          where: { id: existingCustomer.id },
          data: customerData,
        });
        console.log(`Updated B2B customer: ${customerData.name}`);
      } else {
        await prisma.customer.create({
          data: customerData,
        });
        console.log(`Created B2B customer: ${customerData.name}`);
      }
    }

    // Create some sample products for accessories
    const products = [
      {
        name: 'Gas Pipe (ft)',
        category: 'ACCESSORY',
        unit: 'ft',
        stockQuantity: 1000,
        stockType: 'FILLED',
        priceSoldToCustomer: 50,
        lowStockThreshold: 100,
      },
      {
        name: 'Stove',
        category: 'ACCESSORY',
        unit: 'piece',
        stockQuantity: 50,
        stockType: 'FILLED',
        priceSoldToCustomer: 2500,
        lowStockThreshold: 10,
      },
      {
        name: 'Regulator Adjustable',
        category: 'ACCESSORY',
        unit: 'piece',
        stockQuantity: 100,
        stockType: 'FILLED',
        priceSoldToCustomer: 800,
        lowStockThreshold: 20,
      },
      {
        name: 'Regulator Ideal High Pressure',
        category: 'ACCESSORY',
        unit: 'piece',
        stockQuantity: 80,
        stockType: 'FILLED',
        priceSoldToCustomer: 1200,
        lowStockThreshold: 15,
      },
      {
        name: 'Regulator 5 Star High Pressure',
        category: 'ACCESSORY',
        unit: 'piece',
        stockQuantity: 60,
        stockType: 'FILLED',
        priceSoldToCustomer: 1500,
        lowStockThreshold: 12,
      },
      {
        name: 'Regulator 3 Star Low Pressure Q1',
        category: 'ACCESSORY',
        unit: 'piece',
        stockQuantity: 40,
        stockType: 'FILLED',
        priceSoldToCustomer: 600,
        lowStockThreshold: 8,
      },
      {
        name: 'Regulator 3 Star Low Pressure Q2',
        category: 'ACCESSORY',
        unit: 'piece',
        stockQuantity: 40,
        stockType: 'FILLED',
        priceSoldToCustomer: 650,
        lowStockThreshold: 8,
      }
    ];

    // Create products
    for (const productData of products) {
      const existingProduct = await prisma.product.findFirst({
        where: { name: productData.name }
      });

      if (existingProduct) {
        await prisma.product.update({
          where: { id: existingProduct.id },
          data: productData,
        });
        console.log(`Updated product: ${productData.name}`);
      } else {
        await prisma.product.create({
          data: productData,
        });
        console.log(`Created product: ${productData.name}`);
      }
    }

    console.log('B2B customers and products created successfully!');
  } catch (error) {
    console.error('Error creating B2B customers:', error);
  } finally {
    await prisma.$disconnect();
  }
}

populateB2BCustomers();
