import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { userModel } from '../models/index.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { eq, desc, and, or, ilike, count } from 'drizzle-orm';
import * as schema from '../models/schema.js';
import { getDb } from '../config/database.js';

const router = Router();

const db = getDb();

router.get('/', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const search = req.query.search || '';
    const role = req.query.role;
    const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;

    const offset = (page - 1) * limit;

    const conditions = [];
    if (search) {
      conditions.push(or(ilike(schema.users.email, `%${search}%`), ilike(schema.users.fullName, `%${search}%`)));
    }
    if (role) conditions.push(eq(schema.users.role, role));
    if (isActive !== undefined) conditions.push(eq(schema.users.isActive, isActive));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [users, totalResult] = await Promise.all([
      db.select().from(schema.users).where(whereClause).orderBy(desc(schema.users.createdAt)).limit(limit).offset(offset),
      db.select({ count: count() }).from(schema.users).where(whereClause),
    ]);

    const total = Number(totalResult[0]?.count || 0);

    res.json({
      success: true,
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { email, password, fullName, role = 'staff', isActive = true } = req.body;

    if (!email || !password || !fullName) {
      throw AppError.badRequest('Email, password, and full name are required');
    }
    if (!['admin', 'staff', 'viewer'].includes(role)) {
      throw AppError.badRequest('Role must be admin, staff, or viewer');
    }
    if (typeof isActive !== 'boolean') {
      throw AppError.badRequest('Active status must be a boolean');
    }

    const existing = await userModel.findByEmail(email.toLowerCase());
    if (existing) {
      throw AppError.conflict('Email already registered');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await userModel.create({
      email: email.toLowerCase(),
      passwordHash,
      fullName,
      role,
      isActive,
    });

    res.status(201).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const updates = { ...req.body };
    if (updates.email) updates.email = updates.email.toLowerCase();
    if (updates.password) {
      updates.passwordHash = await bcrypt.hash(updates.password, 12);
      delete updates.password;
    }

    const user = await userModel.update(req.params.id, updates);
    if (!user) throw AppError.notFound('User not found');

    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    await userModel.delete(req.params.id);
    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    next(err);
  }
});

export const usersAdminRoutes = router;
