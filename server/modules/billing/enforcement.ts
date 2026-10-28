import 'server-only';
import type { Deps } from '../../deps';
import { env } from '../../config/env';
import { JsynqError, serviceToken, type UserClient } from '../../lib/jsynq';
import { errMessage, log } from '../../lib/logger';
import { AgentSetupModel, type IAgentSetup } from '../agents/models';
import { agentsMustPause } from './deriveEntitlements';
import { AgentPauseModel, SubscriptionModel, type IAgentPause, type PauseReason } from './models';
import { getEntitlements } from './service';

type EnforcementDeps = Pick<Deps, 'user' | 'now'>;

/**
 * The member this service acts as in JSYNQ for a workspace when nobody is signed in: the user who
 * started the subscription (the owner), else the creator of an Attende agent. JSYNQ checks that
 * this user still belongs to the workspace.
 */
async function actorOf(workspaceId: string, setups: IAgentSetup[]): Promise<string | null> {
  const sub = await SubscriptionModel.findOne({ workspaceId }).select('userId').lean();
  if (sub?.userId && /^[0-9a-f]{24}$/i.test(sub.userId)) return sub.userId;
  return setups[0]?.createdBy ?? null;
}

/** A JSYNQ client acting in `workspaceId` as its owner, or null when there is nobody to act as. */
export async function workspaceClient(deps: Pick<Deps, 'user'>, workspaceId: string): Promise<UserClient | null> {
  const setups = await AgentSetupModel.find({ workspaceId, state: 'ready' }).select('createdBy').limit(1).lean<IAgentSetup[]>();
  const actor = await actorOf(workspaceId, setups);
  return actor ? deps.user(serviceToken({ userId: actor }, workspaceId)) : null;
}

const attendeBindingIds = (setups: IAgentSetup[]) => new Set(setups.flatMap((s) => s.lines.map((l) => l.bindingId).filter((id): id is string => !!id)));

/**
 * Pauses every active binding of the workspace's Attende agents (existing JSYNQ route
 * `POST /api/automation-bindings/:id/pause`) and records why. Idempotent: run again, it pauses
 * whatever was resumed meanwhile. Never throws; false when JSYNQ could not be reached (the
 * reconcile cron retries).
 */
export async function pauseWorkspaceAgents(deps: EnforcementDeps, workspaceId: string, reason: PauseReason): Promise<boolean> {
  await AgentPauseModel.updateOne(
    { workspaceId },
    { $addToSet: { reasons: reason }, $setOnInsert: { bindingIds: [], pausedAt: deps.now() } },
    { upsert: true }
  );
  const setups = await AgentSetupModel.find({ workspaceId, state: 'ready' }).lean<IAgentSetup[]>();
  const ours = attendeBindingIds(setups);
  if (ours.size === 0) return true;
  try {
    const actor = await actorOf(workspaceId, setups);
    if (!actor) throw new Error('no member to act as');
    const client = deps.user(serviceToken({ userId: actor }, workspaceId));
    const active = (await client.listBindings()).filter((b) => b.status === 'active' && ours.has(String(b._id))).map((b) => String(b._id));
    const paused: string[] = [];
    for (const id of active) {
      try {
        await client.pauseBinding(id);
        paused.push(id);
      } catch (error) {
        // 404 = no longer active: nothing to pause.
        if (!(error instanceof JsynqError && error.status === 404)) throw error;
      }
    }
    await AgentPauseModel.updateOne({ workspaceId }, { $addToSet: { bindingIds: { $each: paused } }, $unset: { lastError: 1 } });
    log.info('agents.paused', { workspaceId, reason, bindings: paused.length });
    return true;
  } catch (error) {
    await AgentPauseModel.updateOne({ workspaceId }, { $set: { lastError: errMessage(error).slice(0, 300) } });
    log.warn('agents.pause_failed', { workspaceId, reason, error: errMessage(error) });
    return false;
  }
}

/**
 * Drops one pause reason; when none is left, resumes the bindings this service paused (only those
 * still belonging to an Attende agent) and forgets the pause. Never throws.
 */
export async function resumeWorkspaceAgents(deps: EnforcementDeps, workspaceId: string, reason: PauseReason): Promise<boolean> {
  const row = await AgentPauseModel.findOne({ workspaceId }).lean<IAgentPause>();
  if (!row || !row.reasons.includes(reason)) return true;
  if (row.reasons.some((r) => r !== reason)) {
    await AgentPauseModel.updateOne({ workspaceId }, { $pull: { reasons: reason } });
    return true;
  }
  const setups = await AgentSetupModel.find({ workspaceId, state: 'ready' }).lean<IAgentSetup[]>();
  const ours = attendeBindingIds(setups);
  const toResume = row.bindingIds.filter((id) => ours.has(id));
  try {
    if (toResume.length) {
      const actor = await actorOf(workspaceId, setups);
      if (!actor) throw new Error('no member to act as');
      const client = deps.user(serviceToken({ userId: actor }, workspaceId));
      for (const id of toResume) {
        try {
          await client.resumeBinding(id);
        } catch (error) {
          // 404 = not paused any more (or gone): nothing to resume.
          if (!(error instanceof JsynqError && error.status === 404)) throw error;
        }
      }
    }
    await AgentPauseModel.deleteOne({ workspaceId, reasons: [reason] });
    log.info('agents.resumed', { workspaceId, reason, bindings: toResume.length });
    return true;
  } catch (error) {
    await AgentPauseModel.updateOne({ workspaceId }, { $set: { lastError: errMessage(error).slice(0, 300) } });
    log.warn('agents.resume_failed', { workspaceId, reason, error: errMessage(error) });
    return false;
  }
}

export async function pauseReasonsOf(workspaceId: string): Promise<PauseReason[]> {
  return (await AgentPauseModel.findOne({ workspaceId }).select('reasons').lean<IAgentPause>())?.reasons ?? [];
}

/** A person paused (or deleted) one agent: its bindings must not come back with the workspace. */
export async function forgetPausedBindings(workspaceId: string, bindingIds: string[]): Promise<void> {
  if (bindingIds.length) await AgentPauseModel.updateOne({ workspaceId }, { $pull: { bindingIds: { $in: bindingIds } } });
}

/**
 * Trial expiry, cancellation, a long-lapsed paid period: the agents stop (reason `access`), and
 * come back on reactivation. The app itself is gated by `entitlementGate` from the same rules.
 */
export async function enforceAccess(deps: EnforcementDeps, workspaceId: string): Promise<void> {
  const ent = await getEntitlements(workspaceId);
  const mustPause = agentsMustPause(ent, env().BILLING_GRACE_DAYS, deps.now());
  const row = await AgentPauseModel.findOne({ workspaceId }).select('reasons lastError').lean<IAgentPause>();
  const paused = !!row?.reasons.includes('access');
  // A pause JSYNQ did not complete (`lastError`) is retried.
  if (mustPause && (!paused || row?.lastError)) await pauseWorkspaceAgents(deps, workspaceId, 'access');
  else if (!mustPause && paused) await resumeWorkspaceAgents(deps, workspaceId, 'access');
}
