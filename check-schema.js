/**
 * Check database schema
 * Verifies the current state of the database tables and views
 */

const { Pool } = require('pg');
require('dotenv').config();

const connectionString = `postgresql://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}/${process.env.PGDATABASE}?sslmode=require`;

const pool = new Pool({
  connectionString: connectionString,
  ssl: {
    require: true,
    rejectUnauthorized: false
  }
});

async function checkSchema() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking database schema...\n');
    
    // Check documents table
    console.log('📋 Documents table columns:');
    const docsColumns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'documents'
      ORDER BY ordinal_position
    `);
    docsColumns.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });
    
    console.log('\n📋 Document_chunks table columns:');
    const chunksColumns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'document_chunks'
      ORDER BY ordinal_position
    `);
    
    if (chunksColumns.rows.length > 0) {
      chunksColumns.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type}`);
      });
    } else {
      console.log('  ⚠️  Table does not exist');
    }
    
    console.log('\n📋 Tags table columns:');
    const tagsColumns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'tags'
      ORDER BY ordinal_position
    `);
    tagsColumns.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });
    
    console.log('\n📋 Existing views:');
    const views = await client.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public'
    `);
    if (views.rows.length > 0) {
      views.rows.forEach(row => {
        console.log(`  - ${row.table_name}`);
      });
    } else {
      console.log('  ⚠️  No views found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkSchema().catch(console.error);
