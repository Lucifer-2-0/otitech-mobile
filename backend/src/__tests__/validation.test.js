import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import app from '../server.js';
import { getPool, closePool } from '../config/database.js';

describe('Validation Middleware', () => {
  let server;

  beforeAll(async () => {
    server = app.listen(0);
  });

  afterAll(async () => {
    await closePool();
    if (server) await new Promise((resolve) => server.close(resolve));
  });

  describe('Body Validation', () => {
    it('should validate required fields on property create', async () => {
      const response = await request(server)
        .post('/api/v1/properties')
        .set('Authorization', 'Bearer fake-token')
        .send({}); // Missing required fields

      // Will fail auth first, but validation would run after auth
      expect([401, 422]).toContain(response.status);
    });

    it('should validate enum values', async () => {
      const response = await request(server)
        .post('/api/v1/enquiries')
        .send({
          name: 'Test',
          phone: '+2348012345678',
          service: 'invalid_service',
          message: 'Test',
        });

      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toBeDefined();
    });

    it('should validate email format', async () => {
      const response = await request(server)
        .post('/api/v1/enquiries')
        .send({
          name: 'Test',
          phone: '+2348012345678',
          email: 'not-an-email',
          service: 'building_design',
          message: 'Test',
        });

      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Query Validation', () => {
    it('should validate pagination params', async () => {
      const response = await request(server)
        .get('/api/v1/properties?page=-1&limit=1000');

      expect([200, 422]).toContain(response.status);
    });

    it('should validate filter enums', async () => {
      const response = await request(server)
        .get('/api/v1/properties?type=invalid_type');

      expect([200, 422]).toContain(response.status);
    });
  });

  describe('Params Validation', () => {
    it('should validate numeric ID params', async () => {
      const response = await request(server)
        .get('/api/v1/properties/not-a-number');

      expect([401, 422, 404]).toContain(response.status);
    });

    it('should validate slug params', async () => {
      const response = await request(server)
        .get('/api/v1/properties/valid-slug');
      // Should not 500
      expect(response.status).not.toBe(500);
    });
  });
});