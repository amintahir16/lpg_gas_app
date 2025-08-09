const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createDemoUsers() {
  try {
    const users = [
      {
        email: 'admin@lpg.com',
        name: 'Admin User',
        password: 'admin123',
        role: 'ADMIN',
      },
      {
        email: 'superadmin@lpg.com',
        name: 'Super Admin',
        password: 'super123',
        role: 'SUPER_ADMIN',
      },
      {
        email: 'customer@lpg.com',
        name: 'John Customer',
        password: 'customer123',
        role: 'USER',
      },
      {
        email: 'vendor@lpg.com',
        name: 'Vendor Supplier',
        password: 'vendor123',
        role: 'VENDOR',
      },
    ];

    for (const userData of users) {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email }
      });

      if (existingUser) {
        console.log(`User ${userData.email} already exists`);
        continue;
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      // Create user
      const user = await prisma.user.create({
        data: {
          email: userData.email,
          name: userData.name,
          password: hashedPassword,
          role: userData.role,
        },
      });

      console.log(`User created successfully: ${user.email} (${user.role})`);
    }

    console.log('\nDemo users created!');
    console.log('Login credentials:');
    console.log('- Admin: admin@lpg.com / admin123');
    console.log('- Super Admin: superadmin@lpg.com / super123');
    console.log('- Customer: customer@lpg.com / customer123');
    console.log('- Vendor: vendor@lpg.com / vendor123');
  } catch (error) {
    console.error('Error creating demo users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createDemoUsers(); 