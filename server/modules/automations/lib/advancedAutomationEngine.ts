import 'server-only';
import type { AutomationCondition } from './conditions';
import {
  ADVANCED_AUTOMATION_LIMITS,
  type AdvancedAutomationChoice,
  type AdvancedAutomationDefinition,
  type AdvancedAutomationNode,
  type AdvancedAutomationRunState,
  type AdvancedAutomationRunStatus,
} from '../types';
import { parseChoiceReply } from './advancedAutomationChoices';

export type EngineEvent =
  | { type: 'start' }
  | { type: 'inbound'; text: string; optionId?: string }
  /** A scheduled wake-up: a wait elapsed or a "no reply" timeout is due. */
  | { type: 'timer' }
  /** The runtime could not deliver the message of the step the run is at. */
  | { type: 'send_failed' };

export type EngineEffect =
  | {
      type: 'send_message';
      nodeId: string;
      text: string;
      replyMode: 'none' | 'buttons' | 'list' | 'free';
      options?: AdvancedAutomationChoice[];
      attachmentUrl?: string;
    }
  | { type: 'send_meta_template'; nodeId: string; templateId: string }
  | { type: 'set_field'; nodeId: string; fieldId: string; value: string; literal?: boolean }
  | {
      type: 'move_stage';
      nodeId: string;
      columnId: string;
      projectId?: string;
      boardId?: string;
    }
  | { type: 'add_label'; nodeId: string; labelText: string; labelColor?: string }
  | { type: 'create_task'; title: string; dueInHours?: number }
  | { type: 'webhook'; url: string }
  | {
      type: 'handoff';
      nodeId: string;
      message?: string;
      /** `ai`: hand the conversation to the JSYNQ agent `agentId` instead of a person. */
      to?: 'person' | 'ai';
      agentId?: string;
      assign?: {
        assignMode?: Extract<
          AdvancedAutomationNode,
          { kind: 'handoff' }
        >['assignMode'];
        userIds?: string[];
        specificUserId?: string;
        workspaceRoleId?: string;
      };
    }
  | { type: 'enter_automation'; automationId: string }
  | {
      type: 'create_card';
      nodeId: string;
      projectId: string;
      boardId?: string;
      columnId: string;
      title: string;
      fields?: Array<{ fieldId: string; value: string }>;
      ownerUserId?: string;
      linkConversation: boolean;
    }
  | { type: 'duplicate_card'; nodeId: string; columnId?: string }
  /** Deletes the run's card (JSYNQ has no archive). Never carried out by the preview. */
  | { type: 'delete_card'; nodeId: string }
  | { type: 'move_board'; nodeId: string; projectId: string; boardId?: string; columnId: string }
  | { type: 'set_value'; nodeId: string; value: string }
  | { type: 'set_owner'; nodeId: string; userId: string }
  | { type: 'remove_label'; nodeId: string; labelText: string }
  | { type: 'add_comment'; nodeId: string; text: string }
  | { type: 'add_checklist_item'; nodeId: string; title: string }
  | { type: 'check_checklist_item'; nodeId: string; title: string; checked: boolean }
  | { type: 'mark_read'; nodeId: string }
  | { type: 'assign_conversation'; nodeId: string; userId: string }
  /** Funnel counter: `exit` undefined = the step was reached; otherwise the exit it left through. */
  | { type: 'stat'; nodeId: string; exit?: string }
  | { type: 'run_ended'; status: AdvancedAutomationRunStatus };

/** Everything the engine needs from the outside world, so it stays pure and testable. */
export type EnginePorts = {
  now: Date;
  evaluateCondition: (condition: AutomationCondition) => Promise<boolean>;
  /** AI step: read the contact's free reply. `understood: false` takes the "not understood" exit. */
  interpretAnswer: (
    node: Extract<AdvancedAutomationNode, { kind: 'ai_agent' }>,
    text: string
  ) => Promise<{ understood: boolean; value?: string }>;
  isWithinBusinessHours: (at: Date) => boolean;
  /** Stable 0-99 bucket for a key (A/B splits must not flip between messages). */
  bucket: (key: string) => number;
};

export type AdvanceResult = {
  state: AdvancedAutomationRunState;
  effects: EngineEffect[];
};

type AutomationGraph = Pick<
  AdvancedAutomationDefinition,
  'nodes' | 'edges' | 'startNodeId'
>;

/** After a "no reply" timeout that is due outside business hours, re-check this much later. */
export const BUSINESS_HOURS_RECHECK_MS = 15 * 60 * 1000;

const addMs = (d: Date, ms: number) => new Date(d.getTime() + ms);

