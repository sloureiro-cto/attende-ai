import 'server-only';
import mongoose, { Schema, type Model } from 'mongoose';

const model = <T>(name: string, schema: Schema<T>): Model<T> => (mongoose.models[name] as Model<T>) || mongoose.model<T>(name, schema);

/** How long a processed message id is remembered. Messages older than `MAX_MESSAGE_AGE_MS` are never processed, so a forgotten id never comes back. */
export const SEEN_TTL_SECONDS = 7 * 24 * 3600;

// ---- worker_seen_messages: every JSYNQ message the worker turned into an event (dedup across websocket + poll) ----

export interface ISeenMessage {
  /** `<channel>:<messageId>`. */
  _id: string;
  workspaceId: string;
  at: Date;
}
const SeenMessageSchema = new Schema<ISeenMessage>(
  { _id: { type: String }, workspaceId: { type: String, required: true }, at: { type: Date, required: true } },
  { collection: 'worker_seen_messages', versionKey: false }
);
SeenMessageSchema.index({ at: 1 }, { expireAfterSeconds: SEEN_TTL_SECONDS });
export const SeenMessageModel = model('WorkerSeenMessage', SeenMessageSchema);

// ---- worker_workspaces: per workspace, when the worker started watching and the safety poll's cursor ----------

export interface IWorkerWorkspace {
  workspaceId: string;
  /** Messages created before this are history: never processed (the worker does not replay the past). */
  watchFrom: Date;
  /** The poll read every conversation whose `lastMessageAt` is newer than this. */
  pollCursor: Date;
  lastPollAt?: Date | null;
  lastPollError?: string | null;
  lastEventAt?: Date | null;
}
const WorkerWorkspaceSchema = new Schema<IWorkerWorkspace>(
  {
    workspaceId: { type: String, required: true, unique: true },
    watchFrom: { type: Date, required: true },
    pollCursor: { type: Date, required: true },
    lastPollAt: { type: Date, default: null },
    lastPollError: { type: String, default: null },
    lastEventAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'worker_workspaces' }
);
export const WorkerWorkspaceModel = model('WorkerWorkspace', WorkerWorkspaceSchema);

// ---- automation_sends: idempotency of what the gateway sends (JSYNQ's send routes take no idempotency key) ------

export interface IAutomationSend {
  /** `runId:nodeId:eventId` (the executor's step key). */
  _id: string;
  workspaceId: string;
  conversationId: string;
  state: 'pending' | 'sent';
  /** The JSYNQ message id: the worker's own messages are not "a human replied" and not an inbound. */
  messageId?: string | null;
  at: Date;
}
const AutomationSendSchema = new Schema<IAutomationSend>(
  {
    _id: { type: String },
    workspaceId: { type: String, required: true },
    conversationId: { type: String, required: true },
    state: { type: String, enum: ['pending', 'sent'], required: true },
    messageId: { type: String, default: null },
    at: { type: Date, required: true },
  },
  { collection: 'automation_sends', versionKey: false }
);
AutomationSendSchema.index({ messageId: 1 }, { partialFilterExpression: { messageId: { $type: 'string' } } });
AutomationSendSchema.index({ at: 1 }, { expireAfterSeconds: 30 * 24 * 3600 });
export const AutomationSendModel = model('AutomationSend', AutomationSendSchema);

// ---- automation_ai_handoffs: conversation bindings an automation created to hand a conversation to an AI -------

export interface IAiHandoff {
  workspaceId: string;
  channel: string;
  conversationId: string;
  sessionId: string;
  agentId: string;
  bindingId: string;
  createdAt?: Date;
}
const AiHandoffSchema = new Schema<IAiHandoff>(
  {
    workspaceId: { type: String, required: true },
    channel: { type: String, required: true },
    conversationId: { type: String, required: true },
    sessionId: { type: String, required: true },
    agentId: { type: String, required: true },
    bindingId: { type: String, required: true },
  },
  { timestamps: true, collection: 'automation_ai_handoffs' }
);
AiHandoffSchema.index({ workspaceId: 1, channel: 1, conversationId: 1 }, { unique: true });
export const AiHandoffModel = model('AutomationAiHandoff', AiHandoffSchema);

