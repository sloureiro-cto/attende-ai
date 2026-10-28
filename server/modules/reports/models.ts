import 'server-only';
import { model, models, Schema, type Model } from 'mongoose';
import { FIRST_RESPONSE_BUCKET_COUNT, REPORT_CHANNELS, type LatencyAccumulator } from './lib';
import type { ReportChannel } from '../../../lib/attende/reports/types';

/** Rows and conversation summaries older than this are dropped (TTL index, ~26 months). */
export const REPORT_RETENTION_DAYS = 800;

// ---- report_sync_state: the job's cursor per workspace -------------------------------------------

export interface IReportSyncState {
  workspaceId: string;
  /** First run: conversations active since this instant are read (the 90-day backfill). */
  backfillFrom: Date;
  /** Set once the backfill scan reached `backfillFrom`; until then the reports answer "preparing". */
  backfillDoneAt: Date | null;
  /** Conversations with activity up to here are synced: the next scan stops at this instant (minus an overlap). */
  cursor: Date | null;
  /** The scan in progress (it can span several runs): started at, stops at, and the inbox cursor reached. */
  scan: { startedAt: Date; until: Date; inboxCursor: string | null } | null;
  lastRunAt: Date | null;
  lastSyncAt: Date | null;
  lastError: string | null;
  /** Lease: one run per workspace at a time. */
  lockedUntil: Date | null;
}

const SyncStateSchema = new Schema<IReportSyncState>(
  {
    workspaceId: { type: String, required: true, unique: true },
    backfillFrom: { type: Date, required: true },
    backfillDoneAt: { type: Date, default: null },
    cursor: { type: Date, default: null },
    scan: { type: new Schema({ startedAt: Date, until: Date, inboxCursor: { type: String, default: null } }, { _id: false }), default: null },
    lastRunAt: { type: Date, default: null },
    lastSyncAt: { type: Date, default: null },
    lastError: { type: String, default: null },
    lockedUntil: { type: Date, default: null },
  },
  { timestamps: true, collection: 'report_sync_state' }
);
SyncStateSchema.index({ lastRunAt: 1 });
export const ReportSyncStateModel: Model<IReportSyncState> = (models.ReportSyncState as Model<IReportSyncState>) ?? model<IReportSyncState>('ReportSyncState', SyncStateSchema);

// ---- report_conversations: what the job learned about each conversation ----------------------------

export type DayActivity = { day: string; inbound: number; ai: number; automation: number; human: number; aiFailed: number };

export interface IReportConversation {
  workspaceId: string;
  channel: ReportChannel;
  conversationId: string;
  sessionId: string;
  /** The AI agent of the conversation (its binding's agent, else JSYNQ's `activeAgent`), null without one. */
  agentId: string | null;
  createdAt: Date;
  createdDay: string;
  lastMessageAt: Date | null;
  lastMessageDirection: 'inbound' | 'outbound' | null;
  /** Newest message already counted, and the ids counted at that exact instant (re-reads never count twice). */
  syncedUntil: Date | null;
  syncedIdsAtEdge: string[];
  /** First inbound / AI / human message within the cohort window (creation day and the next one). */
  firstInboundAt: Date | null;
  firstAiAt: Date | null;
  firstHumanAt: Date | null;
  cohortAiReplies: number;
  cohortHumanReplies: number;
  handedOff: boolean;
  handoffs: Array<{ at: Date; day: string; reason: string }>;
  days: DayActivity[];
  activeDays: string[];
  /** The CRM card the conversation is linked to, and whether that card was created with the conversation (a lead). */
  linkedCardId: string | null;
  leadChecked: boolean;
  leadCreated: boolean;
  /** More messages than one sync reads: the oldest were not counted. */
  truncated: boolean;
  updatedAt?: Date;
}

