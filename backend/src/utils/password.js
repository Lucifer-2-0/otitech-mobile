import { z } from 'zod';
import { pwnedPassword } from 'hibp';

const PASSWORD_MIN_LENGTH = 12;
const PASSWORD_MAX_LENGTH = 128;

const passwordSchema = z.string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(PASSWORD_MAX_LENGTH, `Password must not exceed ${PASSWORD_MAX_LENGTH} characters`)
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const validatePasswordPolicy = (password) => {
  return passwordSchema.safeParse(password);
};

export const checkPwnedPassword = async (password) => {
  try {
    const count = await pwnedPassword(password);
    return count > 0;
  } catch (err) {
    // If HIBP API is unavailable, log and allow (fail open for availability)
    console.warn('HIBP API unavailable, skipping pwned password check:', err.message);
    return false;
  }
};

export const validatePassword = async (password) => {
  const policyResult = validatePasswordPolicy(password);
  if (!policyResult.success) {
    return {
      valid: false,
      errors: policyResult.error.errors.map(e => e.message),
    };
  }

  const isPwned = await checkPwnedPassword(password);
  if (isPwned) {
    return {
      valid: false,
      errors: ['This password has appeared in a data breach. Please choose a different password.'],
    };
  }

  return { valid: true, errors: [] };
};

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH),
  fullName: z.string().min(1).max(255),
  role: z.enum(['admin', 'staff']).optional(),
}).refine(async (data) => {
  const result = await validatePassword(data.password);
  return result.valid;
}, {
  message: 'Password does not meet policy requirements',
  path: ['password'],
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH),
}).refine(async (data) => {
  const result = await validatePassword(data.newPassword);
  return result.valid;
}, {
  message: 'New password does not meet policy requirements',
  path: ['newPassword'],
});

export default {
  validatePasswordPolicy,
  checkPwnedPassword,
  validatePassword,
  registerSchema,
  changePasswordSchema,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
};