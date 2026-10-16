import { Router } from 'express';
import { getDb } from '../config/database.js';
import * as schema from '../models/schema.js';
import { eq, inArray } from 'drizzle-orm';
import { validate, validateParams, validateQuery } from '../middleware/validate.js';
import { z } from 'zod';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();
const db = getDb();

const settingSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.string().min(1),
  description: z.string().optional(),
});

const settingParamsSchema = z.object({
  key: z.string().min(1).max(100),
});

const publicSettingKeys = [
  'whatsapp_number', 'company_phone', 'company_email', 'company_address',
  'google_maps_embed', 'social_instagram', 'social_facebook', 'social_linkedin',
];

const publicKeysSchema = z.object({
  keys: z.preprocess((value) => typeof value === 'string' ? [value] : value,
    z.array(z.enum(publicSettingKeys)).optional()),
});

router.get('/public', validateQuery(publicKeysSchema), async (req, res, next) => {
  try {
    const { keys } = req.validatedQuery;
    let query = db.select().from(schema.siteSettings)
      .where(inArray(schema.siteSettings.key, keys?.length ? keys : publicSettingKeys));
    const settings = await query.orderBy(schema.siteSettings.key);
    res.json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
});

router.get('/', authenticate, authorize('admin', 'staff', 'viewer'), async (req, res, next) => {
  try {
    const settings = await db.select().from(schema.siteSettings).orderBy(schema.siteSettings.key);
    res.json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
});

router.get('/:key', authenticate, authorize('admin', 'staff', 'viewer'), validateParams(settingParamsSchema), async (req, res, next) => {
  try {
    const result = await db.select().from(schema.siteSettings).where(eq(schema.siteSettings.key, req.validatedParams.key)).limit(1);

    if (!result[0]) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Setting not found' },
      });
    }

    res.json({ success: true, data: result[0] });
  } catch (err) {
    next(err);
  }
});

router.post('/', authenticate, authorize('admin'), validate(settingSchema), async (req, res, next) => {
  try {
    const result = await db.insert(schema.siteSettings).values(req.validatedBody).onConflictDoUpdate({
      target: schema.siteSettings.key,
      set: { value: req.validatedBody.value, description: req.validatedBody.description, updatedAt: new Date() },
    }).returning();

    res.status(201).json({ success: true, data: result[0] });
  } catch (err) {
    next(err);
  }
});

router.patch('/:key', authenticate, authorize('admin'), validateParams(settingParamsSchema), validate(settingSchema.partial()), async (req, res, next) => {
  try {
    const updates = { ...req.validatedBody, updatedAt: new Date() };
    const result = await db.update(schema.siteSettings).set(updates).where(eq(schema.siteSettings.key, req.validatedParams.key)).returning();

    if (!result[0]) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Setting not found' },
      });
    }

    res.json({ success: true, data: result[0] });
  } catch (err) {
    next(err);
  }
});

router.delete('/:key', authenticate, authorize('admin'), validateParams(settingParamsSchema), async (req, res, next) => {
  try {
    await db.delete(schema.siteSettings).where(eq(schema.siteSettings.key, req.validatedParams.key));
    res.json({ success: true, message: 'Setting deleted' });
  } catch (err) {
    next(err);
  }
});

export const settingsRoutes = router;
