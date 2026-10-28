import 'server-only';
import { z } from 'zod';
import { env } from '../../config/env';
import { getAutomationsRuntime } from '../../deps';
import { AppError } from '../../lib/errors';
import { json, route } from '../../lib/http';
import { log } from '../../lib/logger';
import { ProcessedEventModel } from '../billing/models';
import { ChannelStatusModel, WorkspaceEventModel } from './models';
import { verifySignature } from './signature';

export const SUBSCRIBED_EVENTS = [
  'agent.reply.blocked',
  'usage.threshold_crossed',
  'usage.limit_reached',
  'channel.connected',
  'channel.disconnected',
] as const;

const envelopeSchema = z.object({
  id: z.string().min(1).max(100),
  type: z.string().min(1).max(100),
  workspaceId: z.string().min(1).max(64),
  occurredAt: z.string(),
  data: z.record(z.unknown()).default({}),
});
type Envelope = z.infer<typeof envelopeSchema>;

const inboundSchema = z.object({
  workspaceId: z.string().regex(/^[0-9a-f]{24}$/i),
  channel: z.enum(['whatsapp', 'instagram', 'sms']),
  conversationId: z.string().min(1).max(64),
  sessionId: z.string().min(1).max(64),
  messageId: z.string().min(1).max(128),
  // `""` for media without text. JSYNQ never sends `optionId` (inbound events carry no interactive
  // reply id); a choice is recognised from the text ("1", "Sim"...). Accepted if a sender adds it.
  text: z.string().max(8000).nullish().transform((v) => v ?? ''),
  optionId: z.string().max(64).nullish().transform((v) => v ?? undefined),
  firstInbound: z.boolean().default(false),
});

/** Raw body + HMAC check shared by both JSYNQ -> this service calls. */
function verified(rawBody: Buffer, header: string | undefined): Buffer {
  const secret = env().JSYNQ_WEBHOOK_SECRET;
  if (!secret) throw new AppError(503, 'JSYNQ webhooks are not configured', 'WEBHOOK_NOT_CONFIGURED');
  if (!verifySignature(secret, rawBody, header, Math.floor(Date.now() / 1000))) {
    throw new AppError(401, 'Invalid signature', 'WEBHOOK_SIGNATURE_INVALID');
  }
  return rawBody;
}

function parseJson(raw: Buffer): unknown {
  try {
    return JSON.parse(raw.toString('utf8'));
  } catch {
    throw new AppError(400, 'Invalid JSON body');
  }
}

async function handleEvent(e: Envelope) {
  const occurredAt = new Date(e.occurredAt);
  switch (e.type) {
    case 'agent.reply.blocked':
    case 'usage.threshold_crossed':
    case 'usage.limit_reached':
      await WorkspaceEventModel.updateOne({ _id: e.id }, { $setOnInsert: { workspaceId: e.workspaceId, type: e.type, data: e.data, occurredAt } }, { upsert: true });
      // Notification hook: ops alerting reads these log lines; in-app notices read workspace_events.
      log.warn(`jsynq.${e.type}`, { workspaceId: e.workspaceId, meter: e.data.meter, reason: e.data.reason, max: e.data.max, pct: e.data.pct });
      return;
    case 'channel.connected':
    case 'channel.disconnected': {
      const sessionId = typeof e.data.sessionId === 'string' ? e.data.sessionId : null;
      if (!sessionId) return;
      // Only move forward in time: when a newer state is stored, the filter misses and the upsert
      // hits the unique key, which means "keep the newer one".
      const status = e.type === 'channel.connected' ? 'connected' : 'disconnected';
      await ChannelStatusModel.updateOne(
        { workspaceId: e.workspaceId, channel: String(e.data.channel ?? 'whatsapp'), sessionId, changedAt: { $lt: occurredAt } },
        { $set: { status, reason: typeof e.data.reason === 'string' ? e.data.reason : undefined, changedAt: occurredAt } },
        { upsert: true }
      ).catch((error) => {
        if ((error as { code?: number }).code !== 11000) throw error;
      });
      return;
    }
    default:
      log.info('jsynq.event_ignored', { type: e.type, workspaceId: e.workspaceId });
  }
}

/**
 *   POST /api/jsynq/webhooks  JSYNQ partner webhooks (P4): signed, deduplicated by event id.
 *   POST /api/jsynq/inbound   Inbound message routed by JSYNQ to the automations runtime (partner
 *                         inbound routing; the URL is sent by `setInboundRouting` and must share
 *                         the origin of /api/jsynq/webhooks, so both are signed with JSYNQ_WEBHOOK_SECRET).
 *                         Answers `{handled}` within JSYNQ's 3 s budget; with the runtime off it is always `false`.
 */
const RAW_LIMIT = 256 * 1024;

export const postJsynqWebhook = route([], async (ctx) => {
  const body = verified(await ctx.raw(RAW_LIMIT), ctx.header('x-jsynq-signature'));
  const parsed = envelopeSchema.safeParse(parseJson(body));
  if (!parsed.success) throw new AppError(400, 'Invalid event envelope');
  const event = parsed.data;
  try {
    await ProcessedEventModel.create({ _id: event.id, source: 'jsynq', type: event.type, processedAt: new Date() });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) return json({ received: true, duplicate: true });
    throw error;
  }
  try {
    await handleEvent(event);
  } catch (error) {
    // Let JSYNQ retry: forget the marker so the redelivery is processed.
    await ProcessedEventModel.deleteOne({ _id: event.id }).catch(() => undefined);
    throw error;
  }
  return json({ received: true });
});

export const postJsynqInbound = route([], async (ctx) => {
  const body = verified(await ctx.raw(RAW_LIMIT), ctx.header('x-jsynq-signature'));
  const runtime = getAutomationsRuntime();
  if (!runtime) return json({ handled: false });
  const parsed = inboundSchema.safeParse(parseJson(body));
  if (!parsed.success) throw new AppError(400, 'Invalid inbound message');
  return json(await runtime.runtime.onInboundMessage(parsed.data));
});
