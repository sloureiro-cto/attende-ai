/**
 * Sends JSYNQ the routed sessions of every workspace with active automations
 * (`PUT /api/partner/v1/workspaces/:id/inbound-routing`, url = <PUBLIC_URL>/api/jsynq/inbound).
 * Step 3 of switching the runtime on (docs/jsynq-dependencies.md §2.5); afterwards the runtime
 * keeps routing in sync by itself.
 *
 *   yarn attende:sync-inbound-routing            dry run: prints what would be sent
 *   yarn attende:sync-inbound-routing --apply    sends it
 *
 * Needs ATTENDE_MONGODB_URI, JSYNQ_API_URL, JSYNQ_PARTNER_API_KEY (scope conversations:write) and PUBLIC_URL.
 */
import mongoose from 'mongoose';
import { AdvancedAutomationModel } from '../modules/automations/models';
import { inboundUrl } from '../modules/automations/runtime/factory';
import { jsynqConversationGateway } from '../modules/automations/runtime/jsynqGateway';
import { activeSessions } from '../modules/automations/service';
import { env } from '../config/env';

async function main() {
  const apply = process.argv.includes('--apply');
  if (!env().PUBLIC_URL) throw new Error('PUBLIC_URL is required');
  await mongoose.connect(env().ATTENDE_MONGODB_URI);
  const url = inboundUrl();
  const gateway = jsynqConversationGateway(env().JSYNQ_PARTNER_API_KEY, { inboundUrl: url });
  const workspaces = (await AdvancedAutomationModel.distinct('workspaceId', { status: 'active' })).map(String);
  let failed = 0;
  for (const ws of workspaces) {
    const sessions = await activeSessions(ws);
    console.log(`${ws}: ${sessions.map((s) => `${s.channel}:${s.sessionId}`).join(', ') || '(none)'} -> ${url}`);
    if (!apply) continue;
    await gateway.setInboundRouting(ws, sessions).catch((error) => {
      failed += 1;
      console.error(`  failed: ${error instanceof Error ? error.message : error}`);
    });
  }
  console.log(apply ? `Applied to ${workspaces.length - failed}/${workspaces.length} workspaces.` : 'Dry run: nothing sent. Re-run with --apply.');
  await mongoose.disconnect();
  if (failed) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
