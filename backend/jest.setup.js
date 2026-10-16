import { config } from 'dotenv';
config({ path: '.env.test' });

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-testing-only-32chars';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-testing-only-32chars';
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/otitech_test';
process.env.LOG_LEVEL = 'silent';