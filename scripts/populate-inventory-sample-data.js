const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function populateInventoryData() {
  try {
    console.log('Starting inventory sample data population...');

    // Create sample stores
    console.log('Creating sample stores...');
    const store1 = await prisma.store.create({
      data: {
        name: 'Main Store',
        location: 'Karachi',
        address: '123 Main Street, Karachi'
      }
    });

    const store2 = await prisma.store.create({
      data: {
        name: 'Branch Store',
        location: 'Lahore',
        address: '456 Branch Road, Lahore'
      }
    });

    console.log('Sample stores created');

    // Create sample vehicles
    console.log('Creating sample vehicles...');
    const vehicle1 = await prisma.vehicle.create({
      data: {
        vehicleNumber: 'KHI-001',
        vehicleType: 'Delivery Truck',
        driverName: 'Ahmed Ali',
        capacity: 50
      }
    });

    const vehicle2 = await prisma.vehicle.create({
      data: {
        vehicleNumber: 'LHR-002',
        vehicleType: 'Van',
        driverName: 'Muhammad Hassan',
        capacity: 25
      }
    });

    console.log('Sample vehicles created');

    // Create sample cylinders
    console.log('Creating sample cylinders...');
    const cylinders = [];
    
    // Domestic cylinders (11.8kg)
    for (let i = 1; i <= 10; i++) {
      cylinders.push({
        code: `DOM-${String(i).padStart(3, '0')}`,
        cylinderType: 'DOMESTIC_11_8KG',
        capacity: 11.8,
        currentStatus: Math.random() > 0.5 ? 'FULL' : 'EMPTY',
        location: 'Warehouse A',
        storeId: i <= 5 ? store1.id : store2.id,
        purchasePrice: 5000 + Math.floor(Math.random() * 1000)
      });
    }

    // Standard cylinders (15kg)
    for (let i = 1; i <= 130; i++) {
      cylinders.push({
        code: `STD-${String(i).padStart(3, '0')}`,
        cylinderType: 'STANDARD_15KG',
        capacity: 15,
        currentStatus: Math.random() > 0.3 ? 'FULL' : 'EMPTY',
        location: 'Warehouse B',
        storeId: i <= 65 ? store1.id : store2.id,
        purchasePrice: 6000 + Math.floor(Math.random() * 1000)
      });
    }

    // Commercial cylinders (45.4kg)
    for (let i = 1; i <= 140; i++) {
      cylinders.push({
        code: `COM-${String(i).padStart(3, '0')}`,
        cylinderType: 'COMMERCIAL_45_4KG',
        capacity: 45.4,
        currentStatus: Math.random() > 0.2 ? 'FULL' : 'EMPTY',
        location: 'Warehouse C',
        storeId: i <= 70 ? store1.id : store2.id,
        purchasePrice: 15000 + Math.floor(Math.random() * 2000)
      });
    }

    // Assign some cylinders to vehicles
    for (let i = 0; i < 20; i++) {
      cylinders[i].vehicleId = vehicle1.id;
      cylinders[i].storeId = null;
    }

    for (let i = 20; i < 35; i++) {
      cylinders[i].vehicleId = vehicle2.id;
      cylinders[i].storeId = null;
    }

    // Set some cylinders as with customers
    for (let i = 35; i < 50; i++) {
      cylinders[i].currentStatus = 'WITH_CUSTOMER';
    }

    await prisma.cylinder.createMany({
      data: cylinders
    });

    console.log('Sample cylinders created');

    // Create sample regulators
    console.log('Creating sample regulators...');
    await prisma.regulator.createMany({
      data: [
        {
          type: 'Adjustable',
          costPerPiece: 1000,
          quantity: 10,
          totalCost: 10000
        },
        {
          type: '5 Star High Pressure',
          costPerPiece: 700,
          quantity: 10,
          totalCost: 7000
        },
        {
          type: 'Low Pressure',
          costPerPiece: 500,
          quantity: 15,
          totalCost: 7500
        },
        {
          type: 'Medium Pressure',
          costPerPiece: 800,
          quantity: 12,
          totalCost: 9600
        }
      ]
    });

    console.log('Sample regulators created');

    // Create sample gas pipes
    console.log('Creating sample gas pipes...');
    await prisma.gasPipe.createMany({
      data: [
        {
          type: 'High Pressure',
          quantity: 100,
          totalCost: 5000
        },
        {
          type: 'Standard',
          quantity: 200,
          totalCost: 8000
        },
        {
          type: 'Low Pressure',
          quantity: 150,
          totalCost: 6000
        },
        {
          type: 'Flexible',
          quantity: 80,
          totalCost: 4000
        }
      ]
    });

    console.log('Sample gas pipes created');

    // Create sample stoves
    console.log('Creating sample stoves...');
    await prisma.stove.createMany({
      data: [
        {
          quality: 'Premium',
          quantity: 5
        },
        {
          quality: 'Standard',
          quantity: 10
        },
        {
          quality: 'Economy',
          quantity: 15
        },
        {
          quality: 'Commercial',
          quantity: 8
        }
      ]
    });

    console.log('Sample stoves created');

    console.log('Inventory sample data population completed successfully!');
    console.log('Created:');
    console.log('- 2 stores');
    console.log('- 2 vehicles');
    console.log('- 280 cylinders (10 domestic, 130 standard, 140 commercial)');
    console.log('- 4 regulator types');
    console.log('- 4 gas pipe types');
    console.log('- 4 stove qualities');
  } catch (error) {
    console.error('Error during data population:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

populateInventoryData();
