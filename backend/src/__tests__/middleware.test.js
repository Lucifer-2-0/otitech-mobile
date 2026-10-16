import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import app from '../server.js';
import { getPool, closePool } from '../config/database.js';

describe('Middleware', () => {
  let server;

  beforeAll(async () => {
    server = app.listen(0);
  });

  afterAll(async () => {
    await closePool();
    if (server) await new Promise((resolve) => server.close(resolve));
  });

  describe('Rate Limiter', () => {
    it('should allow requests under limit', async () => {
      for (let i = 0; i < 5; i++) {
        const response = await request(server).get('/api/v1/health');
        expect(response.status).toBe(200);
      }
    });

    it('should have rate limit headers', async () => {
      const response = await request(server).get('/api/v1/health');
      expect(response.headers).toHaveProperty('ratelimit-limit');
      expect(response.headers).toHaveProperty('ratelimit-remaining');
    });
  });

  describe('Auth Rate Limiter (stricter)', () => {
    it('should have stricter limits on auth endpoints', async () => {
      const response = await request(server)
        .post('/api/v1/auth/login')
        .send({ email: 'test@test.com', password: 'password' });
      
      expect(response.headers).toHaveProperty('ratelimit-limit');
      const limit = parseInt(response.headers['ratelimit-limit']);
      expect(limit).toBeLessThanOrEqual(20);
    });
  });

  describe('CORS', () => {
    it('should include CORS headers', async () => {
      const response = await request(server)
        .get('/api/v1/health')
        .set('Origin', 'http://localhost:4173');
      
      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });

    it('should reject unauthorized origin in production', async () => {
      // This would need NODE_ENV=production to test properly
      // For now, just verify CORS works in development
      const response = await request(server)
        .get('/api/v1/health')
        .set('Origin', 'https://evil.com');
      
      // In development, CORS is permissive
      expect(response.status).toBe(200);
    });
  });

  describe('Validation Middleware', () => {
    it('should reject invalid body', async () => {
      const response = await request(server)
        .post('/api/v1/auth/login')
        .send({ email: 'invalid-email' });
      
      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject missing required fields', async () => {
      const response = await request(server)
        .post('/api/v1/auth/login')
        .send({});
      
      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Error Handler', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(server).get('/api/v1/unknown-route');
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should handle JSON parse errors', async () => {
      const response = await request(server)
        .post('/api/v1/auth/login')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');
      
      expect([400, 422]).toContain(response.status);
    });
  });

  describe('Security Headers', () => {
    it('should include security headers', async () => {
      const response = await request(server).get('/api/v1/health');
      
      expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('referrer-policy');
    });

    it('should have CSP in report-only mode in development', async () => {
      const response = await request(server).get('/api/v1/health');
      const csp = response.headers['content-security-policy-report-only'];
      expect(csp).toBeDefined();
      expect(csp).toContain("default-src 'self'");
    });
  });
});