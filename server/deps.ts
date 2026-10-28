import 'server-only';
import { env } from './config/env';
import { partnerClient, userClient, type PartnerClient, type UserClient } from './lib/jsynq';
import { createMailer, type Mailer } from './lib/mailer';
import type { AutomationsRuntime } from './modules/automations/runtime/factory';
import { stripeGateway, type StripeGateway } from './modules/billing/stripeGateway';

/** Outside-world collaborators. Tests swap any of them. */
export type Deps = {
  stripe: StripeGateway;
  partner: PartnerClient;
  user: (token: string) => UserClient;
  mailer: Mailer;
  now: () => Date;
};

export function defaultDeps(): Deps {
  const e = env();
  return {
    stripe: stripeGateway(e.STRIPE_SECRET_KEY, e.STRIPE_WEBHOOK_SECRET),
    partner: partnerClient(),
    user: userClient,
    mailer: createMailer(),
    now: () => new Date(),
  };
}

let override: Deps | null = null;
let cached: Deps | null = null;
let runtime: AutomationsRuntime | null = null;

/** The deps the route handlers use: built from the env on first use, or the ones a test set. */
export const getDeps = (): Deps => override ?? (cached ??= defaultDeps());
/** Test seam: replace the deps (null restores the defaults). */
export const setDeps = (deps: Deps | null): void => {
  override = deps;
};

/**
 * The advanced automations runtime. It does not run inside Next.js (no timers in serverless): it
 * stays null here, so `POST /api/jsynq/inbound` answers `{handled:false}` and saves do not sync the
 * inbound routing. The worker (phase 4) owns it. Tests set one.
 */
export const getAutomationsRuntime = (): AutomationsRuntime | null => runtime;
export const setAutomationsRuntime = (value: AutomationsRuntime | null): void => {
  runtime = value;
};
