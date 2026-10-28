import 'server-only';
import type { AutomationCondition } from './lib/conditions';

export type AdvancedAutomationChannel = 'whatsapp' | 'instagram' | 'sms';
export type AdvancedAutomationStatus = 'draft' | 'active' | 'paused';

/** Ids are used as Mongo field names in stats (`nodes.<id>.reached`), so keep them strict. */
export const ADVANCED_AUTOMATION_ID_PATTERN = /^[A-Za-z0-9_-]{1,40}$/;

export const ADVANCED_AUTOMATION_LIMITS = {
  nodes: 200,
  edges: 400,
  textChars: 4096,
  buttons: 3,
  listRows: 10,
  buttonLabelChars: 20,
  listLabelChars: 24,
  labelChars: 60,
  noReplyMinutesMax: 60 * 24 * 7,
  waitMinutesMax: 60 * 24 * 30,
  /** Hard stop on nodes executed in one advance (cycle guard). */
  stepsPerAdvance: 50,
  /** Hard stop on nodes executed over a whole run (re-ask loops can't spin forever). */
  stepsPerRun: 500,
  /** An `active` run that has not moved for this long is a crashed advance, not a live one. */
  stuckActiveMs: 2 * 60_000,
} as const;

export type AdvancedAutomationHandoffAssignMode =
  | 'all_crm_members'
  | 'specific_user'
  | 'member_list'
  | 'by_workspace_role';

type NodeBase = {
  id: string;
  /** Canvas position, persisted so the builder reopens as the author left it. */
  x: number;
  y: number;
  label?: string;
};

export type AdvancedAutomationChoice = { id: string; label: string };

export type AdvancedAutomationNode =
  | (NodeBase & {
      kind: 'send_message';
      /** Supports {{lead.*}} / {{contact.*}} variables, resolved by the runtime. */
      text: string;
      replyMode: 'none' | 'buttons' | 'list' | 'free';
      options?: AdvancedAutomationChoice[];
      noReplyMinutes?: number;
      noReplyBusinessHoursOnly?: boolean;
      /** Card custom-field id that receives the free-text answer. */
      saveAnswerTo?: string;
      attachmentUrl?: string;
    })
  | (NodeBase & {
      kind: 'condition';
      rows: Array<{
        id: string;
        name: string;
        condition: AutomationCondition;
      }>;
    })
  | (NodeBase & { kind: 'wait'; minutes: number })
  | (NodeBase & {
      kind: 'split';
      paths: Array<{ id: string; name: string; percent: number }>;
    })
  | (NodeBase & { kind: 'goto_automation'; automationId: string })
  | (NodeBase & { kind: 'stop' })
  | (NodeBase & { kind: 'set_field'; fieldId: string; value: string })
  | (NodeBase & {
      kind: 'move_stage';
      columnId: string;
      projectId?: string;
      boardId?: string;
    })
  | (NodeBase & {
      kind: 'add_label';
      /** Label name; supports {{lead.*}} variables. Found or created BY NAME in the lead card's own project. */
      labelText: string;
      /** Hex color used only when the label has to be created (default `#6366f1`). */
      labelColor?: string;
      /**
       * Project the author picked the label from in the builder. A UI hint only: the runtime always
       * applies the label in the project the lead card is in, creating it there when missing.
       */
      projectId?: string;
    })
  | (NodeBase & { kind: 'create_task'; title: string; dueInHours?: number })
  | (NodeBase & {
      kind: 'ai_agent';
      /** What to extract from the contact's free reply. */
      instruction: string;
      saveAnswerTo: string;
    })
  | (NodeBase & {
      kind: 'handoff';
      /** Sent to the contact right before the conversation goes to a person. */
      message?: string;
      /**
       * `person` (default): the conversation goes to the team (`human_handoff`, assigned per `assignMode`).
       * `ai`: a JSYNQ agent (`agentId`) takes this one conversation (a conversation-level binding the worker
       * creates, and removes when an automation takes the conversation back).
       */
      to?: 'person' | 'ai';
      /** JSYNQ agent id, required with `to: 'ai'`. */
      agentId?: string;
      /** Who gets the conversation (same modes as lead distribution). Default: all CRM members. */
      assignMode?: AdvancedAutomationHandoffAssignMode;
      userIds?: string[];
      specificUserId?: string;
      workspaceRoleId?: string;
    })
  | (NodeBase & { kind: 'webhook'; url: string })
  | (NodeBase & { kind: 'send_meta_template'; templateId: string });

export type AdvancedAutomationNodeKind = AdvancedAutomationNode['kind'];

export type AdvancedAutomationEdge = {
  id: string;
  from: string;
  /** Which exit of `from` this edge leaves through (see `nodeOutputs`). */
  output: string;
  to: string;
};

export type AdvancedAutomationTrigger = {
  kind: 'new_conversation' | 'manual';
  /**
   * Don't auto-start again on a conversation this automation already ran on within this many days. With 0
   * (default) an automation never auto-starts twice on the same conversation.
   */
  dedupeDays: number;
  /** Extra filter evaluated on the first inbound message. */
  filter?: AutomationCondition;
};

export type AdvancedAutomationDefinition = {
  name: string;
  status: AdvancedAutomationStatus;
  channels: Array<{
    channel: AdvancedAutomationChannel;
    enabledSessionIds: string[];
  }>;
  trigger: AdvancedAutomationTrigger;
  /** The automation stops when a human replies in the conversation. */
  stopOnHumanReply: boolean;
  startNodeId: string;
  nodes: AdvancedAutomationNode[];
  edges: AdvancedAutomationEdge[];
};

export type AdvancedAutomationRunStatus =
  | 'active'
  | 'waiting'
  | 'completed'
  | 'handed_off'
  | 'stopped'
  | 'failed';

export type AdvancedAutomationWait =
  | { kind: 'reply'; nodeId: string; timeoutAt?: Date }
  | { kind: 'timer'; nodeId: string; until: Date };

/** Persisted on the conversation (`conversation.advancedAutomation`). Small by design. */
export type AdvancedAutomationRunState = {
  automationId: string;
  runId: string;
  /** Automation version the run started on; edits don't change a run already in flight. */
  automationVersion: number;
  status: AdvancedAutomationRunStatus;
  nodeId: string | null;
  wait?: AdvancedAutomationWait;
  steps: number;
  vars: Record<string, string>;
  /** The contact's latest answer, kept for the AI step that follows a free-text question. */
  lastAnswer?: string;
  startedAt: Date;
  updatedAt: Date;
};
