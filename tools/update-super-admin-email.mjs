/**
 * One-off: rename super admin login email in Postgres (local or Vercel/Neon).
 * Loads env from .env via Node --env-file (Node 20+) or existing process env.
 *
 * Usage: node --env-file=.env tools/update-super-admin-email.mjs
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const OLD_EMAIL = 'admin@lpg.com';
const NEW_EMAIL = 'jawadafridi@flamora.pk';

async function main() {
  const oldKey = OLD_EMAIL.toLowerCase().trim();
  const newKey = NEW_EMAIL.toLowerCase().trim();

  const existing = await prisma.user.findUnique({ where: { email: newKey } });
  if (existing) {
    console.error(`Target email already in use: ${newKey} (id=${existing.id}, role=${existing.role})`);
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email: oldKey } });
  if (!user) {
    console.error(`No user found with email ${oldKey}`);
    process.exit(1);
  }
  if (user.role !== 'SUPER_ADMIN') {
    console.error(`User ${oldKey} has role ${user.role}, expected SUPER_ADMIN. Aborting.`);
    process.exit(1);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { email: newKey },
  });

  console.log(`Updated SUPER_ADMIN email: ${oldKey} → ${newKey} (password unchanged)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
