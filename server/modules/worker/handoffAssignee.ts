import 'server-only';
import type { JsynqBinding, JsynqConversation } from '../../lib/jsynq';
import { errMessage, log } from '../../lib/logger';
import { AgentSetupModel, type IAgentSetup } from '../agents/models';
import type { WorkspaceClients } from './clients';
import type { ConversationRef } from './events';

const BINDINGS_TTL_MS = 60_000;

export type AssignOutcome = 'assigned' | 'not_handoff' | 'already_assigned' | 'no_agent' | 'no_target' | 'member_left' | 'failed';

/**
 * "Quem assume": when a conversation an Attende agent was answering enters `human_handoff` without an assignee, the
 * member the agent's setup names (`form.handoff.target` with `kind: 'user'`) gets it, through the existing assign
 * route (`PATCH /api/{channel}-lite/sessions/:s/conversations/:id/assign`). An assignee already on the conversation is
 * never replaced (the state is read fresh just before), and a member who left the workspace is skipped (the
 * conversation stays with the team).
 */
export class HandoffAssigner {
  private bindings = new Map<string, { rows: JsynqBinding[]; at: number }>();

  constructor(private readonly clients: WorkspaceClients) {}

  private async bindingsOf(workspaceId: string): Promise<JsynqBinding[]> {
    const hit = this.bindings.get(workspaceId);
    if (hit && Date.now() - hit.at < BINDINGS_TTL_MS) return hit.rows;
    const rows = await (await this.clients.require(workspaceId)).listBindings();
    this.bindings.set(workspaceId, { rows, at: Date.now() });
    return rows;
  }

  /** The JSYNQ agent that was answering: the conversation's binding, its active agent, else the session's inbound agent. */
  private async agentOf(ref: ConversationRef, c: JsynqConversation): Promise<string | null> {
    const bindings = await this.bindingsOf(ref.workspaceId);
    if (c.automationBindingId) {
      const b = bindings.find((x) => String(x._id) === String(c.automationBindingId));
      if (b?.agentId) return String(b.agentId);
    }
    if (c.activeAgent?._id) return String(c.activeAgent._id);
    const conv = bindings.find((b) => b.agentId && b.targetType === 'conversation' && String(b.targetId) === ref.conversationId);
    if (conv?.agentId) return String(conv.agentId);
    const inbound = bindings.find((b) => b.agentId && b.targetType === 'all_inbound' && b.channel === ref.channel && String(b.sessionId) === ref.sessionId);
    return inbound?.agentId ? String(inbound.agentId) : null;
  }

  async handle(ref: ConversationRef, c: JsynqConversation): Promise<AssignOutcome> {
    if (c.conversationState !== 'human_handoff') return 'not_handoff';
    if (c.assignedUserId) return 'already_assigned';
    try {
      const agentId = await this.agentOf(ref, c);
      if (!agentId) return 'no_agent';
      const setup = await AgentSetupModel.findOne({ workspaceId: ref.workspaceId, agentId, state: 'ready' }).select('form').lean<Pick<IAgentSetup, 'form'> | null>();
      const target = setup?.form?.handoff?.target;
      if (target?.kind !== 'user' || !target.userId) return 'no_target';
      const members = await this.clients.members(ref.workspaceId);
      if (!members?.ids.has(target.userId.toLowerCase())) {
        log.info('worker.handoff_member_left', { workspaceId: ref.workspaceId, conversationId: ref.conversationId });
        return 'member_left';
      }
      const client = await this.clients.require(ref.workspaceId);
      // Read again right before writing: someone may have taken the conversation since the list was read.
      const fresh = await client.getInboxConversation(ref.workspaceId, ref.conversationId);
      if (fresh?.conversation.assignedUserId) return 'already_assigned';
      if (fresh && fresh.conversation.conversationState !== 'human_handoff') return 'not_handoff';
      await client.assignConversation(ref.channel, ref.sessionId, ref.conversationId, target.userId);
      log.info('worker.handoff_assigned', { workspaceId: ref.workspaceId, conversationId: ref.conversationId, agentId });
      return 'assigned';
    } catch (error) {
      log.warn('worker.handoff_assign_failed', { workspaceId: ref.workspaceId, conversationId: ref.conversationId, error: errMessage(error) });
      return 'failed';
    }
  }
}
