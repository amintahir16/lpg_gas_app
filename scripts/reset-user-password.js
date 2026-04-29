const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

function usage() {
  console.log(
    [
      'Reset a user password (updates bcrypt hash in Postgres).',
      '',
      'Usage:',
      '  node scripts/reset-user-password.js <email> <newPassword>',
      '',
      'Example:',
      '  node scripts/reset-user-password.js admin@lpg.com "NewStrongPassword123!"',
      '',
      'Notes:',
      '- This does NOT recover the old password (impossible with bcrypt).',
      '- Ensure your DATABASE env vars are set (e.g. POSTGRES_PRISMA_URL).',
    ].join('\n')
  );
}

async function main() {
  const email = process.argv[2];
  const newPassword = process.argv[3];

  if (!email || !newPassword) {
    usage();
    process.exitCode = 2;
    return;
  }

  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.error(`No user found with email: ${email}`);
      process.exitCode = 1;
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword, isActive: true },
    });

    console.log('Password reset succeeded for:', email);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Password reset failed:', err);
  process.exitCode = 1;
});

