import 'server-only';
import mongoose from 'mongoose';
import { codedError } from '../../lib/errors';
import { sha256Hex } from '../../lib/crypto';
import { viaJsynq } from '../../lib/jsynq';
import { errMessage, log } from '../../lib/logger';
import { isOverLimit } from '../billing/deriveEntitlements';
import { getEntitlements } from '../billing/service';
import { AGENT_CAPABILITIES, AGENT_RATE_LIMIT, AGENT_TOOL_NAMES, agentModelConfig, buildBindingPolicy } from './lib/agentProfile';
import { runDryRun, type DryRunResult } from './lib/dryRun';
import { validateAgentForm, type FromTemplateBody, type PatchSetupBody } from './lib/formSchema';
import { agentDisplayName, compileAgentProfile } from './lib/promptCompiler';
import { AgentSetupModel, type AgentLine, type IAgentSetup } from './models';
import type { AgentPorts, LineStatus } from './ports';
import { ATTENDE_TEMPLATES, getTemplate } from './templates';
import { ATTENDE_AGENT_ERROR_CODES as CODES, type AttendeeAgentForm, type AttendeeChannel, type AttendeeTemplateKey } from './types';

export type AgentContext = { workspaceId: string; userId: string };

export type AgentStatus = 'draft' | 'paused' | 'live';

export type AgentView = {
  id: string;
  agentId: string;
  templateKey: AttendeeTemplateKey;
  name: string;
  status: AgentStatus;
  form: AttendeeAgentForm;
  lines: Array<{ channel: AttendeeChannel; sessionId: string; bindingId?: string; exists: boolean; connected: boolean; label?: string; active: boolean }>;
  crm?: { projectId: string; columnId: string };
  documents: Array<{ documentId: string; name: string; mimeType?: string; sizeBytes?: number; uploadedAt: string }>;
  lastTestPassedAt?: string;
  liveSince?: string;
  /** The prompt in JSYNQ is not the one this service compiled (edited outside). Re-pushed on the next edit or go-live. */
  promptDrift?: boolean;
  createdAt: string;
  updatedAt: string;
  warnings?: string[];
};

/** A `creating` setup older than this is a crashed create: a retry may take it over. */
export const CREATE_STALE_MS = 2 * 60_000;

const promptHash = (prompt: string) => sha256Hex(prompt);

/**
 * Attende agents on top of JSYNQ: a short form becomes a JSYNQ agent (prompt compiled here,
 * `toolNames`, `knowledgeTrust: 'untrusted'`) plus one paused binding per line. The form stays here
 * as the source of truth; `compiledPromptHash` detects prompts edited in JSYNQ.
 */
export class AgentService {
  constructor(
    private readonly ports: AgentPorts,
    private readonly now: () => Date = () => new Date()
  ) {}

  listTemplates() {
    return ATTENDE_TEMPLATES;
  }

  async list(workspaceId: string): Promise<AgentView[]> {
    const rows = await AgentSetupModel.find({ workspaceId, state: 'ready' }).sort({ createdAt: -1 }).limit(100).lean<IAgentSetup[]>();
    if (rows.length === 0) return [];
    const [agents, statuses, lineStatuses] = await viaJsynq(() =>
      Promise.all([this.ports.listAgents(), this.ports.bindingStatus(), this.ports.lineStatuses(rows.flatMap((r) => r.lines))])
    );
    let offset = 0;
    return rows.map((r) => {
      const ls = lineStatuses.slice(offset, offset + r.lines.length);
      offset += r.lines.length;
      return this.render(r, agents.get(String(r.agentId)) ?? null, statuses, ls);
    });
  }

  async get(workspaceId: string, id: string): Promise<AgentView> {
    return this.toView(await this.load(workspaceId, id));
  }

  // --- create ----------------------------------------------------------------------------

