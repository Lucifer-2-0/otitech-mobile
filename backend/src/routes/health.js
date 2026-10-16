import { Router } from 'express';
import { testConnection, getPool } from '../config/database.js';

const router = Router();

router.get('/', async (req, res) => {
  const dbConnected = await testConnection();

  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: dbConnected ? 'connected' : 'disconnected',
    version: '1.0.0',
  });
});

router.get('/ready', async (req, res) => {
  const dbConnected = await testConnection();

  if (!dbConnected) {
    return res.status(503).json({
      success: false,
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
    });
  }

  res.json({
    success: true,
    status: 'ready',
    timestamp: new Date().toISOString(),
  });
});

router.get('/live', (req, res) => {
  res.json({
    success: true,
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
});

export const healthRoutes = router;