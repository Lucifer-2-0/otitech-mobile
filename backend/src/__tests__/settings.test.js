import request from 'supertest';
import bcrypt from 'bcryptjs';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import app from '../server.js';
import { getPool, closePool } from '../config/database.js';
import * as schema from '../models/schema.js';
import { eq } from 'drizzle-orm';
import { getDb } from '../config/database.js';

describe('Settings Routes', () => {
  let server;
  let adminToken;
  const db = getDb();

  beforeAll(async () => {
    server = app.listen(0);

    const adminPassword = await bcrypt.hash('AdminPass123!', 12);
    await db.insert(schema.users).values({
      email: 'admin4@test.com',
      passwordHash: adminPassword,
      fullName: 'Admin User 4',
      role: 'admin',
      isActive: true,
    }).onConflictDoNothing();

    const adminLogin = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: 'admin4@test.com', password: 'AdminPass123!' });
    adminToken = adminLogin.body.data.accessToken;
  });

  afterAll(async () => {
    await db.delete(schema.users).where(eq(schema.users.email, 'admin4@test.com'));
    await closePool();
    if (server) await new Promise((resolve) => server.close(resolve));
  });

  describe('GET /settings (admin)', () => {
    it('should return all settings', async () => {
      const response = await request(server)
        .get('/api/v1/settings')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /settings/public (public)', () => {
    it('should return public settings', async () => {
      const response = await request(server)
        .get('/api/v1/settings/public?keys=whatsapp_number,company_phone');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('PATCH /settings/:key (admin)', () => {
    it('should update setting as admin', async () => {
      const response = await request(server)
        .patch('/api/v1/settings/test_setting')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ value: 'updated value', description: 'Test description' });

      expect([200, 404]).toContain(response.status);
    });
  });
});