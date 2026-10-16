import request from 'supertest';
import bcrypt from 'bcryptjs';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import app from '../server.js';
import { getPool, closePool } from '../config/database.js';
import * as schema from '../models/schema.js';
import { eq } from 'drizzle-orm';
import { getDb } from '../config/database.js';

describe('Projects Routes', () => {
  let server;
  let adminToken;
  const db = getDb();

  beforeAll(async () => {
    server = app.listen(0);

    const adminPassword = await bcrypt.hash('AdminPass123!', 12);
    await db.insert(schema.users).values({
      email: 'admin2@test.com',
      passwordHash: adminPassword,
      fullName: 'Admin User 2',
      role: 'admin',
      isActive: true,
    }).onConflictDoNothing();

    const adminLogin = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: 'admin2@test.com', password: 'AdminPass123!' });
    adminToken = adminLogin.body.data.accessToken;
  });

  afterAll(async () => {
    await db.delete(schema.users).where(eq(schema.users.email, 'admin2@test.com'));
    await closePool();
    if (server) await new Promise((resolve) => server.close(resolve));
  });

  describe('GET /projects', () => {
    it('should return projects list', async () => {
      const response = await request(server).get('/api/v1/projects');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
    });

    it('should filter by category', async () => {
      const response = await request(server).get('/api/v1/projects?category=residential');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /projects (admin)', () => {
    it('should create project as admin', async () => {
      const response = await request(server)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          slug: 'test-project-' + Date.now(),
          title: 'Test Project',
          category: 'residential',
          status: 'planning',
          location: 'Project Location',
          year: '2024',
          size: '200 sqm',
          value: 5000000,
          description: 'Project description',
          highlights: ['Highlight 1'],
          services: ['building_design'],
          isPublished: false,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
    });
  });
});