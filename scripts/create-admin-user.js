const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const prisma = new PrismaClient();

/**
 * Generate a secure random password.
 * 24 chars from a non-ambiguous alphabet ≈ 142 bits of entropy.
 */
function generatePassword(length = 24) {
  const alphabet =
    'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

async function createAdminUser() {
  try {
    const existingAdmin = await prisma.user.findFirst({
      where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
    });

    if (existingAdmin) {
      console.log('Admin user already exists:', existingAdmin.email);
      return existingAdmin;
    }

    const email = process.env.SEED_ADMIN_EMAIL || 'admin@lpg.com';
    const password = process.env.SEED_ADMIN_PASSWORD || generatePassword();
    const generated = !process.env.SEED_ADMIN_PASSWORD;

    const hashedPassword = await bcrypt.hash(password, 12);

    const adminUser = await prisma.user.create({
      data: {
        email,
        name: 'System Administrator',
        password: hashedPassword,
        role: 'SUPER_ADMIN',
        isActive: true,
      },
    });

    console.log('Admin user created.');
    console.log('Email:    ' + email);
    if (generated) {
      console.log('Password: ' + password);
      console.log(
        '\nThis password was generated randomly and is shown ONCE. ' +
          'Store it in a secret manager and rotate it after first login.\n'
      );
    } else {
      console.log('Password: (provided via SEED_ADMIN_PASSWORD env var)');
    }

    return adminUser;
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();
