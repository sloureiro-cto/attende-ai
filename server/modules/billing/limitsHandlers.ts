import 'server-only';
import { z } from 'zod';
import { AppError } from '../../lib/errors';
import { json, route } from '../../lib/http';
import { rateLimit } from '../../lib/rateLimit';
import { ctxOf, requireUser, requireWorkspace } from '../../middleware/auth';
import { assertPlanAllows } from './limits';
import { assertCanSendOutbound, recordOutbound } from './usage';

const guards = [requireUser, requireWorkspace, rateLimit({ windowMs: 60_000, limit: 120, key: (ctx) => ctx.auth?.workspaceId ?? ctx.ip })];

const checkSchema = z.object({
  resource: z.enum(['lines', 'seats', 'agents', 'docs', 'outbound']),
  adding: z.number().int().min(1).max(100).default(1),
});

/**
 * `POST /api/attende/limits/check`: may the workspace add `adding` of `resource`? The app calls it
 * before the actions it sends straight to JSYNQ (connect a channel, invite members, send a
 * message), since JSYNQ keeps no Attende limits. 200 `{allowed: true}`, else the plan error
 * (402 access codes, 403 `ATTENDE_QUOTA_EXCEEDED` with `details.resource`).
 */
export const postLimitsCheck = route(guards, async (ctx) => {
  const parsed = checkSchema.safeParse(await ctx.body());
  if (!parsed.success) throw new AppError(422, 'Invalid body', 'LIMITS_INVALID_BODY');
  const { workspaceId, token } = ctxOf(ctx);
  const { resource, adding } = parsed.data;
  if (resource === 'outbound') await assertCanSendOutbound(ctx.deps, workspaceId);
  else await assertPlanAllows(ctx.deps.user(token), workspaceId, resource, { adding, now: ctx.deps.now() });
  return json({ allowed: true });
});

const recordSchema = z.object({ count: z.number().int().min(1).max(1000).default(1) });

/** `POST /api/attende/usage/outbound`: the app sent `count` messages (monthly meter and trial cap). */
export const postOutboundUsage = route(guards, async (ctx) => {
  const parsed = recordSchema.safeParse(await ctx.body());
  if (!parsed.success) throw new AppError(422, 'Invalid body', 'LIMITS_INVALID_BODY');
  await recordOutbound(ctx.deps, ctxOf(ctx).workspaceId, parsed.data.count);
  return json({ recorded: parsed.data.count });
});
