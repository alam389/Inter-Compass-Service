import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getPool } from './connection.js';
import { logger } from '../lib/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigrations() {
  const pool = getPool();
  
  try {
    // Read migration files
    const migrationFiles = [
      '001_create_documents_table.sql',
      '002_create_document_chunks_table.sql',
      '003_create_chat_sessions_table.sql'
    ];

    for (const file of migrationFiles) {
      const migrationPath = join(__dirname, 'migrations', file);
      const migrationSQL = readFileSync(migrationPath, 'utf8');
      
      logger.info(`Running migration: ${file}`);
      await pool.query(migrationSQL);
      logger.info(`✅ Migration completed: ${file}`);
    }

    logger.info('🎉 All migrations completed successfully');
  } catch (error) {
    logger.error({ error }, '❌ Migration failed');
    throw error;
  }
}

// Run migrations if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { runMigrations };
