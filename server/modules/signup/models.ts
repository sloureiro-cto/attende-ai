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
  /** AES-GCM sealed password, kept only until the JSYNQ user is created at verify. */
  passwordEnc?: string;
  otpHash?: string;
  otpExpiresAt?: Date;
  otpAttempts: number;
  /** JSYNQ user id (set at verify, or at start-trial for an existing JSYNQ account). */
  userId?: string;
  /** The e-mail already had a JSYNQ account this partner does not manage: the user signs in with it. */
  existingAccount?: boolean;
  stripeCustomerId?: string;
  workspaceId?: string;
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
    passwordEnc: String,
    otpHash: String,
    otpExpiresAt: Date,
    otpAttempts: { type: Number, default: 0 },
    userId: String,
    existingAccount: Boolean,
    stripeCustomerId: String,
    workspaceId: String,
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
// Abandoned, never verified signups disappear after 7 days (with their sealed password).
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
