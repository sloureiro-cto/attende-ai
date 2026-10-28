import 'server-only';
import { generateApiToken } from '../../../lib/auth/apiToken';
import { env } from '../../config/env';

/**
 * A short-lived JSYNQ API token for `userId`, scoped to `workspaceId` (JSYNQ's agent, binding,
 * session, project and knowledge routes act on that claim). The same token NextAuth mints for a
 * signed-in user (`lib/auth/apiToken.ts`, `AUTH_SECRET`); the server mints it when no user is
 * signed in (start-trial on a fresh workspace, Stripe webhooks, crons). JSYNQ still applies its
 * membership and permission checks to that user. Never log the token or return it to a client.
 */
export function serviceToken(user: { userId: string; email?: string; name?: string }, workspaceId: string | null, ttl: '10m' | '1h' = '10m'): string {
  return generateApiToken({ id: user.userId, email: user.email, name: user.name, workspaceId: workspaceId ?? undefined }, env().AUTH_SECRET, ttl);
}
