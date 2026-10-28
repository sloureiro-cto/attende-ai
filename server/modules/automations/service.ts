import 'server-only';
import mongoose from 'mongoose';
import { AppError, badRequest, codedError } from '../../lib/errors';
import type { UserClient } from '../../lib/jsynq';
import { viaJsynq } from '../../lib/jsynq';
import { conditionShapeIssues } from './lib/conditions';
import { automationRegexIssues } from './lib/automationRegexIssues';
import { utcDay } from './lib/advancedAutomationStats';
import type { ParsedAutomationCreate, ParsedAutomationPatch } from './lib/parseAdvancedAutomationInput';
import { blockingIssues, validateAdvancedAutomation, type AdvancedAutomationIssue } from './lib/validateAdvancedAutomation';
import { AdvancedAutomationModel, AdvancedAutomationStatsModel, type IAdvancedAutomation } from './models';
import type { AdvancedAutomationChannel, AdvancedAutomationNode, AdvancedAutomationStatus } from './types';

export const LIST_MAX_LIMIT = 100;

/** Workspace facts read from JSYNQ with the user's token (sessions, members, roles). */
export type WorkspaceDirectory = {
  sessionIds(channel: AdvancedAutomationChannel): Promise<Set<string>>;
  memberIds(): Promise<Set<string>>;
  roleIds(): Promise<Set<string>>;
  /** JSYNQ agents of the workspace (AI handoff targets). Optional: without it the agent ids are not checked. */
  agentIds?(): Promise<Set<string>>;
  /**
   * `channel:sessionId` (lowercase) of every session with an `all_inbound` JSYNQ agent binding that is not completed
   * (active or paused). Optional: without it the conflict rule is not checked.
   */
  agentBoundSessions?(): Promise<Set<string>>;
};

export function jsynqDirectory(client: UserClient, workspaceId: string): WorkspaceDirectory {
  const id = (v: unknown) => String((v as { _id?: unknown })?._id ?? v).toLowerCase();
  return {
    async sessionIds(channel) {
      const rows = await viaJsynq(() => client.listSessions(channel));
      return new Set(rows.filter((r) => !r.deletedAt && r.status !== 'disabled').map((r) => String(r._id).toLowerCase()));
    },
    async memberIds() {
      const ws = await viaJsynq(() => client.getWorkspace(workspaceId));
      return new Set([...(ws?.owner ? [id(ws.owner)] : []), ...(ws?.members ?? []).map(id)]);
    },
    async roleIds() {
      return new Set((await viaJsynq(() => client.listWorkspaceRoles(workspaceId))).map((r) => id(r._id)));
    },
    async agentIds() {
      return new Set((await viaJsynq(() => client.listAgents())).map((a) => String(a.id).toLowerCase()));
    },
    async agentBoundSessions() {
      const rows = await viaJsynq(() => client.listBindings());
      return new Set(
        rows
          .filter((b) => b.agentId && b.targetType === 'all_inbound' && b.status !== 'completed' && b.sessionId)
          .map((b) => `${String(b.channel).toLowerCase()}:${String(b.sessionId).toLowerCase()}`)
      );
    },
  };
}

const notFound = () => new AppError(404, 'Advanced automation not found');
const invalid = (message: string, issues?: AdvancedAutomationIssue[]) => badRequest(message, issues ? { issues } : undefined);
const conflict = () => new AppError(409, 'This automation was changed by someone else. Reload and try again.');
const isOid = (id: string) => /^[0-9a-f]{24}$/i.test(id);
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function conditionIssues(a: { nodes: AdvancedAutomationNode[]; trigger: ParsedAutomationCreate['trigger'] }): AdvancedAutomationIssue[] {
  const issues: AdvancedAutomationIssue[] = [];
  if (a.trigger.filter) issues.push(...conditionShapeIssues(a.trigger.filter, 'trigger.filter'));
  for (const node of a.nodes) {
    if (node?.kind !== 'condition') continue;
    for (const row of node.rows ?? []) issues.push(...conditionShapeIssues(row.condition, `nodes[${node.id}].rows[${row.id}]`));
  }
  return issues;
}

