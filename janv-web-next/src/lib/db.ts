import { Pool } from 'pg';

const connectionString =
  process.env.DATABASE_URL || 'postgres://postgres@localhost:5432/janv_db';

const isSsl =
  connectionString.includes('rds.amazonaws.com') ||
  connectionString.includes('sslmode=') ||
  connectionString.includes('ssl=true');

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

const pool =
  global.__pgPool ||
  new Pool({
    connectionString,
    ssl: isSsl ? { rejectUnauthorized: false } : undefined,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

if (process.env.NODE_ENV !== 'production') {
  global.__pgPool = pool;
}

export default pool;

export async function query<T = unknown>(text: string, params?: unknown[]): Promise<T[]> {
  try {
    const res = await pool.query(text, params);
    return res.rows as T[];
  } catch (err) {
    console.error('Database query error:', err, 'Query:', text);
    throw err;
  }
}
