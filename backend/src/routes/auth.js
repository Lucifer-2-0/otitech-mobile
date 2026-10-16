import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { userModel } from '../models/index.js';
import { validate } from '../middleware/validate.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { z } from 'zod';
import config from '../config/index.js';
import { validatePassword } from '../utils/password.js';
import { authRateLimiter, bruteForceProtection, resetLoginAttempts } from '../middleware/rateLimiter.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().email().transform((email) => email.toLowerCase()),
  password: z.string().min(1),
});

const registerSchema = z.object({
  email: z.string().email().transform((email) => email.toLowerCase()),
  password: z.string().min(12),
  fullName: z.string().trim().min(1).max(255),
  role: z.enum(['staff', 'viewer']).optional(),
}).superRefine(async (data, ctx) => {
  const result = await validatePassword(data.password);
  if (!result.valid) {
    result.errors.forEach((error) => {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: error,
        path: ['password'],
      });
    });
  }
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(12),
}).superRefine(async (data, ctx) => {
  const result = await validatePassword(data.newPassword);
  if (!result.valid) {
    result.errors.forEach((error) => {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: error,
        path: ['newPassword'],
      });
    });
  }
});

router.post('/login', authRateLimiter, bruteForceProtection, validate(loginSchema), async (req, res, next) => {
  try {
    const user = await userModel.findByEmail(req.validatedBody.email);

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      });
    }

    const isValid = await bcrypt.compare(req.validatedBody.password, user.passwordHash);

    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      });
    }

    await userModel.update(user.id, { lastLoginAt: new Date() });

    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role, fullName: user.fullName },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    const refreshToken = jwt.sign(
      { id: user.id, type: 'refresh' },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiresIn }
    );

    resetLoginAttempts(req.ip);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/register', authenticate, authorize('admin'), validate(registerSchema), async (req, res, next) => {
  try {
    const existing = await userModel.findByEmail(req.validatedBody.email);

    if (existing) {
      return res.status(409).json({
        success: false,
        error: { code: 'EMAIL_EXISTS', message: 'Email already registered' },
      });
    }

    const passwordHash = await bcrypt.hash(req.validatedBody.password, 12);

    const user = await userModel.create({
      email: req.validatedBody.email,
      passwordHash,
      fullName: req.validatedBody.fullName,
      role: req.validatedBody.role || 'staff',
    });

    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role, fullName: user.fullName },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    const refreshToken = jwt.sign(
      { id: user.id, type: 'refresh' },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiresIn }
    );

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_TOKEN', message: 'Refresh token required' },
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
    } catch (err) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Invalid or expired refresh token' },
      });
    }

    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Invalid token type' },
      });
    }

    const user = await userModel.findById(decoded.id);

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found or inactive' },
      });
    }

    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role, fullName: user.fullName },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    const newRefreshToken = jwt.sign(
      { id: user.id, type: 'refresh' },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiresIn }
    );

    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/change-password', authenticate, validate(changePasswordSchema), async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret);
    const user = await userModel.findById(decoded.id);

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found or inactive' },
      });
    }

    const isValid = await bcrypt.compare(req.validatedBody.currentPassword, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Current password is incorrect' },
      });
    }

    const newPasswordHash = await bcrypt.hash(req.validatedBody.newPassword, 12);
    await userModel.update(user.id, { passwordHash: newPasswordHash });

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
});

router.get('/me', authenticate, async (req, res) => {
  // req.user is already populated by authenticate middleware
  res.json({
    success: true,
    data: {
      id: req.user.id,
      email: req.user.email,
      fullName: req.user.fullName,
      role: req.user.role,
    },
  });
});

export const authRoutes = router;
