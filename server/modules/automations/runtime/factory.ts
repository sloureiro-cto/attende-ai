import 'server-only';
import { randomUUID } from 'crypto';
import mongoose from 'mongoose';
import { env } from '../../../config/env';
import type { Job } from '../../../lib/cron';
import { errMessage, log } from '../../../lib/logger';
import { logAdvancedAutomation } from '../lib/advancedAutomationLogger';
import { AdvancedAutomationModel, type IAdvancedAutomation } from '../models';
import { automationStats } from '../stats';
import { GatewayEffectExecutor } from './executor';
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

export type AutomationsRuntime = {
  runtime: AutomationRuntime;
  gateway: ConversationGateway;
  jobs: Job[];
};

/**
 * Wires the runtime around a `ConversationGateway`. There is no production gateway yet: the one on
 * the JSYNQ partner conversation API is gone (Option A, no JSYNQ changes), and the phase-4 worker
 * brings one over JSYNQ's existing user routes plus the `messaging-inbox` websocket, which then
 * calls `runtime.onInboundMessage`. Without a gateway, or while
 * `ADVANCED_AUTOMATIONS_RUNTIME_ENABLED` is off, this returns null: no timers run.
 */
export function createAutomationsRuntime(opts: { gateway?: ConversationGateway; now?: () => Date } = {}): AutomationsRuntime | null {
  if (!opts.gateway) {
    if (env().ADVANCED_AUTOMATIONS_RUNTIME_ENABLED) log.warn('automations.runtime_without_gateway');
    return null;
  }
  const gateway = opts.gateway;
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
    ],
  };
}