  async createFromTemplate(ctx: AgentContext, body: FromTemplateBody): Promise<{ view: AgentView; created: boolean }> {
    const template = getTemplate(body.templateKey);
    if (!template) throw codedError(404, CODES.TEMPLATE_NOT_FOUND, 'Unknown template');
    const form = this.validateForm(body.templateKey, body.form);

    const existing = await AgentSetupModel.findOne({ workspaceId: ctx.workspaceId, clientRequestId: body.clientRequestId }).lean<IAgentSetup>();
    if (existing?.state === 'ready') return { view: await this.toView(existing), created: false };

    const current = await AgentSetupModel.countDocuments({ workspaceId: ctx.workspaceId, state: { $ne: 'failed' }, clientRequestId: { $ne: body.clientRequestId } });
    const ent = await getEntitlements(ctx.workspaceId);
    if (ent && isOverLimit(ent.limits.agents, current)) {
      throw codedError(403, CODES.QUOTA_AGENTS, 'Your plan reached its limit of AI agents', { resource: 'agents', limit: ent.limits.agents });
    }
    await this.assertLines(body.lines);
    await this.assertHandoffTarget(form);

    const setup = await this.claimCreate(ctx, body, form);
    const profile = compileAgentProfile(body.templateKey, form);
    const created: { agentId?: string; bindingIds: string[] } = { bindingIds: [] };
    try {
      const agent = await viaJsynq(() =>
        this.ports.createAgent({
          name: profile.name,
          description: profile.description,
          type: 'specialized',
          category: template.category === 'sales' ? 'sales' : 'support',
          modelConfig: agentModelConfig(),
          toolNames: [...AGENT_TOOL_NAMES],
          knowledgeTrust: 'untrusted',
          systemPrompt: profile.systemPrompt,
          confirmationRequired: false,
          allowSubAgents: false,
          rateLimit: AGENT_RATE_LIMIT,
          capabilities: AGENT_CAPABILITIES,
          isActive: true,
        })
      );
      created.agentId = agent.id;
      await AgentSetupModel.updateOne({ _id: setup._id }, { $set: { 'pending.agentId': agent.id } });

      const policy = buildBindingPolicy(form, body.crm);
      const lines: AgentLine[] = [];
      for (const line of body.lines) {
        const binding = await viaJsynq(() => this.ports.createBinding({ agentId: agent.id, channel: line.channel, sessionId: line.sessionId, policy }));
        created.bindingIds.push(binding.id);
        await AgentSetupModel.updateOne({ _id: setup._id }, { $push: { 'pending.bindingIds': binding.id } });
        // New agents start PAUSED: nothing answers a real contact before `go-live`.
        await viaJsynq(() => this.ports.pauseBinding(binding.id));
        lines.push({ channel: line.channel, sessionId: line.sessionId, bindingId: binding.id });
      }

      const ready = await AgentSetupModel.findOneAndUpdate(
        { _id: setup._id, state: 'creating' },
        {
          $set: { state: 'ready', agentId: agent.id, lines, compiledPromptHash: promptHash(profile.systemPrompt), ...(body.crm ? { crm: body.crm } : {}) },
          $unset: { pending: 1 },
        },
        { new: true }
      ).lean<IAgentSetup>();
      if (!ready) throw new Error('setup was taken over during create');
      log.info('agent.created', { workspaceId: ctx.workspaceId, setupId: String(setup._id), agentId: agent.id, lines: lines.length });
      return { view: await this.toView(ready), created: true };
    } catch (error) {
      await this.rollbackCreate(String(setup._id), created);
      throw error;
    }
  }

  /**
   * Reserves the `clientRequestId` (unique index) before anything is created in JSYNQ. A crashed
   * attempt (`creating` for > 2 min) or a rolled-back one is taken over after its leftovers are removed.
   */
  private async claimCreate(ctx: AgentContext, body: FromTemplateBody, form: AttendeeAgentForm): Promise<IAgentSetup> {
    const doc = { workspaceId: ctx.workspaceId, templateKey: body.templateKey, form, clientRequestId: body.clientRequestId, createdBy: ctx.userId, state: 'creating', pending: { bindingIds: [] } };
    try {
      return (await AgentSetupModel.create(doc)).toObject() as IAgentSetup;
    } catch (error) {
      if ((error as { code?: number }).code !== 11000) throw error;
    }
    const staleBefore = new Date(this.now().getTime() - CREATE_STALE_MS);
    const old = await AgentSetupModel.findOne({ workspaceId: ctx.workspaceId, clientRequestId: body.clientRequestId }).lean<IAgentSetup>();
    if (old?.state === 'ready') throw codedError(409, 'ATTENDE_AGENT_CREATE_IN_PROGRESS', 'This agent was just created; reload it');
    if (!old || (old.state === 'creating' && old.updatedAt > staleBefore)) {
      throw codedError(409, 'ATTENDE_AGENT_CREATE_IN_PROGRESS', 'This agent is still being created, try again in a moment');
    }
    await this.cleanupPending(old);
    const taken = await AgentSetupModel.findOneAndUpdate(
      { _id: old._id, state: old.state, updatedAt: old.updatedAt },
      { $set: { ...doc, state: 'creating' } },
      { new: true }
    ).lean<IAgentSetup>();
    if (!taken) throw codedError(409, 'ATTENDE_AGENT_CREATE_IN_PROGRESS', 'This agent is still being created, try again in a moment');
    return taken;
  }

