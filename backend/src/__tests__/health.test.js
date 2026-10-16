import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import app from '../server.js';
import { getPool, closePool } from '../config/database.js';

describe('Health Endpoints', () => {
  let server;

  beforeAll(async () => {
    server = app.listen(0);
  });

  afterAll(async () => {
    await closePool();
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('GET /health should return healthy status', async () => {
    const response = await request(server).get('/api/v1/health');
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.status).toBe('healthy');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('uptime');
    expect(response.body).toHaveProperty('database');
  });

  it('GET /health/ready should return ready status', async () => {
    const response = await request(server).get('/api/v1/health/ready');
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.status).toBe('ready');
  });

  it('GET /health/live should return alive status', async () => {
    const response = await request(server).get('/api/v1/health/live');
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.status).toBe('alive');
  });
});