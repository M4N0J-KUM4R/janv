import { Pool } from 'pg';

const connectionString =
  process.env.DATABASE_URL || 'postgres://postgres@localhost:5432/janv_db';

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

const pool =
  global.__pgPool ||
  new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
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
