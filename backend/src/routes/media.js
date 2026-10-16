import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate, validateParams } from '../middleware/validate.js';
import { z } from 'zod';
import { getPresignedUploadUrl, isS3Configured, deleteObject } from '../services/storage.js';
import { AppError } from '../middleware/errorHandler.js';
import * as schema from '../models/schema.js';
import { getDb } from '../config/database.js';
import { eq, and } from 'drizzle-orm';

const router = Router();

const presignedSchema = z.object({
  prefix: z.enum(['properties', 'projects']),
  fileName: z.string().min(1).max(255),
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  expiresIn: z.coerce.number().int().min(300).max(86400).optional(),
});

const imageMetadataSchema = z.object({
  url: z.string().url().max(500),
  altText: z.string().trim().max(255).optional().nullable(),
  isCover: z.boolean().optional().default(false),
});

router.post('/presigned-upload', authenticate, authorize('admin', 'staff'), validate(presignedSchema), async (req, res, next) => {
  try {
    if (!isS3Configured()) {
      throw AppError.badRequest('S3 storage not configured. Set STORAGE_PROVIDER=s3 and provide AWS credentials.');
    }

    const { prefix, fileName, contentType, expiresIn = 3600 } = req.validatedBody;
    const result = await getPresignedUploadUrl({ prefix, fileName, contentType, expiresIn });

    res.json({
      success: true,
      data: {
        uploadUrl: result.uploadUrl,
        key: result.key,
        publicUrl: result.publicUrl,
        expiresIn: result.expiresIn,
        method: 'PUT',
        headers: {
          'Content-Type': req.validatedBody.contentType,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/storage/status', authenticate, authorize('admin', 'staff', 'viewer'), async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: {
        provider: process.env.STORAGE_PROVIDER || 'local',
        s3Configured: isS3Configured(),
        bucket: process.env.AWS_S3_BUCKET || null,
        region: process.env.AWS_REGION || 'us-east-1',
        publicUrl: process.env.AWS_S3_PUBLIC_URL || null,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Backward compatibility functions for properties.js and projects.js
export const findStoredImages = async (kind, id) => {
  const table = kind === 'property' ? schema.propertyImages : schema.projectImages;
  const idField = kind === 'property' ? schema.propertyImages.propertyId : schema.projectImages.projectId;
  
  const db = getDb();
  const imageQuery = kind === 'property' ? db.query.propertyImages : db.query.projectImages;
  return imageQuery.findMany({
    where: eq(idField, id),
    orderBy: (t, { asc }) => [asc(t.sortOrder)],
  });
};

export const removeStoredImages = async (kind, id, imageId) => {
  const table = kind === 'property' ? schema.propertyImages : schema.projectImages;
  const idField = kind === 'property' ? schema.propertyImages.id : schema.projectImages.id;
  const fkField = kind === 'property' ? schema.propertyImages.propertyId : schema.projectImages.projectId;
  
  const db = getDb();
  const imageQuery = kind === 'property' ? db.query.propertyImages : db.query.projectImages;
  
  // Get the image to check ownership
  const image = await imageQuery.findFirst({
    where: and(eq(idField, imageId), eq(fkField, id)),
  });
  
  if (!image) {
    throw AppError.notFound('Image not found');
  }
  
  // If deleting cover image, we might want to set another as cover
  if (image.isCover || image.is_cover) {
    const otherImages = await imageQuery.findMany({
      where: and(eq(fkField, id), eq(idField, imageId)),
    });
    
    if (otherImages.length > 0) {
      // This would need to be handled by the caller
      throw AppError.badRequest('Cannot delete cover image directly. Set another image as cover first.');
    }
  }
  
  await db.delete(table).where(and(eq(idField, imageId), eq(fkField, id)));
  await deleteObject(image.key);
  
  return { success: true };
};

export const createImageRoutes = (kind) => {
  const imageRouter = Router({ mergeParams: true });
  
  // GET images for a record
  imageRouter.get('/', authenticate, authorize('admin', 'staff', 'viewer'), async (req, res, next) => {
    try {
      const images = await findStoredImages(kind, req.params.id);
      res.json({ success: true, data: images });
    } catch (err) {
      next(err);
    }
  });
  
  // POST upload image
  imageRouter.post('/', authenticate, authorize('admin', 'staff'), validateParams(z.object({ id: z.coerce.number().int().positive() })), validate(imageMetadataSchema), async (req, res, next) => {
    try {
      const db = getDb();
      const parentId = req.validatedParams.id;
      const table = kind === 'property' ? schema.propertyImages : schema.projectImages;
      const fkField = kind === 'property' ? schema.propertyImages.propertyId : schema.projectImages.projectId;
      const parentTable = kind === 'property' ? schema.properties : schema.projects;
      const [parent] = await db.select({ id: parentTable.id }).from(parentTable)
        .where(eq(parentTable.id, parentId)).limit(1);
      if (!parent) throw AppError.notFound(`${kind === 'property' ? 'Property' : 'Project'} not found`);

      const existingImages = await db.select({ sortOrder: table.sortOrder }).from(table).where(eq(fkField, parentId));
      const sortOrder = existingImages.reduce((highest, image) => Math.max(highest, image.sortOrder), -1) + 1;
      const isCover = req.validatedBody.isCover || existingImages.length === 0;

      const [image] = await db.transaction(async (tx) => {
        if (isCover) await tx.update(table).set({ isCover: false }).where(eq(fkField, parentId));
        const values = kind === 'property'
          ? { propertyId: parentId, ...req.validatedBody, sortOrder, isCover }
          : { projectId: parentId, ...req.validatedBody, sortOrder, isCover };
        return tx.insert(table).values(values).returning();
      });

      res.status(201).json({ success: true, data: image, message: 'Image uploaded.' });
    } catch (err) {
      next(err);
    }
  });
  
  // PATCH update image (alt text, order, cover)
  imageRouter.patch('/:imageId', authenticate, authorize('admin', 'staff'), async (req, res, next) => {
    try {
      const { altText, sortOrder, isCover } = req.body;
      const table = kind === 'property' ? schema.propertyImages : schema.projectImages;
      const idField = kind === 'property' ? schema.propertyImages.id : schema.projectImages.id;
      const fkField = kind === 'property' ? schema.propertyImages.propertyId : schema.projectImages.projectId;
      
      const db = getDb();
      const imageQuery = kind === 'property' ? db.query.propertyImages : db.query.projectImages;
      
      // Verify ownership
      const image = await imageQuery.findFirst({
        where: and(eq(table.id, req.params.imageId), eq(fkField, req.params.id)),
      });
      
      if (!image) {
        throw AppError.notFound('Image not found');
      }
      
      // If setting as cover, unset current cover
      if (isCover) {
        await db.update(table)
          .set({ isCover: false })
          .where(and(eq(fkField, req.params.id), eq(table.isCover || table.is_cover, true)));
      }
      
      const updates = {};
      if (altText !== undefined) updates.altText = altText;
      if (sortOrder !== undefined) updates.sortOrder = sortOrder;
      if (isCover !== undefined) updates.isCover = isCover;
      
      const [updated] = await db.update(table)
        .set(updates)
        .where(and(eq(table.id, req.params.imageId), eq(fkField, req.params.id)))
        .returning();
      
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  });
  
  // DELETE image
  imageRouter.delete('/:imageId', authenticate, authorize('admin', 'staff'), async (req, res, next) => {
    try {
      await removeStoredImages(kind, req.params.id, req.params.imageId);
      res.json({ success: true, message: 'Image removed' });
    } catch (err) {
      next(err);
    }
  });
  
  return imageRouter;
};

router.get('/storage/status', authenticate, authorize('admin', 'staff', 'viewer'), async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: {
        provider: process.env.STORAGE_PROVIDER || 'local',
        s3Configured: isS3Configured(),
        bucket: process.env.AWS_S3_BUCKET || null,
        region: process.env.AWS_REGION || 'us-east-1',
        publicUrl: process.env.AWS_S3_PUBLIC_URL || null,
      },
    });
  } catch (err) {
    next(err);
  }
});

export const mediaRoutes = router;
