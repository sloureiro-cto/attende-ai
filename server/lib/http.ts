import 'server-only';
import { connectDb } from '../db';
import { getDeps, type Deps } from '../deps';
import type { AuthContext } from '../middleware/auth';
import { AppError } from './errors';
import { errMessage, log } from './logger';

const JSON_LIMIT_BYTES = 1024 * 1024;

/** Next.js passes the dynamic segments as the second argument of a route handler. */
export type RouteContext = { params?: Record<string, string | string[]> };
export type RouteHandler = (req: Request, context?: RouteContext) => Promise<Response>;

/** What a handler (and its guards) sees of the request. */
export type HttpContext = {
  req: Request;
  deps: Deps;
  params: Record<string, string>;
  query: Record<string, string>;
  /** Client address: first `x-forwarded-for` hop (set by the platform), else `x-real-ip`. */
  ip: string;
  header(name: string): string | undefined;
  /** Set by `requireUser` (and `requireWorkspace`). */
  auth?: AuthContext;
  /** The raw body, read once (webhook signatures need the exact bytes). */
  raw(limitBytes?: number): Promise<Buffer>;
  /** JSON body like `express.json()`: `{}` unless the content type is JSON; 400 on bad JSON, 413 over 1 MB. */
  body(): Promise<unknown>;
};

/** A guard runs before the handler, in order, and throws an `AppError` to refuse. */
export type Guard = (ctx: HttpContext) => void | Promise<void>;

export const ok = (data: unknown, status = 200) => Response.json({ success: true, data }, { status });
export const json = (body: unknown, status = 200, headers?: Record<string, string>) => Response.json(body, { status, headers });
export const noContent = () => new Response(null, { status: 204 });

export function errorResponse(error: unknown, path: string, method: string): Response {
  if (error instanceof AppError) {
    if (error.status >= 500) log.error('request.failed', { path, status: error.status, error: error.message });
    return Response.json(error.toBody(), { status: error.status });
  }
  log.error('request.unexpected_error', { path, method, error: errMessage(error) });
  return Response.json(new AppError(500, 'Could not complete the request').toBody(), { status: 500 });
}

function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || req.headers.get('x-real-ip')?.trim() || 'anonymous';
}

function flatParams(params: RouteContext['params']): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(params ?? {})) out[key] = Array.isArray(value) ? value.join('/') : value;
  return out;
}

function createContext(req: Request, context?: RouteContext): HttpContext {
  const url = new URL(req.url);
  let rawBody: Promise<Buffer> | null = null;
  let parsed: Promise<unknown> | null = null;
  const ctx: HttpContext = {
    req,
    deps: getDeps(),
    params: flatParams(context?.params),
    query: Object.fromEntries(url.searchParams.entries()),
    ip: clientIp(req),
    header: (name) => req.headers.get(name) ?? undefined,
    raw(limitBytes = JSON_LIMIT_BYTES) {
      rawBody ??= (async () => {
        const declared = Number(req.headers.get('content-length') ?? 0);
        if (declared > limitBytes) throw new AppError(413, 'Payload too large');
        const buffer = Buffer.from(await req.arrayBuffer());
        if (buffer.length > limitBytes) throw new AppError(413, 'Payload too large');
        return buffer;
      })();
      return rawBody;
    },
    body() {
      parsed ??= (async () => {
        if (!/\bjson\b/i.test(req.headers.get('content-type') ?? '')) return {};
        const raw = await ctx.raw(JSON_LIMIT_BYTES);
        if (raw.length === 0) return {};
        try {
          return JSON.parse(raw.toString('utf8')) as unknown;
        } catch {
          throw new AppError(400, 'Invalid JSON body');
        }
      })();
      return parsed;
    },
  };
  return ctx;
}

/**
 * The shared wrapper of every Attende route handler: opens the database, runs the guards (auth,
 * workspace, plan gate, rate limits), runs the handler, and turns any throw into the one error
 * body `{error, code, message, reference?, details?}`.
 */
export function route(guards: Guard[], handler: (ctx: HttpContext) => Promise<Response>): RouteHandler {
  return async (req, context) => {
    const path = new URL(req.url).pathname;
    try {
      const ctx = createContext(req, context);
      await connectDb();
      for (const guard of guards) await guard(ctx);
      return await handler(ctx);
    } catch (error) {
      return errorResponse(error, path, req.method);
    }
  };
}
