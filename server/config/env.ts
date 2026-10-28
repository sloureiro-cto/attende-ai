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
  // Same HS256 secret JSYNQ signs user JWTs with. The server also mints JSYNQ API tokens with it
  // (lib/auth/apiToken.ts) to act as a member when no user is signed in.
  AUTH_SECRET: z.string().min(16),

  JSYNQ_API_URL: z.string().url(),
  JSYNQ_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),

  STRIPE_SECRET_KEY: z.string().min(10),
  STRIPE_WEBHOOK_SECRET: z.string().min(10),
  BILLING_GRACE_DAYS: z.coerce.number().int().min(0).max(30).default(3),

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
  return env;
}

let cached: Env | null = null;
export const env = (): Env => (cached ??= parseEnv());
/** Tests replace the environment between suites. */
export const resetEnvCache = () => {
  cached = null;
};
