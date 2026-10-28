import 'server-only';
import { jsynqRequest, unwrap } from './http';
import type { Channel, JsynqAgent, JsynqBinding, JsynqKnowledgeSource, JsynqLanguage, JsynqOwnedWorkspace, JsynqProject, JsynqSession, JsynqTool, JsynqWorkspace } from './types';

const SESSION_PATH: Record<Channel, string> = {
  whatsapp: '/api/whatsapp-lite/sessions',
  sms: '/api/sms-lite/sessions',
  instagram: '/api/instagram-lite/sessions',
};

/**
 * JSYNQ calls made AS the signed-in user: the user's own JWT is passed through, so JSYNQ applies
 * its normal membership, ACL and plan checks. Agent, binding, session and knowledge routes act on
 * the JWT's `workspaceId` claim (JSYNQ ignores any workspace in the URL/body there).
 */
export function userClient(token: string) {
  const call = <T>(method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE', path: string, opts: { body?: unknown; query?: Record<string, string | number | undefined>; form?: FormData; idempotent?: boolean; timeoutMs?: number } = {}) =>
    jsynqRequest<T>({ method, path, auth: token, ...opts });

  return {
    // --- workspaces (any signed-in user; delete = any member, soft delete) -------------------

    /** `POST /api/workspaces`: the caller becomes owner and member. JSYNQ also gives it its free plan and seeds its default agent. */
    async createWorkspace(input: { name: string; language: JsynqLanguage }): Promise<{ _id: string }> {
      const res = await call<{ workspace?: { _id?: unknown } }>('POST', '/api/workspaces', { body: input, timeoutMs: 45_000 });
      const id = res.body?.workspace?._id;
      if (!id) throw new Error('JSYNQ workspace creation returned no id');
      return { _id: String(id) };
    },
    /** `GET /api/workspaces/check-owner`: the caller's own (not deleted) workspaces. */
    async listOwnedWorkspaces(): Promise<JsynqOwnedWorkspace[]> {
      const res = await call<{ workspaces?: Array<JsynqOwnedWorkspace & { _id: unknown }> }>('GET', '/api/workspaces/check-owner');
      return (res.body?.workspaces ?? []).map((w) => ({ ...w, _id: String(w._id) }));
    },
    async deleteWorkspace(workspaceId: string): Promise<void> {
      await call('DELETE', `/api/workspaces/${encodeURIComponent(workspaceId)}`);
    },

    // --- projects (workspace from the JWT claim) ------------------------------------------

    async listProjects(): Promise<JsynqProject[]> {
      const res = await call<{ projects?: JsynqProject[] }>('GET', '/api/projects', { query: { limit: 50 } });
      return res.body?.projects ?? [];
    },
    /** `POST /api/projects`; with `projectType: {title: 'crm'}` JSYNQ creates the board and its default CRM columns. */
    async createProject(input: { title: string; private: boolean; projectType: { title: 'crm' | 'kanban' } }): Promise<{ _id: string }> {
      const res = await call<{ project?: { _id?: unknown } }>('POST', '/api/projects', { body: input, timeoutMs: 30_000 });
      const id = res.body?.project?._id;
      if (!id) throw new Error('JSYNQ project creation returned no id');
      return { _id: String(id) };
    },

    // --- tools ----------------------------------------------------------------------------

    /** `GET /api/workspaces/:id/mcp-tools`: the workspace's tool registry (platform tools have provider `jsynq`). */
    async listTools(workspaceId: string, query: { search?: string; provider?: string } = {}): Promise<JsynqTool[]> {
      const res = await call<unknown>('GET', `/api/workspaces/${encodeURIComponent(workspaceId)}/mcp-tools`, { query: { ...query, limit: 50 } });
      return unwrap<JsynqTool[]>(res.body) ?? [];
    },

    // --- members --------------------------------------------------------------------------

    /** Pending workspace invites (`GET /api/invites/workspaces?status=pending`): they take a seat once accepted. */
    async countPendingInvites(): Promise<number> {
      const res = await call<{ pagination?: { total?: number }; invites?: unknown[] }>('GET', '/api/invites/workspaces', { query: { status: 'pending', limit: 1 } });
      return res.body?.pagination?.total ?? res.body?.invites?.length ?? 0;
    },

    /** 200 = member (or owner), 403 = not. Also carries `owner`, `members` and `businessHours`. */
    async getWorkspace(workspaceId: string): Promise<JsynqWorkspace | null> {
      const res = await call<{ workspace: JsynqWorkspace | null }>('GET', `/api/workspaces/${encodeURIComponent(workspaceId)}`);
      return res.body?.workspace ?? null;
    },

    async createAgent(input: Record<string, unknown>): Promise<JsynqAgent> {
      return unwrap<JsynqAgent>((await call('POST', '/api/agents', { body: input, timeoutMs: 45_000 })).body);
    },
    async getAgent(agentId: string): Promise<JsynqAgent> {
      return unwrap<JsynqAgent>((await call('GET', `/api/agents/${encodeURIComponent(agentId)}`)).body);
    },
    async listAgents(): Promise<JsynqAgent[]> {
      return unwrap<JsynqAgent[]>((await call('GET', '/api/agents', { query: { limit: 100 } })).body) ?? [];
    },
    async updateAgent(agentId: string, patch: Record<string, unknown>): Promise<JsynqAgent> {
      return unwrap<JsynqAgent>((await call('PATCH', `/api/agents/${encodeURIComponent(agentId)}`, { body: patch, idempotent: true })).body);
    },
    async deleteAgent(agentId: string): Promise<void> {
      await call('DELETE', `/api/agents/${encodeURIComponent(agentId)}`);
    },

    async createBinding(input: Record<string, unknown>): Promise<JsynqBinding> {
      return unwrap<JsynqBinding>((await call('POST', '/api/automation-bindings', { body: input })).body);
    },
    async updateBindingPolicy(bindingId: string, policy: Record<string, unknown>): Promise<void> {
      await call('PATCH', `/api/automation-bindings/${encodeURIComponent(bindingId)}`, { body: { policy }, idempotent: true });
    },
    /** JSYNQ answers 404 when the binding is not in the expected state: pausing a paused binding is fine. */
    async pauseBinding(bindingId: string): Promise<void> {
      await call('POST', `/api/automation-bindings/${encodeURIComponent(bindingId)}/pause`, { idempotent: true });
    },
    async resumeBinding(bindingId: string): Promise<void> {
      await call('POST', `/api/automation-bindings/${encodeURIComponent(bindingId)}/resume`, { idempotent: true });
    },
    async deleteBinding(bindingId: string): Promise<void> {
      await call('DELETE', `/api/automation-bindings/${encodeURIComponent(bindingId)}`);
    },
    async listBindings(query: { agentId?: string; channel?: string } = {}): Promise<JsynqBinding[]> {
      return unwrap<JsynqBinding[]>((await call('GET', '/api/automation-bindings', { query: { ...query, limit: 200 } })).body) ?? [];
    },

    async listSessions(channel: Channel): Promise<JsynqSession[]> {
      return unwrap<JsynqSession[]>((await call('GET', SESSION_PATH[channel])).body) ?? [];
    },

    /** Upload to the workspace knowledge (published, workspace scope); JSYNQ schedules the indexing. */
    async uploadKnowledgeDocument(file: { buffer: Buffer; originalname: string; mimetype: string }): Promise<{ id: string; name: string }> {
      const form = new FormData();
      form.append('file', new Blob([new Uint8Array(file.buffer)], { type: file.mimetype }), file.originalname);
      form.append('name', file.originalname);
      const res = await call<{ document?: { _id: string; name?: string } }>('POST', '/api/workspace-knowledge/documents/upload', { form, timeoutMs: 120_000 });
      const doc = res.body?.document;
      if (!doc?._id) throw new Error('JSYNQ upload returned no document');
      return { id: String(doc._id), name: doc.name ?? file.originalname };
    },
    async deleteDocument(documentId: string): Promise<void> {
      await call('DELETE', `/api/documents/${encodeURIComponent(documentId)}`, { timeoutMs: 20_000 });
    },
    /** Every library document of the workspace knowledge (JSYNQ lists at most 200). */
    async listKnowledgeDocuments(): Promise<JsynqKnowledgeSource[]> {
      const res = await call<unknown>('GET', '/api/workspace-knowledge/sources', { query: { kinds: 'library_document' } });
      return unwrap<{ items?: JsynqKnowledgeSource[] }>(res.body)?.items ?? [];
    },
    async listKnowledgeSources(refIds: string[]): Promise<JsynqKnowledgeSource[]> {
      if (refIds.length === 0) return [];
      const res = await call<unknown>('GET', '/api/workspace-knowledge/sources', { query: { refIds: refIds.join(','), kinds: 'library_document' } });
      return unwrap<{ items?: JsynqKnowledgeSource[] }>(res.body)?.items ?? [];
    },

    async listWorkspaceRoles(workspaceId: string): Promise<Array<{ _id: string; name?: string }>> {
      const res = await call<{ roles?: Array<{ _id: string; name?: string }> }>('GET', `/api/roles/workspaces/${encodeURIComponent(workspaceId)}`);
      return res.body?.roles ?? [];
    },
  };
}

export type UserClient = ReturnType<typeof userClient>;
