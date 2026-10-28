import 'server-only';
import mongoose, { Schema, type Model } from 'mongoose';
import type { JsynqLimitsInput } from '../../lib/jsynq';
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

// ---- limits_sync: desired JSYNQ limits vs what JSYNQ acknowledged -----------------------------

export interface ILimitsSync {
  workspaceId: string;
  desired: JsynqLimitsInput;
  desiredHash: string;
  syncedHash?: string;
  syncedAt?: Date;
  jsynqVersion?: number;
  attempts: number;
  lastError?: string;
}
const LimitsSyncSchema = new Schema<ILimitsSync>(
  {
    workspaceId: { type: String, required: true, unique: true },
    desired: { type: Schema.Types.Mixed, required: true },
    desiredHash: { type: String, required: true },
    syncedHash: String,
    syncedAt: Date,
    jsynqVersion: Number,
    attempts: { type: Number, default: 0 },
    lastError: String,
  },
  { timestamps: true, collection: 'limits_sync' }
);
export const LimitsSyncModel = model('LimitsSync', LimitsSyncSchema);
