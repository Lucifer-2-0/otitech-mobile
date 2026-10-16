import { Registry, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';
import config from '../config/index.js';

const register = new Registry();

// Add default metrics (CPU, memory, etc.)
collectDefaultMetrics({ register, prefix: 'node_' });

// Custom metrics
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request latency in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register],
});

export const dbQueryDuration = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'Database query latency in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
  registers: [register],
});

export const dbPoolGauge = new Gauge({
  name: 'db_pool_connections',
  help: 'Database pool connections',
  labelNames: ['state'], // idle, active, total
  registers: [register],
});

export const activeUsersGauge = new Gauge({
  name: 'active_users',
  help: 'Number of active users (sessions)',
  registers: [register],
});

export const enquiriesTotal = new Counter({
  name: 'enquiries_total',
  help: 'Total number of enquiries received',
  labelNames: ['service', 'status'],
  registers: [register],
});

export const propertiesTotal = new Gauge({
  name: 'properties_total',
  help: 'Total properties',
  labelNames: ['status', 'published'],
  registers: [register],
});

export const projectsTotal = new Gauge({
  name: 'projects_total',
  help: 'Total projects',
  labelNames: ['status', 'published'],
  registers: [register],
});

export const emailSentTotal = new Counter({
  name: 'email_sent_total',
  help: 'Total emails sent',
  labelNames: ['type', 'status'],
  registers: [register],
});

export const rateLimitHitsTotal = new Counter({
  name: 'rate_limit_hits_total',
  help: 'Total rate limit hits',
  labelNames: ['endpoint'],
  registers: [register],
});

export const authAttemptsTotal = new Counter({
  name: 'auth_attempts_total',
  help: 'Total authentication attempts',
  labelNames: ['result'], // success, failure
  registers: [register],
});

export const metricsMiddleware = (req, res, next) => {
  const start = Date.now();
  const route = req.route?.path || req.path;

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const statusCode = res.statusCode;

    httpRequestsTotal.inc({ method: req.method, route, status_code: statusCode });
    httpRequestDuration.observe({ method: req.method, route, status_code: statusCode }, duration);

    if (req.path.startsWith('/api/v1/auth/')) {
      authAttemptsTotal.inc({ result: statusCode < 400 ? 'success' : 'failure' });
    }

    if (statusCode === 429) {
      rateLimitHitsTotal.inc({ endpoint: route });
    }
  });

  next();
};

export const getMetrics = async () => {
  return register.metrics();
};

export const getContentType = () => register.contentType;

export default {
  register,
  metricsMiddleware,
  getMetrics,
  getContentType,
  httpRequestsTotal,
  httpRequestDuration,
  dbQueryDuration,
  dbPoolGauge,
  activeUsersGauge,
  enquiriesTotal,
  propertiesTotal,
  projectsTotal,
  emailSentTotal,
  rateLimitHitsTotal,
  authAttemptsTotal,
};