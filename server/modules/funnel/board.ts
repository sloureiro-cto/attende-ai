import 'server-only';
import type { FunnelStage, StageKind } from '../../../lib/attende/funnel/types';
import { AppError } from '../../lib/errors';
import { JsynqError, mapJsynqError, type JsynqProject, type UserClient } from '../../lib/jsynq';
import { TtlCache } from '../../lib/ttlCache';

export type FunnelBoard = { projectId: string; boardId: string; stages: FunnelStage[] };

/** Board and stages per (user, workspace): one minute. Stage counts per (user, board): 20 seconds. */
const boards = new TtlCache<FunnelBoard>(60_000, 2000);
const counts = new TtlCache<Record<string, number>>(20_000, 2000);
export const clearFunnelCaches = () => {
  boards.clear();
  counts.clear();
};

const idOf = (v: unknown): string => (v == null ? '' : typeof v === 'object' ? String((v as { _id?: unknown })._id ?? '') : String(v));

export const stageKindOf = (columnStatus: unknown): StageKind =>
  columnStatus === 'win' || columnStatus === 'done' ? 'won' : columnStatus === 'lost' ? 'lost' : 'open';

const typeTitle = (p: JsynqProject) => (typeof p.projectType === 'string' ? '' : (p.projectType?.title ?? '')).trim().toLowerCase();

/** JSYNQ's own rule (`crmProjectUtils`): the project type is CRM, or one of its tabs is a CRM board. */
export const isCrmProject = (p: JsynqProject) => ['crm', 'crm project'].includes(typeTitle(p)) || (p.tabs ?? []).some((t) => t.boardType === 'crm');

const noBoard = () => new AppError(404, 'The workspace has no CRM board this user can open', 'FUNNEL_NO_BOARD');

/**
 * The funnel's board: the oldest CRM project the user can see (`GET /api/projects`, the signup creates one), its first
 * CRM tab (else the project's default board), with its columns as stages in board order (`GET .../columns/kanban`,
 * which drops boards the user cannot open). Columns carry no color in JSYNQ: `color` is null.
 */
export async function resolveFunnelBoard(client: UserClient, cacheKey: string): Promise<FunnelBoard> {
  return boards.getOrLoad(cacheKey, async () => {
    try {
      const project = (await client.listProjectsDetailed()).find(isCrmProject);
      if (!project) throw noBoard();
      const crmTab = (project.tabs ?? []).filter((t) => t.boardType === 'crm' && t.boardId).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))[0];
      const kanban = await client.kanbanColumns(String(project._id), crmTab?.boardId ? String(crmTab.boardId) : undefined);
      const boardId = idOf(kanban?.boardId);
      if (!boardId) throw noBoard();
      const stages: FunnelStage[] = (kanban.columns ?? []).map((c, order) => ({
        id: String(c.columnId),
        name: c.title ?? '',
        color: null,
        order,
        kind: stageKindOf(c.columnStatus),
      }));
      return { projectId: String(project._id), boardId, stages };
    } catch (error) {
      if (error instanceof JsynqError && (error.status === 403 || error.status === 404)) throw noBoard();
      throw mapJsynqError(error);
    }
  });
}

export function forgetFunnelBoard(cacheKey: string): void {
  boards.delete(cacheKey);
}

/** Cards per stage (`pagination.total` of each column on the kanban's first-load route), cached 20 s. */
export async function stageCounts(client: UserClient, board: FunnelBoard, cacheKey: string): Promise<Record<string, number>> {
  return counts.getOrLoad(`${cacheKey}:${board.boardId}`, async () => {
    try {
      return await client.boardColumnTotals(board.projectId, board.boardId);
    } catch (error) {
      throw mapJsynqError(error);
    }
  });
}

export function forgetStageCounts(board: FunnelBoard, cacheKey: string): void {
  counts.delete(`${cacheKey}:${board.boardId}`);
}
