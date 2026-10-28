import 'server-only';
import type { Deps } from '../../deps';
import { serviceToken, type UserClient } from '../../lib/jsynq';
import { workspaceActor } from '../billing/enforcement';

const ACTOR_TTL_MS = 5 * 60_000;
const WORKSPACE_TTL_MS = 60_000;

export type WorkspaceMembers = { ids: Set<string>; businessHours: unknown };

/**
 * JSYNQ clients acting in a workspace as its owner (`subscriptions.userId`, else an agent creator), with a token the
 * worker mints with `AUTH_SECRET` per call (10 min). JSYNQ applies that member's normal access. Tokens are never
 * logged or kept beyond the call.
 */
export class WorkspaceClients {
  private actors = new Map<string, { id: string | null; at: number }>();
  private workspaces = new Map<string, { value: WorkspaceMembers | null; at: number }>();

  constructor(private readonly deps: Pick<Deps, 'user'>) {}

  async actor(workspaceId: string): Promise<string | null> {
    const hit = this.actors.get(workspaceId);
    if (hit && Date.now() - hit.at < ACTOR_TTL_MS) return hit.id;
    const id = await workspaceActor(workspaceId);
    this.actors.set(workspaceId, { id, at: Date.now() });
    return id;
  }

  /** A client for one call (or a short batch). Null when nobody can act in the workspace. */
  async client(workspaceId: string): Promise<UserClient | null> {
    const actor = await this.actor(workspaceId);
    return actor ? this.deps.user(serviceToken({ userId: actor }, workspaceId)) : null;
  }

  async require(workspaceId: string): Promise<UserClient> {
    const client = await this.client(workspaceId);
    if (!client) throw new Error('no member to act as in this workspace');
    return client;
  }

  /** The websocket token: the same server-minted JWT, 1 h (the socket re-handshakes before it expires). */
  async socketToken(workspaceId: string): Promise<string | null> {
    const actor = await this.actor(workspaceId);
    return actor ? serviceToken({ userId: actor }, workspaceId, '1h') : null;
  }

  /** Members (owner included, lowercase ids) and business hours, cached 60 s. */
  async members(workspaceId: string): Promise<WorkspaceMembers | null> {
    const hit = this.workspaces.get(workspaceId);
    if (hit && Date.now() - hit.at < WORKSPACE_TTL_MS) return hit.value;
    const client = await this.require(workspaceId);
    const ws = await client.getWorkspace(workspaceId);
    const id = (v: unknown) => String((v as { _id?: unknown })?._id ?? v).toLowerCase();
    const value = ws ? { ids: new Set([...(ws.owner ? [id(ws.owner)] : []), ...(ws.members ?? []).map(id)]), businessHours: ws.businessHours ?? null } : null;
    this.workspaces.set(workspaceId, { value, at: Date.now() });
    return value;
  }

  forget(workspaceId: string) {
    this.actors.delete(workspaceId);
    this.workspaces.delete(workspaceId);
  }
}
