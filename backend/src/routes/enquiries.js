import { Router } from 'express';
import { enquiryModel, userModel } from '../models/index.js';
import { validateQuery, validateParams, validate } from '../middleware/validate.js';
import { z } from 'zod';
import { authenticate, authorize } from '../middleware/auth.js';
import { sendEnquiryNotification } from '../services/email.js';
import { contactFormRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

const enquiryQuerySchema = z.object({
  status: z.enum(['new', 'in_progress', 'contacted', 'closed']).optional(),
  service: z.enum(['building_design', 'construction', 'real_estate', 'project_support']).optional(),
  assignedTo: z.coerce.number().optional(),
  page: z.coerce.number().positive().default(1),
  limit: z.coerce.number().positive().max(50).default(20),
});

const enquiryParamsSchema = z.object({
  id: z.coerce.number(),
});

const createEnquirySchema = z.object({
  name: z.string().min(1).max(255),
  phone: z.string().min(1).max(50),
  email: z.string().email().optional().or(z.literal('')),
  service: z.enum(['building_design', 'construction', 'real_estate', 'project_support']),
  message: z.string().min(1),
  propertyId: z.coerce.number().optional(),
  projectId: z.coerce.number().optional(),
});

router.post('/', contactFormRateLimiter, validate(createEnquirySchema), async (req, res, next) => {
  try {
    const data = { ...req.validatedBody };
    if (data.email === '') data.email = null;

    const enquiry = await enquiryModel.create(data);

    try {
      await sendEnquiryNotification(enquiry);
    } catch (emailErr) {
      req.logger.warn({ err: emailErr }, 'Failed to send enquiry notification email');
    }

    res.status(201).json({ success: true, data: enquiry });
  } catch (err) {
    next(err);
  }
});

router.get('/', authenticate, authorize('admin', 'staff', 'viewer'), validateQuery(enquiryQuerySchema), async (req, res, next) => {
  try {
    const { status, service, assignedTo, page, limit } = req.validatedQuery;
    const offset = (page - 1) * limit;

    const [enquiries, total] = await Promise.all([
      enquiryModel.findAll({ status, service, assignedTo, limit, offset }),
      enquiryModel.getTotalCount({ status, service, assignedTo }),
    ]);

    res.json({
      success: true,
      data: enquiries,
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

router.get('/:id', authenticate, authorize('admin', 'staff', 'viewer'), validateParams(enquiryParamsSchema), async (req, res, next) => {
  try {
    const enquiry = await enquiryModel.findById(req.validatedParams.id);

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Enquiry not found' },
      });
    }

    res.json({ success: true, data: enquiry });
  } catch (err) {
    next(err);
  }
});

const updateEnquirySchema = z.object({
  status: z.enum(['new', 'in_progress', 'contacted', 'closed']).optional(),
  assignedTo: z.coerce.number().nullable().optional(),
  notes: z.string().optional(),
});

router.patch('/:id', authenticate, authorize('admin', 'staff'), validateParams(enquiryParamsSchema), validate(updateEnquirySchema), async (req, res, next) => {
  try {
    const enquiry = await enquiryModel.update(req.validatedParams.id, req.validatedBody);

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Enquiry not found' },
      });
    }

    res.json({ success: true, data: enquiry });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authenticate, authorize('admin'), validateParams(enquiryParamsSchema), async (req, res, next) => {
  try {
    await enquiryModel.delete(req.validatedParams.id);
    res.json({ success: true, message: 'Enquiry deleted' });
  } catch (err) {
    next(err);
  }
});

export const enquiryRoutes = router;
