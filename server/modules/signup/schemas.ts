import 'server-only';
import { z } from 'zod';
import { isTierSlug } from '../billing/tiers';

const emailSchema = z.string({ required_error: 'email is required' }).trim().toLowerCase().email('email is invalid').max(254);
const planSlugSchema = z.string().refine((slug) => isTierSlug(slug), { message: 'unknown plan' });

/**
 * JSYNQ's own signup (`POST /api/users`) needs a digit and one of `!@#$%^&*(),.?":{}|<>`; the
 * product rule adds 8..200 characters. Same symbol set here so JSYNQ never rejects what we accept.
 */
export const PASSWORD_SYMBOLS = /[!@#$%^&*(),.?":{}|<>]/;
export const passwordSchema = z
  .string({ required_error: 'password is required' })
  .min(8, 'password must have at least 8 characters')
  .max(200)
  .regex(/\d/, 'password must contain a number')
  .regex(PASSWORD_SYMBOLS, 'password must contain a special character (!@#$%^&*(),.?":{}|<>)');

export const signupSchema = z.object({
  name: z.string({ required_error: 'name is required' }).trim().min(2).max(120),
  email: emailSchema,
  password: passwordSchema,
  businessName: z.string({ required_error: 'businessName is required' }).trim().min(2).max(120),
  locale: z.enum(['pt', 'en', 'es']).default('pt'),
  planSlug: planSlugSchema.optional(),
});

export const verifySchema = z.object({ email: emailSchema, otp: z.string().trim().min(4).max(10) });
export const resendSchema = z.object({ email: emailSchema });

export const startTrialSchema = z.object({
  /** Stripe PaymentMethod id (`pm_...`) from confirming the SetupIntent in Stripe.js. */
  paymentMethodId: z.string().trim().regex(/^pm_[A-Za-z0-9_]+$/, 'invalid payment method'),
  planSlug: planSlugSchema.optional(),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type VerifyInput = z.infer<typeof verifySchema>;
export type StartTrialInput = z.infer<typeof startTrialSchema>;
