const { Client } = require('pg');

// ==========================================================
// CONFIGURATION
// ==========================================================
const sourceUrl = 'postgresql://postgres:9535@localhost:5432/lpg_gas_app';
const targetUrl = 'postgres://5ad26fbc8db728818d5e855560652e39e0c5f6f4a86e76a5b7c2a5b8a9e1aabe:sk_9tzrAXrhsMBhEA5w0vXAU@db.prisma.io:5432/postgres?sslmode=require'; 

async function migrateData() {
  // Source is local, target is Vercel
  const sourceClient = new Client({ connectionString: sourceUrl });
  const targetClient = new Client({ 
    connectionString: targetUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔗 Connecting to databases...');
    await sourceClient.connect();
    console.log('✅ Connected to Source (Local).');
    await targetClient.connect();
    console.log('✅ Connected to Target (Vercel).');

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
    console.log('🔓 Temporarily disabling foreign key constraints on target...');
    await targetClient.query('SET session_replication_role = "replica";');

    for (const table of tables) {
      console.log(`🚀 Processing table: "${table}"`);
      
      // Clear target table
      console.log(`   - Clearing target table...`);
      await targetClient.query(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE;`);

      // Fetch data from source
      console.log(`   - Fetching data from source...`);
      const dataRes = await sourceClient.query(`SELECT * FROM "${table}"`);
      
      if (dataRes.rows.length === 0) {
        console.log(`   - Table is empty, skipping.`);
        continue;
      }

      // Prepare bulk insert
      const columns = Object.keys(dataRes.rows[0]);
      const columnNames = columns.map(c => `"${c}"`).join(', ');
      
      // We insert in batches to avoid hitting parameter limits (max 65535 for pg)
      const maxBatchSize = Math.floor(60000 / columns.length);
      let totalMigrated = 0;

      for (let i = 0; i < dataRes.rows.length; i += maxBatchSize) {
        const batch = dataRes.rows.slice(i, i + maxBatchSize);
        const valuePlaceholders = batch.map((row, rowIndex) => {
          const rowPlaceholders = columns.map((_, colIndex) => `$${rowIndex * columns.length + colIndex + 1}`);
          return `(${rowPlaceholders.join(', ')})`;
        }).join(', ');

        const flattenedValues = batch.flatMap(row => columns.map(col => row[col]));
        const query = `INSERT INTO "${table}" (${columnNames}) VALUES ${valuePlaceholders}`;
        
        await targetClient.query(query, flattenedValues);
        totalMigrated += batch.length;
        console.log(`   - Migrated ${totalMigrated}/${dataRes.rows.length} rows...`);
      }
      
      console.log(`   ✅ Successfully migrated ${dataRes.rows.length} rows to "${table}".`);
    }

    // Re-enable triggers
    console.log('🔒 Re-enabling foreign key constraints...');
    await targetClient.query('SET session_replication_role = "origin";');
    
    console.log('\n✨ ALL DATA MIGRATED SUCCESSFULLY FROM LOCAL TO VERCEL! ✨');
    
  } catch (err) {
    console.error('\n❌ MIGRATION FAILED:', err);
    try { 
      console.log('Attempting to restore foreign key constraints...');
      await targetClient.query('SET session_replication_role = "origin";'); 
    } catch(e) {}
  } finally {
    await sourceClient.end();
    await targetClient.end();
  }
}

migrateData();
