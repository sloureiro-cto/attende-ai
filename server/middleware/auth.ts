import 'server-only';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../lib/errors';
import type { HttpContext } from '../lib/http';
import { JsynqError, userClient } from '../lib/jsynq';

export type AuthContext = {
  userId: string;
  email?: string;
  name?: string;
  /** The raw JWT, passed through to JSYNQ for calls made as this user. */
  token: string;
  /** `workspaceId` claim of the JWT (JSYNQ's user routes act on this one). */
  tokenWorkspaceId: string | null;
  /** Set by `requireWorkspace`: verified membership. */
  workspaceId?: string;
};

/**
 * Verifies the user JWT locally (HS256, `AUTH_SECRET`), the same token the frontend sends to JSYNQ.
 * No network call. 401 `AUTH_REQUIRED` without a token, 401 `AUTH_INVALID` for a bad/expired one.
 */
export function requireUser(ctx: HttpContext): void {
  const header = ctx.header('authorization') ?? '';
  const token = /^Bearer\s+(.+)$/i.exec(header)?.[1]?.trim();
  if (!token) throw new AppError(401, 'Authentication required', 'AUTH_REQUIRED');
  let claims: jwt.JwtPayload;
  try {
    const decoded = jwt.verify(token, env().AUTH_SECRET, { algorithms: ['HS256'] });
    if (typeof decoded === 'string') throw new Error('unexpected payload');
    claims = decoded;
  } catch {
    throw new AppError(401, 'Invalid or expired token', 'AUTH_INVALID');
  }
  const userId = typeof claims.id === 'string' ? claims.id : typeof claims.sub === 'string' ? claims.sub : null;
  if (!userId) throw new AppError(401, 'Invalid or expired token', 'AUTH_INVALID');
  ctx.auth = {
    userId,
    email: typeof claims.email === 'string' ? claims.email : undefined,
    name: typeof claims.name === 'string' ? claims.name : undefined,
    token,
    tokenWorkspaceId: typeof claims.workspaceId === 'string' && claims.workspaceId ? claims.workspaceId : null,
  };
}

const MEMBERSHIP_TTL_MS = 60_000;
const MEMBERSHIP_MAX = 10_000;
const membership = new Map<string, { member: boolean; until: number }>();
export const clearMembershipCache = () => membership.clear();

async function isMember(token: string, userId: string, workspaceId: string): Promise<boolean> {
  const key = `${userId}:${workspaceId}`;
  const hit = membership.get(key);
  if (hit && hit.until > Date.now()) return hit.member;
  let member: boolean;
  try {
    member = !!(await userClient(token).getWorkspace(workspaceId));
  } catch (error) {
    // 403/404 = not a member. Anything else (JSYNQ down) is not cached and fails closed.
    if (error instanceof JsynqError && (error.status === 403 || error.status === 404 || error.status === 400)) member = false;
    else throw new AppError(503, 'Could not verify workspace access', 'JSYNQ_UNAVAILABLE');
  }
  if (membership.size >= MEMBERSHIP_MAX) membership.clear();
  membership.set(key, { member, until: Date.now() + MEMBERSHIP_TTL_MS });
  return member;
}

/**
 * Resolves the workspace of the request: the `x-workspace-id` header, else the JWT claim. It must
 * be a workspace the user belongs to (checked through JSYNQ with the user's token, cached 60 s).
 *
 * JSYNQ's agent, binding, session and knowledge routes act on the JWT claim, so a header naming
 * another workspace than the token is refused (409 `WORKSPACE_TOKEN_MISMATCH`): the frontend must
 * switch workspaces through its session first.
 */
export async function requireWorkspace(ctx: HttpContext): Promise<void> {
  const auth = ctx.auth;
  if (!auth) throw new AppError(401, 'Authentication required', 'AUTH_REQUIRED');
  const header = ctx.header('x-workspace-id')?.trim() || null;
  const workspaceId = header ?? auth.tokenWorkspaceId;
  if (!workspaceId) throw new AppError(400, 'No workspace selected', 'WORKSPACE_REQUIRED');
  if (!/^[0-9a-f]{24}$/i.test(workspaceId)) throw new AppError(400, 'Invalid workspace id', 'WORKSPACE_REQUIRED');
  if (header && auth.tokenWorkspaceId && header !== auth.tokenWorkspaceId) {
    throw new AppError(409, 'The workspace header does not match the session workspace', 'WORKSPACE_TOKEN_MISMATCH');
  }
  if (!(await isMember(auth.token, auth.userId, workspaceId))) throw new AppError(403, 'Access denied for this workspace', 'WORKSPACE_FORBIDDEN');
  auth.workspaceId = workspaceId;
}

/** For handlers behind `requireUser` + `requireWorkspace`. */
export function ctxOf(ctx: HttpContext): AuthContext & { workspaceId: string } {
  const auth = ctx.auth;
  if (!auth?.workspaceId) throw new AppError(401, 'Authentication required', 'AUTH_REQUIRED');
  return auth as AuthContext & { workspaceId: string };
}
