/**
 * Registers this service's webhook endpoint in JSYNQ (partner API, scope `webhooks:write`).
 *
 *   yarn attende:register-jsynq-webhook --url https://app.attende.example.com/api/jsynq/webhooks            dry run
 *   yarn attende:register-jsynq-webhook --url https://app.attende.example.com/api/jsynq/webhooks --apply    create it
 *   yarn attende:register-jsynq-webhook --apply                                                         <PUBLIC_URL>/api/jsynq/webhooks
 *
 * Needs JSYNQ_API_URL and JSYNQ_PARTNER_API_KEY. The signing secret is printed ONCE: store it as
 * JSYNQ_WEBHOOK_SECRET. To rotate, delete the endpoint (`--delete <id>`) and register again.
 */
import { partnerClient } from '../lib/jsynq/partnerClient';
import { SUBSCRIBED_EVENTS } from '../modules/jsynq-webhooks/handlers';

const arg = (name: string) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
};

async function main() {
  const key = process.env.JSYNQ_PARTNER_API_KEY;
  if (!process.env.JSYNQ_API_URL || !key) throw new Error('JSYNQ_API_URL and JSYNQ_PARTNER_API_KEY are required');
  const partner = partnerClient(key);
  const toDelete = arg('--delete');
  if (toDelete) {
    await partner.deleteWebhookEndpoint(toDelete);
    console.log(`Deleted ${toDelete}`);
    return;
  }
  // Default: <PUBLIC_URL>/api/jsynq/webhooks. The inbound routing URL (<PUBLIC_URL>/api/jsynq/inbound) must
  // be on this endpoint's origin: JSYNQ signs inbound calls with this endpoint's secret.
  const publicUrl = process.env.PUBLIC_URL?.replace(/\/+$/, '');
  const url = arg('--url') ?? (publicUrl ? `${publicUrl}/api/jsynq/webhooks` : undefined);
  if (!url) throw new Error('--url (or PUBLIC_URL) is required');
  const existing = await partner.listWebhookEndpoints();
  for (const e of existing) console.log(`existing ${e.id} ${e.status} ${e.url} [${e.events.join(', ')}]`);
  if (existing.some((e) => e.url === url && e.status === 'active')) {
    console.log('An active endpoint with this URL already exists; nothing to do.');
    return;
  }
  if (!process.argv.includes('--apply')) {
    console.log(`Dry run: would register ${url} for ${SUBSCRIBED_EVENTS.join(', ')}. Re-run with --apply.`);
    return;
  }
  const created = await partner.createWebhookEndpoint({ url, events: [...SUBSCRIBED_EVENTS] });
  console.log(`Registered ${created.id}. Set JSYNQ_WEBHOOK_SECRET to the secret below (shown once):`);
  console.log(created.secret);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
