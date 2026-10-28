import 'server-only';
import type { Deps } from '../../deps';
import { codedError } from '../../lib/errors';
import { errMessage, log } from '../../lib/logger';
import { decideAccess, isOverLimit } from './deriveEntitlements';
import { pauseReasonsOf, pauseWorkspaceAgents, resumeWorkspaceAgents } from './enforcement';
import { AgentPauseModel, UsageCounterModel, type IAgentPause } from './models';
import { getEntitlements } from './service';

/** UTC calendar month, the AI-reply quota period. */
export const monthOf = (at: Date): string => at.toISOString().slice(0, 7);
const TRIAL = 'trial';

async function bump(workspaceId: string, period: string, inc: { aiReplies?: number; outbound?: number }) {
  return UsageCounterModel.findOneAndUpdate({ workspaceId, period }, { $inc: inc }, { upsert: true, new: true }).lean();
}

export async function counters(workspaceId: string, now: Date): Promise<{ aiReplies: number; outbound: number; trialOutbound: number }> {
  const rows = await UsageCounterModel.find({ workspaceId, period: { $in: [monthOf(now), TRIAL] } }).lean();
  const month = rows.find((r) => r.period === monthOf(now));
  return { aiReplies: month?.aiReplies ?? 0, outbound: month?.outbound ?? 0, trialOutbound: rows.find((r) => r.period === TRIAL)?.outbound ?? 0 };
}

/**
 * One AI reply sent by an Attende agent. Phase 4: the worker calls this for every agent reply it
 * sees on the JSYNQ websocket (JSYNQ has no per-workspace meter this service can read). When the
 * month's count reaches the plan's `aiRepliesPerMonth`, the workspace's agents are paused through
 * the existing binding pause route (reason `ai_quota`); `resumeAiQuotaPauses` lifts it next month
 * or after an upgrade. Never throws.
 */
export async function recordAiReply(deps: Pick<Deps, 'user' | 'now'>, workspaceId: string, count = 1): Promise<{ used: number; limit: number | null; paused: boolean }> {
  try {
    const row = await bump(workspaceId, monthOf(deps.now()), { aiReplies: count });
    const used = row?.aiReplies ?? count;
    const limit = (await getEntitlements(workspaceId))?.limits.aiRepliesPerMonth ?? null;
    if (limit === null || !isOverLimit(limit, used)) return { used, limit, paused: false };
    const already = (await pauseReasonsOf(workspaceId)).includes('ai_quota');
    if (!already) {
      log.warn('usage.ai_quota_reached', { workspaceId, used, limit });
      await pauseWorkspaceAgents(deps, workspaceId, 'ai_quota');
    }
    return { used, limit, paused: true };
  } catch (error) {
    log.error('usage.record_ai_reply_failed', { workspaceId, error: errMessage(error) });
    return { used: 0, limit: null, paused: false };
  }
}

/** A message the workspace sent (app or worker). Counted per month, and against the trial cap while trialing. */
export async function recordOutbound(deps: Pick<Deps, 'now'>, workspaceId: string, count = 1): Promise<void> {
  try {
    const ent = await getEntitlements(workspaceId);
    await bump(workspaceId, monthOf(deps.now()), { outbound: count });
    if (ent?.status === 'trialing') await bump(workspaceId, TRIAL, { outbound: count });
  } catch (error) {
    log.error('usage.record_outbound_failed', { workspaceId, error: errMessage(error) });
  }
}

/**
 * Before the workspace sends a message: the subscription must allow it (402 codes of the gate) and,
 * while trialing, the trial outbound cap must not be used up (403 `ATTENDE_QUOTA_EXCEEDED`,
 * `resource: 'trialOutbound'`). A workspace without Attende entitlements is not limited here.
 */
export async function assertCanSendOutbound(deps: Pick<Deps, 'now'>, workspaceId: string): Promise<void> {
  const ent = await getEntitlements(workspaceId);
  if (!ent) return;
  const decision = decideAccess(ent, deps.now());
  if (!decision.allowed) throw codedError(decision.status, decision.reference, decision.message);
  if (ent.status !== 'trialing' || !ent.trialOutboundCap) return;
  const used = (await counters(workspaceId, deps.now())).trialOutbound;
  if (used >= ent.trialOutboundCap) {
    throw codedError(403, 'ATTENDE_QUOTA_EXCEEDED', 'The trial reached its limit of sent messages', { resource: 'trialOutbound', limit: ent.trialOutboundCap, used });
  }
}

/** Reconcile: lifts `ai_quota` pauses whose month rolled over or whose plan now allows more. */
export async function resumeAiQuotaPauses(deps: Pick<Deps, 'user' | 'now'>, batch = 200): Promise<number> {
  const rows = await AgentPauseModel.find({ reasons: 'ai_quota' }).select('workspaceId').limit(batch).lean<IAgentPause[]>();
  let resumed = 0;
  for (const { workspaceId } of rows) {
    const limit = (await getEntitlements(workspaceId))?.limits.aiRepliesPerMonth;
    const used = (await counters(workspaceId, deps.now())).aiReplies;
    if (limit !== undefined && isOverLimit(limit, used)) continue;
    if (await resumeWorkspaceAgents(deps, workspaceId, 'ai_quota')) resumed += 1;
  }
  return resumed;
}
