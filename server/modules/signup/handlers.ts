import 'server-only';
import type { ZodTypeAny, z } from 'zod';
import { AppError } from '../../lib/errors';
import { json, route, type HttpContext } from '../../lib/http';
import { rateLimit } from '../../lib/rateLimit';
import { requireUser } from '../../middleware/auth';
import { listCatalog } from '../billing/catalog';
import { canonicalEmail } from './canonicalEmail';
import { SIGNUP_ERRORS, signupError } from './errors';
import { resendSchema, signupSchema, startTrialSchema, verifySchema } from './schemas';
import { SignupService } from './service';

function parse<S extends ZodTypeAny>(schema: S, body: unknown): z.infer<S> {
  const result = schema.safeParse(body);
  if (!result.success) throw signupError('INVALID_BODY', result.error.issues[0]?.message ?? 'Invalid body');
  return result.data;
}

const HOUR = 60 * 60_000;
const QUARTER = 15 * 60_000;
const bodyEmail = async (ctx: HttpContext) => {
  const email = ((await ctx.body()) as { email?: unknown } | undefined)?.email;
  return typeof email === 'string' ? canonicalEmail(email) : 'unknown';
};
const userKey = (ctx: HttpContext) => ctx.auth?.userId ?? ctx.ip;

/** In-memory limiters (per instance). Behind several instances, put a shared store here. */
const limiter = (windowMs: number, limit: number, key?: (ctx: HttpContext) => string | Promise<string>) =>
  rateLimit({
    windowMs,
    limit,
    key,
    error: () => new AppError(429, 'Too many attempts, please try again later.', SIGNUP_ERRORS.RATE_LIMITED[1]),
  });

const service = (ctx: HttpContext) => new SignupService(ctx.deps);

/**
 * `/api/attende/signup`
 *   PUBLIC   GET  /plans         tier catalog (limits + prices, `catalog.ts`)
 *   PUBLIC   POST /              pending signup + JSYNQ user (`POST /api/users`; JSYNQ e-mails the code)
 *   PUBLIC   POST /verify        code -> JSYNQ (`PATCH /api/users/verify-otp`) -> login summary (no token)
 *   PUBLIC   POST /resend        new JSYNQ code (always 202)
 *   SESSION  POST /setup-intent  JSYNQ's SetupIntent (`GET /api/subscriptions/setup-intent`) for the card form
 *   SESSION  POST /start-trial   JSYNQ workspace + CRM project + JSYNQ subscription (upgrade-to-trial, 7-day trial
 *                                 set in Stripe) + entitlements; `withoutTrial: true` subscribes and charges now
 */
export const getPlans = route([limiter(60_000, 60)], async () =>
  json(await listCatalog(), 200, { 'Cache-Control': 'public, max-age=60' })
);

export const postSignup = route([limiter(HOUR, 8), limiter(HOUR, 4, bodyEmail)], async (ctx) =>
  json(await service(ctx).register(parse(signupSchema, await ctx.body())), 201)
);

export const postVerify = route([limiter(QUARTER, 30), limiter(QUARTER, 8, bodyEmail)], async (ctx) =>
  json(await service(ctx).verify(parse(verifySchema, await ctx.body())))
);

export const postResend = route([limiter(HOUR, 4, bodyEmail)], async (ctx) => {
  await service(ctx).resend(parse(resendSchema, await ctx.body()).email);
  // Always the same answer: this endpoint must not reveal whether the e-mail has a signup.
  return json({ sent: true }, 202);
});

export const postSetupIntent = route([requireUser, limiter(HOUR, 10, userKey)], async (ctx) =>
  json(await service(ctx).createSetupIntent({ userId: ctx.auth!.userId, email: ctx.auth!.email }))
);

export const postStartTrial = route([requireUser, limiter(HOUR, 6, userKey)], async (ctx) => {
  const out = await service(ctx).startTrial({ userId: ctx.auth!.userId, email: ctx.auth!.email }, parse(startTrialSchema, await ctx.body()));
  return json(out, out.alreadyStarted ? 200 : 201);
});
