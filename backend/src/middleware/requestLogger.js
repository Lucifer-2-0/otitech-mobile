import logger from '../config/logger.js';

export const requestLogger = (req, res, next) => {
  const start = Date.now();
  req.logger = logger.child({ reqId: Math.random().toString(36).slice(2) });

  res.on('finish', () => {
    const duration = Date.now() - start;
    req.logger.info(
      { method: req.method, url: req.url, status: res.statusCode, duration },
      `${req.method} ${req.url} ${res.statusCode} ${duration}ms`
    );
  });

  next();
};