  /** Undo a failed create. If JSYNQ cleanup fails, the setup stays `failed` for the sweeper. */
  private async rollbackCreate(setupId: string, created: { agentId?: string; bindingIds: string[] }) {
    const ok = await this.cleanupPending({ pending: created } as IAgentSetup);
    if (ok) await AgentSetupModel.deleteOne({ _id: setupId, state: 'creating' });
    else await AgentSetupModel.updateOne({ _id: setupId }, { $set: { state: 'failed', pending: created } });
  }

  /** Deletes the JSYNQ leftovers of an unfinished create. True when nothing is left behind. */
  async cleanupPending(setup: Pick<IAgentSetup, 'pending'>): Promise<boolean> {
    let ok = true;
    for (const id of setup.pending?.bindingIds ?? []) {
      await this.ports.deleteBinding(id).catch((error) => {
        if ((error as { status?: number }).status !== 404) ok = false;
        log.warn('agent.rollback_binding_failed', { bindingId: id, error: errMessage(error) });
      });
    }
    if (setup.pending?.agentId) {
      await this.ports.deleteAgent(setup.pending.agentId).catch((error) => {
        if ((error as { status?: number }).status !== 404) ok = false;
        log.warn('agent.rollback_agent_failed', { agentId: setup.pending?.agentId, error: errMessage(error) });
      });
    }
    return ok;
  }

  // --- edits -----------------------------------------------------------------------------

  async patchSetup(ctx: AgentContext, id: string, body: PatchSetupBody): Promise<AgentView> {
    const setup = await this.load(ctx.workspaceId, id);
    const form = this.validateForm(setup.templateKey, body.form);
    await this.assertHandoffTarget(form);
    const profile = compileAgentProfile(setup.templateKey, form);
    const crm = body.crm === null ? undefined : (body.crm ?? setup.crm);
    const policy = buildBindingPolicy(form, crm);

    const statuses = await viaJsynq(() => this.ports.bindingStatus());
    const isLive = setup.lines.some((l) => l.bindingId && statuses.get(l.bindingId) === 'active');

    let lines = setup.lines;
    if (body.lines) {
      await this.assertLines(body.lines);
      const wanted = new Map(body.lines.map((l) => [`${l.channel}:${l.sessionId}`, l]));
      const kept: AgentLine[] = [];
      for (const line of setup.lines) {
        const key = `${line.channel}:${line.sessionId}`;
        if (wanted.has(key)) {
          kept.push(line);
          wanted.delete(key);
        } else if (line.bindingId) {
          await viaJsynq(() => this.ports.deleteBinding(line.bindingId!));
        }
      }
      for (const line of wanted.values()) {
        const binding = await viaJsynq(() => this.ports.createBinding({ agentId: String(setup.agentId), channel: line.channel, sessionId: line.sessionId, policy }));
        if (!isLive) await viaJsynq(() => this.ports.pauseBinding(binding.id));
        kept.push({ channel: line.channel, sessionId: line.sessionId, bindingId: binding.id });
      }
      lines = kept;
    }

    for (const line of lines) if (line.bindingId) await viaJsynq(() => this.ports.updateBindingPolicy(line.bindingId!, policy));
    await this.pushPrompt(setup, profile);

    const updated = await AgentSetupModel.findOneAndUpdate(
      { _id: setup._id, workspaceId: ctx.workspaceId },
      {
        $set: { form, lines, compiledPromptHash: promptHash(profile.systemPrompt), ...(crm ? { crm } : {}) },
        // Any edit invalidates the last passed test.
        $unset: { lastTestPassedAt: 1, ...(crm ? {} : { crm: 1 }) },
      },
      { new: true }
    ).lean<IAgentSetup>();
    return this.toView(updated ?? setup);
  }

