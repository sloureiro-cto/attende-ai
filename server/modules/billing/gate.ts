import 'server-only';
import { AppError } from '../../lib/errors';
import type { HttpContext } from '../../lib/http';
import { decideAccess } from './deriveEntitlements';
import { BillingService, getEntitlements } from './service';

/** Workspaces found without any Attende access, so a free JSYNQ workspace is not re-read on every request. */
const NEGATIVE_TTL_MS = 60_000;
const NEGATIVE_MAX = 5_000;
const checkedWithout = new Map<string, number>();

/**
 * Plan gate for Attende routes. Use after `requireUser` + `requireWorkspace`.
 * 403 `ATTENDE_NOT_ENTITLED`, 402 `ATTENDE_TRIAL_EXPIRED` / `ATTENDE_SUBSCRIPTION_INACTIVE`
 * (code in `reference` and in `details.code`). One local read per request; a workspace with no stored entitlements is
 * looked up once in JSYNQ (`GET /api/subscriptions/me`, caller's token): a paid JSYNQ plan includes Attende.
 */
export async function entitlementGate(ctx: HttpContext): Promise<void> {
  const workspaceId = ctx.auth?.workspaceId;
  if (!workspaceId) throw new AppError(401, 'Authentication required', 'AUTH_REQUIRED');
  let ent = await getEntitlements(workspaceId);
  if (!ent && ctx.auth?.token && (checkedWithout.get(workspaceId) ?? 0) < Date.now()) {
    ent = await new BillingService(ctx.deps).refresh(workspaceId, { client: ctx.deps.user(ctx.auth.token), userId: ctx.auth.userId });
    if (!ent) {
      if (checkedWithout.size >= NEGATIVE_MAX) checkedWithout.clear();
      checkedWithout.set(workspaceId, Date.now() + NEGATIVE_TTL_MS);
    }
  }
  const decision = decideAccess(ent);
  if (!decision.allowed) throw new AppError(decision.status, decision.message, decision.reference, { code: decision.reference });
}
