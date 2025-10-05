/**
 * Migration runner script
 * Runs SQL migrations from the src/db/migrations folder
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

// Database configuration
const connectionString = `postgresql://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}/${process.env.PGDATABASE}?sslmode=require`;

const pool = new Pool({
  connectionString: connectionString,
  ssl: {
    require: true,
    rejectUnauthorized: false
  }
});

async function runMigrations() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting database migrations...\n');
    
    const migrationsDir = path.join(__dirname, 'src', 'db', 'migrations');
    const files = fs.readdirSync(migrationsDir).sort();
    
    for (const file of files) {
      if (file.endsWith('.sql')) {
        console.log(`📄 Running migration: ${file}`);
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf-8');
        
        try {
          await client.query(sql);
          console.log(`✅ Completed: ${file}\n`);
        } catch (error) {
          console.error(`❌ Error in ${file}:`, error.message);
          // Continue with other migrations even if one fails
          // (some statements might already exist)
        }
      }
    }
    
    console.log('✅ All migrations completed!\n');
    
    // Verify the view was created
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public' 
      AND table_name = 'documents_with_stats'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Verified: documents_with_stats view exists');
    } else {
      console.log('⚠️  Warning: documents_with_stats view not found');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migrations
runMigrations().catch(console.error);
