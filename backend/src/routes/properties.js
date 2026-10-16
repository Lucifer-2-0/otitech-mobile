import { Router } from 'express';
import { propertyModel } from '../models/index.js';
import { validateQuery, validateParams, validate } from '../middleware/validate.js';
import { z } from 'zod';
import { authenticate, authorize } from '../middleware/auth.js';
import { createImageRoutes } from './media.js';

const router = Router();
router.use('/:id/images', createImageRoutes('property'));

const propertyQuerySchema = z.object({
  type: z.enum(['land', 'house', 'apartment', 'commercial']).optional(),
  purpose: z.enum(['sale', 'rent']).optional(),
  status: z.enum(['available', 'under_offer', 'sold', 'let']).optional(),
  location: z.string().optional(),
  minPrice: z.coerce.number().positive().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  page: z.coerce.number().positive().default(1),
  limit: z.coerce.number().positive().max(50).default(12),
});

const propertyParamsSchema = z.object({
  slug: z.string().min(1),
});
const propertySlugSchema = z.string().trim().min(1).max(255).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

router.get('/', validateQuery(propertyQuerySchema), async (req, res, next) => {
  try {
    const { type, purpose, status, location, minPrice, maxPrice, page, limit } = req.validatedQuery;
    const offset = (page - 1) * limit;

    const [properties, total] = await Promise.all([
      propertyModel.findPublished({ type, purpose, status, location, minPrice, maxPrice, limit, offset }),
      propertyModel.getTotalCount({ type, purpose, status, location, minPrice, maxPrice }),
    ]);

    res.json({
      success: true,
      data: properties,
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

router.get('/admin', authenticate, authorize('admin', 'staff', 'viewer'), validateQuery(propertyQuerySchema), async (req, res, next) => {
  try {
    const { type, purpose, status, location, minPrice, maxPrice, page, limit } = req.validatedQuery;
    const filters = { type, purpose, status, location, minPrice, maxPrice };
    const offset = (page - 1) * limit;
    const [properties, total] = await Promise.all([
      propertyModel.findAllForAdmin({ ...filters, limit, offset }),
      propertyModel.getAdminTotalCount(filters),
    ]);
    res.json({ success: true, data: properties, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
});

router.get('/:slug', validateParams(propertyParamsSchema), async (req, res, next) => {
  try {
    const property = await propertyModel.findBySlug(req.validatedParams.slug);

    if (!property) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Property not found' },
      });
    }

    res.json({ success: true, data: property });
  } catch (err) {
    next(err);
  }
});

const createPropertySchema = z.object({
  slug: propertySlugSchema,
  title: z.string().min(1),
  type: z.enum(['land', 'house', 'apartment', 'commercial']),
  purpose: z.enum(['sale', 'rent']),
  status: z.enum(['available', 'under_offer', 'sold', 'let']).default('available'),
  location: z.string().min(1),
  size: z.string().optional(),
  price: z.number().positive().optional(),
  priceLabel: z.string().optional(),
  description: z.string().optional(),
  features: z.array(z.string()).optional(),
  accent: z.string().optional(),
  isPublished: z.boolean().default(false),
});

router.post('/', authenticate, authorize('admin', 'staff'), validate(createPropertySchema), async (req, res, next) => {
  try {
    const property = await propertyModel.create({
      ...req.validatedBody,
      publishedAt: req.validatedBody.isPublished ? new Date() : null,
    });
    res.status(201).json({ success: true, data: property });
  } catch (err) {
    next(err);
  }
});

const updatePropertySchema = z.object({
  slug: propertySlugSchema.optional(),
  title: z.string().min(1).optional(),
  type: z.enum(['land', 'house', 'apartment', 'commercial']).optional(),
  purpose: z.enum(['sale', 'rent']).optional(),
  status: z.enum(['available', 'under_offer', 'sold', 'let']).optional(),
  location: z.string().min(1).optional(),
  size: z.string().optional(),
  price: z.number().positive().optional(),
  priceLabel: z.string().optional(),
  description: z.string().optional(),
  features: z.array(z.string()).optional(),
  accent: z.string().optional(),
  isPublished: z.boolean().optional(),
});

router.patch('/:id', authenticate, authorize('admin', 'staff'), validateParams(z.object({ id: z.coerce.number() })), validate(updatePropertySchema), async (req, res, next) => {
  try {
    const updates = { ...req.validatedBody };
    if (req.validatedBody.isPublished === true) {
      updates.publishedAt = new Date();
    } else if (req.validatedBody.isPublished === false) {
      updates.publishedAt = null;
    }

    const property = await propertyModel.update(req.validatedParams.id, updates);

    if (!property) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Property not found' },
      });
    }

    res.json({ success: true, data: property });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authenticate, authorize('admin'), validateParams(z.object({ id: z.coerce.number() })), async (req, res, next) => {
  try {
    await propertyModel.delete(req.validatedParams.id);
    res.json({ success: true, message: 'Property deleted' });
  } catch (err) {
    next(err);
  }
});

export const propertyRoutes = router;
