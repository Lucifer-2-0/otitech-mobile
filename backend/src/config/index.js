import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  apiPrefix: process.env.API_PREFIX || '/api/v1',

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    name: process.env.DB_NAME || 'otitech',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    url: process.env.DATABASE_URL,
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  cors: {
    origin: (process.env.CORS_ORIGIN || 'http://localhost:4173,http://127.0.0.1:4173')
      .split(',')
      .map((o) => o.trim()),
  },

  email: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM || 'OTI-TECH <noreply@otitech.com>',
  },

  whatsapp: {
    businessNumber: process.env.WHATSAPP_BUSINESS_NUMBER || '2349017017156',
  },

  upload: {
    dir: path.resolve(backendRoot, process.env.UPLOAD_DIR || '../uploads'),
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 5242880,
  },

  storage: {
    provider: process.env.STORAGE_PROVIDER || 'local', // 'local', 's3', 'cloudinary'
    s3: {
      region: process.env.AWS_REGION || 'us-east-1',
      bucket: process.env.AWS_S3_BUCKET,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      endpoint: process.env.AWS_S3_ENDPOINT, // For Cloudflare R2, etc.
      publicUrl: process.env.AWS_S3_PUBLIC_URL, // Custom domain/CDN URL
    },
    cloudinary: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      apiSecret: process.env.CLOUDINARY_API_SECRET,
    },
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  },

  logLevel: process.env.LOG_LEVEL || 'info',

  sentry: {
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
    profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.1'),
  },
};

if (config.env === 'production') {
  const requiredSecrets = [process.env.JWT_SECRET, process.env.JWT_REFRESH_SECRET];
  if (requiredSecrets.some((secret) => !secret || secret.length < 32)) {
    throw new Error('Production requires JWT_SECRET and JWT_REFRESH_SECRET values of at least 32 characters.');
  }
  const databaseUrlPassword = config.db.url ? new URL(config.db.url).password : '';
  if ((!config.db.url && !process.env.DB_PASSWORD)
      || process.env.DB_PASSWORD === 'postgres'
      || databaseUrlPassword === 'postgres') {
    throw new Error('Production requires a non-default database password or DATABASE_URL.');
  }
}

export default config;
