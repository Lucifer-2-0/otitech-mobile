import request from 'supertest';
import bcrypt from 'bcryptjs';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import app from '../server.js';
import { getPool, closePool } from '../config/database.js';
import * as schema from '../models/schema.js';
import { eq } from 'drizzle-orm';
import { getDb } from '../config/database.js';

describe('Enquiries Routes', () => {
  let server;
  let adminToken;
  const db = getDb();

  beforeAll(async () => {
    server = app.listen(0);

    const adminPassword = await bcrypt.hash('AdminPass123!', 12);
    await db.insert(schema.users).values({
      email: 'admin3@test.com',
      passwordHash: adminPassword,
      fullName: 'Admin User 3',
      role: 'admin',
      isActive: true,
    }).onConflictDoNothing();

    const adminLogin = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: 'admin3@test.com', password: 'AdminPass123!' });
    adminToken = adminLogin.body.data.accessToken;
  });

  afterAll(async () => {
    await db.delete(schema.users).where(eq(schema.users.email, 'admin3@test.com'));
    await closePool();
    if (server) await new Promise((resolve) => server.close(resolve));
  });

  describe('POST /enquiries (public)', () => {
    it('should create enquiry without auth', async () => {
      const response = await request(server)
        .post('/api/v1/enquiries')
        .send({
          name: 'John Doe',
          phone: '+2348012345678',
          email: 'john@example.com',
          service: 'building_design',
          message: 'I need a design for my house',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe('John Doe');
    });

    it('should reject invalid service', async () => {
      const response = await request(server)
        .post('/api/v1/enquiries')
        .send({
          name: 'Jane Doe',
          phone: '+2348012345679',
          service: 'invalid_service',
          message: 'Test message',
        });

      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /enquiries (admin)', () => {
    it('should return enquiries list for admin', async () => {
      const response = await request(server)
        .get('/api/v1/enquiries')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
    });

    it('should filter by status', async () => {
      const response = await request(server)
        .get('/api/v1/enquiries?status=new')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});