const ConversationSchema = new Schema<IReportConversation>(
  {
    workspaceId: { type: String, required: true },
    channel: { type: String, enum: REPORT_CHANNELS, required: true },
    conversationId: { type: String, required: true },
    sessionId: { type: String, required: true },
    agentId: { type: String, default: null },
    createdAt: { type: Date, required: true },
    createdDay: { type: String, required: true },
    lastMessageAt: { type: Date, default: null },
    lastMessageDirection: { type: String, default: null },
    syncedUntil: { type: Date, default: null },
    syncedIdsAtEdge: { type: [String], default: [] },
    firstInboundAt: { type: Date, default: null },
    firstAiAt: { type: Date, default: null },
    firstHumanAt: { type: Date, default: null },
    cohortAiReplies: { type: Number, default: 0 },
    cohortHumanReplies: { type: Number, default: 0 },
    handedOff: { type: Boolean, default: false },
    handoffs: { type: [{ _id: false, at: Date, day: String, reason: String }], default: [] },
    days: { type: [{ _id: false, day: String, inbound: Number, ai: Number, automation: Number, human: Number, aiFailed: Number }], default: [] },
    activeDays: { type: [String], default: [] },
    linkedCardId: { type: String, default: null },
    leadChecked: { type: Boolean, default: false },
    leadCreated: { type: Boolean, default: false },
    truncated: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: false, updatedAt: true }, collection: 'report_conversations' }
);
ConversationSchema.index({ workspaceId: 1, channel: 1, conversationId: 1 }, { unique: true });
ConversationSchema.index({ workspaceId: 1, activeDays: 1 });
ConversationSchema.index({ workspaceId: 1, createdDay: 1 });
ConversationSchema.index({ workspaceId: 1, 'handoffs.day': 1 });
ConversationSchema.index({ updatedAt: 1 }, { expireAfterSeconds: REPORT_RETENTION_DAYS * 86_400 });
export const ReportConversationModel: Model<IReportConversation> =
  (models.ReportConversation as Model<IReportConversation>) ?? model<IReportConversation>('ReportConversation', ConversationSchema);

// ---- report_daily_stats: what the reports read ----------------------------------------------------

export interface IReportDailyStats {
  workspaceId: string;
  day: string;
  dayDate: Date;
  channel: ReportChannel;
  agentId: string | null;
  inboundMessages: number;
  aiReplies: number;
  automationReplies: number;
  humanReplies: number;
  aiFailed: number;
  conversationsActive: number;
  conversationsStarted: number;
  handoffEvents: number;
  outcomeResolvedByAi: number;
  outcomeHandedOff: number;
  outcomeHumanHandled: number;
  outcomeAbandoned: number;
  outcomeOpen: number;
  leadsCreated: number;
  frAi: LatencyAccumulator;
  frHuman: LatencyAccumulator;
  handoffReasons: Array<{ reason: string; count: number }>;
  computedAt: Date;
}

const num = { type: Number, default: 0 } as const;
const latencyPaths = () => ({ sumMs: num, count: num, buckets: { type: [Number], default: () => new Array<number>(FIRST_RESPONSE_BUCKET_COUNT).fill(0) } }) as const;

/**
 * Pre-aggregated daily counters per (workspace, UTC day, channel, agent), rebuilt as whole (workspace, day) slices
 * from `report_conversations`. `conversation*`/`outcome*`/`leadsCreated`/`fr*` are COHORT metrics (conversations that
 * STARTED that day); the rest are per-day activity.
 */
const DailyStatsSchema = new Schema<IReportDailyStats>(
  {
    workspaceId: { type: String, required: true },
    day: { type: String, required: true },
    dayDate: { type: Date, required: true },
    channel: { type: String, enum: REPORT_CHANNELS, required: true },
    agentId: { type: String, default: null },
    inboundMessages: num,
    aiReplies: num,
    automationReplies: num,
    humanReplies: num,
    aiFailed: num,
    conversationsActive: num,
    conversationsStarted: num,
    handoffEvents: num,
    outcomeResolvedByAi: num,
    outcomeHandedOff: num,
    outcomeHumanHandled: num,
    outcomeAbandoned: num,
    outcomeOpen: num,
    leadsCreated: num,
    frAi: latencyPaths(),
    frHuman: latencyPaths(),
    handoffReasons: { type: [{ _id: false, reason: String, count: Number }], default: [] },
    computedAt: { type: Date, required: true },
  },
  { collection: 'report_daily_stats', versionKey: false }
);
DailyStatsSchema.index({ workspaceId: 1, day: 1, channel: 1, agentId: 1 }, { unique: true });
DailyStatsSchema.index({ dayDate: 1 }, { expireAfterSeconds: REPORT_RETENTION_DAYS * 86_400 });
export const ReportDailyStatsModel: Model<IReportDailyStats> =
  (models.ReportDailyStats as Model<IReportDailyStats>) ?? model<IReportDailyStats>('ReportDailyStats', DailyStatsSchema);
