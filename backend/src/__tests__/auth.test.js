import request from 'supertest';
import bcrypt from 'bcryptjs';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import app from '../server.js';
import { getPool, closePool } from '../config/database.js';
import * as schema from '../models/schema.js';
import { eq } from 'drizzle-orm';
import { getDb } from '../config/database.js';

describe('Auth Routes', () => {
  let server;
  const db = getDb();

  beforeAll(async () => {
    server = app.listen(0);
    // Create test user
    const passwordHash = await bcrypt.hash('TestPass123!', 12);
    await db.insert(schema.users).values({
      email: 'test@example.com',
      passwordHash,
      fullName: 'Test User',
      role: 'staff',
      isActive: true,
    }).onConflictDoNothing();
  });

  afterAll(async () => {
    // Clean up test user
    await db.delete(schema.users).where(eq(schema.users.email, 'test@example.com'));
    await closePool();
    if (server) await new Promise((resolve) => server.close(resolve));
  });

  describe('POST /auth/login', () => {
    it('should return 401 for invalid credentials', async () => {
      const response = await request(server)
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com', password: 'wrongpassword' });
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should return tokens for valid credentials', async () => {
      const response = await request(server)
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com', password: 'TestPass123!' });
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.user).toHaveProperty('email', 'test@example.com');
    });

    it('should return 400 for missing email', async () => {
      const response = await request(server)
        .post('/api/v1/auth/login')
        .send({ password: 'TestPass123!' });
      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /auth/refresh', () => {
    it('should return new tokens with valid refresh token', async () => {
      const login = await request(server)
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com', password: 'TestPass123!' });

      const response = await request(server)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: login.body.data.refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(server)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid-token' });
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });
  });

  describe('GET /auth/me', () => {
    it('should return user info with valid token', async () => {
      const login = await request(server)
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com', password: 'TestPass123!' });

      const response = await request(server)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${login.body.data.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('email', 'test@example.com');
    });

    it('should reject request without token', async () => {
      const response = await request(server).get('/api/v1/auth/me');
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });
});