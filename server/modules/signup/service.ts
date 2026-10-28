import 'server-only';
import type { Deps } from '../../deps';
import { AppError } from '../../lib/errors';
import { decrypt, encrypt, randomOtp, safeEqual, sha256Hex } from '../../lib/crypto';
import { JsynqError, mapJsynqError } from '../../lib/jsynq';
import { errMessage, log } from '../../lib/logger';
import { findSellablePlan, pickMonthlyPrice } from '../billing/catalog';
import { EntitlementModel, LimitsSyncModel, SubscriptionModel } from '../billing/models';
import { BillingService, getEntitlements } from '../billing/service';
import { SUBSCRIPTION_APP_TAG } from '../billing/stripeGateway';
import { DEFAULT_TIER, TRIAL_DAYS } from '../billing/tiers';
import { canonicalEmail } from './canonicalEmail';
import { isDisposableEmail } from './disposable';
import { signupError } from './errors';
import { SignupModel, type ISignup } from './models';
import type { SignupInput, StartTrialInput, VerifyInput } from './schemas';
import { consumeTrialClaim, releaseTrialClaim, reserveTrialClaim } from './trialClaims';

const OTP_TTL_MS = 10 * 60_000;
const OTP_MAX_ATTEMPTS = 5;
/** A `trial_starting` lock older than this is a crashed attempt and can be taken over. */
export const TRIAL_LOCK_STALE_MS = 5 * 60_000;

const otpHash = (signupId: string, otp: string) => sha256Hex(`${signupId}:${otp}`);

function passwordContainsName(name: string, password: string): boolean {
  const lowered = password.toLowerCase();
  return name
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .some((part) => part.length > 4 && lowered.includes(part));
}

const OTP_SUBJECT = { pt: 'Seu código de verificação', en: 'Your verification code', es: 'Tu código de verificación' } as const;
const OTP_TEXT = {
  pt: (code: string) => `Seu código para criar a conta no Attende: ${code}. Ele vale por 10 minutos.`,
  en: (code: string) => `Your code to create your Attende account: ${code}. It is valid for 10 minutes.`,
  es: (code: string) => `Tu código para crear la cuenta en Attende: ${code}. Es válido por 10 minutos.`,
} as const;

export type SessionUser = { userId: string; email?: string };

export type StartTrialResult = {
  workspaceId: string;
  subscriptionStatus: string;
  trialEndsAt: string | null;
  plan: { slug: string; name: string };
  alreadyStarted: boolean;
  entitlements: Awaited<ReturnType<typeof getEntitlements>>;
};

/**
 * Self-serve onboarding: register (OTP by e-mail) -> verify (JSYNQ user via the partner API) ->
 * SetupIntent -> start trial (claims -> JSYNQ workspace -> Stripe trial -> JSYNQ limits ->
 * conversation analytics). Every external step is idempotent and compensated on failure.
 */
export class SignupService {
  private readonly billing: BillingService;

  constructor(private readonly deps: Deps) {
    this.billing = new BillingService(deps);
  }

  // --- register / verify ---------------------------------------------------------------

  async register(input: SignupInput): Promise<{ email: string; nextStep: 'verify_email' }> {
    if (isDisposableEmail(input.email)) throw signupError('DISPOSABLE_EMAIL', 'Please use a permanent e-mail address.');
    if (passwordContainsName(input.name, input.password)) throw signupError('PASSWORD_CONTAINS_NAME', "your name can't be a part of your password");

    const existing = await SignupModel.findOne({ email: input.email }).lean();
    if (existing && existing.state !== 'pending_verification') throw signupError('EMAIL_IN_USE', 'E-mail address already in use');

    const signup = await SignupModel.findOneAndUpdate(
      { email: input.email, state: 'pending_verification' },
      {
        $set: {
          canonicalEmail: canonicalEmail(input.email),
          name: input.name.replace(/\s+/g, ' ').trim(),
          businessName: input.businessName,
          locale: input.locale,
          planSlug: input.planSlug,
          passwordEnc: encrypt(input.password),
        },
        $setOnInsert: { email: input.email, state: 'pending_verification', startAttempts: 0 },
      },
      { upsert: true, new: true }
    ).lean<ISignup>();
    await this.sendOtp(signup!);
    return { email: input.email, nextStep: 'verify_email' };
  }

  async resend(email: string): Promise<void> {
    const signup = await SignupModel.findOne({ email, state: 'pending_verification' }).lean<ISignup>();
    if (signup) await this.sendOtp(signup);
  }

