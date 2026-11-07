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
  | (NodeBase & {
      kind: 'set_field';
      /** A custom field id of the board, a JSYNQ CRM field (`email`, `phone`, `company`, `estimateRevenue`,
       * `contactName`...) or `card:title` / `card:owner`. */
      fieldId: string;
      /** Variables allowed (`{{lead.name}}`, `{{answer}}`). */
      value: string;
      /** Where the author picked the field (builder hints; the runtime writes on the run's card). */
      projectId?: string;
      boardId?: string;
      fieldType?: string;
    })
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
  | (NodeBase & { kind: 'send_meta_template'; templateId: string })
  // --- lead / deal (JSYNQ card) -----------------------------------------------------------------
  | (NodeBase & {
      kind: 'create_card';
      projectId: string;
      boardId: string;
      columnId: string;
      /** Lead/deal title; supports variables (default `{{lead.name}}`). */
      title: string;
      /** Field values (standard or custom field ids), variables allowed. */
      fields?: Array<{ fieldId: string; value: string }>;
      /** Member who owns the new card. */
      ownerUserId?: string;
      /** Link the conversation to the new card when it has none (default true). */
      linkConversation?: boolean;
    })
  | (NodeBase & {
      kind: 'duplicate_card';
      /** Stage of the copy; empty = the stage the card is in. */
      columnId?: string;
      projectId?: string;
      boardId?: string;
    })
  | (NodeBase & {
      kind: 'delete_card';
      /** The author confirmed the warning (JSYNQ has no archive: the card is deleted). Required to activate. */
      confirmed?: boolean;
    })
  | (NodeBase & { kind: 'move_board'; projectId: string; boardId: string; columnId: string })
  | (NodeBase & { kind: 'set_value'; value: string })
  | (NodeBase & { kind: 'set_owner'; userId: string })
  | (NodeBase & { kind: 'remove_label'; labelText: string; projectId?: string })
  // --- record -------------------------------------------------------------------------------------
  | (NodeBase & { kind: 'add_comment'; text: string })
  | (NodeBase & { kind: 'add_checklist_item'; title: string })
  | (NodeBase & { kind: 'check_checklist_item'; title: string; checked: boolean })
  // --- conversation ---------------------------------------------------------------------------------
  | (NodeBase & { kind: 'mark_read' })
  | (NodeBase & { kind: 'assign_conversation'; userId: string })
  | (NodeBase & { kind: 'save_reply'; fieldId: string; projectId?: string; boardId?: string })
  // --- flow -----------------------------------------------------------------------------------------
  | (NodeBase & {
      kind: 'wait_reply';
      /** How long to wait for the contact (exit `no_reply` after it). */
      minutes: number;
      businessHoursOnly?: boolean;
      /** Field that receives the answer (optional). */
      saveAnswerTo?: string;
    });

export type AdvancedAutomationNodeKind = AdvancedAutomationNode['kind'];

export type AdvancedAutomationEdge = {
  id: string;
  from: string;
  /** Which exit of `from` this edge leaves through (see `nodeOutputs`). */
  output: string;
  to: string;
};

/** Conversation triggers: the worker sees them on the `messaging-inbox` websocket and its safety poll. */
export const CONVERSATION_TRIGGER_KINDS = [
  'new_conversation',
  'keyword',
  'any_message',
  'contact_no_reply',
  'team_no_reply',
  'handed_to_human',
  'conversation_assigned',
] as const;
/** CRM triggers: the worker's `crm-dashboard:<projectId>` sockets and their catch-up poll. */
export const CRM_TRIGGER_KINDS = ['card_created', 'card_stage_changed', 'card_label_added', 'card_won', 'card_lost'] as const;
/** Time triggers: the worker's `automation-schedules` job (every minute, leased). */
export const TIME_TRIGGER_KINDS = ['scheduled', 'date_field'] as const;
export const TRIGGER_KINDS = ['manual', 'webhook', ...CONVERSATION_TRIGGER_KINDS, ...CRM_TRIGGER_KINDS, ...TIME_TRIGGER_KINDS] as const;
export type AdvancedAutomationTriggerKind = (typeof TRIGGER_KINDS)[number];

/** Filters every trigger kind can add (all optional; empty = no filter). */
export type AdvancedAutomationTriggerFilters = {
  /** Only these channels (conversation runs). */
  channels?: AdvancedAutomationChannel[];
  /** Only leads on this board / these stages. */
  projectId?: string;
  boardId?: string;
  columnIds?: string[];
  /** Only leads with at least one of these labels (names, case-insensitive). */
  labels?: string[];
};

export type AdvancedAutomationTrigger = {
  kind: AdvancedAutomationTriggerKind;
  /**
   * Don't auto-start again on a conversation this automation already ran on within this many days. With 0
   * (default) an automation never auto-starts twice on the same conversation (`new_conversation` only).
   */
  dedupeDays: number;
  /** Extra filter evaluated on the first inbound message. */
  filter?: AutomationCondition;
  /** Common filters (channel, board/stage, label). */
  filters?: AdvancedAutomationTriggerFilters;
  /** Start at most once per lead (card) or, without a card, per conversation. */
  oncePerLead?: boolean;
  /** `keyword`: any of these words or phrases (accent- and case-insensitive). */
  keywords?: string[];
  /** `any_message`: only outside the workspace's business hours. */
  outsideBusinessHoursOnly?: boolean;
  /** `contact_no_reply` / `team_no_reply`: silence that starts the run. */
  minutes?: number;
  /** `conversation_assigned`: only when assigned to this member (empty = anyone). */
  userId?: string;
  /** CRM triggers: the board; `card_stage_changed`: the stage; `card_label_added`: the label (name). */
  projectId?: string;
  boardId?: string;
  columnId?: string;
  labelText?: string;
  /** `scheduled`: when, and for the leads of which stage. */
  schedule?: {
    frequency: 'daily' | 'weekly';
    /** `HH:MM` in the workspace time zone (business hours' zone, else UTC). */
    time: string;
    /** 0 = Sunday .. 6 = Saturday (`weekly`). */
    weekdays?: number[];
  };
  /** `date_field`: X days before (negative) or after (positive) a date field of the lead. */
  dateField?: { fieldId: string; offsetDays: number; time: string };
};

/** Hard limits of the protections (per automation). */
export const TRIGGER_LIMITS = {
  /** Runs one automation may start per minute (all triggers together). */
  runsPerMinute: 30,
  /** Leads a time trigger reads per automation per tick. */
  scheduledLeadsPerTick: 200,
  /** Pages of 50 a time trigger reads per automation per tick. */
  scheduledPagesPerTick: 4,
  /** Leads one pass of a time trigger reads at most (per automation per day). */
  scheduledLeadsPerPass: 2000,
  /** Webhook calls per automation per minute. */
  webhookPerMinute: 60,
  keywords: 20,
  keywordChars: 60,
  silenceMinutesMin: 5,
  silenceMinutesMax: 60 * 24 * 30,
} as const;

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
  /** The card this run acts on besides the conversation's linked one: created by the run, or the trigger's lead. */
  card?: { projectId: string; cardId: string; createdByRun?: boolean };
  /** What started the run (`trigger:<kind>`, `manual`, `goto`) and its event: the anti-loop marker. */
  origin?: { kind: string; eventId?: string; automationId?: string };
  startedAt: Date;
  updatedAt: Date;
};
