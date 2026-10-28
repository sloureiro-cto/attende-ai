import 'server-only';
import type { Deps } from '../../deps';
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
 * is no request here: the sweeper asks the partner API for a login token of the setup's creator.
 * That only works for users the partner created (not "sign in with an existing JSYNQ account"
 * users) and when the token's first workspace is this one; other cases are logged for an operator.
 */
export async function sweepOrphanAgents(deps: Pick<Deps, 'partner' | 'user' | 'now'>): Promise<{ cleaned: number; skipped: number }> {
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
        const login = await deps.partner.loginToken(row.createdBy);
        if (login.workspaceId !== row.workspaceId) {
          skipped += 1;
          log.warn('sweeper.no_token_for_workspace', { setupId: String(row._id), workspaceId: row.workspaceId, agentId: row.pending?.agentId });
          continue;
        }
        const service = new AgentService(jsynqAgentPorts(deps.user(login.accessToken), row.workspaceId), deps.now);
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