  private async sendOtp(signup: ISignup) {
    const code = randomOtp();
    await SignupModel.updateOne(
      { _id: signup._id },
      { $set: { otpHash: otpHash(String(signup._id), code), otpExpiresAt: new Date(this.deps.now().getTime() + OTP_TTL_MS), otpAttempts: 0 } }
    );
    await this.deps.mailer.send({ to: signup.email, subject: OTP_SUBJECT[signup.locale], text: OTP_TEXT[signup.locale](code) });
  }

  /**
   * Checks the OTP, then creates the JSYNQ user through the partner API and returns its login
   * summary (with an `accessToken` the frontend may use). If the e-mail already has a JSYNQ
   * account this partner did not create: 409 `USER_EXISTS_UNMANAGED`; the user signs in with that
   * account and `start-trial` continues with its id.
   */
  async verify(input: VerifyInput) {
    const signup = await SignupModel.findOne({ email: input.email }).lean<ISignup>();
    if (!signup) throw signupError('OTP_NOT_FOUND', 'verification OTP not found');
    if (signup.state !== 'pending_verification') return this.verifiedResult(signup);
    if (!signup.otpHash || !signup.otpExpiresAt) throw signupError('OTP_NOT_FOUND', 'verification OTP not found');
    if (signup.otpExpiresAt.getTime() < this.deps.now().getTime()) throw signupError('OTP_EXPIRED', 'verification OTP has expired');
    if (signup.otpAttempts >= OTP_MAX_ATTEMPTS) throw signupError('OTP_EXPIRED', 'too many attempts, ask for a new code');
    if (!safeEqual(signup.otpHash, otpHash(String(signup._id), input.otp))) {
      await SignupModel.updateOne({ _id: signup._id }, { $inc: { otpAttempts: 1 } });
      throw signupError('OTP_INVALID', 'invalid verification OTP');
    }

    let userId: string | undefined;
    try {
      const out = await this.deps.partner.createUser({
        email: signup.email,
        name: signup.name,
        password: signup.passwordEnc ? decrypt(signup.passwordEnc) : undefined,
        locale: signup.locale,
      });
      userId = out.userId;
    } catch (error) {
      if (error instanceof JsynqError && error.reference === 'USER_EXISTS_UNMANAGED') {
        await SignupModel.updateOne(
          { _id: signup._id },
          { $set: { state: 'verified', existingAccount: true }, $unset: { passwordEnc: 1, otpHash: 1, otpExpiresAt: 1 } }
        );
        throw signupError('USER_EXISTS_UNMANAGED', 'This e-mail already has an account. Sign in with it to continue.');
      }
      throw mapJsynqError(error);
    }
    await SignupModel.updateOne(
      { _id: signup._id },
      { $set: { state: 'verified', userId }, $unset: { passwordEnc: 1, otpHash: 1, otpExpiresAt: 1 } }
    );
    log.info('signup.verified', { signupId: String(signup._id), userId });
    return this.verifiedResult({ ...signup, state: 'verified', userId });
  }

  private async verifiedResult(signup: ISignup) {
    if (signup.existingAccount || !signup.userId) throw signupError('USER_EXISTS_UNMANAGED', 'This e-mail already has an account. Sign in with it to continue.');
    const login = await this.deps.partner.loginToken(signup.userId).catch((error) => {
      throw mapJsynqError(error);
    });
    return { ...login, signup: { businessName: signup.businessName, planSlug: signup.planSlug ?? null, state: signup.state } };
  }

  // --- session steps -------------------------------------------------------------------

  /**
   * The signup of the signed-in user: by user id, or (existing JSYNQ account) by the verified
   * e-mail of the JWT, which binds the user id to it.
   */
  private async signupOf(user: SessionUser): Promise<ISignup> {
    const byUser = await SignupModel.findOne({ userId: user.userId }).lean<ISignup>();
    if (byUser) return byUser;
    if (user.email) {
      const email = user.email.trim().toLowerCase();
      const pending = await SignupModel.findOne({ email }).lean<ISignup>();
      if (pending?.state === 'pending_verification') throw signupError('NOT_VERIFIED', 'Verify your e-mail first.');
      if (pending?.existingAccount && !pending.userId) {
        const bound = await SignupModel.findOneAndUpdate({ _id: pending._id, userId: { $exists: false } }, { $set: { userId: user.userId } }, { new: true }).lean<ISignup>();
        if (bound) return bound;
      }
    }
    throw signupError('NO_SIGNUP', 'signup not found');
  }

  async createSetupIntent(user: SessionUser): Promise<{ clientSecret: string }> {
    const signup = await this.signupOf(user);
    const customerId = await this.ensureCustomer(signup);
    return this.deps.stripe.createSetupIntent(customerId);
  }

