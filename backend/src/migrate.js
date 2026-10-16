import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPool, getDb, closePool } from './config/database.js';
import logger from './config/logger.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const withRetry = async (fn, maxRetries = 15, baseDelay = 3000) => {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const isConnectionError = error.code === 'ECONNRESET' || 
                                error.code === 'ETIMEDOUT' || 
                                error.message?.includes('Connection terminated') ||
                                error.message?.includes('ECONNRESET');
      
      if (!isConnectionError || attempt === maxRetries) {
        throw error;
      }
      
      const delay = baseDelay * Math.pow(1.5, attempt);
      logger.warn({ attempt: attempt + 1, maxRetries, delay, error: error.message }, 
        `Connection failed, retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }
  throw lastError;
};

export const runMigrations = async () => {
  const db = getDb();
  const pool = getPool();

  try {
    logger.info('Running migrations...');
    
    await withRetry(async () => {
      await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'staff',
        is_active BOOLEAN NOT NULL DEFAULT true,
        last_login_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS properties (
        id SERIAL PRIMARY KEY,
        slug VARCHAR(255) NOT NULL UNIQUE,
        title VARCHAR(255) NOT NULL,
        type VARCHAR(20) NOT NULL,
        purpose VARCHAR(10) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'available',
        location VARCHAR(255) NOT NULL,
        size VARCHAR(100),
        price DECIMAL(14,2),
        price_label VARCHAR(50),
        description TEXT,
        features TEXT[],
        accent VARCHAR(50),
        is_published BOOLEAN NOT NULL DEFAULT false,
        published_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS property_images (
        id SERIAL PRIMARY KEY,
        property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        url VARCHAR(500) NOT NULL,
        alt_text VARCHAR(255),
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_cover BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        slug VARCHAR(255) NOT NULL UNIQUE,
        title VARCHAR(255) NOT NULL,
        category VARCHAR(20) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'planning',
        location VARCHAR(255) NOT NULL,
        year VARCHAR(50),
        size VARCHAR(100),
        value DECIMAL(14,2),
        description TEXT,
        highlights TEXT[],
        services TEXT[],
        accent VARCHAR(50),
        is_published BOOLEAN NOT NULL DEFAULT false,
        published_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS project_images (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        url VARCHAR(500) NOT NULL,
        alt_text VARCHAR(255),
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_cover BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS enquiries (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        email VARCHAR(255),
        service VARCHAR(20) NOT NULL,
        message TEXT NOT NULL,
        property_id INTEGER REFERENCES properties(id) ON DELETE SET NULL,
        project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'new',
        assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
        notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS site_settings (
        id SERIAL PRIMARY KEY,
        key VARCHAR(100) NOT NULL UNIQUE,
        value TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      ALTER TABLE properties
        ADD COLUMN IF NOT EXISTS seller_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS review_status VARCHAR(20) NOT NULL DEFAULT 'approved',
        ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

      UPDATE properties
      SET review_status = 'not_submitted'
      WHERE seller_id IS NULL AND is_published = false AND review_status = 'approved';

      CREATE INDEX IF NOT EXISTS properties_seller_id_idx ON properties(seller_id);
    `);
    
    logger.info('Migrations completed successfully');
  });

  logger.info('Migrations completed successfully');
} catch (err) {
    logger.error({ err }, 'Migration failed');
    throw err;
  } finally {
    await closePool();
  }
};

const isMainModule = process.argv[1]
  && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMainModule) {
  runMigrations().catch((err) => {
    logger.error({ err }, 'Migration script failed');
    process.exit(1);
  });
}

export default runMigrations;
