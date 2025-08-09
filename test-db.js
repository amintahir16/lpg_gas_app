const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testConnection() {
  try {
    console.log('🔌 Testing database connection...');
    
    // Test basic connection
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Database connection successful:', result);
    
    // Test user count
    const userCount = await prisma.user.count();
    console.log('👥 Current users in database:', userCount);
    
    // Test vendor count
    const vendorCount = await prisma.vendor.count();
    console.log('🏢 Current vendors in database:', vendorCount);
    
    // Test support requests count
    const supportCount = await prisma.supportRequest.count();
    console.log('🆘 Current support requests in database:', supportCount);
    
    await prisma.$disconnect();
    console.log('✅ Database test completed successfully');
    
  } catch (error) {
    console.error('❌ Database connection error:', error);
    await prisma.$disconnect();
  }
}

testConnection(); 