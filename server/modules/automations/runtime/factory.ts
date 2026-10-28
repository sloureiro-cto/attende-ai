import 'server-only';
import { randomUUID } from 'crypto';
import mongoose from 'mongoose';
import { env } from '../../../config/env';
import type { Job } from '../../../lib/cron';
import { errMessage, log } from '../../../lib/logger';
import { logAdvancedAutomation } from '../lib/advancedAutomationLogger';
import { AdvancedAutomationModel, type IAdvancedAutomation } from '../models';
import { activeSessions } from '../service';
import { automationStats } from '../stats';
import { GatewayEffectExecutor } from './executor';
import { jsynqConversationGateway } from './jsynqGateway';
import type { ConversationGateway } from './ports';
import { MongoRunStore } from './runStore';
import { AutomationRuntime, type RuntimeAutomation } from './runtime';

const toRuntime = (d: IAdvancedAutomation): RuntimeAutomation => ({
  id: String(d._id),
  name: d.name,
  status: d.status,
  trigger: d.trigger,
  stopOnHumanReply: d.stopOnHumanReply,
  startNodeId: d.startNodeId,
  nodes: d.nodes,
  edges: d.edges,
  version: d.version,
  createdBy: d.createdBy,
});

/** This service's inbound endpoint, on the same origin as the registered `/api/jsynq/webhooks`. */
export const inboundUrl = (): string => `${env().PUBLIC_URL}/api/jsynq/inbound`;

export type AutomationsRuntime = {
  runtime: AutomationRuntime;
  gateway: ConversationGateway;
  /** Tells JSYNQ which sessions to route to us (after activations/pauses). */
  syncInboundRouting(workspaceId: string): Promise<void>;
  jobs: Job[];
};

/**
 * Wires the runtime. Returns null while `ADVANCED_AUTOMATIONS_RUNTIME_ENABLED` is off: nothing is
 * routed, no timers run, and `POST /api/jsynq/inbound` answers `{handled:false}` (JSYNQ answers as usual).
 */
export function createAutomationsRuntime(opts: { gateway?: ConversationGateway; now?: () => Date } = {}): AutomationsRuntime | null {
  if (!env().ADVANCED_AUTOMATIONS_RUNTIME_ENABLED && !opts.gateway) return null;
  const gateway = opts.gateway ?? jsynqConversationGateway(env().JSYNQ_PARTNER_API_KEY, { inboundUrl: inboundUrl() });
  const store = new MongoRunStore();
  const now = opts.now ?? (() => new Date());
  const runtime = new AutomationRuntime({
    store,
    gateway,
    executor: new GatewayEffectExecutor(gateway),
    async loadAutomation(workspaceId, automationId) {
      if (!/^[0-9a-f]{24}$/i.test(automationId)) return null;
      const doc = await AdvancedAutomationModel.findOne({ _id: new mongoose.Types.ObjectId(automationId), workspaceId }).lean<IAdvancedAutomation>();
      return doc ? toRuntime(doc) : null;
    },
    async findEligibleAutomations(workspaceId, channel, sessionId) {
      const docs = await AdvancedAutomationModel.find({
        workspaceId,
        status: 'active',
        'channels.enabledSessionIds': sessionId.toLowerCase(),
        'trigger.kind': 'new_conversation',
      })
        .sort({ updatedAt: 1 })
        .lean<IAdvancedAutomation[]>();
      return docs.filter((d) => d.channels.some((c) => c.channel === channel && c.enabledSessionIds.includes(sessionId.toLowerCase()))).map(toRuntime);
    },
    recordStats: (p) => automationStats.record(p),
    now,
    newId: () => randomUUID(),
    log: (event, data) => logAdvancedAutomation(event, data),
  });

  return {
    runtime,
    gateway,
    async syncInboundRouting(workspaceId) {
      try {
        await gateway.setInboundRouting(workspaceId, await activeSessions(workspaceId));
      } catch (error) {
        // Not fatal for the save; the routing job below retries every few minutes.
        log.warn('automations.inbound_routing_failed', { workspaceId, error: errMessage(error) });
      }
    },
    jobs: [
      {
        // Waits and no-reply timeouts (previously an SQS doorbell in JSYNQ).
        name: 'automation-timers',
        everyMs: 15_000,
        async run() {
          const due = await store.findDue(now(), 200);
          for (const key of due) {
            await runtime.handleTimer(key).catch((error) => log.warn('automations.timer_failed', { ...key, error: errMessage(error) }));
          }
        },
      },
      {
        name: 'automation-inbound-routing',
        everyMs: 10 * 60_000,
        async run() {
          const workspaces = await AdvancedAutomationModel.distinct('workspaceId', { status: 'active' });
          for (const ws of workspaces) await gateway.setInboundRouting(String(ws), await activeSessions(String(ws))).catch(() => undefined);
        },
      },
    ],
  };
}