/** Save-time check that every user/role a handoff step names belongs to this workspace. */
async function handoffTargetIssues(dir: WorkspaceDirectory, nodes: AdvancedAutomationNode[]): Promise<AdvancedAutomationIssue[]> {
  const userIds = new Set<string>();
  const roleIds = new Set<string>();
  const agentIds = new Set<string>();
  for (const n of nodes) {
    if (n?.kind !== 'handoff') continue;
    if (n.assignMode === 'specific_user' && n.specificUserId) userIds.add(n.specificUserId.toLowerCase());
    if (n.assignMode === 'member_list') for (const id of n.userIds ?? []) userIds.add(id.toLowerCase());
    if (n.assignMode === 'by_workspace_role' && n.workspaceRoleId) roleIds.add(n.workspaceRoleId.toLowerCase());
    if (n.to === 'ai' && n.agentId) agentIds.add(n.agentId.toLowerCase());
  }
  const issues: AdvancedAutomationIssue[] = [];
  if (agentIds.size && dir.agentIds) {
    const agents = await dir.agentIds();
    for (const id of agentIds) if (!agents.has(id)) issues.push({ path: 'handoff', message: `agent ${id} does not exist in this workspace` });
  }
  if (userIds.size) {
    const members = await dir.memberIds();
    for (const id of userIds) if (!members.has(id)) issues.push({ path: 'handoff', message: `user ${id} is not a member of this workspace` });
  }
  if (roleIds.size) {
    const roles = await dir.roleIds();
    for (const id of roleIds) if (!roles.has(id)) issues.push({ path: 'handoff', message: `role ${id} does not exist in this workspace` });
  }
  return issues;
}

export type ListParams = { q?: string; status?: AdvancedAutomationStatus; channel?: AdvancedAutomationChannel; page?: number; limit?: number };

/** CRUD + save-time rules of advanced automations (same HTTP shapes as the JSYNQ-era API). */
export class AutomationService {
  constructor(
    private readonly dir: WorkspaceDirectory,
    /** Called after a write that may change which sessions have active automations (the phase-4 worker may hook in). */
    private readonly onActiveSessionsChanged: (workspaceId: string) => Promise<void> = async () => undefined
  ) {}

