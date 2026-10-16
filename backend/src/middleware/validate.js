import { ZodError } from 'zod';

export const validate = (schema) => async (req, res, next) => {
  try {
    const result = await schema.safeParseAsync(req.body);
    if (!result.success) {
      const errors = result.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return res.status(422).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: errors,
        },
      });
    }
    req.validatedBody = result.data;
    next();
  } catch (err) {
    next(err);
  }
};

export const validateQuery = (schema) => (req, res, next) => {
  try {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const errors = result.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return res.status(422).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: errors,
        },
      });
    }
    req.validatedQuery = result.data;
    next();
  } catch (err) {
    next(err);
  }
};

export const validateParams = (schema) => (req, res, next) => {
  try {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      const errors = result.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return res.status(422).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid route parameters',
          details: errors,
        },
      });
    }
    req.validatedParams = result.data;
    next();
  } catch (err) {
    next(err);
  }
};
