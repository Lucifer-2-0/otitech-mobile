import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import config from '../config/index.js';
import * as schema from '../models/schema.js';
import logger from './logger.js';

const { Pool } = pg;

let pool = null;
let db = null;

export const getPool = () => {
  if (!pool) {
    const isSupabase = config.db.url && config.db.url.includes('supabase.co');
    const isNeon = config.db.url && config.db.url.includes('neon.tech');
    pool = new Pool({
      ...(config.db.url ? { connectionString: config.db.url } : {
        host: config.db.host,
        port: config.db.port,
        database: config.db.name,
        user: config.db.user,
        password: config.db.password,
      }),
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: isSupabase ? 30000 : isNeon ? 60000 : 5000,
      // Supabase requires SSL
      ssl: isSupabase ? { rejectUnauthorized: false } : false,
    });

    pool.on('error', (err) => {
      logger.error({ err }, 'Unexpected pool error');
    });
  }
  return pool;
};

export const getDb = () => {
  if (!db) {
    db = drizzle(getPool(), { schema });
  }
  return db;
};

export const closePool = async () => {
  if (pool) {
    await pool.end();
    pool = null;
    db = null;
  }
};

export const testConnection = async () => {
  try {
    const client = await getPool().connect();
    client.release();
    logger.info('Database connection successful');
    return true;
  } catch (err) {
    logger.error({ err }, 'Database connection failed');
    return false;
  }
};

export default { getPool, getDb, closePool, testConnection };
