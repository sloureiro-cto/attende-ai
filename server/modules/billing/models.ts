import 'server-only';
import mongoose, { Schema, type Model } from 'mongoose';
import type { Entitlements } from './deriveEntitlements';
import type { TierLimits } from './tiers';

const model = <T>(name: string, schema: Schema<T>): Model<T> =>
  (mongoose.models[name] as Model<T>) || mongoose.model<T>(name, schema);

// ---- plans: the catalog (tiers + Stripe prices), seeded by scripts/seed-plans.ts ---------------

export type PlanPrice = { id: string; currency: string; interval: 'month' | 'year'; intervalCount: number; amount: number; active: boolean };
export interface IPlan {
  slug: string;
  title: string;
  limits?: Partial<TierLimits>;
  stripeProductId?: string;
  prices: PlanPrice[];
  active: boolean;
}
const PlanSchema = new Schema<IPlan>(
  {
    slug: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    limits: { type: Schema.Types.Mixed },
    stripeProductId: String,
    prices: {
      type: [new Schema<PlanPrice>({ id: String, currency: String, interval: String, intervalCount: Number, amount: Number, active: Boolean }, { _id: false })],
      default: [],
    },
    active: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'plans' }
);
PlanSchema.index({ 'prices.id': 1 });
export const PlanModel = model('Plan', PlanSchema);

// ---- subscriptions: our view of the Stripe subscription of a workspace ------------------------

export interface ISubscription {
  workspaceId: string;
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId?: string;
  status: string;
  planSlug?: string;
  priceId?: string;
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
    stripeCustomerId: { type: String, required: true },
    stripeSubscriptionId: { type: String },
    status: { type: String, required: true },
    planSlug: String,
    priceId: String,
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
  },
  { timestamps: true, collection: 'entitlements' }
);
export const EntitlementModel = model('Entitlement', EntitlementSchema);

// ---- processed_events: webhook idempotency (Stripe and JSYNQ) ---------------------------------

export interface IProcessedEvent {
  _id: string;
  source: 'stripe' | 'jsynq';
  type: string;
  processedAt: Date;
}
const ProcessedEventSchema = new Schema<IProcessedEvent>(
  { _id: { type: String }, source: { type: String, required: true }, type: String, processedAt: { type: Date, default: () => new Date() } },
  { collection: 'processed_events', versionKey: false }
);
ProcessedEventSchema.index({ processedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 45 });
export const ProcessedEventModel = model('ProcessedEvent', ProcessedEventSchema);

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