  private async pushPrompt(setup: IAgentSetup, profile: { name: string; description: string; systemPrompt: string }) {
    await viaJsynq(() => this.ports.updateAgent(String(setup.agentId), { name: profile.name, description: profile.description, systemPrompt: profile.systemPrompt }));
  }

  // --- go live / pause -------------------------------------------------------------------

  async goLive(ctx: AgentContext, id: string): Promise<AgentView> {
    const setup = await this.load(ctx.workspaceId, id);
    if (setup.lines.length === 0) throw codedError(409, CODES.NOT_READY, 'Connect at least one line before going live', { reason: 'no_lines' });
    const statuses = await viaJsynq(() => this.ports.lineStatuses(setup.lines));
    const disconnected = statuses.filter((s) => !s.connected);
    if (disconnected.length > 0) {
      throw codedError(409, CODES.LINE_NOT_CONNECTED, 'Every selected line must be connected to go live', {
        lines: disconnected.map((s) => ({ channel: s.channel, sessionId: s.sessionId, exists: s.exists })),
      });
    }

    // Drift check: if the prompt was edited in JSYNQ, the form wins again before answering contacts.
    const profile = compileAgentProfile(setup.templateKey, setup.form);
    const agent = await viaJsynq(() => this.ports.getAgent(String(setup.agentId)));
    if (!agent) throw codedError(409, CODES.NOT_READY, 'The JSYNQ agent no longer exists', { reason: 'agent_missing' });
    if (agent.systemPrompt === undefined || promptHash(agent.systemPrompt) !== promptHash(profile.systemPrompt)) {
      await this.pushPrompt(setup, profile);
      log.info('agent.prompt_repushed', { workspaceId: ctx.workspaceId, agentId: setup.agentId });
    }

    const bindingStatuses = await viaJsynq(() => this.ports.bindingStatus());
    for (const line of setup.lines) {
      if (line.bindingId && bindingStatuses.get(line.bindingId) !== 'active') {
        await viaJsynq(() => this.ports.resumeBinding(line.bindingId!));
      }
    }
    const updated = await AgentSetupModel.findOneAndUpdate(
      { _id: setup._id, workspaceId: ctx.workspaceId },
      { $set: { liveSince: this.now(), compiledPromptHash: promptHash(profile.systemPrompt) } },
      { new: true }
    ).lean<IAgentSetup>();
    const view = await this.toView(updated ?? setup);
    // Going live without a passed test is allowed, but flagged so the UI can nudge.
    const warnings = [...(setup.lastTestPassedAt ? [] : ['not_tested']), ...(setup.documents.length === 0 ? ['no_documents'] : [])];
    return warnings.length ? { ...view, warnings } : view;
  }

  async pause(ctx: AgentContext, id: string): Promise<AgentView> {
    const setup = await this.load(ctx.workspaceId, id);
    const statuses = await viaJsynq(() => this.ports.bindingStatus());
    for (const line of setup.lines) {
      if (line.bindingId && statuses.get(line.bindingId) === 'active') await viaJsynq(() => this.ports.pauseBinding(line.bindingId!));
    }
    return this.toView(setup);
  }

  // --- dry run ---------------------------------------------------------------------------

  async test(ctx: AgentContext, id: string, input: { message?: string; at?: Date }): Promise<DryRunResult & { promptPreview: string }> {
    const setup = await this.load(ctx.workspaceId, id);
    const statuses = await viaJsynq(() => this.ports.lineStatuses(setup.lines));
    const profile = compileAgentProfile(setup.templateKey, setup.form);
    const result = runDryRun({
      form: setup.form,
      promptLength: profile.systemPrompt.length,
      lines: statuses,
      documentCount: setup.documents.length,
      message: input.message,
      at: input.at ?? this.now(),
    });
    if (result.passed) await AgentSetupModel.updateOne({ _id: setup._id, workspaceId: ctx.workspaceId }, { $set: { lastTestPassedAt: this.now() } });
    return { ...result, promptPreview: profile.systemPrompt };
  }

  // --- internals -------------------------------------------------------------------------

  /** By setup id or JSYNQ agent id, always inside the caller's workspace. */
  async load(workspaceId: string, id: string): Promise<IAgentSetup> {
    const or: Record<string, unknown>[] = [{ agentId: id }];
    if (mongoose.Types.ObjectId.isValid(id) && /^[0-9a-f]{24}$/i.test(id)) or.push({ _id: new mongoose.Types.ObjectId(id) });
    const setup = await AgentSetupModel.findOne({ workspaceId, state: 'ready', $or: or }).lean<IAgentSetup>();
    if (!setup) throw codedError(404, CODES.AGENT_NOT_FOUND, 'Agent not found');
    return setup;
  }

