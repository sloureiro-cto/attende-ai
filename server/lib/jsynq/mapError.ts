import 'server-only';
import { AppError } from '../errors';
import { JsynqError } from './http';

/**
 * Turns a failed JSYNQ call into this service's error. JSYNQ plan/limit refusals become the
 * Attende codes the app already branches on; JSYNQ being down is a 503.
 */
export function mapJsynqError(error: unknown): unknown {
  if (!(error instanceof JsynqError)) return error;
  const ref = error.reference;
  if (ref === 'WORKSPACE_LIMIT_REACHED')
    return new AppError(403, 'Your plan reached one of its limits', 'ATTENDE_QUOTA_EXCEEDED', { code: 'ATTENDE_QUOTA_EXCEEDED', jsynq: error.details });
  if (ref === 'WORKSPACE_SUSPENDED')
    return new AppError(402, 'The Attende-ai subscription is not active', 'ATTENDE_SUBSCRIPTION_INACTIVE', { code: 'ATTENDE_SUBSCRIPTION_INACTIVE' });
  if (error.status === 0 || error.status >= 500 || error.status === 429)
    return new AppError(503, 'JSYNQ is unavailable, try again', 'JSYNQ_UNAVAILABLE', { code: 'JSYNQ_UNAVAILABLE' });
  if (error.status === 401) return new AppError(401, 'Invalid or expired token', 'AUTH_INVALID');
  if (error.status === 403) return new AppError(403, error.message, 'JSYNQ_FORBIDDEN', { code: 'JSYNQ_FORBIDDEN' });
  if (error.status === 404) return new AppError(404, error.message, 'JSYNQ_NOT_FOUND', { code: 'JSYNQ_NOT_FOUND' });
  return new AppError(400, error.message, 'JSYNQ_REJECTED', { code: 'JSYNQ_REJECTED', status: error.status });
}

/** Runs a JSYNQ call and maps its failure. */
export async function viaJsynq<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    throw mapJsynqError(error);
  }
}
