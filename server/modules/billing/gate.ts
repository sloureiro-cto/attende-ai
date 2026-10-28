import 'server-only';
import { AppError } from '../../lib/errors';
import type { HttpContext } from '../../lib/http';
import { decideAccess } from './deriveEntitlements';
import { getEntitlements } from './service';

/**
 * Plan gate for Attende routes. Use after `requireUser` + `requireWorkspace`.
 * 403 `ATTENDE_NOT_ENTITLED`, 402 `ATTENDE_TRIAL_EXPIRED` / `ATTENDE_SUBSCRIPTION_INACTIVE`
 * (code in `reference` and in `details.code`). One local read per request, no cache.
 */
export async function entitlementGate(ctx: HttpContext): Promise<void> {
  const workspaceId = ctx.auth?.workspaceId;
  if (!workspaceId) throw new AppError(401, 'Authentication required', 'AUTH_REQUIRED');
  const decision = decideAccess(await getEntitlements(workspaceId));
  if (!decision.allowed) throw new AppError(decision.status, decision.message, decision.reference, { code: decision.reference });
}
