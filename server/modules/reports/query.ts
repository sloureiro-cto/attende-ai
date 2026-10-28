import 'server-only';
import type { AgentBreakdownRow, OutcomesDistribution, OverviewResponse, ReportChannel, ReportStatus } from '../../../lib/attende/reports/types';
import { AppError } from '../../lib/errors';
import type { UserClient } from '../../lib/jsynq';
import { buildAgentBreakdown, buildOutcomes, buildOverview, REPORT_CHANNELS, resolveRange, totalsOf, type DailyStatsRow } from './lib';
import { ReportDailyStatsModel, ReportSyncStateModel } from './models';

export type ReportQuery = { from?: unknown; to?: unknown; channel?: unknown; agentId?: unknown };
type Filters = { channel?: ReportChannel; agentId?: string | null };

const ID_RE = /^[a-f0-9]{24}$/i;

export function parseFilters(query: Pick<ReportQuery, 'channel' | 'agentId'>): Filters {
  const filters: Filters = {};
  if (query.channel !== undefined && query.channel !== '') {
    if (!REPORT_CHANNELS.includes(query.channel as ReportChannel)) throw new AppError(400, 'invalid channel', 'REPORT_INVALID_FILTERS');
    filters.channel = query.channel as ReportChannel;
  }
  if (query.agentId !== undefined && query.agentId !== '') {
    if (query.agentId === 'none') filters.agentId = null;
    else if (typeof query.agentId === 'string' && ID_RE.test(query.agentId)) filters.agentId = query.agentId.toLowerCase();
    else throw new AppError(400, 'invalid agentId', 'REPORT_INVALID_FILTERS');
  }
  return filters;
}

const toPlain = (r: Record<string, unknown>): DailyStatsRow => {
  const n = (k: string) => Number(r[k] ?? 0) || 0;
  const lat = (v: unknown) => (v as DailyStatsRow['frAi']) ?? { sumMs: 0, count: 0, buckets: [] };
  return {
    day: String(r.day),
    channel: r.channel as ReportChannel,
    agentId: r.agentId ? String(r.agentId) : null,
    inboundMessages: n('inboundMessages'),
    aiReplies: n('aiReplies'),
    automationReplies: n('automationReplies'),
    humanReplies: n('humanReplies'),
    aiFailed: n('aiFailed'),
    conversationsActive: n('conversationsActive'),
    conversationsStarted: n('conversationsStarted'),
    handoffEvents: n('handoffEvents'),
    outcomeResolvedByAi: n('outcomeResolvedByAi'),
    outcomeHandedOff: n('outcomeHandedOff'),
    outcomeHumanHandled: n('outcomeHumanHandled'),
    outcomeAbandoned: n('outcomeAbandoned'),
    outcomeOpen: n('outcomeOpen'),
    leadsCreated: n('leadsCreated'),
    frAi: lat(r.frAi),
    frHuman: lat(r.frHuman),
    handoffReasons: (r.handoffReasons as DailyStatsRow['handoffReasons']) ?? [],
  };
};

/** `preparing` until the workspace's first sync (the 90-day backfill) has finished. */
export async function reportStatus(workspaceId: string): Promise<ReportStatus> {
  const state = await ReportSyncStateModel.findOne({ workspaceId }).select('backfillDoneAt lastSyncAt').lean();
  return { state: state?.backfillDoneAt ? 'ready' : 'preparing', lastSyncAt: state?.lastSyncAt ? new Date(state.lastSyncAt).toISOString() : null };
}

/** Reads ONLY `report_daily_stats` (and agent names from JSYNQ). Every query is workspace-scoped and day-bounded. */
export class ReportsQueryService {
  constructor(
    private readonly workspaceId: string,
    private readonly client: UserClient,
    private readonly now: () => Date
  ) {}

  private async rows(from: string, to: string, filters: Filters): Promise<DailyStatsRow[]> {
    const match: Record<string, unknown> = { workspaceId: this.workspaceId, day: { $gte: from, $lte: to } };
    if (filters.channel) match.channel = filters.channel;
    if (filters.agentId !== undefined) match.agentId = filters.agentId;
    const found = await ReportDailyStatsModel.find(match).select('-_id -workspaceId -dayDate -computedAt').lean<Array<Record<string, unknown>>>();
    return found.map(toPlain);
  }

  /** Agent names from JSYNQ (`GET /api/agents`, the caller's token). A failure only leaves the names out. */
  private async agentNames(rows: DailyStatsRow[]): Promise<Map<string, string>> {
    if (!rows.some((r) => r.agentId)) return new Map();
    const agents = await this.client.listAgents().catch(() => []);
    return new Map(agents.filter((a) => a.id && a.name).map((a) => [String(a.id), a.name]));
  }

  async overview(query: ReportQuery): Promise<OverviewResponse> {
    const range = resolveRange(query, this.now());
    const filters = parseFilters(query);
    const [all, status] = await Promise.all([this.rows(range.previous.from, range.to, filters), reportStatus(this.workspaceId)]);
    const current = all.filter((r) => r.day >= range.from);
    const previous = all.filter((r) => r.day < range.from);
    return buildOverview({ range, current, previous, agentNames: await this.agentNames(current), generatedAt: this.now(), status });
  }

  async agents(query: ReportQuery): Promise<{ range: { from: string; to: string; days: number }; agents: AgentBreakdownRow[]; status: ReportStatus }> {
    const range = resolveRange(query, this.now());
    const [rows, status] = await Promise.all([this.rows(range.from, range.to, parseFilters({ channel: query.channel })), reportStatus(this.workspaceId)]);
    return { range: { from: range.from, to: range.to, days: range.days }, agents: buildAgentBreakdown(rows, await this.agentNames(rows)), status };
  }

  async outcomes(query: ReportQuery): Promise<{ range: { from: string; to: string; days: number }; outcomes: OutcomesDistribution; status: ReportStatus }> {
    const range = resolveRange(query, this.now());
    const [rows, status] = await Promise.all([this.rows(range.from, range.to, parseFilters(query)), reportStatus(this.workspaceId)]);
    return { range: { from: range.from, to: range.to, days: range.days }, outcomes: buildOutcomes(totalsOf(rows)), status };
  }
}
