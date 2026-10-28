import 'server-only';
import type { Deps } from '../../deps';
import { serviceToken } from '../../lib/jsynq';
import { errMessage, log } from '../../lib/logger';
import { AgentSetupModel, type IAgentSetup } from './models';
import { jsynqAgentPorts } from './ports';
import { AgentService } from './service';

const ORPHAN_AGE_MS = 60 * 60_000;

/**
 * Hourly: removes JSYNQ agents/bindings left behind by a create that died half way.
 *
 * JSYNQ agents have no metadata field, so orphans are found from our own journal
 * (`agent_setups.state` `creating`/`failed` + `pending` ids), not by tagging in JSYNQ.
 * Agent and binding routes need a user JWT whose `workspaceId` claim is the workspace, and there
 * is no request here: the sweeper mints one for the setup's creator (`serviceToken`, AUTH_SECRET).
 * If that person left the workspace JSYNQ refuses, and the row is skipped and logged for an operator.
 */
export async function sweepOrphanAgents(deps: Pick<Deps, 'user' | 'now'>): Promise<{ cleaned: number; skipped: number }> {
  const before = new Date(deps.now().getTime() - ORPHAN_AGE_MS);
  const rows = await AgentSetupModel.find({ $or: [{ state: 'failed' }, { state: 'creating', updatedAt: { $lt: before } }] })
    .limit(100)
    .lean<IAgentSetup[]>();
  let cleaned = 0;
  let skipped = 0;
  for (const row of rows) {
    const nothing = !row.pending?.agentId && !(row.pending?.bindingIds?.length ?? 0);
    try {
      if (!nothing) {
        const client = deps.user(serviceToken({ userId: row.createdBy }, row.workspaceId));
        const service = new AgentService(jsynqAgentPorts(client, row.workspaceId), deps.now);
        if (!(await service.cleanupPending(row))) {
          skipped += 1;
          continue;
        }
      }
      await AgentSetupModel.deleteOne({ _id: row._id, state: row.state, updatedAt: row.updatedAt });
      cleaned += 1;
      log.info('sweeper.orphan_removed', { setupId: String(row._id), workspaceId: row.workspaceId, agentId: row.pending?.agentId });
    } catch (error) {
      skipped += 1;
      log.warn('sweeper.failed', { setupId: String(row._id), error: errMessage(error) });
    }
  }
  return { cleaned, skipped };
}
