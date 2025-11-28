const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function applyMigration() {
  try {
    console.log('🔄 Starting cylinderType enum to String migration...\n');

    // 1. Update cylinders table
    console.log('1️⃣  Migrating cylinders table...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "cylinders" ADD COLUMN IF NOT EXISTS "cylinderType_temp" TEXT;
    `);
    await prisma.$executeRawUnsafe(`
      UPDATE "cylinders" SET "cylinderType_temp" = "cylinderType"::TEXT;
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "cylinders" DROP COLUMN IF EXISTS "cylinderType";
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "cylinders" RENAME COLUMN "cylinderType_temp" TO "cylinderType";
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "cylinders" ALTER COLUMN "cylinderType" SET NOT NULL;
    `);
    console.log('   ✅ cylinders table migrated\n');

    // 2. Update b2c_cylinder_holdings table
    console.log('2️⃣  Migrating b2c_cylinder_holdings table...');
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "b2c_cylinder_holdings" ADD COLUMN IF NOT EXISTS "cylinderType_temp" TEXT;
      `);
      await prisma.$executeRawUnsafe(`
        UPDATE "b2c_cylinder_holdings" SET "cylinderType_temp" = "cylinderType"::TEXT;
      `);
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "b2c_cylinder_holdings" DROP COLUMN IF EXISTS "cylinderType";
      `);
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "b2c_cylinder_holdings" RENAME COLUMN "cylinderType_temp" TO "cylinderType";
      `);
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "b2c_cylinder_holdings" ALTER COLUMN "cylinderType" SET NOT NULL;
      `);
      console.log('   ✅ b2c_cylinder_holdings table migrated\n');
    } catch (error) {
      if (error.message.includes('does not exist')) {
        console.log('   ⚠️  b2c_cylinder_holdings table does not exist, skipping...\n');
      } else {
        throw error;
      }
    }

    // 3. Update b2c_transaction_gas_items table
    console.log('3️⃣  Migrating b2c_transaction_gas_items table...');
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "b2c_transaction_gas_items" ADD COLUMN IF NOT EXISTS "cylinderType_temp" TEXT;
      `);
      await prisma.$executeRawUnsafe(`
        UPDATE "b2c_transaction_gas_items" SET "cylinderType_temp" = "cylinderType"::TEXT;
      `);
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "b2c_transaction_gas_items" DROP COLUMN IF EXISTS "cylinderType";
      `);
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "b2c_transaction_gas_items" RENAME COLUMN "cylinderType_temp" TO "cylinderType";
      `);
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "b2c_transaction_gas_items" ALTER COLUMN "cylinderType" SET NOT NULL;
      `);
      console.log('   ✅ b2c_transaction_gas_items table migrated\n');
    } catch (error) {
      if (error.message.includes('does not exist')) {
        console.log('   ⚠️  b2c_transaction_gas_items table does not exist, skipping...\n');
      } else {
        throw error;
      }
    }

    // 4. Update b2c_transaction_security_items table
    console.log('4️⃣  Migrating b2c_transaction_security_items table...');
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "b2c_transaction_security_items" ADD COLUMN IF NOT EXISTS "cylinderType_temp" TEXT;
      `);
      await prisma.$executeRawUnsafe(`
        UPDATE "b2c_transaction_security_items" SET "cylinderType_temp" = "cylinderType"::TEXT;
      `);
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "b2c_transaction_security_items" DROP COLUMN IF EXISTS "cylinderType";
      `);
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "b2c_transaction_security_items" RENAME COLUMN "cylinderType_temp" TO "cylinderType";
      `);
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "b2c_transaction_security_items" ALTER COLUMN "cylinderType" SET NOT NULL;
      `);
      console.log('   ✅ b2c_transaction_security_items table migrated\n');
    } catch (error) {
      if (error.message.includes('does not exist')) {
        console.log('   ⚠️  b2c_transaction_security_items table does not exist, skipping...\n');
      } else {
        throw error;
      }
    }

    // Verify the changes
    console.log('5️⃣  Verifying migration...');
    const result = await prisma.$queryRawUnsafe(`
      SELECT 
        table_name, 
        column_name, 
        data_type 
      FROM information_schema.columns 
      WHERE column_name = 'cylinderType' 
      ORDER BY table_name;
    `);
    
    console.log('\n📊 Migration Results:');
    console.table(result);
    
    console.log('\n✅ Migration completed successfully!');
    console.log('🔄 Please restart your dev server to use the updated schema.\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
applyMigration()
  .then(() => {
    console.log('✨ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });

