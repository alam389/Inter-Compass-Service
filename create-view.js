/**
 * Create documents_with_stats view
 * This is a minimal migration to fix the immediate error
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

async function createView() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Creating documents_with_stats view...\n');
    
    // Drop the view if it exists (in case of partial creation)
    await client.query(`DROP VIEW IF EXISTS documents_with_stats`);
    
    // Create the view with only the columns that exist
    await client.query(`
      CREATE VIEW documents_with_stats AS
      SELECT 
        d.documentid,
        d.documenttitle,
        d.tagid,
        d.uploadedat,
        d.documentcontent,
        COUNT(dc.chunkid) as chunk_count,
        t.tagtype
      FROM documents d
      LEFT JOIN document_chunks dc ON d.documentid = dc.documentid
      LEFT JOIN tags t ON d.tagid = t.tagid
      GROUP BY d.documentid, d.documenttitle, d.tagid, d.uploadedat, d.documentcontent, t.tagtype
    `);
    
    console.log('✅ View created successfully!\n');
    
    // Verify the view was created
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public' 
      AND table_name = 'documents_with_stats'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Verified: documents_with_stats view exists');
      
      // Test the view
      const testResult = await client.query('SELECT COUNT(*) FROM documents_with_stats');
      console.log(`✅ View is queryable. Found ${testResult.rows[0].count} documents`);
    } else {
      console.log('❌ Error: documents_with_stats view not found after creation');
    }
    
  } catch (error) {
    console.error('❌ Error creating view:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

createView().catch(console.error);
