import 'server-only';
import mongoose, { Schema, type Model, type Types } from 'mongoose';

export const SIGNUP_STATES = ['pending_verification', 'verified', 'trial_starting', 'trial_started', 'failed'] as const;
export type SignupState = (typeof SIGNUP_STATES)[number];

export interface ISignup {
  _id: Types.ObjectId;
  email: string;
  canonicalEmail: string;
  name: string;
  businessName: string;
  locale: 'pt' | 'en' | 'es';
  planSlug?: string;
  state: SignupState;
  /** `POST /api/users` succeeded: the JSYNQ user exists (unverified until the OTP) and JSYNQ e-mailed the code. */
  jsynqUserCreated?: boolean;
  /** Wrong codes since the last one sent (JSYNQ does not count them; this service stops guessing at 5). */
  otpAttempts: number;
  /** JSYNQ user id (set at verify, or at start-trial for an existing JSYNQ account). */
  userId?: string;
  /** The e-mail already had a JSYNQ account this signup did not create: the user signs in with it. */
  existingAccount?: boolean;
  stripeCustomerId?: string;
  /**
   * Idempotency of `POST /api/workspaces` (not idempotent in JSYNQ): set before the call. A retry
   * after a crash between that call and saving `workspaceId` adopts the workspace this user created
   * with the business name since then, instead of creating a second one.
   */
  workspaceCreateStartedAt?: Date;
  workspaceId?: string;
  /** The CRM project seeded in the workspace (`POST /api/projects`, type `crm`). */
  crmProjectId?: string;
  subscriptionId?: string;
  lockedAt?: Date;
  startAttempts: number;
  lastErrorRef?: string;
  trialEndsAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SignupSchema = new Schema<ISignup>(
  {
    email: { type: String, required: true, unique: true },
    canonicalEmail: { type: String, required: true },
    name: { type: String, required: true },
    businessName: { type: String, required: true },
    locale: { type: String, enum: ['pt', 'en', 'es'], default: 'pt' },
    planSlug: String,
    state: { type: String, enum: SIGNUP_STATES, default: 'pending_verification' },
    jsynqUserCreated: Boolean,
    otpAttempts: { type: Number, default: 0 },
    userId: String,
    existingAccount: Boolean,
    stripeCustomerId: String,
    workspaceCreateStartedAt: Date,
    workspaceId: String,
    crmProjectId: String,
    subscriptionId: String,
    lockedAt: Date,
    startAttempts: { type: Number, default: 0 },
    lastErrorRef: String,
    trialEndsAt: Date,
  },
  { timestamps: true, collection: 'signups' }
);
SignupSchema.index({ userId: 1 }, { unique: true, partialFilterExpression: { userId: { $type: 'string' } } });
SignupSchema.index({ canonicalEmail: 1 });
// Abandoned, never verified signups disappear after 7 days (the unverified JSYNQ user stays in JSYNQ).
SignupSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 86_400, partialFilterExpression: { state: 'pending_verification' } });

export const SignupModel: Model<ISignup> = (mongoose.models.Signup as Model<ISignup>) || mongoose.model<ISignup>('Signup', SignupSchema);

export type TrialClaimKind = 'card' | 'email';
export interface ITrialClaim {
  kind: TrialClaimKind;
  /** sha256 of the card fingerprint / canonical mailbox. Never the raw value. */
  key: string;
  userId: string;
  workspaceId?: string;
  status: 'reserved' | 'consumed';
}
const TrialClaimSchema = new Schema<ITrialClaim>(
  {
    kind: { type: String, enum: ['card', 'email'], required: true },
    key: { type: String, required: true },
    userId: { type: String, required: true },
    workspaceId: String,
    status: { type: String, enum: ['reserved', 'consumed'], default: 'reserved' },
  },
  { timestamps: true, collection: 'trial_claims' }
);
// The abuse defence: one trial per card and per mailbox. The unique index makes reservations atomic.
TrialClaimSchema.index({ kind: 1, key: 1 }, { unique: true });

export const TrialClaimModel: Model<ITrialClaim> =
  (mongoose.models.TrialClaim as Model<ITrialClaim>) || mongoose.model<ITrialClaim>('TrialClaim', TrialClaimSchema);

/**
 * A JSYNQ workspace a failed signup created and could not delete (`DELETE /api/workspaces/:id`
 * failed). Logged and kept here for an operator; nothing reads it automatically.
 */
export interface IOrphanWorkspace {
  workspaceId: string;
  userId: string;
  signupId: string;
  error: string;
}
const OrphanWorkspaceSchema = new Schema<IOrphanWorkspace>(
  { workspaceId: { type: String, required: true, unique: true }, userId: String, signupId: String, error: String },
  { timestamps: true, collection: 'orphan_workspaces' }
);
export const OrphanWorkspaceModel: Model<IOrphanWorkspace> =
  (mongoose.models.OrphanWorkspace as Model<IOrphanWorkspace>) || mongoose.model<IOrphanWorkspace>('OrphanWorkspace', OrphanWorkspaceSchema);
