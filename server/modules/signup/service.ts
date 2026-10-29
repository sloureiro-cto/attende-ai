import 'server-only';
import type { Deps } from '../../deps';
import { AppError } from '../../lib/errors';
import { JSYNQ_LANGUAGE, JsynqError, mapJsynqError, serviceToken, viaJsynq, type JsynqLoginSummary, type UserClient } from '../../lib/jsynq';
import { errMessage, log } from '../../lib/logger';
import { priceFor, tierOfPrice } from '../billing/catalog';
import { readJsynqSubscription } from '../billing/deriveEntitlements';
import { EntitlementModel, SubscriptionModel } from '../billing/models';
import { BillingService, getEntitlements } from '../billing/service';
import { DEFAULT_TIER, TIER_TITLES, TRIAL_DAYS, normalizeTierSlug } from '../billing/tiers';
import { canonicalEmail } from './canonicalEmail';
import { isDisposableEmail } from './disposable';
import { signupError } from './errors';
import { OrphanWorkspaceModel, SignupModel, type ISignup } from './models';
import type { SignupInput, StartTrialInput, VerifyInput } from './schemas';
import { consumeTrialClaim, releaseTrialClaim, reserveTrialClaim } from './trialClaims';

const OTP_MAX_ATTEMPTS = 5;
/** A `trial_starting` lock older than this is a crashed attempt and can be taken over. */
export const TRIAL_LOCK_STALE_MS = 5 * 60_000;
/** Clock skew allowed when matching a workspace JSYNQ created during a crashed attempt. */
const ADOPT_SKEW_MS = 60_000;
const DAY_MS = 86_400_000;

function passwordContainsName(name: string, password: string): boolean {
  const lowered = password.toLowerCase();
  return name
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .some((part) => part.length > 4 && lowered.includes(part));
}

