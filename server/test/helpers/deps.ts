import type { Deps } from '../../deps';
import { accountsClient, userClient } from '../../lib/jsynq';
import { FakeStripe } from './fakeStripe';

/** Deps against the fake JSYNQ (`JSYNQ_API_URL`) and a fake Stripe. */
export const testDeps = (opts: { stripe?: FakeStripe; now?: () => Date } = {}): Deps => ({
  stripe: opts.stripe ?? new FakeStripe(),
  accounts: accountsClient(),
  user: userClient,
  now: opts.now ?? (() => new Date()),
});
