import 'server-only';
import { AppError } from './errors';
import type { Guard, HttpContext } from './http';

type Window = { count: number; resetAt: number };
const MAX_KEYS = 50_000;

/**
 * Fixed-window, in-memory rate limit (the role `express-rate-limit` had in the Express service).
 * Per instance: behind several serverless instances the effective limit is higher. Put a shared
 * store here if that matters.
 */
export function rateLimit(opts: {
  windowMs: number;
  limit: number;
  key?: (ctx: HttpContext) => string | Promise<string>;
  /** The error answered with 429. */
  error?: () => AppError;
}): Guard {
  const windows = new Map<string, Window>();
  return async (ctx) => {
    const key = opts.key ? await opts.key(ctx) : ctx.ip;
    const now = Date.now();
    let w = windows.get(key);
    if (!w || w.resetAt <= now) {
      if (windows.size >= MAX_KEYS) {
        for (const [k, v] of windows) if (v.resetAt <= now) windows.delete(k);
        if (windows.size >= MAX_KEYS) windows.clear();
      }
      w = { count: 0, resetAt: now + opts.windowMs };
      windows.set(key, w);
    }
    w.count += 1;
    if (w.count > opts.limit) throw opts.error?.() ?? new AppError(429, 'Too many requests, please try again later.');
  };
}
