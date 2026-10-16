import express from 'express';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import helmet from 'helmet';
import cors from 'cors';
import * as Sentry from '@sentry/node';
import config from './config/index.js';
import logger from './config/logger.js';
import { getPool, testConnection } from './config/database.js';
import { requestLogger } from './middleware/requestLogger.js';
import { rateLimiter, authRateLimiter, mediaUploadRateLimiter, adminWriteRateLimiter, bruteForceProtection, resetLoginAttempts } from './middleware/rateLimiter.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { healthRoutes } from './routes/health.js';
import { propertyRoutes } from './routes/properties.js';
import { projectRoutes } from './routes/projects.js';
import { enquiryRoutes } from './routes/enquiries.js';
import { authRoutes } from './routes/auth.js';
import { settingsRoutes } from './routes/settings.js';
import { adminRoutes } from './routes/admin.js';
import { mediaRoutes } from './routes/media.js';
import { usersAdminRoutes } from './routes/users-admin.js';
import { metricsMiddleware, getMetrics, getContentType } from './middleware/metrics.js';

// Initialize Sentry as early as possible
if (config.sentry.dsn) {
  Sentry.init({
    dsn: config.sentry.dsn,
    environment: config.sentry.environment,
    tracesSampleRate: config.sentry.tracesSampleRate,
    profilesSampleRate: config.sentry.profilesSampleRate,
    integrations: [
      Sentry.httpIntegration(),
      Sentry.expressIntegration(),
      // Sentry.prismaIntegration(), // Disabled for compatibility
      // nodeProfilingIntegration(), // Disabled for Windows compatibility
    ],
    beforeSend(event, hint) {
      if (config.env === 'development') {
        logger.debug({ event: event.exception?.values?.[0]?.value }, 'Sentry event (dev)');
      }
      return event;
    },
  });
}

const app = express();

// Sentry request handler must be first middleware
if (config.sentry.dsn) {
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
}

app.use(helmet({
  contentSecurityPolicy: config.env === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "https:", "data:"],
      connectSrc: ["'self'", config.cors.origin],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: config.env === 'production' ? [] : null,
    },
    reportOnly: config.env !== 'production',
  } : false,
  crossOriginEmbedderPolicy: false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  permissionsPolicy: {
    features: {
      camera: ["'none'"],
      microphone: ["'none'"],
      geolocation: ["'none'"],
      payment: ["'none'"],
    },
  },
  hsts: config.env === 'production' ? {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  } : false,
}));

app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = config.cors.origin;
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(config.upload.dir, { fallthrough: false, maxAge: config.env === 'production' ? '7d' : 0 }));

app.use(requestLogger);
app.use(rateLimiter);
app.use(metricsMiddleware);

app.get('/', (req, res) => {
  res.json({
    name: 'OTI-TECH API',
    version: '1.0.0',
    status: 'running',
    docs: '/api/v1',
  });
});

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', getContentType());
    res.send(await getMetrics());
  } catch (err) {
    res.status(500).send('Error generating metrics');
  }
});

app.use(`${config.apiPrefix}/health`, healthRoutes);
app.use(`${config.apiPrefix}/properties`, propertyRoutes);
app.use(`${config.apiPrefix}/projects`, projectRoutes);
app.use(`${config.apiPrefix}/enquiries`, enquiryRoutes);
app.use(`${config.apiPrefix}/auth`, authRateLimiter, authRoutes);
app.use(`${config.apiPrefix}/settings`, settingsRoutes);
app.use(`${config.apiPrefix}/admin`, adminWriteRateLimiter, adminRoutes);
app.use(`${config.apiPrefix}/admin/users`, adminWriteRateLimiter, usersAdminRoutes);
app.use(`${config.apiPrefix}/media`, mediaUploadRateLimiter, mediaRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

// Sentry error handler must be after all other middleware
if (config.sentry.dsn) {
  app.use(Sentry.Handlers.errorHandler());
}

let server = null;

export const startServer = async () => {
  try {
    const connected = await testConnection();
    if (!connected) {
      logger.warn('Database connection failed, starting without DB');
    }

    server = app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port} in ${config.env} mode`);
      logger.info(`API available at http://localhost:${config.port}${config.apiPrefix}`);
    });

    return server;
  } catch (err) {
    logger.error({ err }, 'Failed to start server');
    throw err;
  }
};

export const stopServer = async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
    logger.info('Server stopped');
  }
  const { closePool } = await import('./config/database.js');
  await closePool();
};

const isMainModule = process.argv[1]
  && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMainModule) {
  startServer().catch((err) => {
    logger.error({ err }, 'Server startup failed');
    process.exit(1);
  });
}

export default app;
