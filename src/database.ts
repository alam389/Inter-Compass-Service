import dotenv from 'dotenv';
import { Pool, PoolClient } from 'pg';

// Load environment variables FIRST
dotenv.config();

// Fallback to hardcoded values if env vars are not loaded
if (!process.env.PGHOST) {
  console.log('⚠️ Environment variables not loaded from .env, using hardcoded values');
  process.env.PGHOST = 'ep-icy-cake-adlg1pak-pooler.c-2.us-east-1.aws.neon.tech';
  process.env.PGDATABASE = 'neondb';
  process.env.PGUSER = 'neondb_owner';
  process.env.PGPASSWORD = 'npg_V0ks7LPqizvX';
  process.env.PGSSLMODE = 'require';
}

// Debug environment variables
console.log('🔍 Environment variables loaded:');
console.log('PGHOST:', process.env.PGHOST);
console.log('PGDATABASE:', process.env.PGDATABASE);
console.log('PGUSER:', process.env.PGUSER);
console.log('PGPASSWORD:', process.env.PGPASSWORD ? '***' : 'undefined');
console.log('PGSSLMODE:', process.env.PGSSLMODE);

// Database configuration - using connection string for better compatibility
const connectionString = `postgresql://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}/${process.env.PGDATABASE}?sslmode=require`;

const dbConfig = {
  connectionString: connectionString,
  ssl: {
    require: true,
    rejectUnauthorized: false
  },
  // Connection pool settings
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
};

// Create connection pool
const pool = new Pool(dbConfig);

// Database connection class
export class Database {
  private static instance: Database;
  private pool: Pool;

  private constructor() {
    this.pool = pool;
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  // Get a client from the pool
  public async getClient(): Promise<PoolClient> {
    try {
      const client = await this.pool.connect();
      return client;
    } catch (error) {
      console.error('Error getting database client:', error);
      throw error;
    }
  }

  // Execute a query
  public async query(text: string, params?: any[]): Promise<any> {
    const client = await this.getClient();
    try {
      const result = await client.query(text, params);
      return result;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Test database connection
  public async testConnection(): Promise<boolean> {
    try {
      console.log('🔍 Testing database connection...');
      console.log('Host:', process.env.PGHOST);
      console.log('Database:', process.env.PGDATABASE);
      console.log('User:', process.env.PGUSER);
      console.log('SSL Mode:', process.env.PGSSLMODE);
      
      const result = await this.query('SELECT NOW() as current_time');
      console.log('✅ Database connected successfully at:', result.rows[0].current_time);
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: (error as any)?.code,
        detail: (error as any)?.detail
      });
      return false;
    }
  }

  // Close all connections in the pool
  public async close(): Promise<void> {
    try {
      await this.pool.end();
      console.log('Database pool closed');
    } catch (error) {
      console.error('Error closing database pool:', error);
      throw error;
    }
  }

  // Get pool statistics
  public getPoolStats() {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount
    };
  }
}

// Export singleton instance
export const db = Database.getInstance();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down database connections...');
  await db.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down database connections...');
  await db.close();
  process.exit(0);
});
