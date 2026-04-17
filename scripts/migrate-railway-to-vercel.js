const { Client } = require('pg');

// ==========================================================
// CONFIGURATION
// ==========================================================
const sourceUrl = 'postgresql://postgres:GXVmszfYSGHHeJfAawREEEJEannRGhmO@caboose.proxy.rlwy.net:22256/railway';
const targetUrl = 'postgres://5ad26fbc8db728818d5e855560652e39e0c5f6f4a86e76a5b7c2a5b8a9e1aabe:sk_9tzrAXrhsMBhEA5w0vXAU@db.prisma.io:5432/postgres?sslmode=require'; 

async function migrateData() {
  if (targetUrl === 'YOUR_VERCEL_POSTGRES_PRISMA_URL_HERE') {
    console.error('❌ Error: Please provide the Vercel connection string in the script.');
    process.exit(1);
  }

  const sourceClient = new Client({ connectionString: sourceUrl });
  const targetClient = new Client({ connectionString: targetUrl });

  try {
    console.log('🔗 Connecting to databases...');
    await sourceClient.connect();
    await targetClient.connect();
    console.log('✅ Connected.');

    // 1. Get all user tables in public schema
    const tablesRes = await sourceClient.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name NOT LIKE '_prisma_migrations';
    `);

    const tables = tablesRes.rows.map(r => r.table_name);
    console.log(`📊 Found ${tables.length} tables to migrate: ${tables.join(', ')}`);

    // Disable triggers (to avoid foreign key constraints during migration)
    await targetClient.query('SET session_replication_role = "replica";');

    for (const table of tables) {
      console.log(`🚚 Migrating table: ${table}...`);
      
      // Clear target table
      await targetClient.query(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE;`);

      // Fetch data from source
      const dataRes = await sourceClient.query(`SELECT * FROM "${table}"`);
      
      if (dataRes.rows.length === 0) {
        console.log(`   - Skipping (empty)`);
        continue;
      }

      // Prepare bulk insert
      const columns = Object.keys(dataRes.rows[0]).map(c => `"${c}"`).join(', ');
      const values = dataRes.rows.map((row, i) => {
        const rowValues = Object.values(row).map((val, j) => `$${i * Object.keys(row).length + j + 1}`);
        return `(${rowValues.join(', ')})`;
      }).join(', ');

      const flattenedValues = dataRes.rows.flatMap(row => Object.values(row));

      const query = `INSERT INTO "${table}" (${columns}) VALUES ${values}`;
      await targetClient.query(query, flattenedValues);
      
      console.log(`   - Migrated ${dataRes.rows.length} rows.`);
    }

    // Re-enable triggers
    await targetClient.query('SET session_replication_role = "origin";');
    
    console.log('\n🎉 ALL DATA MIGRATED SUCCESSFULLY!');
    
  } catch (err) {
    console.error('\n❌ MIGRATION FAILED:', err);
    // Ensure triggers are back to origin even on failure
    try { await targetClient.query('SET session_replication_role = "origin";'); } catch(e) {}
  } finally {
    await sourceClient.end();
    await targetClient.end();
  }
}

migrateData();
