import 'server-only';
import mongoose, { Schema, type Model } from 'mongoose';
import type {
  AdvancedAutomationChannel,
  AdvancedAutomationEdge,
  AdvancedAutomationNode,
  AdvancedAutomationRunState,
  AdvancedAutomationStatus,
  AdvancedAutomationTrigger,
} from './types';

const model = <T>(name: string, schema: Schema<T>): Model<T> => (mongoose.models[name] as Model<T>) || mongoose.model<T>(name, schema);

export interface IAdvancedAutomation {
  _id: mongoose.Types.ObjectId;
  workspaceId: string;
  name: string;
  status: AdvancedAutomationStatus;
  channels: Array<{ channel: AdvancedAutomationChannel; enabledSessionIds: string[] }>;
  trigger: AdvancedAutomationTrigger;
  stopOnHumanReply: boolean;
  startNodeId: string;
  nodes: AdvancedAutomationNode[];
  edges: AdvancedAutomationEdge[];
  /** Bumped when the flow changes; a run whose current step was deleted ends `stopped`. */
  version: number;
  createdBy: string;
  updatedBy?: string;
  /** Webhook trigger: SHA-256 of the per-automation secret (the secret itself is shown once and never stored). */
  webhookSecretHash?: string | null;
  webhookSecretSetAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const AdvancedAutomationSchema = new Schema<IAdvancedAutomation>(
  {
    workspaceId: { type: String, required: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    status: { type: String, enum: ['draft', 'active', 'paused'], default: 'draft' },
    channels: {
      type: [new Schema({ channel: { type: String, enum: ['whatsapp', 'instagram', 'sms'], required: true }, enabledSessionIds: [String] }, { _id: false })],
      default: [],
    },
    trigger: { type: Schema.Types.Mixed, required: true },
    stopOnHumanReply: { type: Boolean, default: true },
    startNodeId: { type: String, default: '' },
    // Plain arrays of validated objects; Mixed keeps the graph exactly as the editor sent it.
    nodes: { type: Schema.Types.Mixed, default: () => [] },
    edges: { type: Schema.Types.Mixed, default: () => [] },
    version: { type: Number, default: 1 },
    createdBy: { type: String, required: true },
    updatedBy: String,
    webhookSecretHash: { type: String, default: null },
    webhookSecretSetAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'advanced_automations' }
);
AdvancedAutomationSchema.index({ workspaceId: 1, status: 1, updatedAt: -1 });
// Trigger lookup on inbound: which active automations run on this session?
AdvancedAutomationSchema.index({ workspaceId: 1, status: 1, 'channels.enabledSessionIds': 1 });
// Trigger lookup for CRM / time / webhook events: active automations of a kind.
AdvancedAutomationSchema.index({ workspaceId: 1, status: 1, 'trigger.kind': 1 });
export const AdvancedAutomationModel = model('AdvancedAutomation', AdvancedAutomationSchema);

/** Daily funnel counters for one automation: `_id = <automationId>:<YYYY-MM-DD>`, updated with `$inc`. */
export interface IAdvancedAutomationStats {
  _id: string;
  workspaceId: string;
  automationId: string;
  day: string;
  dayDate: Date;
  started?: number;
  completed?: number;
  handedOff?: number;
  stopped?: number;
  failed?: number;
  nodes?: Record<string, { reached?: number; exits?: Record<string, number> }>;
}
const StatsSchema = new Schema<IAdvancedAutomationStats>(
  {
    _id: { type: String },
    workspaceId: { type: String, required: true },
    automationId: { type: String, required: true },
    day: { type: String, required: true },
    dayDate: { type: Date, required: true },
    started: Number,
    completed: Number,
    handedOff: Number,
    stopped: Number,
    failed: Number,
    nodes: { type: Schema.Types.Mixed },
  },
  { collection: 'advanced_automation_daily_stats', versionKey: false }
);
StatsSchema.index({ workspaceId: 1, automationId: 1, dayDate: -1 });
StatsSchema.index({ dayDate: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 400 });
export const AdvancedAutomationStatsModel = model('AdvancedAutomationStats', StatsSchema);

/**
 * Run state of one conversation (previously embedded in JSYNQ conversation documents). Keyed by
 * `(workspaceId, channel, conversationId)`; `rev` is the compare-and-set token; `waitUntil` is the
 * next wake-up (timer, no-reply timeout, or the doorbell of a freshly claimed run).
 */
export interface IAutomationRun {
  workspaceId: string;
  channel: AdvancedAutomationChannel;
  conversationId: string;
  sessionId: string;
  run?: (AdvancedAutomationRunState & { rev: number; lastEventId?: string }) | null;
  history: Array<{ automationId: string; at: Date }>;
  waitUntil?: Date | null;
}
const RunSchema = new Schema<IAutomationRun>(
  {
    workspaceId: { type: String, required: true },
    channel: { type: String, required: true },
    conversationId: { type: String, required: true },
    sessionId: { type: String, default: '' },
    run: { type: Schema.Types.Mixed, default: null },
    history: { type: [new Schema({ automationId: String, at: Date }, { _id: false })], default: [] },
    waitUntil: { type: Date, default: null },
  },
  { timestamps: true, collection: 'advanced_automation_runs', minimize: false }
);
RunSchema.index({ workspaceId: 1, channel: 1, conversationId: 1 }, { unique: true });
RunSchema.index({ waitUntil: 1 }, { partialFilterExpression: { waitUntil: { $type: 'date' } } });
export const AutomationRunModel = model('AutomationRun', RunSchema);

/** Most recent automation starts kept per conversation (dedupe window + start rate limit). */
export const RUN_HISTORY_MAX = 20;

// ---- trigger bookkeeping (shared by the worker's triggers and the webhook route) -------------------------------------

/** One trigger event an automation already handled (`<automationId>:<eventId>`): redeliveries are no-ops. */
export interface IAutomationTriggerEvent {
  _id: string;
  workspaceId: string;
  at: Date;
}
const TriggerEventSchema = new Schema<IAutomationTriggerEvent>(
  { _id: { type: String }, workspaceId: { type: String, required: true }, at: { type: Date, required: true } },
  { collection: 'automation_trigger_events', versionKey: false }
);
TriggerEventSchema.index({ at: 1 }, { expireAfterSeconds: 7 * 24 * 3600 });
export const AutomationTriggerEventModel = model('AutomationTriggerEvent', TriggerEventSchema);

/** "Only once per lead": `<automationId>:<lead key>` (a card, or a conversation without one). Kept 400 days. */
export interface IAutomationLeadStart {
  _id: string;
  workspaceId: string;
  at: Date;
}
const LeadStartSchema = new Schema<IAutomationLeadStart>(
  { _id: { type: String }, workspaceId: { type: String, required: true }, at: { type: Date, required: true } },
  { collection: 'automation_lead_starts', versionKey: false }
);
LeadStartSchema.index({ at: 1 }, { expireAfterSeconds: 400 * 24 * 3600 });
export const AutomationLeadStartModel = model('AutomationLeadStart', LeadStartSchema);

/** Fixed-window counters shared by every instance: runs per automation per minute, webhook calls per minute. */
export interface IAutomationCounter {
  _id: string;
  n: number;
  expireAt: Date;
}
const CounterSchema = new Schema<IAutomationCounter>(
  { _id: { type: String }, n: { type: Number, default: 0 }, expireAt: { type: Date, required: true } },
  { collection: 'automation_counters', versionKey: false }
);
CounterSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });
export const AutomationCounterModel = model('AutomationCounter', CounterSchema);

/**
 * Anti-loop marker: a change an automation itself made in JSYNQ (`<workspaceId>:<subject>:<change>` -> the automation
 * and run). A trigger event for that same change within the window does not start that automation again.
 */
export interface IAutomationEcho {
  _id: string;
  workspaceId: string;
  automationId: string;
  runId: string;
  at: Date;
}
const EchoSchema = new Schema<IAutomationEcho>(
  {
    _id: { type: String },
    workspaceId: { type: String, required: true },
    automationId: { type: String, required: true },
    runId: { type: String, required: true },
    at: { type: Date, required: true },
  },
  { collection: 'automation_echoes', versionKey: false }
);
// Each kind of marker has its own window (`mongoTriggerGuards.isEcho`); a message marker must outlive a silence.
EchoSchema.index({ at: 1 }, { expireAfterSeconds: 31 * 24 * 3600 });
export const AutomationEchoModel = model('AutomationEcho', EchoSchema);
