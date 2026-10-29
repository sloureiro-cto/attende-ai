import 'server-only';
import mongoose, { Schema, type Model } from 'mongoose';
import type { Entitlements } from './deriveEntitlements';

const model = <T>(name: string, schema: Schema<T>): Model<T> =>
  (mongoose.models[name] as Model<T>) || mongoose.model<T>(name, schema);

// ---- subscriptions: Attende's record of the workspace's JSYNQ subscription ---------------------

/**
 * `source: 'attende'`: an `attende-*` subscription JSYNQ created for this workspace (`upgrade-to-trial`); the Stripe
 * subscription id stays here after it ends, so a canceled customer is told apart from one who never subscribed (JSYNQ's
 * `/subscriptions/me` then shows the free plan). `source: 'jsynq_plan'`: the workspace pays a JSYNQ plan and gets
 * Attende included; nothing here ever acts on that subscription. `userId` is the member this service acts as in JSYNQ.
 */
export type SubscriptionSource = 'attende' | 'jsynq_plan';
export interface ISubscription {
  workspaceId: string;
  userId: string;
  source: SubscriptionSource;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  status: string;
  planSlug?: string;
  priceId?: string;
  currency?: string;
  trialEnd?: Date | null;
  currentPeriodEnd?: Date | null;
  cancelAtPeriodEnd?: boolean;
  canceledAt?: Date | null;
  reconciledAt?: Date;
}
const SubscriptionSchema = new Schema<ISubscription>(
  {
    workspaceId: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    source: { type: String, enum: ['attende', 'jsynq_plan'], default: 'attende' },
    stripeCustomerId: String,
    stripeSubscriptionId: { type: String },
    status: { type: String, required: true },
    planSlug: String,
    priceId: String,
    currency: String,
    trialEnd: Date,
    currentPeriodEnd: Date,
    cancelAtPeriodEnd: { type: Boolean, default: false },
    canceledAt: Date,
    reconciledAt: Date,
  },
  { timestamps: true, collection: 'subscriptions' }
);
SubscriptionSchema.index({ stripeSubscriptionId: 1 }, { unique: true, partialFilterExpression: { stripeSubscriptionId: { $type: 'string' } } });
SubscriptionSchema.index({ reconciledAt: 1 });
export const SubscriptionModel = model('Subscription', SubscriptionSchema);

// ---- entitlements: what the workspace may use (derived from the subscription) ------------------

export interface IEntitlement extends Entitlements {
  workspaceId: string;
  updatedAt?: Date;
}
const EntitlementSchema = new Schema<IEntitlement>(
  {
    workspaceId: { type: String, required: true, unique: true },
    tier: { type: String, required: true },
    limits: { type: Schema.Types.Mixed, required: true },
    status: { type: String, required: true },
    trialEndsAt: Date,
    currentPeriodEnd: Date,
    trialOutboundCap: Number,
    source: { type: String, enum: ['attende', 'jsynq_plan'], default: 'attende' },
  },
  { timestamps: true, collection: 'entitlements' }
);
export const EntitlementModel = model('Entitlement', EntitlementSchema);

// ---- usage_counters: what Attende meters itself (JSYNQ has no per-workspace meter for us) -----

/** `period` is a UTC month (`2026-10`) or `trial` (the trial outbound cap spans the whole trial). */
export interface IUsageCounter {
  workspaceId: string;
  period: string;
  aiReplies: number;
  outbound: number;
}
const UsageCounterSchema = new Schema<IUsageCounter>(
  {
    workspaceId: { type: String, required: true },
    period: { type: String, required: true },
    aiReplies: { type: Number, default: 0 },
    outbound: { type: Number, default: 0 },
  },
  { timestamps: true, collection: 'usage_counters' }
);
UsageCounterSchema.index({ workspaceId: 1, period: 1 }, { unique: true });
export const UsageCounterModel = model('UsageCounter', UsageCounterSchema);

// ---- agent_pauses: Attende bindings this service paused, and why ------------------------------

export const PAUSE_REASONS = ['access', 'ai_quota'] as const;
export type PauseReason = (typeof PAUSE_REASONS)[number];

/**
 * The workspace's Attende agents are paused by this service while any reason holds: `access`
 * (trial ended, subscription canceled, paid period long over) or `ai_quota` (monthly AI replies
 * used up). `bindingIds` are the JSYNQ bindings that were active when paused: only those resume.
 */
export interface IAgentPause {
  workspaceId: string;
  reasons: PauseReason[];
  bindingIds: string[];
  pausedAt: Date;
  lastError?: string;
}
const AgentPauseSchema = new Schema<IAgentPause>(
  {
    workspaceId: { type: String, required: true, unique: true },
    reasons: { type: [String], enum: PAUSE_REASONS, default: [] },
    bindingIds: { type: [String], default: [] },
    pausedAt: { type: Date, required: true },
    lastError: String,
  },
  { timestamps: true, collection: 'agent_pauses' }
);
AgentPauseSchema.index({ reasons: 1 });
export const AgentPauseModel = model('AgentPause', AgentPauseSchema);
