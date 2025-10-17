const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    console.log('Creating admin user...');

    // Check if admin user already exists
    const existingAdmin = await prisma.user.findFirst({
      where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } }
    });

    if (existingAdmin) {
      console.log('✅ Admin user already exists:', existingAdmin.email);
      return existingAdmin;
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@lpg.com',
        name: 'System Administrator',
        password: hashedPassword,
        role: 'SUPER_ADMIN',
        isActive: true
      }
    });

    console.log('✅ Admin user created successfully!');
    console.log('📧 Email: admin@lpg.com');
    console.log('🔑 Password: admin123');
    console.log('👤 Role: SUPER_ADMIN');

    return adminUser;
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();
