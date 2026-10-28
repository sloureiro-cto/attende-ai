import 'server-only';
import { ADVANCED_AUTOMATION_LIMITS, type AdvancedAutomationRunState } from '../types';
import { AutomationRunModel, RUN_HISTORY_MAX, type IAutomationRun } from '../models';
import type { AutomationConversation, AutomationRunStore, ConversationKey } from './ports';

const IN_FLIGHT = ['active', 'waiting'];

/** When the run next needs waking: a reply timeout or a timer, only while waiting. */
export function waitUntilOf(run: AdvancedAutomationRunState): Date | undefined {
  if (run.status !== 'waiting' || !run.wait) return undefined;
  return run.wait.kind === 'reply' ? run.wait.timeoutAt : run.wait.until;
}

const filterOf = (key: ConversationKey) => ({ workspaceId: key.workspaceId, channel: key.channel, conversationId: key.conversationId });

/**
 * Run state in this service's own collection. The two writes are single-document
 * compare-and-set operations, so an inbound event, a timer and a human takeover can race safely.
 */
export class MongoRunStore implements AutomationRunStore {
  async find(key: ConversationKey): Promise<AutomationConversation | null> {
    const doc = await AutomationRunModel.findOne(filterOf(key)).lean<IAutomationRun | null>();
    if (!doc) return null;
    return {
      ...key,
      sessionId: doc.sessionId ?? '',
      run: doc.run
        ? {
            ...doc.run,
            startedAt: new Date(doc.run.startedAt),
            updatedAt: new Date(doc.run.updatedAt),
            ...(doc.run.wait
              ? {
                  wait:
                    doc.run.wait.kind === 'reply'
                      ? { ...doc.run.wait, ...(doc.run.wait.timeoutAt ? { timeoutAt: new Date(doc.run.wait.timeoutAt) } : {}) }
                      : { ...doc.run.wait, until: new Date(doc.run.wait.until) },
                }
              : {}),
          }
        : undefined,
      history: (doc.history ?? []).map((h) => ({ automationId: h.automationId, at: new Date(h.at) })),
    };
  }

  async ensure(key: ConversationKey, sessionId: string): Promise<void> {
    await AutomationRunModel.updateOne(
      filterOf(key),
      { $setOnInsert: { ...filterOf(key), sessionId, run: null, history: [], waitUntil: null } },
      { upsert: true }
    ).catch((error) => {
      if ((error as { code?: number }).code !== 11000) throw error;
    });
  }

  async claimStart(key: ConversationKey, run: AdvancedAutomationRunState, history: { automationId: string; at: Date }): Promise<boolean> {
    // A freshly claimed run is `active` until its first commit. Ring the doorbell for it too, so a
    // crash in between is found by the wake scanner instead of stranding the conversation.
    const waitUntil = waitUntilOf(run) ?? (run.status === 'active' ? new Date(Date.now() + ADVANCED_AUTOMATION_LIMITS.stuckActiveMs) : null);
    const res = await AutomationRunModel.updateOne(
      { ...filterOf(key), $or: [{ run: null }, { 'run.status': { $nin: IN_FLIGHT } }] },
      {
        $set: { run: { ...run, rev: 1 }, waitUntil },
        $push: { history: { $each: [history], $slice: -RUN_HISTORY_MAX } },
      }
    );
    return res.modifiedCount === 1;
  }

  async commit(key: ConversationKey, expectedRev: number, run: AdvancedAutomationRunState, lastEventId?: string): Promise<boolean> {
    const res = await AutomationRunModel.updateOne(
      { ...filterOf(key), 'run.rev': expectedRev },
      { $set: { run: { ...run, rev: expectedRev + 1, ...(lastEventId ? { lastEventId } : {}) }, waitUntil: waitUntilOf(run) ?? null } }
    );
    return res.modifiedCount === 1;
  }

  async findDue(now: Date, limit: number): Promise<ConversationKey[]> {
    const rows = await AutomationRunModel.find({ waitUntil: { $lte: now }, 'run.status': { $in: IN_FLIGHT } })
      .sort({ waitUntil: 1 })
      .limit(Math.max(1, Math.min(500, limit)))
      .select('workspaceId channel conversationId')
      .lean<Array<Pick<IAutomationRun, 'workspaceId' | 'channel' | 'conversationId'>>>();
    return rows.map((r) => ({ workspaceId: r.workspaceId, channel: r.channel, conversationId: r.conversationId }));
  }
}
