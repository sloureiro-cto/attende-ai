import 'server-only';
import { codedError } from '../../lib/errors';
import { viaJsynq, type Channel, type UserClient } from '../../lib/jsynq';
import { AgentSetupModel, type IAgentSetup } from '../agents/models';
import { decideAccess, isOverLimit, type Entitlements } from './deriveEntitlements';
import { getEntitlements } from './service';
import type { TierLimits } from './tiers';

/** Plan limits Attende enforces itself, counted live from JSYNQ's own lists. */
export type PlanResource = keyof Pick<TierLimits, 'lines' | 'agents' | 'docs' | 'seats'>;

const CHANNELS: Channel[] = ['whatsapp', 'sms', 'instagram'];
const idOf = (v: unknown) => String((v as { _id?: unknown })?._id ?? v);

/**
 * Current use of one plan resource, from existing JSYNQ list routes with the caller's token:
 *  - lines:  `GET /api/{whatsapp,sms,instagram}-lite/sessions` (not deleted);
 *  - agents: the Attende agents that still exist in `GET /api/agents`, plus creates in flight
 *            (JSYNQ's own default agent and agents made outside Attende do not count);
 *  - docs:   `GET /api/workspace-knowledge/sources?kinds=library_document`;
 *  - seats:  members of `GET /api/workspaces/:id` plus pending `GET /api/invites/workspaces`.
 */
export async function liveCount(client: UserClient, workspaceId: string, resource: PlanResource, opts: { exceptClientRequestId?: string } = {}): Promise<number> {
  switch (resource) {
    case 'lines': {
      const lists = await Promise.all(CHANNELS.map((c) => client.listSessions(c)));
      return lists.reduce((n, rows) => n + rows.filter((r) => !r.deletedAt).length, 0);
    }
    case 'agents': {
      const [jsynqAgents, setups] = await Promise.all([
        client.listAgents(),
        AgentSetupModel.find({ workspaceId, state: { $in: ['ready', 'creating'] } }).select('agentId state clientRequestId').lean<IAgentSetup[]>(),
      ]);
      const live = new Set(jsynqAgents.filter((a) => a.isActive !== false).map((a) => String(a.id)));
      return setups.filter((s) => s.clientRequestId !== opts.exceptClientRequestId && (s.state === 'creating' || (s.agentId && live.has(s.agentId)))).length;
    }
    case 'docs':
      return (await client.listKnowledgeDocuments()).length;
    case 'seats': {
      const [ws, pending] = await Promise.all([client.getWorkspace(workspaceId), client.countPendingInvites()]);
      const members = new Set([...(ws?.owner ? [idOf(ws.owner)] : []), ...(ws?.members ?? []).map(idOf)]);
      return members.size + pending;
    }
  }
}

const LABEL: Record<PlanResource, string> = { lines: 'channels', agents: 'AI agents', docs: 'documents', seats: 'members' };

/**
 * Refuses an action that would take the workspace over its plan: first the access rules (402
 * `ATTENDE_TRIAL_EXPIRED` / `ATTENDE_SUBSCRIPTION_INACTIVE`, 403 `ATTENDE_NOT_ENTITLED`), then the
 * count (403 `ATTENDE_QUOTA_EXCEEDED`, `details: {resource, limit, used}`, the code the app already
 * shows as "plan limit reached"). JSYNQ unreachable: 503, fail closed.
 */
export async function assertPlanAllows(
  client: UserClient,
  workspaceId: string,
  resource: PlanResource,
  opts: { adding?: number; now?: Date; exceptClientRequestId?: string; entitlements?: Entitlements | null } = {}
): Promise<void> {
  const ent = opts.entitlements !== undefined ? opts.entitlements : await getEntitlements(workspaceId);
  const decision = decideAccess(ent, opts.now ?? new Date());
  if (!decision.allowed) throw codedError(decision.status, decision.reference, decision.message);
  const limit = ent!.limits[resource];
  if (limit === undefined || limit < 0) return;
  const adding = opts.adding ?? 1;
  const used = await viaJsynq(() => liveCount(client, workspaceId, resource, opts));
  if (isOverLimit(limit, used + adding - 1)) {
    throw codedError(403, 'ATTENDE_QUOTA_EXCEEDED', `Your plan reached its limit of ${LABEL[resource]}`, { resource, limit, used });
  }
}