  async list(workspaceId: string, params: ListParams = {}) {
    const limit = Math.min(LIST_MAX_LIMIT, Math.max(1, Math.floor(params.limit ?? 25)));
    const page = Math.max(1, Math.floor(params.page ?? 1));
    const base = { workspaceId };
    const filter: Record<string, unknown> = {
      ...base,
      ...(params.status ? { status: params.status } : {}),
      ...(params.channel ? { 'channels.channel': params.channel } : {}),
      ...(params.q?.trim() ? { name: { $regex: escapeRegex(params.q.trim()), $options: 'i' } } : {}),
    };
    const [rows, total, counts] = await Promise.all([
      AdvancedAutomationModel.aggregate<Omit<IAdvancedAutomation, 'nodes' | 'edges'> & { stepCount: number }>([
        { $match: filter },
        { $sort: { updatedAt: -1, _id: 1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit },
        { $project: { name: 1, status: 1, channels: 1, version: 1, updatedAt: 1, stepCount: { $size: { $ifNull: ['$nodes', []] } } } },
      ]),
      AdvancedAutomationModel.countDocuments(filter),
      AdvancedAutomationModel.aggregate<{ _id: AdvancedAutomationStatus; n: number }>([{ $match: base }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
    ]);
    const since = new Date(Date.now() - 30 * 86_400_000);
    const statRows = rows.length
      ? await AdvancedAutomationStatsModel.aggregate<{ _id: string; started: number; completed: number }>([
          { $match: { workspaceId, automationId: { $in: rows.map((r) => String(r._id)) }, dayDate: { $gte: new Date(`${utcDay(since)}T00:00:00.000Z`) } } },
          { $group: { _id: '$automationId', started: { $sum: { $ifNull: ['$started', 0] } }, completed: { $sum: { $ifNull: ['$completed', 0] } } } },
        ])
      : [];
    const stats = new Map(statRows.map((s) => [s._id, s]));
    const byStatus = Object.fromEntries(counts.map((c) => [c._id, c.n]));
    return {
      items: rows.map((r) => ({
        id: String(r._id),
        name: r.name,
        status: r.status,
        channels: (r.channels ?? []).map((c) => ({ channel: c.channel, enabledSessionIds: (c.enabledSessionIds ?? []).map(String) })),
        stepCount: r.stepCount,
        version: r.version,
        updatedAt: new Date(r.updatedAt).toISOString(),
        stats30d: { started: stats.get(String(r._id))?.started ?? 0, completed: stats.get(String(r._id))?.completed ?? 0 },
      })),
      total,
      page,
      limit,
      totals: { all: counts.reduce((n, c) => n + c.n, 0), active: byStatus.active ?? 0, paused: byStatus.paused ?? 0, draft: byStatus.draft ?? 0 },
    };
  }

  private async load(workspaceId: string, id: string): Promise<IAdvancedAutomation> {
    if (!isOid(id)) throw notFound();
    const doc = await AdvancedAutomationModel.findOne({ _id: new mongoose.Types.ObjectId(id), workspaceId }).lean<IAdvancedAutomation>();
    if (!doc) throw notFound();
    return doc;
  }

  async get(workspaceId: string, id: string) {
    const doc = await this.load(workspaceId, id);
    return { ...doc, _id: String(doc._id), id: String(doc._id), issues: validateAdvancedAutomation(doc) };
  }

  /** Sessions must belong to the workspace (JSYNQ, user token); an unknown id is an error, never dropped. */
  private async resolveChannels(channels: ParsedAutomationCreate['channels']): Promise<IAdvancedAutomation['channels']> {
    const out: IAdvancedAutomation['channels'] = [];
    for (const binding of channels) {
      const requested = [...new Set(binding.enabledSessionIds.map((s) => s.toLowerCase()))];
      if (requested.length) {
        const known = await this.dir.sessionIds(binding.channel);
        if (requested.some((id) => !known.has(id))) throw invalid(`Some ${binding.channel} accounts do not belong to this workspace or are unavailable`);
      }
      out.push({ channel: binding.channel, enabledSessionIds: requested });
    }
    return out;
  }

  private async assertActivatable(
    workspaceId: string,
    a: Pick<ParsedAutomationCreate, 'nodes' | 'edges' | 'startNodeId' | 'trigger'> & { channels: IAdvancedAutomation['channels'] },
    selfId?: string
  ) {
    const issues = [...validateAdvancedAutomation(a), ...conditionIssues(a)];
    if (!a.channels.some((c) => c.enabledSessionIds.length > 0)) issues.push({ path: 'channels', message: 'select at least one account the automation runs on' });
    const targets = a.nodes.flatMap((n) => (n?.kind === 'goto_automation' ? [n.automationId] : []));
    if (targets.length) {
      const found = await AdvancedAutomationModel.find({ workspaceId, _id: { $in: targets.filter(isOid).map((t) => new mongoose.Types.ObjectId(t)) } })
        .select('_id')
        .lean();
      const known = new Set(found.map((f) => String(f._id)));
      for (const id of targets) {
        if (!known.has(id.toLowerCase()) && id !== selfId) issues.push({ path: 'goto_automation', message: `automation ${id} does not exist in this workspace` });
      }
    }
    if (issues.length) throw invalid('The automation is incomplete and cannot be activated', issues);
    await this.assertNoInboundAgent(a.channels);
  }

  /**
   * Conflict rule: a session an active automation runs on must not also have an `all_inbound` JSYNQ agent binding
   * (active or paused), or both would answer every message. Activation is REFUSED (409 `AUTOMATION_SESSION_HAS_AGENT`)
   * instead of pausing the other binding: pausing would silently stop an agent someone put live, and would not last
   * (the agent's go-live, a billing reactivation or JSYNQ's own UI resume it, and then both answer). The person moves
   * the agent off the line (or picks other lines) and activates again. The agent side checks the reverse at go-live
   * (`ATTENDE_AUTOMATION_ON_LINE`).
   */
  private async assertNoInboundAgent(channels: IAdvancedAutomation['channels']) {
    if (!this.dir.agentBoundSessions) return;
    const requested = channels.flatMap((c) => c.enabledSessionIds.map((s) => ({ channel: c.channel, sessionId: s })));
    if (!requested.length) return;
    const bound = await this.dir.agentBoundSessions();
    const clashes = requested.filter((r) => bound.has(`${r.channel}:${r.sessionId.toLowerCase()}`));
    if (clashes.length) {
      throw codedError(409, 'AUTOMATION_SESSION_HAS_AGENT', 'An AI agent already answers every message on some of these accounts. Remove the agent from them or pick other accounts, then activate.', {
        sessions: clashes,
      });
    }
  }

  async create(workspaceId: string, userId: string, input: ParsedAutomationCreate) {
    const blocking = [...blockingIssues(validateAdvancedAutomation(input)), ...automationRegexIssues(input)];
    if (blocking.length) throw invalid('Invalid automation', blocking);
    const targetIssues = await handoffTargetIssues(this.dir, input.nodes);
    if (targetIssues.length) throw invalid('Invalid automation', targetIssues);
    const channels = await this.resolveChannels(input.channels);
    if (input.status === 'active') await this.assertActivatable(workspaceId, { ...input, channels });
    const doc = await AdvancedAutomationModel.create({
      workspaceId,
      name: input.name,
      status: input.status,
      channels,
      trigger: input.trigger,
      stopOnHumanReply: input.stopOnHumanReply,
      startNodeId: input.startNodeId,
      nodes: input.nodes,
      edges: input.edges,
      version: 1,
      createdBy: userId,
      updatedBy: userId,
    });
    if (input.status === 'active') await this.onActiveSessionsChanged(workspaceId);
    return this.get(workspaceId, String(doc._id));
  }

  async update(workspaceId: string, userId: string, id: string, patch: ParsedAutomationPatch) {
    const current = await this.load(workspaceId, id);
    if (patch.expectedUpdatedAt && current.updatedAt.getTime() > Date.parse(patch.expectedUpdatedAt)) throw conflict();
    const graphChanged = patch.nodes !== undefined || patch.edges !== undefined || patch.startNodeId !== undefined;
    const next = {
      nodes: patch.nodes ?? current.nodes,
      edges: patch.edges ?? current.edges,
      startNodeId: patch.startNodeId ?? current.startNodeId,
      trigger: patch.trigger ?? current.trigger,
      status: patch.status ?? current.status,
    };
    if (graphChanged || patch.trigger !== undefined) {
      const blocking = [...blockingIssues(validateAdvancedAutomation(next)), ...automationRegexIssues(next)];
      if (blocking.length) throw invalid('Invalid automation', blocking);
    }
    if (graphChanged) {
      const targetIssues = await handoffTargetIssues(this.dir, next.nodes);
      if (targetIssues.length) throw invalid('Invalid automation', targetIssues);
    }
    const channels = patch.channels !== undefined ? await this.resolveChannels(patch.channels) : current.channels;
    if (next.status === 'active') await this.assertActivatable(workspaceId, { ...next, channels }, String(current._id));

    const $set: Record<string, unknown> = { updatedBy: userId };
    for (const k of ['name', 'status', 'trigger', 'stopOnHumanReply', 'nodes', 'edges', 'startNodeId'] as const) if (patch[k] !== undefined) $set[k] = patch[k];
    if (patch.channels !== undefined) $set.channels = channels;
    // Optimistic lock on the document we validated against.
    const written = await AdvancedAutomationModel.updateOne(
      { _id: current._id, workspaceId, updatedAt: current.updatedAt },
      { $set, ...(graphChanged ? { $inc: { version: 1 } } : {}) }
    );
    if (written.matchedCount === 0) throw conflict();
    if (current.status === 'active' || next.status === 'active') await this.onActiveSessionsChanged(workspaceId);
    return this.get(workspaceId, id);
  }

  async remove(workspaceId: string, id: string): Promise<void> {
    const current = await this.load(workspaceId, id);
    await AdvancedAutomationModel.deleteOne({ _id: current._id, workspaceId });
    if (current.status === 'active') await this.onActiveSessionsChanged(workspaceId);
  }
}

/** Sessions with at least one active automation (what JSYNQ must route to this service). */
export async function activeSessions(workspaceId: string): Promise<Array<{ channel: AdvancedAutomationChannel; sessionId: string }>> {
  const rows = await AdvancedAutomationModel.find({ workspaceId, status: 'active' }).select('channels').lean<Array<Pick<IAdvancedAutomation, 'channels'>>>();
  const seen = new Map<string, { channel: AdvancedAutomationChannel; sessionId: string }>();
  for (const r of rows) for (const c of r.channels ?? []) for (const s of c.enabledSessionIds ?? []) seen.set(`${c.channel}:${s}`, { channel: c.channel, sessionId: s });
  return [...seen.values()];
}
