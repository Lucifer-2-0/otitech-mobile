import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import app from '../server.js';
import { getPool, closePool } from '../config/database.js';
import * as schema from '../models/schema.js';
import { eq } from 'drizzle-orm';
import { getDb } from '../config/database.js';
import config from '../config/index.js';

describe('Auth Middleware', () => {
  let server;
  let adminToken;
  let staffToken;
  let viewerToken;
  const db = getDb();

  beforeAll(async () => {
    server = app.listen(0);

    const password = await bcrypt.hash('TestPass123!', 12);
    
    await db.insert(schema.users).values([
      { email: 'admin.mw@test.com', passwordHash: await bcrypt.hash('Pass123!', 12), fullName: 'Admin MW', role: 'admin', isActive: true },
      { email: 'staff.mw@test.com', passwordHash: await bcrypt.hash('Pass123!', 12), fullName: 'Staff MW', role: 'staff', isActive: true },
      { email: 'viewer.mw@test.com', passwordHash: await bcrypt.hash('Pass123!', 12), fullName: 'Viewer MW', role: 'viewer', isActive: true },
    ]).onConflictDoNothing();

    const adminLogin = await request(server).post('/api/v1/auth/login').send({ email: 'admin.mw@test.com', password: 'TestPass123!' });
    adminToken = adminLogin.body.data.accessToken;

    const staffLogin = await request(server).post('/api/v1/auth/login').send({ email: 'staff.mw@test.com', password: 'TestPass123!' });
    staffToken = staffLogin.body.data.accessToken;

    const viewerLogin = await request(server).post('/api/v1/auth/login').send({ email: 'viewer.mw@test.com', password: 'TestPass123!' });
    viewerToken = viewerLogin.body.data.accessToken;
  });

  afterAll(async () => {
    await db.delete(schema.users).where(eq(schema.users.email, 'admin.mw@test.com'));
    await db.delete(schema.users).where(eq(schema.users.email, 'staff.mw@test.com'));
    await db.delete(schema.users).where(eq(schema.users.email, 'viewer.mw@test.com'));
    await closePool();
    if (server) await new Promise((resolve) => server.close(resolve));
  });

  describe('Admin Role', () => {
    it('should allow admin to access admin routes', async () => {
      const response = await request(server)
        .get('/api/v1/admin/summary')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response.status).toBe(200);
    });

    it('should allow admin to create properties', async () => {
      const response = await request(server)
        .post('/api/v1/properties')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          slug: 'admin-create-' + Date.now(),
          title: 'Admin Property',
          type: 'land',
          purpose: 'sale',
          status: 'available',
          location: 'Admin Location',
        });
      expect(response.status).toBe(201);
    });

    it('should allow admin to delete properties', async () => {
      const create = await request(server)
        .post('/api/v1/properties')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ slug: 'admin-delete-' + Date.now(), title: 'Delete Me', type: 'land', purpose: 'sale', status: 'available', location: 'Loc' });
      
      const response = await request(server)
        .delete(`/api/v1/properties/${create.body.data.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response.status).toBe(200);
    });
  });

  describe('Staff Role', () => {
    it('should allow staff to create properties', async () => {
      const response = await request(server)
        .post('/api/v1/properties')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          slug: 'staff-create-' + Date.now(),
          title: 'Staff Property',
          type: 'house',
          purpose: 'rent',
          status: 'available',
          location: 'Staff Location',
        });
      expect(response.status).toBe(201);
    });

    it('should deny staff from deleting properties', async () => {
      const create = await request(server)
        .post('/api/v1/properties')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ slug: 'staff-delete-test-' + Date.now(), title: 'Staff Delete Test', type: 'land', purpose: 'sale', status: 'available', location: 'Loc' });
      
      const response = await request(server)
        .delete(`/api/v1/properties/${create.body.data.id}`)
        .set('Authorization', `Bearer ${staffToken}`);
      expect(response.status).toBe(403);
    });
  });

  describe('Viewer Role', () => {
    it('should allow viewer to read properties', async () => {
      const response = await request(server)
        .get('/api/v1/properties')
        .set('Authorization', `Bearer ${viewerToken}`);
      expect(response.status).toBe(200);
    });

    it('should deny viewer from creating properties', async () => {
      const response = await request(server)
        .post('/api/v1/properties')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ slug: 'viewer-test-' + Date.now(), title: 'Viewer Test', type: 'land', purpose: 'sale', status: 'available', location: 'Loc' });
      expect(response.status).toBe(403);
    });

    it('should deny viewer from admin summary', async () => {
      const response = await request(server)
        .get('/api/v1/admin/summary')
        .set('Authorization', `Bearer ${viewerToken}`);
      expect(response.status).toBe(403);
    });
  });

  describe('Token Validation', () => {
    it('should reject expired token', async () => {
      const expiredToken = jwt.sign(
        { id: 999, email: 'expired@test.com', role: 'admin' },
        config.jwt.secret,
        { expiresIn: '-1h' }
      );

      const response = await request(server)
        .get('/api/v1/properties')
        .set('Authorization', `Bearer ${expiredToken}`);
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('TOKEN_EXPIRED');
    });

    it('should reject malformed token', async () => {
      const response = await request(server)
        .get('/api/v1/properties')
        .set('Authorization', 'Bearer not-a-valid-token');
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });

    it('should reject token with wrong signature', async () => {
      const badToken = jwt.sign(
        { id: 1, email: 'test@test.com', role: 'admin' },
        'wrong-secret',
        { expiresIn: '1h' }
      );

      const response = await request(server)
        .get('/api/v1/properties')
        .set('Authorization', `Bearer ${badToken}`);
      expect(response.status).toBe(401);
    });
  });
});