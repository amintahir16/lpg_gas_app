const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function initializeDatabase() {
  try {
    console.log('🚀 Initializing database...');

    // Create initial system settings
    const initialSettings = [
      {
        key: 'companyName',
        value: 'LPG Gas Supply Co.',
        category: 'GENERAL',
        description: 'Company name for the business'
      },
      {
        key: 'contactEmail',
        value: 'admin@lpg.com',
        category: 'GENERAL',
        description: 'Primary contact email address'
      },
      {
        key: 'contactPhone',
        value: '+1 (555) 123-4567',
        category: 'GENERAL',
        description: 'Primary contact phone number'
      },
      {
        key: 'address',
        value: '123 Gas Street, Industrial District, City, State 12345',
        category: 'GENERAL',
        description: 'Company business address'
      },
      {
        key: 'businessHours',
        value: 'Monday - Friday: 8AM - 6PM, Saturday: 9AM - 2PM',
        category: 'GENERAL',
        description: 'Business operating hours'
      },
      {
        key: 'deliveryRadius',
        value: '50',
        category: 'GENERAL',
        description: 'Delivery service radius in miles'
      },
      {
        key: 'defaultCreditLimit',
        value: '1000',
        category: 'GENERAL',
        description: 'Default credit limit for new customers'
      },
      {
        key: 'taxRate',
        value: '8.5',
        category: 'GENERAL',
        description: 'Default tax rate percentage'
      },
      {
        key: 'currency',
        value: 'USD',
        category: 'GENERAL',
        description: 'Default currency for transactions'
      },
      {
        key: 'timezone',
        value: 'America/New_York',
        category: 'GENERAL',
        description: 'Business timezone'
      },
      {
        key: 'maintenanceInterval',
        value: '90',
        category: 'GENERAL',
        description: 'Cylinder maintenance interval in days'
      },
      {
        key: 'safetyInspectionInterval',
        value: '180',
        category: 'GENERAL',
        description: 'Safety inspection interval in days'
      }
    ];

    console.log('📝 Creating initial system settings...');
    
    for (const setting of initialSettings) {
      await prisma.systemSettings.upsert({
        where: { key: setting.key },
        update: {
          value: setting.value,
          updatedAt: new Date()
        },
        create: {
          key: setting.key,
          value: setting.value,
          category: setting.category,
          description: setting.description,
          isActive: true
        }
      });
      console.log(`✅ Created/Updated setting: ${setting.key}`);
    }

    console.log('🎉 Database initialization completed successfully!');
    console.log('📊 You can now access the settings page in the admin dashboard.');

  } catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the initialization
initializeDatabase(); 