  private async ensureCustomer(signup: ISignup): Promise<string> {
    if (signup.stripeCustomerId) return signup.stripeCustomerId;
    const customer = await this.deps.stripe.createCustomer({
      email: signup.email,
      name: signup.name,
      metadata: { app: SUBSCRIPTION_APP_TAG, signupId: String(signup._id), userId: signup.userId ?? '' },
    });
    // Only one customer per signup even under a double click: the first write wins.
    const won = await SignupModel.findOneAndUpdate({ _id: signup._id, stripeCustomerId: { $exists: false } }, { $set: { stripeCustomerId: customer.id } }, { new: true }).lean<ISignup>();
    return won?.stripeCustomerId ?? (await SignupModel.findById(signup._id).lean<ISignup>())!.stripeCustomerId!;
  }

  async startTrial(user: SessionUser, input: StartTrialInput, ctx: { country?: string } = {}): Promise<StartTrialResult> {
    const found = await this.signupOf(user);
    if (found.state === 'trial_started' && found.workspaceId) return this.existingResult(found);

    const signup = await this.takeLock(found);
    if (!signup) throw signupError('TRIAL_IN_PROGRESS', 'Your trial is already being set up. Please wait a moment.');
    const userId = user.userId;

    const claims: Array<{ kind: 'card' | 'email'; key: string }> = [];
    const done: { workspaceId?: string; workspaceCreated?: boolean; subscriptionId?: string } = {};
    try {
      const slug = input.planSlug ?? signup.planSlug ?? DEFAULT_TIER;
      const plan = await findSellablePlan(slug);
      const price = plan ? pickMonthlyPrice(plan, ctx.country || 'BR') : null;
      if (!plan || !price) throw signupError('PLAN_NOT_AVAILABLE', 'This plan is not available.');

      const customerId = await this.ensureCustomer(signup);
      const fingerprint = await this.cardFingerprint(input.paymentMethodId, customerId);

      for (const [kind, key] of [['email', signup.canonicalEmail], ['card', fingerprint]] as const) {
        const outcome = await reserveTrialClaim(kind, key, userId);
        if (outcome === 'taken') throw signupError('TRIAL_ALREADY_USED', 'A free trial was already used with this card or e-mail.');
        if (outcome === 'reserved') claims.push({ kind, key });
      }

      // Idempotent by signup id: a retry after a crash gets the same workspace back.
      const ws = await this.deps.partner
        .createWorkspace({ name: signup.businessName, ownerUserId: userId, language: signup.locale, idempotencyKey: `signup:${String(signup._id)}`, seed: ['crm_project'] })
        .catch((error) => {
          throw mapJsynqError(error);
        });
      done.workspaceId = ws.workspaceId;
      done.workspaceCreated = ws.created;
      await SignupModel.updateOne({ _id: signup._id }, { $set: { workspaceId: ws.workspaceId } });

      // A crashed attempt may have created the subscription already: reuse it rather than double-bill.
      const previous = signup.subscriptionId ? await this.deps.stripe.retrieveSubscription(signup.subscriptionId).catch(() => null) : null;
      const sub = previous && previous.status !== 'canceled' && previous.status !== 'incomplete_expired' ? previous : await this.deps.stripe.createSubscription({
        customerId,
        priceId: price.id,
        trialDays: TRIAL_DAYS,
        paymentMethodId: input.paymentMethodId,
        metadata: { app: SUBSCRIPTION_APP_TAG, workspaceId: ws.workspaceId, userId, signupId: String(signup._id) },
        idempotencyKey: `trial:${String(signup._id)}:${signup.startAttempts}`,
      });
      done.subscriptionId = sub.id;
      await SignupModel.updateOne({ _id: signup._id }, { $set: { subscriptionId: sub.id } });

      // Entitlements + JSYNQ limits. A workspace without limits is unrestricted in JSYNQ, so this must succeed.
      const entitlements = await this.billing.applySubscription(sub, { workspaceId: ws.workspaceId, userId });
      if (!(await this.billing.syncLimits(ws.workspaceId))) throw new AppError(503, 'Could not apply the plan limits, try again', 'JSYNQ_UNAVAILABLE');

      try {
        await this.deps.partner.setFeatures(ws.workspaceId, { conversationAnalytics: true });
      } catch (error) {
        // Reports read empty until an operator (or a retry) enables it; the trial itself works.
        log.warn('signup.analytics_feature_failed', { workspaceId: ws.workspaceId, error: errMessage(error) });
      }

      for (const c of claims) await consumeTrialClaim(c.kind, c.key, userId, ws.workspaceId);
      await SignupModel.updateOne(
        { _id: signup._id },
        { $set: { state: 'trial_started', ...(sub.trialEnd ? { trialEndsAt: sub.trialEnd } : {}) }, $unset: { lockedAt: 1, lastErrorRef: 1 } }
      );
      log.info('signup.trial_started', { signupId: String(signup._id), userId, workspaceId: ws.workspaceId, subscriptionId: sub.id });
      return {
        workspaceId: ws.workspaceId,
        subscriptionStatus: sub.status,
        trialEndsAt: sub.trialEnd ? sub.trialEnd.toISOString() : null,
        plan: { slug: plan.slug, name: plan.title },
        alreadyStarted: false,
        entitlements,
      };
    } catch (error) {
      const mapped = this.mapError(error);
      await this.compensate(signup, userId, claims, done, mapped);
      throw mapped;
    }
  }