export function newRunState(params: {
  automationId: string;
  runId: string;
  automationVersion: number;
  now: Date;
}): AdvancedAutomationRunState {
  return {
    automationId: params.automationId,
    runId: params.runId,
    automationVersion: params.automationVersion,
    status: 'active',
    nodeId: null,
    steps: 0,
    vars: {},
    startedAt: params.now,
    updatedAt: params.now,
  };
}

/**
 * Advances one conversation's automation run by one event and returns the new state plus the effects
 * (messages, CRM changes, funnel counters) for the runtime to carry out.
 *
 * Guarantees:
 * - never loops forever: at most `stepsPerAdvance` steps per call and `stepsPerRun` per run;
 *   past either limit the run is marked `failed` instead of spinning;
 * - an inbound message while the run is not waiting for a reply changes nothing;
 * - a reply that matches no option takes the "other" exit when connected, otherwise the automation
 *   keeps waiting (no spam, no dead end);
 * - a missing step/edge ends the run as `completed` ("end of the flow").
 */
export async function advanceAutomationRun(params: {
  automation: AutomationGraph;
  state: AdvancedAutomationRunState;
  event: EngineEvent;
  ports: EnginePorts;
}): Promise<AdvanceResult> {
  const { automation, ports, event } = params;
  const state: AdvancedAutomationRunState = {
    ...params.state,
    vars: { ...params.state.vars },
    updatedAt: ports.now,
  };
  const effects: EngineEffect[] = [];
  const byId = new Map(automation.nodes.map((n) => [n.id, n]));
  const edgeTo = new Map(
    automation.edges.map((e) => [`${e.from}:${e.output}`, e.to])
  );

  const end = (status: AdvancedAutomationRunStatus): AdvanceResult => {
    state.status = status;
    state.wait = undefined;
    effects.push({ type: 'run_ended', status });
    return { state, effects };
  };

  const stay = (): AdvanceResult => ({
    state: { ...params.state, vars: { ...params.state.vars } },
    effects: [],
  });

  /** Runs from `nodeId` until the run waits or ends. */
  const run = async (startId: string | undefined): Promise<AdvanceResult> => {
    let current = startId;
    let advanced = 0;
    while (current) {
      advanced += 1;
      if (
        advanced > ADVANCED_AUTOMATION_LIMITS.stepsPerAdvance ||
        state.steps >= ADVANCED_AUTOMATION_LIMITS.stepsPerRun
      ) {
        return end('failed');
      }
      const node = byId.get(current);
      if (!node) return end('failed');
      state.steps += 1;
      state.nodeId = node.id;
      effects.push({ type: 'stat', nodeId: node.id });

      const leave = (exit: string): string | undefined => {
        effects.push({ type: 'stat', nodeId: node.id, exit });
        return edgeTo.get(`${node.id}:${exit}`);
      };

      switch (node.kind) {
        case 'send_message': {
          effects.push({
            type: 'send_message',
            nodeId: node.id,
            text: node.text,
            replyMode: node.replyMode,
            ...(node.options ? { options: node.options } : {}),
            ...(node.attachmentUrl
              ? { attachmentUrl: node.attachmentUrl }
              : {}),
          });
          if (node.replyMode === 'none') {
            current = leave('next');
            break;
          }
          state.status = 'waiting';
          state.wait = {
            kind: 'reply',
            nodeId: node.id,
            ...(node.noReplyMinutes
              ? { timeoutAt: addMs(ports.now, node.noReplyMinutes * 60_000) }
              : {}),
          };
          return { state, effects };
        }
        case 'condition': {
          let exit = 'none';
          for (const row of node.rows) {
            let held = false;
            try {
              held = await ports.evaluateCondition(row.condition);
            } catch {
              held = false;
            }
            if (held) {
              exit = row.id;
              break;
            }
          }
          current = leave(exit);
          break;
        }
        case 'wait': {
          state.status = 'waiting';
          state.wait = {
            kind: 'timer',
            nodeId: node.id,
            until: addMs(ports.now, node.minutes * 60_000),
          };
          return { state, effects };
        }
        case 'split': {
          const bucket = ports.bucket(`${state.runId}:${node.id}`);
          let cursor = 0;
          let exit = 'else';
          for (const path of node.paths) {
            cursor += path.percent;
            if (bucket < cursor) {
              exit = path.id;
              break;
            }
          }
          current = leave(exit);
          break;
        }
        case 'goto_automation':
          effects.push({
            type: 'enter_automation',
            automationId: node.automationId,
          });
          return end('completed');
        case 'stop':
          return end('completed');
        case 'handoff':
          effects.push({
            type: 'handoff',
            nodeId: node.id,
            message: node.message,
            ...(node.to === 'ai' ? { to: 'ai' as const, agentId: node.agentId } : {}),
            assign: {
              assignMode: node.assignMode,
              userIds: node.userIds,
              specificUserId: node.specificUserId,
              workspaceRoleId: node.workspaceRoleId,
            },
          });
          return end('handed_off');
        case 'set_field':
          effects.push({
            type: 'set_field',
            nodeId: node.id,
            fieldId: node.fieldId,
            value: node.value,
          });
          state.vars[node.fieldId] = node.value;
          current = leave('next');
          break;
        case 'move_stage':
          effects.push({
            type: 'move_stage',
            nodeId: node.id,
            columnId: node.columnId,
            projectId: node.projectId,
            boardId: node.boardId,
          });
          current = leave('next');
          break;
        case 'add_label':
          effects.push({
            type: 'add_label',
            nodeId: node.id,
            labelText: node.labelText,
            ...(node.labelColor ? { labelColor: node.labelColor } : {}),
          });
          current = leave('next');
          break;
        case 'create_task':
          effects.push({
            type: 'create_task',
            title: node.title,
            dueInHours: node.dueInHours,
          });
          current = leave('next');
          break;
        case 'webhook':
          effects.push({ type: 'webhook', url: node.url });
          current = leave('next');
          break;
        case 'send_meta_template':
          effects.push({
            type: 'send_meta_template',
            nodeId: node.id,
            templateId: node.templateId,
          });
          current = leave('next');
          break;
        case 'create_card':
          effects.push({
            type: 'create_card',
            nodeId: node.id,
            projectId: node.projectId,
            ...(node.boardId ? { boardId: node.boardId } : {}),
            columnId: node.columnId,
            title: node.title,
            ...(node.fields?.length ? { fields: node.fields } : {}),
            ...(node.ownerUserId ? { ownerUserId: node.ownerUserId } : {}),
            linkConversation: node.linkConversation !== false,
          });
          current = leave('next');
          break;
        case 'duplicate_card':
          effects.push({ type: 'duplicate_card', nodeId: node.id, ...(node.columnId ? { columnId: node.columnId } : {}) });
          current = leave('next');
          break;
        case 'delete_card':
          effects.push({ type: 'delete_card', nodeId: node.id });
          current = leave('next');
          break;
        case 'move_board':
          effects.push({ type: 'move_board', nodeId: node.id, projectId: node.projectId, ...(node.boardId ? { boardId: node.boardId } : {}), columnId: node.columnId });
          current = leave('next');
          break;
        case 'set_value':
          effects.push({ type: 'set_value', nodeId: node.id, value: node.value });
          current = leave('next');
          break;
        case 'set_owner':
          effects.push({ type: 'set_owner', nodeId: node.id, userId: node.userId });
          current = leave('next');
          break;
        case 'remove_label':
          effects.push({ type: 'remove_label', nodeId: node.id, labelText: node.labelText });
          current = leave('next');
          break;
        case 'add_comment':
          effects.push({ type: 'add_comment', nodeId: node.id, text: node.text });
          current = leave('next');
          break;
        case 'add_checklist_item':
          effects.push({ type: 'add_checklist_item', nodeId: node.id, title: node.title });
          current = leave('next');
          break;
        case 'check_checklist_item':
          effects.push({ type: 'check_checklist_item', nodeId: node.id, title: node.title, checked: node.checked !== false });
          current = leave('next');
          break;
        case 'mark_read':
          effects.push({ type: 'mark_read', nodeId: node.id });
          current = leave('next');
          break;
        case 'assign_conversation':
          effects.push({ type: 'assign_conversation', nodeId: node.id, userId: node.userId });
          current = leave('next');
          break;
        case 'save_reply': {
          // The contact's latest answer is data: written as is, never rendered as a template.
          const answer = state.lastAnswer ?? '';
          if (node.fieldId && answer.trim()) {
            effects.push({ type: 'set_field', nodeId: node.id, fieldId: node.fieldId, value: answer, literal: true });
            state.vars[node.fieldId] = answer;
          }
          current = leave('next');
          break;
        }
        case 'wait_reply':
          state.status = 'waiting';
          state.wait = { kind: 'reply', nodeId: node.id, timeoutAt: addMs(ports.now, node.minutes * 60_000) };
          return { state, effects };
        case 'ai_agent': {
          let result: { understood: boolean; value?: string } = {
            understood: false,
          };
          try {
            result = await ports.interpretAnswer(node, state.lastAnswer ?? '');
          } catch {
            result = { understood: false };
          }
          if (result.understood && result.value !== undefined) {
            effects.push({
              type: 'set_field',
              nodeId: node.id,
              fieldId: node.saveAnswerTo,
              value: result.value,
              literal: true,
            });
            state.vars[node.saveAnswerTo] = result.value;
          }
          current = leave(result.understood ? 'understood' : 'not_understood');
          break;
        }
      }
    }
    // Followed an exit with no connection (or ran out of steps without waiting): flow finished.
    return end('completed');
  };

  if (event.type === 'start') {
    state.status = 'active';
    effects.push({ type: 'stat', nodeId: '__run__', exit: 'started' });
    return run(automation.startNodeId);
  }

  if (state.status !== 'waiting' || !state.wait) return stay();
  const wait = state.wait;
  const waitingNode = byId.get(wait.nodeId);

  if (event.type === 'send_failed') {
    if (!waitingNode) return end('failed');
    // An earlier message of the batch failed; waiting for a reply still makes sense (the no-reply exit covers it).
    if (waitingNode.kind === 'wait_reply') return stay();
    state.wait = undefined;
    state.status = 'active';
    effects.push({ type: 'stat', nodeId: waitingNode.id, exit: 'send_failed' });
    const next = edgeTo.get(`${waitingNode.id}:send_failed`);
    return next ? run(next) : end('failed');
  }

  if (event.type === 'timer') {
    if (wait.kind === 'timer') {
      if (wait.until.getTime() > ports.now.getTime()) return stay();
      state.wait = undefined;
      state.status = 'active';
      effects.push({ type: 'stat', nodeId: wait.nodeId, exit: 'next' });
      return run(edgeTo.get(`${wait.nodeId}:next`));
    }
    // reply timeout
    if (!wait.timeoutAt || wait.timeoutAt.getTime() > ports.now.getTime())
      return stay();
    if (
      ((waitingNode?.kind === 'send_message' && waitingNode.noReplyBusinessHoursOnly) ||
        (waitingNode?.kind === 'wait_reply' && waitingNode.businessHoursOnly)) &&
      !ports.isWithinBusinessHours(ports.now)
    ) {
      state.wait = {
        ...wait,
        timeoutAt: addMs(ports.now, BUSINESS_HOURS_RECHECK_MS),
      };
      return { state, effects };
    }
    state.wait = undefined;
    state.status = 'active';
    effects.push({ type: 'stat', nodeId: wait.nodeId, exit: 'no_reply' });
    const next = edgeTo.get(`${wait.nodeId}:no_reply`);
    return next ? run(next) : end('completed');
  }

  // inbound
  if (wait.kind !== 'reply') return stay();
  if (waitingNode?.kind === 'wait_reply') {
    state.lastAnswer = event.text;
    state.wait = undefined;
    state.status = 'active';
    if (waitingNode.saveAnswerTo && event.text.trim()) {
      effects.push({ type: 'set_field', nodeId: waitingNode.id, fieldId: waitingNode.saveAnswerTo, value: event.text, literal: true });
      state.vars[waitingNode.saveAnswerTo] = event.text;
    }
    effects.push({ type: 'stat', nodeId: waitingNode.id, exit: 'answered' });
    const next = edgeTo.get(`${waitingNode.id}:answered`);
    return next ? run(next) : end('completed');
  }
  if (waitingNode?.kind !== 'send_message') return stay();
  state.lastAnswer = event.text;

  if (waitingNode.replyMode === 'free') {
    state.wait = undefined;
    state.status = 'active';
    // Media without text arrives as "": it still answers, but never blanks the saved field.
    if (waitingNode.saveAnswerTo && event.text.trim()) {
      effects.push({
        type: 'set_field',
        nodeId: waitingNode.id,
        fieldId: waitingNode.saveAnswerTo,
        value: event.text,
        literal: true,
      });
      state.vars[waitingNode.saveAnswerTo] = event.text;
    }
    effects.push({ type: 'stat', nodeId: waitingNode.id, exit: 'answered' });
    const next = edgeTo.get(`${waitingNode.id}:answered`);
    return next ? run(next) : end('completed');
  }

  const optionId = parseChoiceReply(
    waitingNode.options ?? [],
    event.text,
    event.optionId
  );
  const exit = optionId ?? 'other';
  const next = edgeTo.get(`${waitingNode.id}:${exit}`);
  if (!optionId && !next) {
    // Unrecognised reply and no "other" path: keep waiting for a valid answer.
    return { state: { ...state, wait }, effects: [] };
  }
  state.wait = undefined;
  state.status = 'active';
  effects.push({ type: 'stat', nodeId: waitingNode.id, exit });
  return next ? run(next) : end('completed');
}
