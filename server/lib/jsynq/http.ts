import 'server-only';
import { env } from '../../config/env';
import { errMessage, log } from '../logger';

/** A JSYNQ call that failed. `status` 0 = network/timeout. `reference` is JSYNQ's machine code when it sent one. */
export class JsynqError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly reference?: string,
    readonly details?: unknown
  ) {
    super(message);
    this.name = 'JsynqError';
  }
}

export type JsynqRequest = {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  /** Bearer credential; absent for JSYNQ's public routes (signup, OTP). */
  auth?: string;
  query?: Record<string, string | number | undefined>;
  body?: unknown;
  form?: FormData;
  headers?: Record<string, string>;
  /** Safe to repeat (GET/PUT/DELETE by default; POST only when the endpoint is idempotent by key). */
  idempotent?: boolean;
  timeoutMs?: number;
};

export type JsynqResponse<T> = { status: number; body: T; headers: Headers };

const RETRY_DELAYS_MS = [200, 800];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function url(path: string, query?: JsynqRequest['query']): string {
  const u = new URL(path, env().JSYNQ_API_URL.replace(/\/+$/, '') + '/');
  for (const [k, v] of Object.entries(query ?? {})) if (v !== undefined && v !== '') u.searchParams.set(k, String(v));
  return u.toString();
}

const retryable = (status: number) => status === 0 || status === 429 || status === 502 || status === 503 || status === 504;

/**
 * One HTTP call to JSYNQ with a timeout, retries for idempotent calls (network errors, 429, 502-504)
 * and error mapping to `JsynqError`. The credential is never logged.
 */
export async function jsynqRequest<T>(req: JsynqRequest): Promise<JsynqResponse<T>> {
  const idempotent = req.idempotent ?? req.method !== 'POST';
  const attempts = idempotent ? RETRY_DELAYS_MS.length + 1 : 1;
  let last: JsynqError | undefined;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (attempt > 0) await sleep(RETRY_DELAYS_MS[attempt - 1]!);
    try {
      return await once<T>(req);
    } catch (error) {
      last = error instanceof JsynqError ? error : new JsynqError(0, errMessage(error));
      if (!retryable(last.status) || attempt === attempts - 1) break;
      log.warn('jsynq.retry', { method: req.method, path: req.path, status: last.status, attempt: attempt + 1 });
    }
  }
  throw last!;
}

async function once<T>(req: JsynqRequest): Promise<JsynqResponse<T>> {
  const headers: Record<string, string> = { ...(req.auth ? { Authorization: `Bearer ${req.auth}` } : {}), Accept: 'application/json', ...req.headers };
  let body: RequestInit['body'];
  if (req.form) body = req.form;
  else if (req.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(req.body);
  }
  let res: Response;
  try {
    res = await fetch(url(req.path, req.query), {
      method: req.method,
      headers,
      body,
      redirect: 'manual',
      signal: AbortSignal.timeout(req.timeoutMs ?? env().JSYNQ_TIMEOUT_MS),
    });
  } catch (error) {
    throw new JsynqError(0, `JSYNQ unreachable: ${errMessage(error)}`);
  }
  const text = res.status === 204 ? '' : await res.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }
  if (!res.ok) {
    const b = (parsed && typeof parsed === 'object' ? parsed : {}) as { message?: unknown; reference?: unknown; details?: unknown };
    const details = b.details as { code?: unknown } | undefined;
    const reference = typeof b.reference === 'string' ? b.reference : typeof details?.code === 'string' ? details.code : undefined;
    throw new JsynqError(res.status, typeof b.message === 'string' ? b.message : `JSYNQ answered ${res.status}`, reference, b.details);
  }
  return { status: res.status, body: parsed as T, headers: res.headers };
}

/** JSYNQ wraps most user routes in `{ success, data }`. */
export const unwrap = <T>(body: unknown): T =>
  (body && typeof body === 'object' && 'data' in (body as object) ? (body as { data: T }).data : (body as T));
