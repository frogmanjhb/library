import { Pool, QueryResult, QueryResultRow } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load .env file if not already loaded (for cases where db.ts is imported before server.ts)
if (!process.env.DATABASE_URL) {
  const envPath = path.resolve(__dirname, '../../.env');
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}

function getDatabaseUrl(): string {
  // First check if already loaded in process.env
  const url = process.env.DATABASE_URL;
  if (url) return url;
  
  // Try to load .env file if not already loaded
  const envPath = path.resolve(__dirname, '../../.env');
  if (fs.existsSync(envPath)) {
    // Try dotenv first
    dotenv.config({ path: envPath });
    if (process.env.DATABASE_URL) {
      return process.env.DATABASE_URL;
    }
    
    // Fallback: read .env directly (handles encoding issues)
    try {
      // Try UTF-8 first
      let content = fs.readFileSync(envPath, 'utf-8');
      // Remove BOM if present
      if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
      }
      // Try UTF-16 if UTF-8 doesn't work
      if (!content.includes('DATABASE_URL')) {
        content = fs.readFileSync(envPath, 'utf16le');
      }
      const match = content.match(/DATABASE_URL\s*=\s*(.+)/);
      if (match) {
        const dbUrl = match[1].trim().replace(/^["']|["']$/g, '').replace(/\r?\n$/, '');
        if (dbUrl) return dbUrl;
      }
    } catch (err) {
      console.error('Error reading .env file:', err);
    }
  }
  throw new Error('DATABASE_URL not found. Set it in backend/.env');
}

// Create a connection pool (lazy initialization)
let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: getDatabaseUrl(),
      // Connection pool settings
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
    });

    // Handle pool errors
    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
      process.exit(-1);
    });
  }
  return pool;
}

// Helper function to execute queries
export const query = async <T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> => {
  const start = Date.now();
  try {
    const res = await getPool().query<T>(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log('Executed query', { text, duration, rows: res.rowCount });
    }
    return res;
  } catch (error) {
    console.error('Query error', { text, error });
    throw error;
  }
};

// Helper function to get a client from the pool for transactions
export const getClient = async () => {
  const client = await getPool().connect();
  return client;
};

// Close the pool (useful for graceful shutdown)
export const closePool = async () => {
  if (pool) {
    await pool.end();
    pool = null;
  }
};

export default getPool();
