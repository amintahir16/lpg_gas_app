const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function migrateInventoryData() {
  try {
    console.log('Starting inventory data migration...');

    // Check if we have any cylinders with old enum values
    const oldCylinders = await prisma.cylinder.findMany({
      where: {
        OR: [
          { cylinderType: 'KG_15' },
          { cylinderType: 'KG_45' },
          { currentStatus: 'AVAILABLE' },
          { currentStatus: 'RENTED' }
        ]
      }
    });

    console.log(`Found ${oldCylinders.length} cylinders with old enum values`);

    if (oldCylinders.length > 0) {
      console.log('Updating cylinder types...');
      
      // Update cylinder types
      await prisma.cylinder.updateMany({
        where: { cylinderType: 'KG_15' },
        data: { cylinderType: 'STANDARD_15KG' }
      });

      await prisma.cylinder.updateMany({
        where: { cylinderType: 'KG_45' },
        data: { cylinderType: 'COMMERCIAL_45_4KG' }
      });

      console.log('Updating cylinder statuses...');
      
      // Update cylinder statuses
      await prisma.cylinder.updateMany({
        where: { currentStatus: 'AVAILABLE' },
        data: { currentStatus: 'FULL' }
      });

      await prisma.cylinder.updateMany({
        where: { currentStatus: 'RENTED' },
        data: { currentStatus: 'WITH_CUSTOMER' }
      });

      console.log('Cylinder data migration completed successfully');
    } else {
      console.log('No cylinders with old enum values found');
    }

    // Create some sample stores if none exist
    const storeCount = await prisma.store.count();
    if (storeCount === 0) {
      console.log('Creating sample stores...');
      await prisma.store.createMany({
        data: [
          {
            name: 'Main Store',
            location: 'Karachi',
            address: '123 Main Street, Karachi'
          },
          {
            name: 'Branch Store',
            location: 'Lahore',
            address: '456 Branch Road, Lahore'
          }
        ]
      });
      console.log('Sample stores created');
    }

    // Create some sample vehicles if none exist
    const vehicleCount = await prisma.vehicle.count();
    if (vehicleCount === 0) {
      console.log('Creating sample vehicles...');
      await prisma.vehicle.createMany({
        data: [
          {
            vehicleNumber: 'KHI-001',
            vehicleType: 'Delivery Truck',
            driverName: 'Ahmed Ali',
            capacity: 50
          },
          {
            vehicleNumber: 'LHR-002',
            vehicleType: 'Van',
            driverName: 'Muhammad Hassan',
            capacity: 25
          }
        ]
      });
      console.log('Sample vehicles created');
    }

    // Create some sample accessories if none exist
    const regulatorCount = await prisma.regulator.count();
    if (regulatorCount === 0) {
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
          }
        ]
      });
      console.log('Sample regulators created');
    }

    const gasPipeCount = await prisma.gasPipe.count();
    if (gasPipeCount === 0) {
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
          }
        ]
      });
      console.log('Sample gas pipes created');
    }

    const stoveCount = await prisma.stove.count();
    if (stoveCount === 0) {
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
          }
        ]
      });
      console.log('Sample stoves created');
    }

    console.log('Inventory data migration completed successfully!');
  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrateInventoryData();