  /** Undo, newest first: Stripe subscription, local billing rows, the JSYNQ workspace, the claims. */
  private async compensate(signup: ISignup, userId: string, claims: Array<{ kind: 'card' | 'email'; key: string }>, done: { workspaceId?: string; subscriptionId?: string }, error: unknown) {
    const step = async (name: string, fn: () => Promise<unknown>) => {
      try {
        await fn();
      } catch (e) {
        log.error('signup.compensation_failed', { signupId: String(signup._id), step: name, error: errMessage(e) });
      }
    };
    if (done.subscriptionId) await step('cancel_subscription', () => this.deps.stripe.cancelSubscription(done.subscriptionId!));
    if (done.workspaceId) {
      const workspaceId = done.workspaceId;
      await step('billing_rows', () =>
        Promise.all([SubscriptionModel.deleteOne({ workspaceId }), EntitlementModel.deleteOne({ workspaceId }), LimitsSyncModel.deleteOne({ workspaceId })])
      );
      await step('delete_workspace', async () => {
        try {
          await this.deps.partner.deleteWorkspace(workspaceId);
        } catch (e) {
          if (!(e instanceof JsynqError && e.status === 404)) throw e;
        }
      });
    }
    for (const c of claims) await step('release_claim', () => releaseTrialClaim(c.kind, c.key, userId));
    await SignupModel.updateOne(
      { _id: signup._id },
      {
        $set: { state: 'failed', lastErrorRef: error instanceof AppError && error.reference ? error.reference : 'SIGNUP_FAILED' },
        $unset: { lockedAt: 1, workspaceId: 1, subscriptionId: 1 },
      }
    );
    log.warn('signup.trial_failed', { signupId: String(signup._id), reference: error instanceof AppError ? error.reference : undefined });
  }

  private async takeLock(signup: ISignup): Promise<ISignup | null> {
    const staleBefore = new Date(this.deps.now().getTime() - TRIAL_LOCK_STALE_MS);
    return SignupModel.findOneAndUpdate(
      { _id: signup._id, $or: [{ state: { $in: ['verified', 'failed'] } }, { state: 'trial_starting', lockedAt: { $lt: staleBefore } }] },
      { $set: { state: 'trial_starting', lockedAt: this.deps.now() }, $inc: { startAttempts: 1 } },
      { new: true }
    ).lean<ISignup>();
  }

  private async cardFingerprint(paymentMethodId: string, customerId: string): Promise<string> {
    let pm;
    try {
      pm = await this.deps.stripe.retrievePaymentMethod(paymentMethodId);
    } catch {
      throw signupError('PAYMENT_METHOD_INVALID', 'The payment method is invalid.');
    }
    if (pm.type !== 'card' || !pm.fingerprint || (pm.customerId && pm.customerId !== customerId)) {
      throw signupError('PAYMENT_METHOD_INVALID', 'The payment method is invalid.');
    }
    if (!pm.customerId) await this.deps.stripe.attachPaymentMethod(pm.id, customerId);
    return pm.fingerprint;
  }

  private async existingResult(signup: ISignup): Promise<StartTrialResult> {
    const workspaceId = signup.workspaceId!;
    const entitlements = await getEntitlements(workspaceId);
    const sub = await SubscriptionModel.findOne({ workspaceId }).lean();
    const slug = entitlements?.tier ?? signup.planSlug ?? DEFAULT_TIER;
    const plan = await findSellablePlan(slug);
    const trialEndsAt = signup.trialEndsAt ?? entitlements?.trialEndsAt ?? null;
    return {
      workspaceId,
      subscriptionStatus: sub?.status ?? 'trialing',
      trialEndsAt: trialEndsAt ? new Date(trialEndsAt).toISOString() : null,
      plan: { slug, name: plan?.title ?? slug },
      alreadyStarted: true,
      entitlements,
    };
  }

  private mapError(error: unknown): unknown {
    if (error instanceof AppError) return error;
    const type = (error as { type?: string })?.type;
    if (type === 'StripeCardError') return signupError('PAYMENT_FAILED', (error as Error).message);
    return mapJsynqError(error);
  }
}
