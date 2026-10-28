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
