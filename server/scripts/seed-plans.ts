/**
 * Seeds the plan catalog (`plans`) from the Stripe prices of the three tiers.
 *
 *   yarn attende:seed-plans            dry run: prints what would change
 *   yarn attende:seed-plans --apply    writes the plans
 *
 * Needs ATTENDE_MONGODB_URI and STRIPE_SECRET_KEY. Prices are found by product metadata
 * `attende_tier=<slug>` or a lookup key starting with `<slug>_`. Never creates anything in Stripe.
 */
import mongoose from 'mongoose';
import { PlanModel } from '../modules/billing/models';
import { planCatalogFromStripe } from '../modules/billing/planSeed';
import { stripeGateway } from '../modules/billing/stripeGateway';

async function main() {
  const apply = process.argv.includes('--apply');
  const { ATTENDE_MONGODB_URI, STRIPE_SECRET_KEY } = process.env;
  if (!ATTENDE_MONGODB_URI || !STRIPE_SECRET_KEY) throw new Error('ATTENDE_MONGODB_URI and STRIPE_SECRET_KEY are required');
  await mongoose.connect(ATTENDE_MONGODB_URI);
  const prices = await stripeGateway(STRIPE_SECRET_KEY, '').listPrices();
  const existing = await PlanModel.find().lean();
  const changes = planCatalogFromStripe(prices, existing);
  for (const c of changes) {
    const summary = c.doc.prices.map((p) => `${p.currency} ${p.interval} ${p.amount}${p.active ? '' : ' (inactive)'}`).join(', ') || 'no prices';
    console.log(`${c.action.padEnd(6)} ${c.slug}: ${summary}`);
    if (apply && c.action !== 'noop') await PlanModel.updateOne({ slug: c.slug }, { $set: c.doc }, { upsert: true });
  }
  console.log(apply ? 'Applied.' : 'Dry run: nothing written. Re-run with --apply.');
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