// ---- automation_actions: idempotency of the non-idempotent JSYNQ writes of a step (create card, clone, comment...) --

export interface IAutomationAction {
  /** `runId:nodeId:eventId[:action]` (the executor's step key). */
  _id: string;
  workspaceId: string;
  state: 'pending' | 'done';
  /** What the call returned that a replay must return again (the created card). */
  result?: { projectId?: string; cardId?: string } | null;
  at: Date;
}
const AutomationActionSchema = new Schema<IAutomationAction>(
  {
    _id: { type: String },
    workspaceId: { type: String, required: true },
    state: { type: String, enum: ['pending', 'done'], required: true },
    result: { type: Schema.Types.Mixed, default: null },
    at: { type: Date, required: true },
  },
  { collection: 'automation_actions', versionKey: false }
);
AutomationActionSchema.index({ at: 1 }, { expireAfterSeconds: 30 * 24 * 3600 });
export const AutomationActionModel = model('AutomationAction', AutomationActionSchema);

// ---- worker_card_snapshots: what the worker last saw of a card (stage, labels), to turn CRM events into triggers ----

export interface IWorkerCardSnapshot {
  /** `<workspaceId>:<cardId>`. */
  _id: string;
  workspaceId: string;
  projectId: string;
  column: string | null;
  /** Label ids; null = never seen (a first sight is a baseline, never "labels added"). */
  labels: string[] | null;
  /** Bumped on every change seen; part of the trigger event ids. */
  rev: number;
  at: Date;
}
const CardSnapshotSchema = new Schema<IWorkerCardSnapshot>(
  {
    _id: { type: String },
    workspaceId: { type: String, required: true },
    projectId: { type: String, required: true },
    column: { type: String, default: null },
    labels: { type: [String], default: null },
    rev: { type: Number, default: 0 },
    at: { type: Date, required: true },
  },
  { collection: 'worker_card_snapshots', versionKey: false }
);
CardSnapshotSchema.index({ at: 1 }, { expireAfterSeconds: 180 * 24 * 3600 });
export const WorkerCardSnapshotModel = model('WorkerCardSnapshot', CardSnapshotSchema);

// ---- worker_crm_cursors: the CRM catch-up poll's cursor per watched project --------------------------------------

export interface IWorkerCrmCursor {
  /** `<workspaceId>:<projectId>`. */
  _id: string;
  workspaceId: string;
  cursor: Date;
}
const CrmCursorSchema = new Schema<IWorkerCrmCursor>(
  { _id: { type: String }, workspaceId: { type: String, required: true }, cursor: { type: Date, required: true } },
  { collection: 'worker_crm_cursors', versionKey: false }
);
export const WorkerCrmCursorModel = model('WorkerCrmCursor', CrmCursorSchema);

// ---- automation_schedule_states: progress of a time trigger's pass for its current slot (one day) ----------------

export interface IAutomationScheduleState {
  /** The automation id. */
  _id: string;
  workspaceId: string;
  /** Local date of the pass (`YYYY-MM-DD`). */
  slot: string;
  /** Next page to read (1-based). */
  page: number;
  done: boolean;
  /** Leads read in this slot. */
  read: number;
  at: Date;
}
const ScheduleStateSchema = new Schema<IAutomationScheduleState>(
  {
    _id: { type: String },
    workspaceId: { type: String, required: true },
    slot: { type: String, required: true },
    page: { type: Number, default: 1 },
    done: { type: Boolean, default: false },
    read: { type: Number, default: 0 },
    at: { type: Date, required: true },
  },
  { collection: 'automation_schedule_states', versionKey: false }
);
export const AutomationScheduleStateModel = model('AutomationScheduleState', ScheduleStateSchema);
