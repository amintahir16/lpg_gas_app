const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function populateSampleRentals() {
  try {
    console.log('🚀 Starting sample rental population...\n');

    // Get or create admin user
    let adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (!adminUser) {
      console.log('Creating admin user...');
      adminUser = await prisma.user.create({
        data: {
          email: 'admin@lpggas.com',
          name: 'Admin User',
          password: '$2a$10$X8qZ9YxZ9YxZ9YxZ9YxZ9.YxZ9YxZ9YxZ9YxZ9YxZ9YxZ9YxZ9YxZ', // hashed password
          role: 'ADMIN'
        }
      });
      console.log('✅ Admin user created');
    }

    // Get or create sample B2B customers
    console.log('\n📋 Creating sample customers...');
    
    const sampleCustomers = [
      {
        name: 'Al-Madina Restaurant',
        contactPerson: 'Ahmed Hassan',
        phone: '+92-300-1234567',
        email: 'ahmed@almadina.com',
        address: 'Main Boulevard, Gulberg III, Lahore',
        type: 'B2B',
        creditLimit: 50000,
        paymentTermsDays: 30,
        createdBy: adminUser.id
      },
      {
        name: 'Royal Hotel & Suites',
        contactPerson: 'Fatima Khan',
        phone: '+92-300-2345678',
        email: 'fatima@royalhotel.com',
        address: 'Shahrah-e-Faisal, Karachi',
        type: 'B2B',
        creditLimit: 100000,
        paymentTermsDays: 15,
        createdBy: adminUser.id
      },
      {
        name: 'Green Valley Hospital',
        contactPerson: 'Dr. Ali Raza',
        phone: '+92-300-3456789',
        email: 'ali.raza@greenvalley.com',
        address: 'Canal Road, Faisalabad',
        type: 'B2B',
        creditLimit: 75000,
        paymentTermsDays: 30,
        createdBy: adminUser.id
      },
      {
        name: 'Star Bakery',
        contactPerson: 'Muhammad Usman',
        phone: '+92-300-4567890',
        email: 'usman@starbakery.com',
        address: 'Mall Road, Rawalpindi',
        type: 'B2B',
        creditLimit: 30000,
        paymentTermsDays: 20,
        createdBy: adminUser.id
      },
      {
        name: 'Paradise Wedding Hall',
        contactPerson: 'Sara Ali',
        phone: '+92-300-5678901',
        email: 'sara@paradisehall.com',
        address: 'DHA Phase 5, Karachi',
        type: 'B2B',
        creditLimit: 60000,
        paymentTermsDays: 15,
        createdBy: adminUser.id
      }
    ];

    const customers = [];
    for (const customerData of sampleCustomers) {
      // Check if customer already exists
      let customer = await prisma.customer.findFirst({
        where: { name: customerData.name }
      });

      if (!customer) {
        customer = await prisma.customer.create({
          data: customerData
        });
        console.log(`✅ Created customer: ${customer.name}`);
      } else {
        console.log(`ℹ️  Customer already exists: ${customer.name}`);
      }
      customers.push(customer);
    }

    // Get available cylinders (FULL or EMPTY status)
    console.log('\n🔍 Finding available cylinders...');
    const availableCylinders = await prisma.cylinder.findMany({
      where: {
        currentStatus: {
          in: ['FULL', 'EMPTY']
        }
      },
      take: 15 // Get 15 cylinders for rentals
    });

    console.log(`Found ${availableCylinders.length} available cylinders`);

    if (availableCylinders.length === 0) {
      console.log('❌ No available cylinders found. Please add cylinders to the database first.');
      return;
    }

    // Create sample rentals
    console.log('\n📦 Creating sample rentals...');
    
    const now = new Date();
    const rentals = [];

    for (let i = 0; i < Math.min(availableCylinders.length, 12); i++) {
      const cylinder = availableCylinders[i];
      const customer = customers[i % customers.length];
      
      // Create rental with varied dates
      const daysAgo = Math.floor(Math.random() * 30); // 0-30 days ago
      const rentalDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
      const durationDays = 30 + Math.floor(Math.random() * 60); // 30-90 days
      const expectedReturnDate = new Date(rentalDate.getTime() + (durationDays * 24 * 60 * 60 * 1000));
      
      // Determine if overdue
      const isOverdue = expectedReturnDate < now && Math.random() > 0.7; // 30% chance of being overdue
      
      // Calculate rental amount based on cylinder type
      let rentalAmount = 0;
      let depositAmount = 0;
      
      if (cylinder.cylinderType === 'DOMESTIC_11_8KG') {
        rentalAmount = 150 * (durationDays / 30); // 150 per month
        depositAmount = 3000;
      } else if (cylinder.cylinderType === 'STANDARD_15KG') {
        rentalAmount = 200 * (durationDays / 30);
        depositAmount = 4000;
      } else if (cylinder.cylinderType === 'COMMERCIAL_45_4KG') {
        rentalAmount = 450 * (durationDays / 30);
        depositAmount = 8000;
      }

      // Create the rental
      const rental = await prisma.cylinderRental.create({
        data: {
          customerId: customer.id,
          cylinderId: cylinder.id,
          userId: adminUser.id,
          rentalDate: rentalDate,
          expectedReturnDate: expectedReturnDate,
          rentalAmount: rentalAmount,
          depositAmount: depositAmount,
          status: 'ACTIVE',
          notes: `Rental for ${customer.name} - ${durationDays} days duration`
        }
      });

      // Update cylinder status to WITH_CUSTOMER
      await prisma.cylinder.update({
        where: { id: cylinder.id },
        data: { currentStatus: 'WITH_CUSTOMER' }
      });

      rentals.push(rental);
      console.log(`✅ Created rental: ${cylinder.code} → ${customer.name} (${isOverdue ? 'OVERDUE' : 'ACTIVE'})`);
    }

    console.log(`\n✅ Successfully created ${rentals.length} sample rentals!`);

    // Summary
    console.log('\n📊 Summary:');
    console.log(`   Customers: ${customers.length}`);
    console.log(`   Rentals Created: ${rentals.length}`);
    
    const typeCounts = {};
    rentals.forEach(r => {
      const cylinder = availableCylinders.find(c => c.id === r.cylinderId);
      typeCounts[cylinder.cylinderType] = (typeCounts[cylinder.cylinderType] || 0) + 1;
    });
    
    console.log('\n   Rentals by Cylinder Type:');
    Object.entries(typeCounts).forEach(([type, count]) => {
      const displayType = type.replace('_', ' ').replace('KG', 'kg');
      console.log(`     ${displayType}: ${count}`);
    });

    console.log('\n🎉 Sample data population completed!');
    console.log('💡 Now go to: Inventory → Cylinders with Customers to see the data!');

  } catch (error) {
    console.error('\n❌ Error populating sample rentals:', error.message);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

populateSampleRentals();

