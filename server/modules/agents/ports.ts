import 'server-only';
import type { UserClient } from '../../lib/jsynq';
import type { AttendeeChannel } from './types';

export type LineStatus = { channel: AttendeeChannel; sessionId: string; exists: boolean; connected: boolean; label?: string };

/** Everything the agent service needs from JSYNQ, behind a port (tests fake it; prod uses HTTP). */
export type AgentPorts = {
  createAgent(input: Record<string, unknown>): Promise<{ id: string }>;
  getAgent(agentId: string): Promise<{ name: string; systemPrompt?: string } | null>;
  listAgents(): Promise<Map<string, { name: string; systemPrompt?: string }>>;
  updateAgent(agentId: string, patch: { name: string; description: string; systemPrompt: string }): Promise<void>;
  deleteAgent(agentId: string): Promise<void>;
  createBinding(input: { agentId: string; channel: AttendeeChannel; sessionId: string; policy: Record<string, unknown> }): Promise<{ id: string }>;
  pauseBinding(bindingId: string): Promise<void>;
  resumeBinding(bindingId: string): Promise<void>;
  deleteBinding(bindingId: string): Promise<void>;
  updateBindingPolicy(bindingId: string, policy: Record<string, unknown>): Promise<void>;
  bindingStatus(): Promise<Map<string, 'active' | 'paused' | 'completed'>>;
  lineStatuses(lines: Array<{ channel: AttendeeChannel; sessionId: string }>): Promise<LineStatus[]>;
  memberIds(): Promise<Set<string>>;
  uploadDocument(file: { buffer: Buffer; originalname: string; mimetype: string }): Promise<{ id: string; name: string }>;
  deleteDocument(documentId: string): Promise<void>;
  indexStatus(documentIds: string[]): Promise<Map<string, { status: string; pageCount?: number; errorMessage?: string }>>;
};

const CONNECTED: Record<AttendeeChannel, (status?: string) => boolean> = {
  whatsapp: (s) => s === 'connected',
  instagram: (s) => s === 'active',
  sms: (s) => s !== 'disabled',
};

/** Production adapter: JSYNQ user routes with the caller's JWT. Lists are read once per instance. */
export function jsynqAgentPorts(client: UserClient, workspaceId: string): AgentPorts {
  const sessions = new Map<AttendeeChannel, Promise<Map<string, { status?: string; label?: string }>>>();
  const sessionsOf = (channel: AttendeeChannel) => {
    if (!sessions.has(channel)) {
      sessions.set(
        channel,
        client.listSessions(channel).then((rows) => new Map(rows.filter((r) => !r.deletedAt).map((r) => [String(r._id), { status: r.status, label: r.label }])))
      );
    }
    return sessions.get(channel)!;
  };
  let bindings: Promise<Map<string, 'active' | 'paused' | 'completed'>> | null = null;

  return {
    async createAgent(input) {
      const agent = await client.createAgent(input);
      return { id: String(agent.id) };
    },
    async getAgent(agentId) {
      const a = await client.getAgent(agentId);
      return a && a.isActive !== false ? { name: a.name, systemPrompt: a.systemPrompt } : null;
    },
    async listAgents() {
      return new Map((await client.listAgents()).map((a) => [String(a.id), { name: a.name, systemPrompt: a.systemPrompt }]));
    },
    async updateAgent(agentId, patch) {
      await client.updateAgent(agentId, patch);
    },
    async deleteAgent(agentId) {
      await client.deleteAgent(agentId);
    },
    async createBinding({ agentId, channel, sessionId, policy }) {
      bindings = null;
      const b = await client.createBinding({ agentId, channel, sessionId, targetType: 'all_inbound', mode: 'auto_reply', policy });
      return { id: String(b._id) };
    },
    async pauseBinding(id) {
      bindings = null;
      await client.pauseBinding(id);
    },
    async resumeBinding(id) {
      bindings = null;
      await client.resumeBinding(id);
    },
    async deleteBinding(id) {
      bindings = null;
      await client.deleteBinding(id);
    },
    async updateBindingPolicy(id, policy) {
      await client.updateBindingPolicy(id, policy);
    },
    async bindingStatus() {
      bindings ??= client.listBindings().then((rows) => new Map(rows.map((b) => [String(b._id), b.status])));
      return bindings;
    },
    async lineStatuses(lines) {
      return Promise.all(
        lines.map(async (l) => {
          const s = (await sessionsOf(l.channel)).get(l.sessionId);
          return { channel: l.channel, sessionId: l.sessionId, exists: !!s, connected: !!s && CONNECTED[l.channel](s.status), ...(s?.label ? { label: s.label } : {}) };
        })
      );
    },
    async memberIds() {
      const ws = await client.getWorkspace(workspaceId);
      const id = (v: unknown) => String((v as { _id?: unknown })?._id ?? v);
      return new Set([...(ws?.owner ? [id(ws.owner)] : []), ...(ws?.members ?? []).map(id)]);
    },
    uploadDocument: (file) => client.uploadKnowledgeDocument(file),
    deleteDocument: (id) => client.deleteDocument(id),
    async indexStatus(ids) {
      const rows = await client.listKnowledgeSources(ids);
      return new Map(rows.filter((r) => r.refId).map((r) => [String(r.refId), { status: r.status, pageCount: r.pageCount, errorMessage: r.errorMessage }]));
    },
  };
}
