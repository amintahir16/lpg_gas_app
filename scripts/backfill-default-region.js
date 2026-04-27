/**
 * Backfill script: ensures a default region "Hayatabad Branch" exists and
 * assigns it to every existing record that has a nullable regionId column.
 *
 * Safe to re-run — uses upsert + conditional updates that only touch rows
 * where regionId is currently NULL.
 *
 * Usage:  node scripts/backfill-default-region.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const DEFAULT_REGION_NAME = 'Hayatabad Branch';
const DEFAULT_REGION_CODE = 'HYT';

async function backfillRegion() {
  try {
    console.log('Backfilling default region...');

    const region = await prisma.region.upsert({
      where: { name: DEFAULT_REGION_NAME },
      update: {
        isActive: true,
        isDefault: true,
      },
      create: {
        name: DEFAULT_REGION_NAME,
        code: DEFAULT_REGION_CODE,
        address: 'Hayatabad, Peshawar',
        description: 'Default branch (auto-created by backfill).',
        isActive: true,
        isDefault: true,
        sortOrder: 0,
      },
    });

    console.log(`Default region ready: ${region.name} (${region.id})`);

    const updatableModels = [
      'customer',
      'b2CCustomer',
      'cylinder',
      'expense',
      'officeExpense',
      'salaryRecord',
      'dailyPlantPrice',
      'product',
      'customItem',
      'store',
      'vehicle',
      'purchaseEntry',
      'vendorPayment',
      'vendorOrder',
      'vendorInventory',
      'vendorFinancialReport',
      'b2BTransaction',
      'b2CTransaction',
    ];

    for (const modelName of updatableModels) {
      try {
        const result = await prisma[modelName].updateMany({
          where: { regionId: null },
          data: { regionId: region.id },
        });
        console.log(`  ${modelName.padEnd(28)} -> updated ${result.count} rows`);
      } catch (err) {
        console.warn(`  ${modelName} skipped: ${err.message}`);
      }
    }

    const adminUpdate = await prisma.user.updateMany({
      where: {
        role: 'ADMIN',
        regionId: null,
      },
      data: { regionId: region.id },
    });
    console.log(`  ${'user (ADMIN role)'.padEnd(28)} -> updated ${adminUpdate.count} rows`);

    console.log('Backfill completed successfully.');
  } catch (error) {
    console.error('Backfill failed:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

backfillRegion();