const isEmailInUse = (error: unknown) => error instanceof JsynqError && error.status === 400 && /already in use/i.test(error.message);

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
 * Self-serve onboarding on JSYNQ's existing public routes (no partner API):
 *   register -> `POST /api/users` (JSYNQ creates the user and e-mails its signup code)
 *   verify   -> `PATCH /api/users/verify-otp` (JSYNQ verifies the user and answers the login summary)
 *   SetupIntent (JSYNQ's) -> start trial: claims -> `POST /api/workspaces` (as the user) -> CRM project ->
 *   `POST /api/subscriptions/upgrade-to-trial` -> 7-day trial in Stripe -> entitlements. Every external step is
 *   idempotent or recorded, and compensated on failure.
 *
 * The e-mail code is JSYNQ's (delegated), not ours: JSYNQ only marks a user verified through its
 * own OTP, and a user it does not consider verified cannot sign in. The JSYNQ e-mail is therefore
 * JSYNQ-branded.
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

    const existing = await SignupModel.findOne({ email: input.email }).lean<ISignup>();
    if (existing && existing.state !== 'pending_verification') {
      if (existing.existingAccount) throw signupError('USER_EXISTS_UNMANAGED', 'This e-mail already has an account. Sign in with it to continue.');
      throw signupError('EMAIL_IN_USE', 'E-mail address already in use');
    }

    const name = input.name.replace(/\s+/g, ' ').trim();
    const signup = await SignupModel.findOneAndUpdate(
      { email: input.email, state: 'pending_verification' },
      {
        $set: { canonicalEmail: canonicalEmail(input.email), name, businessName: input.businessName, locale: input.locale, planSlug: input.planSlug, otpAttempts: 0 },
        $setOnInsert: { email: input.email, state: 'pending_verification', startAttempts: 0 },
      },
      { upsert: true, new: true }
    ).lean<ISignup>();

    // The JSYNQ user already exists from an earlier submit of this signup: JSYNQ sends a new code.
    if (signup!.jsynqUserCreated) {
      await this.deps.accounts.resendSignupOtp(input.email).catch((error) => {
        throw mapJsynqError(error);
      });
      return { email: input.email, nextStep: 'verify_email' };
    }

    try {
      await this.deps.accounts.register({ name, email: input.email, password: input.password, language: JSYNQ_LANGUAGE[input.locale] });
    } catch (error) {
      if (isEmailInUse(error)) {
        // The e-mail has a JSYNQ account this signup did not create: sign in with it, then start-trial.
        await SignupModel.updateOne({ _id: signup!._id }, { $set: { state: 'verified', existingAccount: true } });
        throw signupError('USER_EXISTS_UNMANAGED', 'This e-mail already has an account. Sign in with it to continue.');
      }
      if (error instanceof JsynqError && error.status === 422) throw signupError('INVALID_BODY', error.message);
      throw mapJsynqError(error);
    }
    await SignupModel.updateOne({ _id: signup!._id }, { $set: { jsynqUserCreated: true } });
    log.info('signup.registered', { signupId: String(signup!._id) });
    return { email: input.email, nextStep: 'verify_email' };
  }

  /** Always quiet: never reveals whether the e-mail has a signup. */
  async resend(email: string): Promise<void> {
    const signup = await SignupModel.findOne({ email, state: 'pending_verification', jsynqUserCreated: true }).lean<ISignup>();
    if (!signup) return;
    try {
      await this.deps.accounts.resendSignupOtp(email);
      await SignupModel.updateOne({ _id: signup._id }, { $set: { otpAttempts: 0 } });
    } catch (error) {
      log.warn('signup.resend_failed', { signupId: String(signup._id), error: errMessage(error) });
    }
  }

  /**
   * Checks the code with JSYNQ, which marks its user verified and answers the login summary. The
   * caller (the app's server action) turns that summary into a short sign-in proof; no JSYNQ token
   * leaves this service.
   */
  async verify(input: VerifyInput): Promise<JsynqLoginSummary & { signup: { businessName: string; planSlug: string | null; state: string } }> {
    const signup = await SignupModel.findOne({ email: input.email }).lean<ISignup>();
    if (!signup || (signup.state === 'pending_verification' && !signup.jsynqUserCreated)) throw signupError('OTP_NOT_FOUND', 'verification OTP not found');
    if (signup.existingAccount) throw signupError('USER_EXISTS_UNMANAGED', 'This e-mail already has an account. Sign in with it to continue.');
    // Verified already: the code is spent. Never hand out a sign-in for an e-mail alone.
    if (signup.state !== 'pending_verification') throw signupError('EMAIL_IN_USE', 'This e-mail is already verified. Sign in to continue.');
    if (signup.otpAttempts >= OTP_MAX_ATTEMPTS) throw signupError('OTP_EXPIRED', 'too many attempts, ask for a new code');

    let login: JsynqLoginSummary;
    try {
      login = await this.deps.accounts.verifySignupOtp({ email: input.email, otp: input.otp });
    } catch (error) {
      if (error instanceof JsynqError && error.status === 404) throw signupError('OTP_NOT_FOUND', 'verification OTP not found');
      if (error instanceof JsynqError && error.status === 400) {
        if (/expired/i.test(error.message)) throw signupError('OTP_EXPIRED', 'verification OTP has expired');
        await SignupModel.updateOne({ _id: signup._id }, { $inc: { otpAttempts: 1 } });
        throw signupError('OTP_INVALID', 'invalid verification OTP');
      }
      if (error instanceof JsynqError && error.status === 422) throw signupError('OTP_INVALID', 'invalid verification OTP');
      throw mapJsynqError(error);
    }
    await SignupModel.updateOne({ _id: signup._id }, { $set: { state: 'verified', userId: login.id }, $unset: { otpAttempts: 1 } });
    log.info('signup.verified', { signupId: String(signup._id), userId: login.id });
    return { ...login, signup: { businessName: signup.businessName, planSlug: signup.planSlug ?? null, state: 'verified' } };
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

  /** JSYNQ as the signing-up user, optionally scoped to a workspace (server-minted token, never returned). */
  private as(user: SessionUser, workspaceId: string | null): UserClient {
    return this.deps.user(serviceToken({ userId: user.userId, email: user.email }, workspaceId));
  }

  /**
   * The card form's SetupIntent: JSYNQ's own (`GET /api/subscriptions/setup-intent`), on the user's JSYNQ Stripe customer
   * (JSYNQ creates it when missing). The browser confirms it with JSYNQ's publishable key; the card is then attached
   * to that customer, which `upgrade-to-trial` requires.
   */
  async createSetupIntent(user: SessionUser): Promise<{ clientSecret: string }> {
    await this.signupOf(user);
    return this.as(user, null)
      .createSubscriptionSetupIntent()
      .catch((error) => {
        throw mapJsynqError(error);
      });
  }

  /**
   * Starts the 7-day trial (or, with `withoutTrial`, a paid subscription at once):
   *   claims (one trial per mailbox and per card) -> JSYNQ workspace -> CRM project ->
   *   `POST /api/subscriptions/upgrade-to-trial` as the owner (JSYNQ: USD flat price, 14-day trial) ->
   *   Stripe `trial_end` = now + 7 days (or `now`), `proration_behavior: none` -> entitlements.
   * Idempotent: a retry reuses the workspace, the JSYNQ subscription and the trial end already chosen. Any failure
   * undoes what this attempt did (Stripe subscription, workspace, claims).
   */
  async startTrial(user: SessionUser, input: StartTrialInput): Promise<StartTrialResult> {
    const found = await this.signupOf(user);
    if (found.state === 'trial_started' && found.workspaceId) return this.existingResult(found);

    const signup = await this.takeLock(found);
    if (!signup) throw signupError('TRIAL_IN_PROGRESS', 'Your trial is already being set up. Please wait a moment.');
    const userId = user.userId;
    const withoutTrial = input.withoutTrial === true;

    const claims: Array<{ kind: 'card' | 'email'; key: string }> = [];
    const done: { workspaceId?: string; subscriptionId?: string } = {};
    try {
      const slug = normalizeTierSlug(input.planSlug ?? signup.planSlug) ?? DEFAULT_TIER;
      if (!priceFor(slug)) throw signupError('PLAN_NOT_AVAILABLE', 'This plan is not available.');
      const pm = await this.paymentMethod(input.paymentMethodId);

      if (!withoutTrial) {
        for (const [kind, key] of [['email', signup.canonicalEmail], ['card', pm.fingerprint]] as const) {
          const outcome = await reserveTrialClaim(kind, key, userId);
          if (outcome === 'reserved') claims.push({ kind, key });
          if (outcome === 'taken') {
            throw signupError('TRIAL_ALREADY_USED', 'A free trial was already used with this card or e-mail. You can subscribe without a trial.', { canSubscribeWithoutTrial: true });
          }
        }
      }

      const workspaceId = await this.ensureWorkspace(signup, user);
      done.workspaceId = workspaceId;
      await this.ensureCrmProject(signup, user, workspaceId);

      // The JSYNQ subscription. A crashed attempt may have created it already: reuse it rather than double-bill
      // (upgrade-to-trial also refuses a workspace that is not on the free plan any more).
      const client = this.as(user, workspaceId);
      const current = readJsynqSubscription(await viaJsynq(() => client.getMySubscription()));
      let subscriptionId: string;
      if (current.kind === 'attende' && current.status !== 'canceled' && current.status !== 'incomplete_expired') {
        subscriptionId = current.stripeSubscriptionId;
      } else {
        subscriptionId = (await client.upgradeToTrial({ planSlug: slug, paymentMethodId: pm.id })).stripeSubscriptionId!;
      }
      done.subscriptionId = subscriptionId;
      await SignupModel.updateOne({ _id: signup._id }, { $set: { subscriptionId, stripeCustomerId: pm.customerId } });

      let sub = await this.deps.stripe.retrieveSubscription(subscriptionId);
      // JSYNQ only uses a card of the owner's own customer; anything else would leave the trial without a card.
      if (sub.customerId !== pm.customerId) throw signupError('PAYMENT_METHOD_INVALID', 'The payment method is invalid.');
      if (!tierOfPrice(sub.priceId)) throw signupError('PLAN_NOT_AVAILABLE', 'This plan is not available.');

      // JSYNQ hard-codes a 14-day trial; Attende's is 7 days. The end is chosen once, so a retry sends the same one.
      let trialEnd: Date | 'now' = 'now';
      if (!withoutTrial) {
        trialEnd = signup.trialEndTarget ? new Date(signup.trialEndTarget) : new Date(this.deps.now().getTime() + TRIAL_DAYS * DAY_MS);
        await SignupModel.updateOne({ _id: signup._id }, { $set: { trialEndTarget: trialEnd } });
      }
      const settled = withoutTrial ? sub.status !== 'trialing' : !!sub.trialEnd && Math.floor(sub.trialEnd.getTime() / 1000) === Math.floor((trialEnd as Date).getTime() / 1000);
      if (!settled) {
        sub = await this.deps.stripe.updateSubscription(subscriptionId, {
          trialEnd,
          prorationBehavior: 'none',
          defaultPaymentMethodId: pm.id,
          // Without a trial the first invoice is charged now: a declined card rejects the change (nothing half-done).
          ...(withoutTrial ? { paymentBehavior: 'error_if_incomplete' as const } : {}),
          idempotencyKey: `attende-start:${String(signup._id)}:${signup.startAttempts}:${withoutTrial ? 'now' : 'trial'}`,
        });
      }

      // Entitlements: the plan Attende enforces itself from now on. JSYNQ's webhook syncs its own copy.
      const entitlements = await this.billing.applyStripeSubscription(workspaceId, userId, sub);

      for (const c of claims) await consumeTrialClaim(c.kind, c.key, userId, workspaceId);
      await SignupModel.updateOne(
        { _id: signup._id },
        {
          $set: { state: 'trial_started', planSlug: slug, ...(sub.status === 'trialing' && sub.trialEnd ? { trialEndsAt: sub.trialEnd } : {}) },
          $unset: { lockedAt: 1, lastErrorRef: 1, workspaceCreateStartedAt: 1, ...(sub.status === 'trialing' ? {} : { trialEndsAt: 1 }) },
        }
      );
      log.info('signup.subscription_started', { signupId: String(signup._id), userId, workspaceId, subscriptionId, trial: !withoutTrial });
      return {
        workspaceId,
        subscriptionStatus: sub.status,
        trialEndsAt: sub.status === 'trialing' && sub.trialEnd ? sub.trialEnd.toISOString() : null,
        plan: { slug, name: TIER_TITLES[slug] },
        alreadyStarted: false,
        entitlements,
      };
    } catch (error) {
      const mapped = this.mapError(error);
      await this.compensate(signup, user, claims, done, mapped);
      throw mapped;
    }
  }

  private async ensureWorkspace(signup: ISignup, user: SessionUser): Promise<string> {
    const client = this.as(user, null);
    if (signup.workspaceId) return signup.workspaceId;
    if (signup.workspaceCreateStartedAt) {
      const since = new Date(signup.workspaceCreateStartedAt).getTime() - ADOPT_SKEW_MS;
      const owned = await client.listOwnedWorkspaces().catch((error) => {
        throw mapJsynqError(error);
      });
      const taken = new Set((await EntitlementModel.find({ workspaceId: { $in: owned.map((w) => w._id) } }).select('workspaceId').lean()).map((e) => e.workspaceId));
      const orphan = owned
        .filter((w) => w.name === signup.businessName && !taken.has(w._id) && w.createdAt && new Date(w.createdAt).getTime() >= since)
        .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())[0];
      if (orphan) {
        await SignupModel.updateOne({ _id: signup._id }, { $set: { workspaceId: orphan._id } });
        log.info('signup.workspace_adopted', { signupId: String(signup._id), workspaceId: orphan._id });
        return orphan._id;
      }
    }
    await SignupModel.updateOne({ _id: signup._id }, { $set: { workspaceCreateStartedAt: this.deps.now() } });
    const ws = await client.createWorkspace({ name: signup.businessName, language: JSYNQ_LANGUAGE[signup.locale] }).catch((error) => {
      throw mapJsynqError(error);
    });
    await SignupModel.updateOne({ _id: signup._id }, { $set: { workspaceId: ws._id } });
    return ws._id;
  }

  /**
   * The default CRM of the workspace (what the partner API's `seed: ['crm_project']` did): a `crm`
   * project, for which JSYNQ creates the board and its default columns. Reused when the workspace
   * already has one (`GET /api/projects`).
   */
  private async ensureCrmProject(signup: ISignup, user: SessionUser, workspaceId: string): Promise<string> {
    if (signup.crmProjectId && signup.workspaceId === workspaceId) return signup.crmProjectId;
    const client = this.as(user, workspaceId);
    try {
      const projects = await client.listProjects();
      const typeOf = (p: (typeof projects)[number]) => (typeof p.projectType === 'object' && p.projectType ? p.projectType.title : p.projectType);
      const existing = projects.find((p) => String(typeOf(p) ?? '').toLowerCase() === 'crm');
      const projectId = existing ? String(existing._id) : (await client.createProject({ title: signup.businessName.slice(0, 120), private: false, projectType: { title: 'crm' } }))._id;
      await SignupModel.updateOne({ _id: signup._id }, { $set: { crmProjectId: projectId } });
      return projectId;
    } catch (error) {
      throw mapJsynqError(error);
    }
  }


  /** Undo, newest first: the Stripe subscription JSYNQ created, local billing rows, the JSYNQ workspace, the claims. */
  private async compensate(signup: ISignup, user: SessionUser, claims: Array<{ kind: 'card' | 'email'; key: string }>, done: { workspaceId?: string; subscriptionId?: string }, error: unknown) {
    const step = async (name: string, fn: () => Promise<unknown>) => {
      try {
        await fn();
        return true;
      } catch (e) {
        log.error('signup.compensation_failed', { signupId: String(signup._id), step: name, error: errMessage(e) });
        return false;
      }
    };
    // Ending it in Stripe is enough for JSYNQ: its webhook moves the workspace back to the free plan.
    if (done.subscriptionId) await step('cancel_subscription', () => this.deps.stripe.cancelSubscriptionNow(done.subscriptionId!));
    let keepWorkspace = false;
    if (done.workspaceId) {
      const workspaceId = done.workspaceId;
      await step('billing_rows', () => Promise.all([SubscriptionModel.deleteOne({ workspaceId }), EntitlementModel.deleteOne({ workspaceId })]));
      // `DELETE /api/workspaces/:id` (any member; soft delete in JSYNQ).
      const deleted = await step('delete_workspace', async () => {
        try {
          await this.as(user, workspaceId).deleteWorkspace(workspaceId);
        } catch (e) {
          if (!(e instanceof JsynqError && (e.status === 404 || e.status === 403))) throw e;
        }
      });
      if (!deleted) {
        // Keep it on the signup so a retry reuses it rather than creating another, and tell an operator.
        keepWorkspace = true;
        await OrphanWorkspaceModel.updateOne(
          { workspaceId },
          { $set: { userId: user.userId, signupId: String(signup._id), error: 'delete failed during signup compensation' } },
          { upsert: true }
        ).catch(() => undefined);
        log.error('signup.orphan_workspace', { signupId: String(signup._id), workspaceId });
      }
    }
    for (const c of claims) await step('release_claim', () => releaseTrialClaim(c.kind, c.key, user.userId));
    await SignupModel.updateOne(
      { _id: signup._id },
      {
        $set: { state: 'failed', lastErrorRef: error instanceof AppError && error.reference ? error.reference : 'SIGNUP_FAILED' },
        $unset: { lockedAt: 1, subscriptionId: 1, trialEndTarget: 1, ...(keepWorkspace ? {} : { workspaceId: 1, crmProjectId: 1, workspaceCreateStartedAt: 1 }) },
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


  /** The confirmed card: on a JSYNQ Stripe customer (the SetupIntent attached it), with a fingerprint for the claims. */
  private async paymentMethod(paymentMethodId: string): Promise<{ id: string; customerId: string; fingerprint: string }> {
    let pm;
    try {
      pm = await this.deps.stripe.retrievePaymentMethod(paymentMethodId);
    } catch {
      throw signupError('PAYMENT_METHOD_INVALID', 'The payment method is invalid.');
    }
    if (pm.type !== 'card' || !pm.fingerprint || !pm.customerId) throw signupError('PAYMENT_METHOD_INVALID', 'The payment method is invalid.');
    return { id: pm.id, customerId: pm.customerId, fingerprint: pm.fingerprint };
  }

  private async existingResult(signup: ISignup): Promise<StartTrialResult> {
    const workspaceId = signup.workspaceId!;
    const entitlements = await getEntitlements(workspaceId);
    const sub = await SubscriptionModel.findOne({ workspaceId }).lean();
    const slug = normalizeTierSlug(entitlements?.tier ?? signup.planSlug) ?? DEFAULT_TIER;
    const trialEndsAt = signup.trialEndsAt ?? entitlements?.trialEndsAt ?? null;
    return {
      workspaceId,
      subscriptionStatus: sub?.status ?? entitlements?.status ?? 'trialing',
      trialEndsAt: trialEndsAt ? new Date(trialEndsAt).toISOString() : null,
      plan: { slug, name: TIER_TITLES[slug] },
      alreadyStarted: true,
      entitlements,
    };
  }

  private mapError(error: unknown): unknown {
    if (error instanceof AppError) return error;
    const type = (error as { type?: string })?.type;
    if (type === 'StripeCardError') return signupError('PAYMENT_FAILED', (error as Error).message);
    // JSYNQ answers 400 `[ERROR][STRIPE] ...` when Stripe refused the subscription (card declined, ...).
    if (error instanceof JsynqError && error.status === 400 && /stripe/i.test(error.message)) return signupError('PAYMENT_FAILED', 'The card was declined.');
    return mapJsynqError(error);
  }
}
