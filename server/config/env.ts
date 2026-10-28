import 'server-only';
import { z } from 'zod';

const bool = (fallback: boolean) =>
  z
    .enum(['true', 'false', '1', '0'])
    .optional()
    .transform((v) => (v === undefined ? fallback : v === 'true' || v === '1'));

/**
 * Every setting the service reads. Parsed once at boot; a missing or malformed value stops the
 * process with a list of the problems (names only, never values).
 */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  // The Attende database. Separate from MONGODB_URI (the JSYNQ database NextAuth reads).
  ATTENDE_MONGODB_URI: z.string().min(1),
  // Origin of this app: the only allowed billing-portal return origin. Defaults to AUTH_URL.
  FRONTEND_URL: z.string().url(),
  // Public origin of this app (e.g. https://app.attende.ai). JSYNQ calls
  // <PUBLIC_URL>/api/jsynq/webhooks and <PUBLIC_URL>/api/jsynq/inbound; both must share one origin.
  PUBLIC_URL: z
    .string()
    .url()
    .optional()
    .transform((v) => v?.replace(/\/+$/, '')),

  // Same HS256 secret JSYNQ signs user JWTs with.
  AUTH_SECRET: z.string().min(16),

  JSYNQ_API_URL: z.string().url(),
  JSYNQ_PARTNER_API_KEY: z.string().min(10),
  JSYNQ_WEBHOOK_SECRET: z.string().optional(),
  JSYNQ_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),

  STRIPE_SECRET_KEY: z.string().min(10),
  STRIPE_WEBHOOK_SECRET: z.string().min(10),
  BILLING_GRACE_DAYS: z.coerce.number().int().min(0).max(30).default(3),

  // 32 bytes, base64. Encrypts the pending signup password until the e-mail is verified.
  DATA_ENCRYPTION_KEY: z
    .string()
    .refine((v) => Buffer.from(v, 'base64').length === 32, 'must be 32 bytes in base64'),

  MAIL_PROVIDER: z.enum(['log', 'smtp', 'resend']).default('log'),
  MAIL_FROM: z.string().default('Attende <no-reply@localhost>'),
  SMTP_URL: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),

  AGENT_MODEL: z.string().default('gpt-4o-mini'),
  EXTRA_DISPOSABLE_DOMAINS: z.string().default(''),

  // Vercel Cron sends it as `Authorization: Bearer <CRON_SECRET>` to /api/cron/*. Without it the cron routes refuse.
  CRON_SECRET: z.string().min(16).optional(),
  ADVANCED_AUTOMATIONS_RUNTIME_ENABLED: bool(false),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type Env = z.infer<typeof schema>;

export function parseEnv(source: NodeJS.ProcessEnv = process.env): Env {
  // An empty value (`NAME=` copied from .env.example) means "not set", so optional defaults apply.
  const set = Object.fromEntries(Object.entries(source).filter(([, v]) => v !== undefined && v !== ''));
  const frontend = set.FRONTEND_URL || set.AUTH_URL;
  const result = schema.safeParse({ ...set, ...(frontend ? { FRONTEND_URL: frontend } : {}) });
  if (!result.success) {
    const problems = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    throw new Error(`Invalid environment:\n  ${problems.join('\n  ')}`);
  }
  const env = result.data;
  if (env.MAIL_PROVIDER === 'smtp' && !env.SMTP_URL) throw new Error('Invalid environment: SMTP_URL is required for MAIL_PROVIDER=smtp');
  if (env.ADVANCED_AUTOMATIONS_RUNTIME_ENABLED && !env.PUBLIC_URL) throw new Error('Invalid environment: PUBLIC_URL is required for ADVANCED_AUTOMATIONS_RUNTIME_ENABLED=true');
  if (env.MAIL_PROVIDER === 'resend' && !env.RESEND_API_KEY) throw new Error('Invalid environment: RESEND_API_KEY is required for MAIL_PROVIDER=resend');
  return env;
}

let cached: Env | null = null;
export const env = (): Env => (cached ??= parseEnv());
/** Tests replace the environment between suites. */
export const resetEnvCache = () => {
  cached = null;
};
