import 'server-only';
import { env } from './config/env';
import { accountsClient, userClient, type AccountsClient, type UserClient } from './lib/jsynq';
import type { AutomationsRuntime } from './modules/automations/runtime/factory';
import { stripeGateway, type StripeGateway } from './modules/billing/stripeGateway';

/** Outside-world collaborators. Tests swap any of them. */
export type Deps = {
  stripe: StripeGateway;
  /** JSYNQ's public signup routes (no credential). */
  accounts: AccountsClient;
  /** JSYNQ routes as a user: the request's JWT, or a server-minted one (`serviceToken`). */
  user: (token: string) => UserClient;
  now: () => Date;
};

export function defaultDeps(): Deps {
  const e = env();
  return {
    stripe: stripeGateway(e.STRIPE_SECRET_KEY, e.STRIPE_WEBHOOK_SECRET),
    accounts: accountsClient(),
    user: userClient,
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
 * stays null here. The worker (phase 4) owns it and feeds it from the JSYNQ websocket. Tests set one.
 */
export const getAutomationsRuntime = (): AutomationsRuntime | null => runtime;
export const setAutomationsRuntime = (value: AutomationsRuntime | null): void => {
  runtime = value;
};
