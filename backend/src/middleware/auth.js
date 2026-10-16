import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import config from '../config/index.js';
import { AppError } from './errorHandler.js';
import { userModel } from '../models/index.js';

const supabaseJwksClient = jwksClient({
  jwksUri: 'https://kmeqjvhscqjisososezt.supabase.co/auth/v1/.well-known/jwks.json',
  cache: true,
  rateLimit: true,
});

const verifySupabaseToken = (token) => {
  return new Promise((resolve, reject) => {
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || !decoded.header?.kid) {
      return reject(new Error('Invalid token format'));
    }

    jwt.verify(token, (header, callback) => {
      supabaseJwksClient.getSigningKey(header.kid, (err, key) => {
        if (err) return callback(err);
        const signingKey = key?.getPublicKey?.() ?? key?.publicKey;
        callback(null, signingKey);
      });
    }, {
      algorithms: ['ES256', 'RS256'],
      audience: 'authenticated',
      issuer: 'https://kmeqjvhscqjisososezt.supabase.co/auth/v1',
    }, (err, decoded) => {
      if (err) return reject(err);
      resolve(decoded);
    });
  });
};

export const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
  }

  const token = authHeader.split(' ')[1];

  // Try Supabase JWTs using the configured asymmetric signing keys
  try {
    const decoded = await verifySupabaseToken(token);

    // Supabase subjects are UUIDs, while this app's users table uses serial IDs.
    // Resolve the local role/profile by the verified email claim instead.
    const user = decoded.email
      ? await userModel.findByEmail(decoded.email.toLowerCase())
      : null;
    if (user && user.isActive) {
      req.user = { id: user.id, email: user.email, fullName: user.fullName, role: user.role };
      return next();
    }
  } catch (supabaseErr) {
    // Fall through to custom JWT validation
  }

  // Fallback: Custom JWT (HS256)
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    const user = await userModel.findById(decoded.id);
    if (!user || !user.isActive) {
      return next(new AppError('User not found or inactive', 401, 'USER_NOT_FOUND'));
    }
    req.user = { id: user.id, email: user.email, fullName: user.fullName, role: user.role };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('Token expired', 401, 'TOKEN_EXPIRED'));
    }
    return next(new AppError('Invalid token', 401, 'INVALID_TOKEN'));
  }
};

export const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded;
  } catch (err) {
    // Ignore invalid tokens for optional auth
  }

  next();
};

export const authorize = (...roles) => (req, res, next) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
  }

  if (!roles.includes(req.user.role)) {
    throw new AppError('Insufficient permissions', 403, 'FORBIDDEN');
  }

  next();
};
