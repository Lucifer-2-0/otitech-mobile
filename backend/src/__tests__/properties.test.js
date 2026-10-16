import request from 'supertest';
import bcrypt from 'bcryptjs';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import app from '../server.js';
import { getPool, closePool } from '../config/database.js';
import * as schema from '../models/schema.js';
import { eq } from 'drizzle-orm';
import { getDb } from '../config/database.js';

describe('Properties Routes', () => {
  let server;
  let adminToken;
  let staffToken;
  const db = getDb();

  beforeAll(async () => {
    server = app.listen(0);

    // Create admin user
    const adminPassword = await bcrypt.hash('AdminPass123!', 12);
    await db.insert(schema.users).values({
      email: 'admin@test.com',
      passwordHash: adminPassword,
      fullName: 'Admin User',
      role: 'admin',
      isActive: true,
    }).onConflictDoNothing();

    // Create staff user
    const staffPassword = await bcrypt.hash('StaffPass123!', 12);
    await db.insert(schema.users).values({
      email: 'staff@test.com',
      passwordHash: staffPassword,
      fullName: 'Staff User',
      role: 'staff',
      isActive: true,
    }).onConflictDoNothing();

    // Login as admin
    const adminLogin = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@test.com', password: 'AdminPass123!' });
    adminToken = adminLogin.body.data.accessToken;

    // Login as staff
    const staffLogin = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: 'staff@test.com', password: 'StaffPass123!' });
    staffToken = staffLogin.body.data.accessToken;
  });

  afterAll(async () => {
    await db.delete(schema.users).where(eq(schema.users.email, 'admin@test.com'));
    await db.delete(schema.users).where(eq(schema.users.email, 'staff@test.com'));
    await closePool();
    if (server) await new Promise((resolve) => server.close(resolve));
  });

  describe('GET /properties', () => {
    it('should return properties list', async () => {
      const response = await request(server).get('/api/v1/properties');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
    });

    it('should filter by type', async () => {
      const response = await request(server).get('/api/v1/properties?type=land');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should paginate results', async () => {
      const response = await request(server).get('/api/v1/properties?page=1&limit=5');
      expect(response.status).toBe(200);
      expect(response.body.pagination.limit).toBe(5);
    });
  });

  describe('POST /properties (admin)', () => {
    it('should create property as admin', async () => {
      const response = await request(server)
        .post('/api/v1/properties')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          slug: 'test-property-' + Date.now(),
          title: 'Test Property',
          type: 'house',
          purpose: 'sale',
          status: 'available',
          location: 'Test Location',
          size: '100 sqm',
          price: 1000000,
          priceLabel: '₦1M',
          description: 'Test description',
          features: ['Feature 1', 'Feature 2'],
          isPublished: false,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.title).toBe('Test Property');
    });

    it('should reject unauthenticated request', async () => {
      const response = await request(server)
        .post('/api/v1/properties')
        .send({ slug: 'test', title: 'Test', type: 'land', purpose: 'sale', status: 'available', location: 'Loc' });
      expect(response.status).toBe(401);
    });
  });

  describe('PATCH /properties/:id (staff)', () => {
    it('should update property as staff', async () => {
      // Create property first
      const create = await request(server)
        .post('/api/v1/properties')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          slug: 'test-update-' + Date.now(),
          title: 'Update Test',
          type: 'land',
          purpose: 'sale',
          status: 'available',
          location: 'Update Location',
        });

      const response = await request(server)
        .patch(`/api/v1/properties/${create.body.data.id}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ title: 'Updated Title', price: 2000000 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Updated Title');
    });
  });
});