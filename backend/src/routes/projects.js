import { Router } from 'express';
import { projectModel } from '../models/index.js';
import { validateQuery, validateParams, validate } from '../middleware/validate.js';
import { z } from 'zod';
import { authenticate, authorize } from '../middleware/auth.js';
import { createImageRoutes } from './media.js';

const router = Router();
router.use('/:id/images', createImageRoutes('project'));

const projectQuerySchema = z.object({
  category: z.enum(['residential', 'commercial', 'mixed_use', 'renovation']).optional(),
  status: z.enum(['planning', 'ongoing', 'completed']).optional(),
  location: z.string().optional(),
  year: z.string().optional(),
  page: z.coerce.number().positive().default(1),
  limit: z.coerce.number().positive().max(50).default(12),
});

const projectParamsSchema = z.object({
  slug: z.string().min(1),
});
const projectSlugSchema = z.string().trim().min(1).max(255).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

router.get('/', validateQuery(projectQuerySchema), async (req, res, next) => {
  try {
    const { category, status, location, year, page, limit } = req.validatedQuery;
    const offset = (page - 1) * limit;

    const [projects, total] = await Promise.all([
      projectModel.findPublished({ category, status, location, year, limit, offset }),
      projectModel.getTotalCount({ category, status, location, year }),
    ]);

    res.json({
      success: true,
      data: projects,
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

router.get('/admin', authenticate, authorize('admin', 'staff', 'viewer'), validateQuery(projectQuerySchema), async (req, res, next) => {
  try {
    const { category, status, location, year, page, limit } = req.validatedQuery;
    const filters = { category, status, location, year };
    const offset = (page - 1) * limit;
    const [projects, total] = await Promise.all([
      projectModel.findAllForAdmin({ ...filters, limit, offset }),
      projectModel.getAdminTotalCount(filters),
    ]);
    res.json({ success: true, data: projects, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
});

router.get('/:slug', validateParams(projectParamsSchema), async (req, res, next) => {
  try {
    const project = await projectModel.findBySlug(req.validatedParams.slug);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      });
    }

    res.json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
});

const createProjectSchema = z.object({
  slug: projectSlugSchema,
  title: z.string().min(1),
  category: z.enum(['residential', 'commercial', 'mixed_use', 'renovation']),
  status: z.enum(['planning', 'ongoing', 'completed']).default('planning'),
  location: z.string().min(1),
  year: z.string().optional(),
  size: z.string().optional(),
  value: z.number().positive().optional(),
  description: z.string().optional(),
  highlights: z.array(z.string()).optional(),
  services: z.array(z.enum(['building_design', 'construction', 'real_estate', 'project_support'])).optional(),
  accent: z.string().optional(),
  isPublished: z.boolean().default(false),
});

router.post('/', authenticate, authorize('admin', 'staff'), validate(createProjectSchema), async (req, res, next) => {
  try {
    const project = await projectModel.create({
      ...req.validatedBody,
      publishedAt: req.validatedBody.isPublished ? new Date() : null,
    });
    res.status(201).json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
});

const updateProjectSchema = z.object({
  slug: projectSlugSchema.optional(),
  title: z.string().min(1).optional(),
  category: z.enum(['residential', 'commercial', 'mixed_use', 'renovation']).optional(),
  status: z.enum(['planning', 'ongoing', 'completed']).optional(),
  location: z.string().min(1).optional(),
  year: z.string().optional(),
  size: z.string().optional(),
  value: z.number().positive().optional(),
  description: z.string().optional(),
  highlights: z.array(z.string()).optional(),
  services: z.array(z.enum(['building_design', 'construction', 'real_estate', 'project_support'])).optional(),
  accent: z.string().optional(),
  isPublished: z.boolean().optional(),
});

router.patch('/:id', authenticate, authorize('admin', 'staff'), validateParams(z.object({ id: z.coerce.number() })), validate(updateProjectSchema), async (req, res, next) => {
  try {
    const updates = { ...req.validatedBody };
    if (req.validatedBody.isPublished === true) {
      updates.publishedAt = new Date();
    } else if (req.validatedBody.isPublished === false) {
      updates.publishedAt = null;
    }

    const project = await projectModel.update(req.validatedParams.id, updates);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Project not found' },
      });
    }

    res.json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authenticate, authorize('admin'), validateParams(z.object({ id: z.coerce.number() })), async (req, res, next) => {
  try {
    await projectModel.delete(req.validatedParams.id);
    res.json({ success: true, message: 'Project deleted' });
  } catch (err) {
    next(err);
  }
});

export const projectRoutes = router;
