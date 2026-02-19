import { Pool, QueryResult } from 'pg';
import fs from 'fs';
import path from 'path';

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (url) return url;
  // Fallback: read .env directly (avoids dotenv/cwd issues in npm workspaces)
  const envPath = path.resolve(__dirname, '../../.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    const match = content.match(/DATABASE_URL\s*=\s*(.+)/);
    if (match) return match[1].trim().replace(/^["']|["']$/g, '');
  }
  throw new Error('DATABASE_URL not found. Set it in backend/.env');
}

// Create a connection pool
const pool = new Pool({
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

// Helper function to execute queries
export const query = async <T = unknown>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> => {
  const start = Date.now();
  try {
    const res = await pool.query<T>(text, params);
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
  const client = await pool.connect();
  return client;
};

// Close the pool (useful for graceful shutdown)
export const closePool = async () => {
  await pool.end();
};

export default pool;