  private validateForm(templateKey: AttendeeTemplateKey, input: unknown): AttendeeAgentForm {
    const result = validateAgentForm(templateKey, input);
    if (!result.ok) throw codedError(400, CODES.VALIDATION, 'The form has invalid fields', { issues: result.issues });
    return result.form;
  }

  private async assertHandoffTarget(form: AttendeeAgentForm) {
    const target = form.handoff.target;
    if (target?.kind !== 'user' || !target.userId) return;
    const members = await viaJsynq(() => this.ports.memberIds());
    if (!members.has(target.userId)) {
      throw codedError(400, CODES.VALIDATION, 'The form has invalid fields', {
        issues: [{ path: 'handoff.target.userId', message: 'Not a member of this workspace' }],
      });
    }
  }

  private async assertLines(lines: Array<{ channel: AttendeeChannel; sessionId: string }>) {
    const seen = new Set<string>();
    for (const line of lines) {
      const key = `${line.channel}:${line.sessionId}`;
      if (seen.has(key)) throw codedError(400, CODES.VALIDATION, 'Duplicate line', { issues: [{ path: 'lines', message: 'Duplicate line' }] });
      seen.add(key);
    }
    const statuses = await viaJsynq(() => this.ports.lineStatuses(lines));
    const missing = statuses.find((s) => !s.exists);
    if (missing) throw codedError(400, CODES.LINE_NOT_FOUND, 'Line not found in this workspace', { channel: missing.channel, sessionId: missing.sessionId });
  }

  private async toView(setup: IAgentSetup): Promise<AgentView> {
    const [agent, statuses, lineStatuses] = await viaJsynq(() =>
      Promise.all([this.ports.getAgent(String(setup.agentId)).catch(() => null), this.ports.bindingStatus(), this.ports.lineStatuses(setup.lines)])
    );
    return this.render(setup, agent, statuses, lineStatuses);
  }

  private render(
    setup: IAgentSetup,
    agent: { name: string; systemPrompt?: string } | null,
    statuses: Map<string, string>,
    lineStatuses: LineStatus[]
  ): AgentView {
    const lines = setup.lines.map((l, i) => {
      const ls = lineStatuses[i];
      return {
        channel: l.channel,
        sessionId: l.sessionId,
        ...(l.bindingId ? { bindingId: l.bindingId } : {}),
        exists: ls?.exists ?? false,
        connected: ls?.connected ?? false,
        ...(ls?.label ? { label: ls.label } : {}),
        active: l.bindingId ? statuses.get(l.bindingId) === 'active' : false,
      };
    });
    const status: AgentStatus = lines.length === 0 ? 'draft' : lines.some((l) => l.active) ? 'live' : 'paused';
    const drift = !!(agent?.systemPrompt !== undefined && setup.compiledPromptHash && promptHash(agent.systemPrompt) !== setup.compiledPromptHash);
    return {
      id: String(setup._id),
      agentId: String(setup.agentId),
      templateKey: setup.templateKey,
      name: agent?.name ?? agentDisplayName(setup.templateKey, setup.form),
      status,
      form: setup.form,
      lines,
      ...(setup.crm ? { crm: { projectId: setup.crm.projectId, columnId: setup.crm.columnId } } : {}),
      documents: setup.documents.map((d) => ({
        documentId: d.documentId,
        name: d.name,
        ...(d.mimeType ? { mimeType: d.mimeType } : {}),
        ...(d.sizeBytes !== undefined ? { sizeBytes: d.sizeBytes } : {}),
        uploadedAt: new Date(d.uploadedAt).toISOString(),
      })),
      ...(setup.lastTestPassedAt ? { lastTestPassedAt: new Date(setup.lastTestPassedAt).toISOString() } : {}),
      ...(setup.liveSince ? { liveSince: new Date(setup.liveSince).toISOString() } : {}),
      ...(drift ? { promptDrift: true } : {}),
      createdAt: new Date(setup.createdAt).toISOString(),
      updatedAt: new Date(setup.updatedAt).toISOString(),
    };
  }
}
