import { Router } from 'express';
import { propertyModel } from '../models/index.js';
import { validateQuery, validateParams, validate } from '../middleware/validate.js';
import { z } from 'zod';
import { authenticate, authorize } from '../middleware/auth.js';
import { createImageRoutes } from './media.js';
import { randomUUID } from 'node:crypto';

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
const adminPropertyQuerySchema = propertyQuerySchema.extend({
  reviewStatus: z.enum(['not_submitted', 'pending', 'approved', 'rejected']).optional(),
});

const propertyParamsSchema = z.object({
  slug: z.string().min(1),
});
const propertySlugSchema = z.string().trim().min(1).max(255).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const sellerPropertySchema = z.object({
  title: z.string().trim().min(3).max(255),
  type: z.enum(['land', 'house', 'apartment', 'commercial']),
  purpose: z.enum(['sale', 'rent']),
  location: z.string().trim().min(2).max(255),
  size: z.string().trim().max(100).optional(),
  price: z.coerce.number().positive().optional(),
  priceLabel: z.string().trim().max(50).optional(),
  description: z.string().trim().max(10000).optional(),
  features: z.array(z.string().trim().min(1).max(255)).max(30).optional(),
});

const sellerPropertyUpdateSchema = sellerPropertySchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'Provide at least one property field to update' },
);

const makePropertySlug = (title) => {
  const base = title.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 230) || 'property';
  return `${base}-${randomUUID().slice(0, 8)}`;
};

router.get('/mine', authenticate, authorize('seller'), async (req, res, next) => {
  try {
    const properties = await propertyModel.findOwnedBy(req.user.id);
    res.json({ success: true, data: properties });
  } catch (err) {
    next(err);
  }
});

router.post('/seller', authenticate, authorize('seller'), validate(sellerPropertySchema), async (req, res, next) => {
  try {
    const property = await propertyModel.create({
      ...req.validatedBody,
      slug: makePropertySlug(req.validatedBody.title),
      sellerId: req.user.id,
      reviewStatus: 'pending',
      isPublished: false,
    });
    res.status(201).json({ success: true, data: property, message: 'Property submitted for admin review.' });
  } catch (err) {
    next(err);
  }
});

router.patch('/mine/:id', authenticate, authorize('seller'), validateParams(z.object({ id: z.coerce.number().int().positive() })), validate(sellerPropertyUpdateSchema), async (req, res, next) => {
  try {
    const id = req.validatedParams.id;
    const property = await propertyModel.findById(id);
    if (!property || property.sellerId !== req.user.id) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Property not found' } });
    }
    if (property.reviewStatus === 'approved' && property.isPublished) {
      return res.status(409).json({ success: false, error: { code: 'LISTING_LOCKED', message: 'Contact OTI-TECH to update a published listing.' } });
    }
    const updated = await propertyModel.update(id, {
      ...req.validatedBody,
      reviewStatus: 'pending',
      reviewedAt: null,
      reviewedBy: null,
      isPublished: false,
      publishedAt: null,
    });
    res.json({ success: true, data: updated, message: 'Changes submitted for admin review.' });
  } catch (err) {
    next(err);
  }
});

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

router.get('/admin', authenticate, authorize('admin', 'staff', 'viewer'), validateQuery(adminPropertyQuerySchema), async (req, res, next) => {
  try {
    const { type, purpose, status, location, minPrice, maxPrice, reviewStatus, page, limit } = req.validatedQuery;
    const filters = { type, purpose, status, location, minPrice, maxPrice, reviewStatus };
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

router.patch('/admin/:id/review', authenticate, authorize('admin'), validateParams(z.object({ id: z.coerce.number().int().positive() })), validate(z.object({
  decision: z.enum(['approve', 'reject']),
})), async (req, res, next) => {
  try {
    const id = req.validatedParams.id;
    const property = await propertyModel.findById(id);
    if (!property || !property.sellerId) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Seller listing not found' } });
    }
    const approved = req.validatedBody.decision === 'approve';
    const updated = await propertyModel.update(id, {
      reviewStatus: approved ? 'approved' : 'rejected',
      reviewedAt: new Date(),
      reviewedBy: req.user.id,
      isPublished: approved,
      publishedAt: approved ? new Date() : null,
    });
    res.json({ success: true, data: updated, message: approved ? 'Listing approved and published.' : 'Listing rejected.' });
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
      reviewStatus: req.validatedBody.isPublished ? 'approved' : 'not_submitted',
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
    const existing = await propertyModel.findById(req.validatedParams.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Property not found' } });
    }
    if (existing.sellerId && req.user.role !== 'admin' && updates.isPublished !== undefined) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only an admin can publish a seller listing.' } });
    }
    if (req.validatedBody.isPublished === true) {
      updates.publishedAt = new Date();
      updates.reviewStatus = 'approved';
      updates.reviewedAt = existing.reviewedAt || new Date();
      updates.reviewedBy = existing.reviewedBy || req.user.id;
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
