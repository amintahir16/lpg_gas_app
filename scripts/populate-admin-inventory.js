const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function populateAdminInventory() {
  try {
    console.log('🚀 Starting comprehensive admin inventory population...');

    // 1. Create multiple stores
    console.log('🏪 Creating stores...');
    const stores = await createStores();
    console.log(`✅ Created ${stores.length} stores`);

    // 2. Create vehicles
    console.log('🚛 Creating vehicles...');
    const vehicles = await createVehicles();
    console.log(`✅ Created ${vehicles.length} vehicles`);

    // 3. Create cylinders with realistic distribution
    console.log('🔵 Creating cylinders...');
    const cylinders = await createCylinders(stores, vehicles);
    console.log(`✅ Created ${cylinders.length} cylinders`);

    // 4. Create accessories and equipment
    console.log('🔧 Creating accessories and equipment...');
    await createAccessories();
    console.log('✅ Created accessories and equipment');

    // 5. Create products for B2B transactions
    console.log('📦 Creating products...');
    await createProducts();
    console.log('✅ Created products');

    // 6. Create vendors with inventory
    console.log('🏢 Creating vendors with inventory...');
    await createVendorsWithInventory(cylinders);
    console.log('✅ Created vendors with inventory');

    // 7. Display summary
    await displayInventorySummary();

    console.log('🎉 Admin inventory population completed successfully!');
  } catch (error) {
    console.error('❌ Error populating admin inventory:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function createStores() {
  const storeData = [
    {
      name: 'Main Warehouse Karachi',
      location: 'Karachi',
      address: 'Plot 123, Industrial Area, Karachi, Pakistan'
    },
    {
      name: 'Branch Store Lahore',
      location: 'Lahore',
      address: '456 Mall Road, Lahore, Pakistan'
    },
    {
      name: 'Distribution Center Islamabad',
      location: 'Islamabad',
      address: '789 Blue Area, Islamabad, Pakistan'
    },
    {
      name: 'Regional Store Peshawar',
      location: 'Peshawar',
      address: '321 University Road, Peshawar, Pakistan'
    },
    {
      name: 'Coastal Depot Karachi',
      location: 'Karachi',
      address: '654 Clifton, Karachi, Pakistan'
    }
  ];

  // Clear existing stores first
  await prisma.store.deleteMany({});
  
  // Create new stores
  const stores = await prisma.store.createMany({
    data: storeData
  });

  // Fetch the created stores
  const createdStores = await prisma.store.findMany();
  return createdStores;
}

async function createVehicles() {
  const vehicleData = [
    {
      vehicleNumber: 'KHI-2024-001',
      vehicleType: 'Heavy Duty Truck',
      driverName: 'Muhammad Ali',
      capacity: 100
    },
    {
      vehicleNumber: 'KHI-2024-002',
      vehicleType: 'Delivery Van',
      driverName: 'Ahmed Hassan',
      capacity: 50
    },
    {
      vehicleNumber: 'LHR-2024-001',
      vehicleType: 'Pickup Truck',
      driverName: 'Saeed Khan',
      capacity: 30
    },
    {
      vehicleNumber: 'ISB-2024-001',
      vehicleType: 'Heavy Duty Truck',
      driverName: 'Imran Shah',
      capacity: 80
    },
    {
      vehicleNumber: 'PSH-2024-001',
      vehicleType: 'Delivery Van',
      driverName: 'Farooq Ahmed',
      capacity: 40
    },
    {
      vehicleNumber: 'KHI-2024-003',
      vehicleType: 'Motorcycle',
      driverName: 'Bilal Khan',
      capacity: 2
    }
  ];

  // Clear existing vehicles first
  await prisma.vehicle.deleteMany({});
  
  // Create new vehicles
  await prisma.vehicle.createMany({
    data: vehicleData
  });

  // Fetch the created vehicles
  const vehicles = await prisma.vehicle.findMany();
  return vehicles;
}

async function createCylinders(stores, vehicles) {
  const cylinders = [];
  
  // Get random stores and vehicles for assignment
  const getRandomStore = () => stores[Math.floor(Math.random() * stores.length)];
  const getRandomVehicle = () => vehicles[Math.floor(Math.random() * vehicles.length)];
  const getRandomStatus = () => {
    const statuses = ['FULL', 'EMPTY', 'MAINTENANCE', 'WITH_CUSTOMER'];
    const weights = [0.4, 0.3, 0.1, 0.2]; // 40% full, 30% empty, 10% maintenance, 20% with customer
    const random = Math.random();
    let cumulative = 0;
    for (let i = 0; i < statuses.length; i++) {
      cumulative += weights[i];
      if (random <= cumulative) return statuses[i];
    }
    return 'FULL';
  };

  // Create Domestic 11.8kg cylinders (50 units)
  for (let i = 1; i <= 50; i++) {
    const status = getRandomStatus();
    const cylinder = await prisma.cylinder.create({
      data: {
        code: `DOM-${String(i).padStart(4, '0')}`,
        cylinderType: 'DOMESTIC_11_8KG',
        capacity: 11.8,
        currentStatus: status,
        location: status === 'WITH_CUSTOMER' ? 'Customer Location' : 'Warehouse',
        storeId: status === 'WITH_CUSTOMER' ? null : getRandomStore().id,
        vehicleId: status === 'WITH_CUSTOMER' ? null : (Math.random() > 0.7 ? getRandomVehicle().id : null),
        purchaseDate: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
        purchasePrice: 4500 + Math.floor(Math.random() * 1000),
        lastMaintenanceDate: new Date(2024, Math.floor(Math.random() * 6), Math.floor(Math.random() * 28) + 1),
        nextMaintenanceDate: new Date(2024, Math.floor(Math.random() * 6) + 6, Math.floor(Math.random() * 28) + 1)
      }
    });
    cylinders.push(cylinder);
  }

  // Create Standard 15kg cylinders (200 units)
  for (let i = 1; i <= 200; i++) {
    const status = getRandomStatus();
    const cylinder = await prisma.cylinder.create({
      data: {
        code: `STD-${String(i).padStart(4, '0')}`,
        cylinderType: 'STANDARD_15KG',
        capacity: 15.0,
        currentStatus: status,
        location: status === 'WITH_CUSTOMER' ? 'Customer Location' : 'Warehouse',
        storeId: status === 'WITH_CUSTOMER' ? null : getRandomStore().id,
        vehicleId: status === 'WITH_CUSTOMER' ? null : (Math.random() > 0.7 ? getRandomVehicle().id : null),
        purchaseDate: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
        purchasePrice: 5500 + Math.floor(Math.random() * 1500),
        lastMaintenanceDate: new Date(2024, Math.floor(Math.random() * 6), Math.floor(Math.random() * 28) + 1),
        nextMaintenanceDate: new Date(2024, Math.floor(Math.random() * 6) + 6, Math.floor(Math.random() * 28) + 1)
      }
    });
    cylinders.push(cylinder);
  }

  // Create Commercial 45.4kg cylinders (30 units)
  for (let i = 1; i <= 30; i++) {
    const status = getRandomStatus();
    const cylinder = await prisma.cylinder.create({
      data: {
        code: `COM-${String(i).padStart(4, '0')}`,
        cylinderType: 'COMMERCIAL_45_4KG',
        capacity: 45.4,
        currentStatus: status,
        location: status === 'WITH_CUSTOMER' ? 'Customer Location' : 'Warehouse',
        storeId: status === 'WITH_CUSTOMER' ? null : getRandomStore().id,
        vehicleId: status === 'WITH_CUSTOMER' ? null : (Math.random() > 0.7 ? getRandomVehicle().id : null),
        purchaseDate: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
        purchasePrice: 12000 + Math.floor(Math.random() * 3000),
        lastMaintenanceDate: new Date(2024, Math.floor(Math.random() * 6), Math.floor(Math.random() * 28) + 1),
        nextMaintenanceDate: new Date(2024, Math.floor(Math.random() * 6) + 6, Math.floor(Math.random() * 28) + 1)
      }
    });
    cylinders.push(cylinder);
  }

  return cylinders;
}

async function createAccessories() {
  // Clear existing accessories
  await prisma.regulator.deleteMany({});
  await prisma.gasPipe.deleteMany({});
  await prisma.stove.deleteMany({});

  // Create regulators
  const regulatorData = [
    {
      type: 'Adjustable',
      costPerPiece: 1200,
      quantity: 25,
      totalCost: 30000
    },
    {
      type: 'Ideal High Pressure',
      costPerPiece: 1500,
      quantity: 20,
      totalCost: 30000
    },
    {
      type: '5 Star High Pressure',
      costPerPiece: 1800,
      quantity: 30,
      totalCost: 54000
    },
    {
      type: '3 Star Low Pressure Q1',
      costPerPiece: 800,
      quantity: 40,
      totalCost: 32000
    },
    {
      type: '3 Star Low Pressure Q2',
      costPerPiece: 600,
      quantity: 35,
      totalCost: 21000
    }
  ];

  await prisma.regulator.createMany({
    data: regulatorData
  });

  // Create gas pipes
  const gasPipeData = [
    {
      type: 'Rubber Hose 6mm',
      quantity: 500.0,
      totalCost: 25000
    },
    {
      type: 'Rubber Hose 8mm',
      quantity: 300.0,
      totalCost: 30000
    },
    {
      type: 'Steel Pipe 1/2 inch',
      quantity: 200.0,
      totalCost: 40000
    },
    {
      type: 'Steel Pipe 3/4 inch',
      quantity: 150.0,
      totalCost: 45000
    }
  ];

  await prisma.gasPipe.createMany({
    data: gasPipeData
  });

  // Create stoves
  const stoveData = [
    {
      quality: 'Premium 4-Burner',
      quantity: 20,
      costPerPiece: 15000,
      totalCost: 300000
    },
    {
      quality: 'Standard 2-Burner',
      quantity: 50,
      costPerPiece: 8000,
      totalCost: 400000
    },
    {
      quality: 'Economy 1-Burner',
      quantity: 30,
      costPerPiece: 4000,
      totalCost: 120000
    },
    {
      quality: 'Commercial 6-Burner',
      quantity: 10,
      costPerPiece: 25000,
      totalCost: 250000
    }
  ];

  await prisma.stove.createMany({
    data: stoveData
  });
}

async function createProducts() {
  // Clear existing products
  await prisma.product.deleteMany({});

  const productData = [
    {
      name: 'LPG Gas Cylinder 11.8kg (Domestic)',
      category: 'GAS_CYLINDER',
      unit: 'piece',
      stockQuantity: 50,
      stockType: 'FILLED',
      priceSoldToCustomer: 2500,
      lowStockThreshold: 10
    },
    {
      name: 'LPG Gas Cylinder 15kg (Standard)',
      category: 'GAS_CYLINDER',
      unit: 'piece',
      stockQuantity: 200,
      stockType: 'FILLED',
      priceSoldToCustomer: 3000,
      lowStockThreshold: 20
    },
    {
      name: 'LPG Gas Cylinder 45.4kg (Commercial)',
      category: 'GAS_CYLINDER',
      unit: 'piece',
      stockQuantity: 30,
      stockType: 'FILLED',
      priceSoldToCustomer: 8000,
      lowStockThreshold: 5
    },
    {
      name: 'Gas Regulator High Pressure',
      category: 'ACCESSORY',
      unit: 'piece',
      stockQuantity: 25,
      stockType: 'FILLED',
      priceSoldToCustomer: 1200,
      lowStockThreshold: 5
    },
    {
      name: 'Gas Regulator Standard',
      category: 'ACCESSORY',
      unit: 'piece',
      stockQuantity: 50,
      stockType: 'FILLED',
      priceSoldToCustomer: 800,
      lowStockThreshold: 10
    },
    {
      name: 'Gas Hose 6mm',
      category: 'ACCESSORY',
      unit: 'meter',
      stockQuantity: 500,
      stockType: 'FILLED',
      priceSoldToCustomer: 50,
      lowStockThreshold: 50
    },
    {
      name: 'Gas Hose 8mm',
      category: 'ACCESSORY',
      unit: 'meter',
      stockQuantity: 300,
      stockType: 'FILLED',
      priceSoldToCustomer: 75,
      lowStockThreshold: 30
    },
    {
      name: 'Gas Stove 2-Burner',
      category: 'ACCESSORY',
      unit: 'piece',
      stockQuantity: 50,
      stockType: 'FILLED',
      priceSoldToCustomer: 8000,
      lowStockThreshold: 10
    },
    {
      name: 'Gas Stove 4-Burner',
      category: 'ACCESSORY',
      unit: 'piece',
      stockQuantity: 20,
      stockType: 'FILLED',
      priceSoldToCustomer: 15000,
      lowStockThreshold: 5
    }
  ];

  await prisma.product.createMany({
    data: productData
  });
}

async function createVendorsWithInventory(cylinders) {
  // Clear existing vendor data
  await prisma.vendorPayment.deleteMany({});
  await prisma.vendorInventory.deleteMany({});
  await prisma.vendor.deleteMany({});

  const vendorData = [
    {
      vendorCode: 'VEN-001',
      companyName: 'Pak Gas Industries Ltd',
      contactPerson: 'Muhammad Asif',
      email: 'asif@pakgas.com',
      phone: '+92-21-1234567',
      address: 'Industrial Area, Karachi',
      taxId: 'TAX-001-2024',
      paymentTerms: 30,
      category: 'CYLINDER_PURCHASE'
    },
    {
      vendorCode: 'VEN-002',
      companyName: 'Lahore Gas Equipment Co',
      contactPerson: 'Ahmed Raza',
      email: 'ahmed@lahoregas.com',
      phone: '+92-42-2345678',
      address: 'Mall Road, Lahore',
      taxId: 'TAX-002-2024',
      paymentTerms: 45,
      category: 'ACCESSORIES_PURCHASE'
    },
    {
      vendorCode: 'VEN-003',
      companyName: 'Islamabad Gas Solutions',
      contactPerson: 'Sara Khan',
      email: 'sara@islamabadgas.com',
      phone: '+92-51-3456789',
      address: 'Blue Area, Islamabad',
      taxId: 'TAX-003-2024',
      paymentTerms: 15,
      category: 'GAS_PURCHASE'
    }
  ];

  // Create vendors
  await prisma.vendor.createMany({
    data: vendorData
  });

  // Get created vendors
  const vendors = await prisma.vendor.findMany();

  for (const vendor of vendors) {
    // Create vendor inventory items
    const inventoryItems = [
      {
        name: 'LPG Cylinder 11.8kg',
        category: 'Cylinders',
        quantity: 20,
        unitPrice: 4000,
        status: 'IN_STOCK',
        description: 'High quality domestic LPG cylinder'
      },
      {
        name: 'LPG Cylinder 15kg',
        category: 'Cylinders',
        quantity: 50,
        unitPrice: 5000,
        status: 'IN_STOCK',
        description: 'Standard commercial LPG cylinder'
      },
      {
        name: 'LPG Cylinder 45.4kg',
        category: 'Cylinders',
        quantity: 10,
        unitPrice: 10000,
        status: 'IN_STOCK',
        description: 'Heavy duty commercial LPG cylinder'
      },
      {
        name: 'Gas Regulator Set',
        category: 'Accessories',
        quantity: 100,
        unitPrice: 800,
        status: 'IN_STOCK',
        description: 'Complete gas regulator set with fittings'
      },
      {
        name: 'Gas Hose Assembly',
        category: 'Accessories',
        quantity: 200,
        unitPrice: 300,
        status: 'LOW_STOCK',
        description: 'Rubber gas hose with connectors'
      }
    ];

    for (const item of inventoryItems) {
      await prisma.vendorInventory.create({
        data: {
          vendorId: vendor.id,
          name: item.name,
          category: item.category,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          status: item.status,
          description: item.description
        }
      });
    }

    // Create some vendor payments
    for (let i = 1; i <= 3; i++) {
      await prisma.vendorPayment.create({
        data: {
          vendorId: vendor.id,
          amount: (i * 10000) + Math.floor(Math.random() * 5000),
          paymentDate: new Date(2024, Math.floor(Math.random() * 6), Math.floor(Math.random() * 28) + 1),
          method: ['BANK_TRANSFER', 'CASH', 'CHECK'][Math.floor(Math.random() * 3)],
          status: ['COMPLETED', 'PENDING'][Math.floor(Math.random() * 2)],
          description: `Payment for order #${i}`,
          reference: `PAY-${vendor.vendorCode}-${i}`
        }
      });
    }
  }
}

async function displayInventorySummary() {
  console.log('\n📊 INVENTORY SUMMARY');
  console.log('==================');

  // Store summary
  const storeCount = await prisma.store.count();
  console.log(`🏪 Stores: ${storeCount}`);

  // Vehicle summary
  const vehicleCount = await prisma.vehicle.count();
  console.log(`🚛 Vehicles: ${vehicleCount}`);

  // Cylinder summary
  const cylinderCount = await prisma.cylinder.count();
  const cylinderByType = await prisma.cylinder.groupBy({
    by: ['cylinderType'],
    _count: { cylinderType: true }
  });
  const cylinderByStatus = await prisma.cylinder.groupBy({
    by: ['currentStatus'],
    _count: { currentStatus: true }
  });

  console.log(`🔵 Total Cylinders: ${cylinderCount}`);
  cylinderByType.forEach(type => {
    console.log(`   ${type.cylinderType}: ${type._count.cylinderType}`);
  });
  console.log('   Status Distribution:');
  cylinderByStatus.forEach(status => {
    console.log(`   ${status.currentStatus}: ${status._count.currentStatus}`);
  });

  // Accessories summary
  const regulatorCount = await prisma.regulator.count();
  const gasPipeCount = await prisma.gasPipe.count();
  const stoveCount = await prisma.stove.count();

  console.log(`🔧 Regulators: ${regulatorCount} types`);
  console.log(`🔗 Gas Pipes: ${gasPipeCount} types`);
  console.log(`🔥 Stoves: ${stoveCount} types`);

  // Products summary
  const productCount = await prisma.product.count();
  console.log(`📦 Products: ${productCount}`);

  // Vendor summary
  const vendorCount = await prisma.vendor.count();
  const vendorInventoryCount = await prisma.vendorInventory.count();
  console.log(`🏢 Vendors: ${vendorCount}`);
  console.log(`📋 Vendor Inventory Items: ${vendorInventoryCount}`);

  console.log('\n✅ Inventory population completed successfully!');
}

// Run the script
populateAdminInventory();
