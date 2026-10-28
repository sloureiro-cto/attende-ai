import 'server-only';
import { env } from '../../config/env';
import { jsynqRequest } from './http';
import type { JsynqLimitsDoc, JsynqLimitsInput, JsynqLoginToken, JsynqUsage, JsynqWebhookEndpoint } from './types';

const BASE = '/api/partner/v1';
const ws = (id: string) => `${BASE}/workspaces/${encodeURIComponent(id)}`;

/**
 * JSYNQ partner API (`/api/partner/v1`) with this service's partner key. Used for signup
 * (users/workspaces/login tokens), limits, usage, features, analytics and webhook endpoints.
 * Every endpoint is idempotent (by e-mail, idempotencyKey or full replacement), so all are retried.
 */
export function partnerClient(key: string = env().JSYNQ_PARTNER_API_KEY) {
  const call = <T>(method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, opts: { body?: unknown; query?: Record<string, string | undefined>; headers?: Record<string, string>; idempotent?: boolean } = {}) =>
    jsynqRequest<T>({ method, path, auth: key, idempotent: true, ...opts });

  return {
    /** 201 created / 200 already ours. 409 USER_EXISTS_UNMANAGED when the e-mail belongs to someone else. */
    async createUser(input: { email: string; name: string; password?: string; locale?: 'pt' | 'en' | 'es' }) {
      const res = await call<{ userId: string; created: boolean }>('POST', `${BASE}/users`, { body: { ...input, emailVerified: true } });
      return res.body;
    },
    async loginToken(userId: string): Promise<JsynqLoginToken> {
      return (await call<JsynqLoginToken>('POST', `${BASE}/users/${encodeURIComponent(userId)}/login-token`)).body;
    },
    async createWorkspace(input: { name: string; ownerUserId: string; language?: 'pt' | 'en' | 'es'; idempotencyKey: string; seed?: Array<'crm_project'> }) {
      return (await call<{ workspaceId: string; created: boolean; crmProjectId?: string }>('POST', `${BASE}/workspaces`, { body: input })).body;
    },
    async deleteWorkspace(workspaceId: string): Promise<void> {
      await call('DELETE', ws(workspaceId));
    },
    async putLimits(workspaceId: string, limits: JsynqLimitsInput): Promise<JsynqLimitsDoc> {
      return (await call<JsynqLimitsDoc>('PUT', `${ws(workspaceId)}/limits`, { body: limits })).body;
    },
    async getLimits(workspaceId: string): Promise<JsynqLimitsDoc> {
      return (await call<JsynqLimitsDoc>('GET', `${ws(workspaceId)}/limits`)).body;
    },
    async getUsage(workspaceId: string, month?: string): Promise<JsynqUsage> {
      return (await call<JsynqUsage>('GET', `${ws(workspaceId)}/usage`, { query: { month } })).body;
    },
    async setFeatures(workspaceId: string, features: { conversationAnalytics: boolean }) {
      return (await call<{ features: { conversationAnalytics: boolean } }>('PATCH', `${ws(workspaceId)}/features`, { body: features })).body;
    },
    async createWebhookEndpoint(input: { url: string; events: string[] }): Promise<JsynqWebhookEndpoint> {
      return (await call<JsynqWebhookEndpoint>('POST', `${BASE}/webhook-endpoints`, { body: input, idempotent: false })).body;
    },
    async listWebhookEndpoints(): Promise<JsynqWebhookEndpoint[]> {
      return (await call<{ endpoints: JsynqWebhookEndpoint[] }>('GET', `${BASE}/webhook-endpoints`)).body.endpoints ?? [];
    },
    async deleteWebhookEndpoint(endpointId: string): Promise<void> {
      await call('DELETE', `${BASE}/webhook-endpoints/${encodeURIComponent(endpointId)}`);
    },
  };
}

export type PartnerClient = ReturnType<typeof partnerClient>;
