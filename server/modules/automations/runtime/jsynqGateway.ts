import 'server-only';
import { jsynqRequest, JsynqError } from '../../../lib/jsynq';
import type { BusinessHours } from '../lib/conditions';
import type { ConversationContext, ConversationGateway, ConversationKey } from './ports';

const HOURS_TTL_MS = 5 * 60_000;

/**
 * `ConversationGateway` over the JSYNQ partner conversation API (scope `conversations:write`),
 * with this service's partner key.
 *
 * Partner key, not a user token: the runtime acts on inbound messages and timers, when no user
 * is signed in, and a stored user JWT would expire (24 h) and carry one user's permissions.
 *
 * `inboundUrl` is this service's `POST /api/jsynq/inbound`. JSYNQ only accepts it on the origin of an
 * active webhook endpoint of ours, and signs the inbound calls with that endpoint's secret
 * (`JSYNQ_WEBHOOK_SECRET`).
 *
 * Every action carries the caller's per-step `Idempotency-Key`: a retry of the same step is a
 * replay in JSYNQ (24 h), a later step, even to the same column, is a new action.
 */
export function jsynqConversationGateway(partnerKey: string, opts: { inboundUrl: string }): ConversationGateway {
  const ws = (id: string) => `/api/partner/v1/workspaces/${encodeURIComponent(id)}`;
  const conv = (k: ConversationKey) => `${ws(k.workspaceId)}/conversations/${k.channel}/${encodeURIComponent(k.conversationId)}`;
  const call = async <T>(method: 'GET' | 'POST' | 'PUT' | 'PATCH', path: string, body?: unknown, o: { idempotencyKey?: string; query?: Record<string, string> } = {}) =>
    (
      await jsynqRequest<T>({
        method,
        path,
        auth: partnerKey,
        body,
        query: o.query,
        headers: o.idempotencyKey ? { 'Idempotency-Key': o.idempotencyKey } : undefined,
        idempotent: method === 'GET' || method === 'PUT' || !!o.idempotencyKey,
        timeoutMs: 10_000,
      })
    ).body;
  const hours = new Map<string, { value: BusinessHours | null; until: number }>();
  const sendResult = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof JsynqError ? (error.reference ?? String(error.status)) : (error as Error).message };
    }
  };

  return {
    async setInboundRouting(workspaceId, sessions) {
      await call('PUT', `${ws(workspaceId)}/inbound-routing`, { sessions, url: opts.inboundUrl });
    },
    async context(key) {
      return (await call<ConversationContext>('GET', `${conv(key)}/context`)) ?? { vars: {} };
    },
    async humanRepliedSince(key, since) {
      return !!(await call<{ replied: boolean }>('GET', `${conv(key)}/human-replied`, undefined, { query: { since: since.toISOString() } }))?.replied;
    },
    sendText: (key, text, o) => sendResult(() => call('POST', `${conv(key)}/messages`, { text }, o)),
    sendTemplate: (key, templateId, o) => sendResult(() => call('POST', `${conv(key)}/messages`, { templateId }, o)),
    moveCard: (key, input, o) =>
      sendResult(() => call('POST', `${conv(key)}/card/move`, { columnId: input.columnId, ...(input.boardId ? { boardId: input.boardId } : {}) }, o)),
    async addLabel(key, cardId, text, color, o) {
      await call('POST', `${ws(key.workspaceId)}/cards/${encodeURIComponent(cardId)}/labels`, { text, ...(color ? { color } : {}) }, o);
    },
    async setCardField(key, cardId, fieldId, value, o) {
      await call('PATCH', `${ws(key.workspaceId)}/cards/${encodeURIComponent(cardId)}/fields`, { fieldId, value }, o);
    },
    async handoff(key, assign, reason, o) {
      await call('POST', `${conv(key)}/handoff`, { ...assign, reason: reason.slice(0, 300) }, o);
    },
    async businessHours(workspaceId) {
      const hit = hours.get(workspaceId);
      if (hit && hit.until > Date.now()) return hit.value;
      const value = (await call<{ businessHours: BusinessHours | null }>('GET', `${ws(workspaceId)}/business-hours`))?.businessHours ?? null;
      hours.set(workspaceId, { value, until: Date.now() + HOURS_TTL_MS });
      return value;
    },
  };
}
