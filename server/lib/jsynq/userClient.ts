import 'server-only';
import { jsynqRequest, unwrap } from './http';
import type { Channel, JsynqAgent, JsynqBinding, JsynqCard, JsynqContactDeal, JsynqConversation, JsynqDirectoryEntry, JsynqInboxRow, JsynqKanbanColumns, JsynqKnowledgeSource, JsynqLanguage, JsynqMessage, JsynqOwnedWorkspace, JsynqProject, JsynqSession, JsynqTool, JsynqWorkspace } from './types';

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

  /** `GET /api/workspaces/:w/messaging/inbox/conversations`: every channel, `lastMessageAt desc`, keyset cursor, limit <= 50. */
  const inbox = async (
    workspaceId: string,
    query: { cursor?: string; limit?: number; conversationState?: string; assignee?: 'all' | 'unassigned'; conversationId?: string }
  ): Promise<{ rows: JsynqInboxRow[]; nextCursor: string | null; hasMore: boolean }> => {
    const res = await call<{ data?: JsynqInboxRow[]; meta?: { nextCursor?: string | null; hasMore?: boolean } }>(
      'GET',
      `/api/workspaces/${encodeURIComponent(workspaceId)}/messaging/inbox/conversations`,
      {
        query: {
          channel: 'all',
          limit: query.limit ?? 50,
          cursor: query.cursor,
          conversationState: query.conversationState,
          assignee: query.assignee,
          conversationId: query.conversationId,
        },
      }
    );
    return { rows: res.body?.data ?? [], nextCursor: res.body?.meta?.nextCursor ?? null, hasMore: !!res.body?.meta?.hasMore };
  };

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

    // --- CRM (funnel): existing project / board / card routes, access enforced by JSYNQ ----------

    /** `GET /api/projects` oldest first (JSYNQ has no type filter: the caller keeps the CRM ones). */
    async listProjectsDetailed(): Promise<JsynqProject[]> {
      const res = await call<{ projects?: JsynqProject[] }>('GET', '/api/projects', { query: { limit: 50, page: 1, sortBy: 'createdAt', sortOrder: 'asc' } });
      return res.body?.projects ?? [];
    },
    /** `GET /api/projects/:p/columns/kanban[?boardId=]`: the board (default when omitted) and its columns in board order. */
    async kanbanColumns(projectId: string, boardId?: string): Promise<JsynqKanbanColumns> {
      const res = await call<JsynqKanbanColumns>('GET', `/api/projects/${encodeURIComponent(projectId)}/columns/kanban`, { query: { boardId } });
      return res.body;
    },
    /** `GET /api/projects/:p/boards/:b/cards/initial`: one card per column, only for `pagination.total` per column. */
    async boardColumnTotals(projectId: string, boardId: string): Promise<Record<string, number>> {
      const res = await call<{ columns?: Record<string, { pagination?: { total?: number } }> }>(
        'GET',
        `/api/projects/${encodeURIComponent(projectId)}/boards/${encodeURIComponent(boardId)}/cards/initial`,
        { query: { limitPerColumn: 1, includeTimeEntries: 'false' } }
      );
      const out: Record<string, number> = {};
      for (const [columnId, col] of Object.entries(res.body?.columns ?? {})) out[columnId] = Number(col?.pagination?.total ?? 0) || 0;
      return out;
    },
    /** `GET /api/projects/:p/cards/paginated` (skip/limit, `{total}`), top-level cards only. */
    async listCardsPage(projectId: string, query: Record<string, string | number | undefined>): Promise<{ cards: JsynqCard[]; total: number }> {
      const res = await call<{ cards?: JsynqCard[]; pagination?: { total?: number } }>('GET', `/api/projects/${encodeURIComponent(projectId)}/cards/paginated`, { query });
      return { cards: res.body?.cards ?? [], total: Number(res.body?.pagination?.total ?? 0) || 0 };
    },
    async getCard(projectId: string, cardId: string): Promise<JsynqCard | null> {
      const res = await call<{ card?: JsynqCard }>('GET', `/api/projects/${encodeURIComponent(projectId)}/cards/${encodeURIComponent(cardId)}`);
      return res.body?.card ?? null;
    },
    /**
     * `PUT /api/projects/:p/cards/:id` with `{column}`: the route the CRM kanban moves a lead with. JSYNQ takes the
     * status from the new column, checks board access, writes the audit log and publishes `card.moved` (automations).
     */
    async moveCard(projectId: string, cardId: string, columnId: string): Promise<JsynqCard | null> {
      const res = await call<{ card?: JsynqCard }>('PUT', `/api/projects/${encodeURIComponent(projectId)}/cards/${encodeURIComponent(cardId)}`, { body: { column: columnId }, idempotent: true });
      return res.body?.card ?? null;
    },
    async listLabels(projectId: string, boardId?: string): Promise<Array<{ _id: string; text?: string; color?: string | null }>> {
      const res = await call<{ labels?: Array<{ _id: string; text?: string; color?: string | null }> }>('GET', `/api/projects/${encodeURIComponent(projectId)}/labels`, { query: { boardId } });
      return res.body?.labels ?? [];
    },
    async listLeadSources(projectId: string, boardId?: string): Promise<Array<{ _id: string; text?: string; color?: string | null }>> {
      const res = await call<unknown>('GET', `/api/projects/${encodeURIComponent(projectId)}/lead-sources`, { query: { boardId } });
      const body = res.body as { leadSources?: unknown; data?: unknown } | unknown[] | null;
      const list = Array.isArray(body) ? body : (body as { leadSources?: unknown })?.leadSources ?? unwrap<unknown>(body);
      return Array.isArray(list) ? (list as Array<{ _id: string; text?: string; color?: string | null }>) : [];
    },
    /** `GET /api/users/workspaces/:id`: members with name and photo. */
    async listWorkspaceUsers(workspaceId: string): Promise<Array<{ id: string; name?: string; email?: string; image?: string | null }>> {
      const res = await call<{ members?: Array<{ id: string; name?: string; email?: string; image?: string | null }> }>('GET', `/api/users/workspaces/${encodeURIComponent(workspaceId)}`);
      return res.body?.members ?? [];
    },
    /** `GET /api/workspaces/:w/directory` (page/limit <= 100). */
    async listDirectory(workspaceId: string, query: Record<string, string | number | undefined>): Promise<{ items: JsynqDirectoryEntry[]; hasNextPage: boolean }> {
      const res = await call<{ items?: JsynqDirectoryEntry[]; pagination?: { hasNextPage?: boolean } }>('GET', `/api/workspaces/${encodeURIComponent(workspaceId)}/directory`, { query });
      return { items: res.body?.items ?? [], hasNextPage: !!res.body?.pagination?.hasNextPage };
    },
    /** `GET /api/workspaces/:w/contacts/:id/deals` (newest first, limit <= 100), every board of the workspace. */
    async listContactDeals(workspaceId: string, contactId: string, limit = 100): Promise<JsynqContactDeal[]> {
      const res = await call<{ items?: JsynqContactDeal[] }>('GET', `/api/workspaces/${encodeURIComponent(workspaceId)}/contacts/${encodeURIComponent(contactId)}/deals`, { query: { limit, page: 1 } });
      return res.body?.items ?? [];
    },
    /** `GET /api/projects/:p/cards/:id/{whatsapp,instagram,sms}-conversations`: the card's conversations, newest first. */
    async listCardConversations(projectId: string, cardId: string, channel: Channel): Promise<JsynqConversation[]> {
      const res = await call<unknown>('GET', `/api/projects/${encodeURIComponent(projectId)}/cards/${encodeURIComponent(cardId)}/${channel}-conversations`);
      const list = unwrap<unknown>(res.body);
      return Array.isArray(list) ? (list as JsynqConversation[]) : [];
    },

    // --- messaging (reports) ----------------------------------------------------------------

    /** `GET /api/workspaces/:w/messaging/inbox/conversations`: every channel, `lastMessageAt desc`, keyset cursor, limit <= 50. */
    listInboxConversations: inbox,
    /** One conversation through the inbox deep link (`?conversationId=`): state, assignee, binding, linked card. Null when not visible. */
    async getInboxConversation(workspaceId: string, conversationId: string): Promise<JsynqInboxRow | null> {
      const page = await inbox(workspaceId, { conversationId, limit: 1 });
      return page.rows.find((r) => String(r.conversation?._id) === conversationId) ?? null;
    },

    // --- messaging (worker: automations and handoff assignment) -------------------------------

    /**
     * `POST /api/{channel}-lite/sessions/:s/conversations/:id/messages` `{text}`: sends as the token's member
     * (`senderType: 'user'`). Not idempotent in JSYNQ: the caller keeps its own idempotency record.
     */
    async sendConversationMessage(channel: Channel, sessionId: string, conversationId: string, text: string): Promise<{ _id: string | null }> {
      const res = await call<unknown>('POST', `${SESSION_PATH[channel]}/${encodeURIComponent(sessionId)}/conversations/${encodeURIComponent(conversationId)}/messages`, {
        body: { text },
        timeoutMs: 30_000,
      });
      const data = unwrap<{ _id?: unknown; id?: unknown } | null>(res.body);
      const id = data?._id ?? data?.id;
      return { _id: id ? String(id) : null };
    },
    /** `POST /api/{channel}-lite/conversations/:id/state` `{newState, reason}` (JSYNQ checks the transition). */
    async setConversationState(channel: Channel, conversationId: string, newState: string, reason?: string): Promise<void> {
      await call('POST', `/api/${channel}-lite/conversations/${encodeURIComponent(conversationId)}/state`, { body: { newState, reason }, idempotent: true });
    },
    /** `PATCH /api/{channel}-lite/sessions/:s/conversations/:id/assign` `{userId}`. */
    async assignConversation(channel: Channel, sessionId: string, conversationId: string, userId: string): Promise<void> {
      await call('PATCH', `${SESSION_PATH[channel]}/${encodeURIComponent(sessionId)}/conversations/${encodeURIComponent(conversationId)}/assign`, { body: { userId } });
    },
    /** `POST /api/projects/:p/label` `{text, color}`. */
    async createLabel(projectId: string, input: { text: string; color: string }): Promise<{ _id: string }> {
      const res = await call<{ label?: { _id?: unknown } }>('POST', `/api/projects/${encodeURIComponent(projectId)}/label`, { body: input });
      const id = res.body?.label?._id;
      if (!id) throw new Error('JSYNQ label creation returned no id');
      return { _id: String(id) };
    },
    /** `PUT /api/projects/:p/cards/:id` with a partial body (`addLabelIds`, `customFields` merge with what the card has). */
    async updateCard(projectId: string, cardId: string, body: Record<string, unknown>): Promise<JsynqCard | null> {
      const res = await call<{ card?: JsynqCard }>('PUT', `/api/projects/${encodeURIComponent(projectId)}/cards/${encodeURIComponent(cardId)}`, { body, idempotent: true });
      return res.body?.card ?? null;
    },
    /**
     * One page of a conversation's messages, newest first. WhatsApp and SMS page by `offset`; Instagram by `before`
     * (ISO, `createdAt <`). Content comes back as JSYNQ serves it (WhatsApp decrypted by JSYNQ); reports never read it.
     */
    async listConversationMessages(
      channel: Channel,
      sessionId: string,
      conversationId: string,
      page: { limit: number; offset?: number; before?: string }
    ): Promise<JsynqMessage[]> {
      const path = `${SESSION_PATH[channel]}/${encodeURIComponent(sessionId)}/conversations/${encodeURIComponent(conversationId)}/messages`;
      const query = channel === 'instagram' ? { limit: page.limit, before: page.before } : { limit: page.limit, offset: page.offset ?? 0 };
      const res = await call<unknown>('GET', path, { query });
      const list = unwrap<unknown>(res.body);
      return Array.isArray(list) ? (list as JsynqMessage[]) : [];
    },

    async listWorkspaceRoles(workspaceId: string): Promise<Array<{ _id: string; name?: string }>> {
      const res = await call<{ roles?: Array<{ _id: string; name?: string }> }>('GET', `/api/roles/workspaces/${encodeURIComponent(workspaceId)}`);
      return res.body?.roles ?? [];
    },
  };
}

export type UserClient = ReturnType<typeof userClient>;
