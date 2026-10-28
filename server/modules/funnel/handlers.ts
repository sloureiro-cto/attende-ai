import 'server-only';
import { AppError } from '../../lib/errors';
import { ok, route, type HttpContext } from '../../lib/http';
import { errMessage, log } from '../../lib/logger';
import { rateLimit } from '../../lib/rateLimit';
import { ctxOf, requireUser, requireWorkspace } from '../../middleware/auth';
import { entitlementGate } from '../billing/gate';
import { FUNNEL_EXPORT_MAX_ROWS, FunnelService } from './service';
import { parseFunnelQuery, PAGE_SIZES, DEFAULT_PAGE_SIZE } from './query';

const ID_RE = /^[a-f0-9]{24}$/i;

/** Every funnel call is made to JSYNQ with the caller's own token: JSYNQ enforces project and board access. */
const guards = [requireUser, requireWorkspace, entitlementGate, rateLimit({ windowMs: 60_000, limit: 240, key: (ctx) => ctx.auth?.userId ?? ctx.ip })];
const exportGuards = [requireUser, requireWorkspace, entitlementGate, rateLimit({ windowMs: 60_000, limit: 5, key: (ctx) => `export:${ctx.auth?.userId ?? ctx.ip}` })];

const serviceOf = (http: HttpContext) => {
  const ctx = ctxOf(http);
  return new FunnelService({ client: http.deps.user(ctx.token), userId: ctx.userId, workspaceId: ctx.workspaceId });
};

/** `GET /api/attende/funnel`: one page of deals of the funnel board (`FunnelPage`). */
export const getFunnel = route(guards, async (http) => ok(await serviceOf(http).page(parseFunnelQuery(http.query))));

/** `GET /api/attende/funnel/stages`: stages in board order with card counts (cached 20 s). */
export const getFunnelStages = route(guards, async (http) => ok(await serviceOf(http).stages()));

/** `GET /api/attende/funnel/contacts?q&limit&cursor&maskPhone`. */
export const getFunnelContacts = route(guards, async (http) => {
  const limitRaw = Number(http.query.limit ?? DEFAULT_PAGE_SIZE);
  const limit = (PAGE_SIZES as readonly number[]).includes(limitRaw) ? limitRaw : DEFAULT_PAGE_SIZE;
  const cursor = http.query.cursor || null;
  if (cursor && !/^[A-Za-z0-9_-]{1,512}$/.test(cursor)) throw new AppError(400, 'Invalid cursor', 'FUNNEL_INVALID_CURSOR');
  return ok(await serviceOf(http).contacts({ q: (http.query.q ?? '').slice(0, 80), limit, cursor, maskPhone: http.query.maskPhone === 'true' }));
});

/** `PATCH /api/attende/funnel/:cardId/stage {columnId}`: moves a deal like a drag on the CRM kanban. */
export const patchFunnelStage = route(guards, async (http) => {
  const cardId = http.params.cardId ?? '';
  const body = (await http.body()) as { columnId?: unknown };
  const columnId = typeof body?.columnId === 'string' ? body.columnId : '';
  if (!ID_RE.test(cardId) || !ID_RE.test(columnId)) throw new AppError(400, 'Invalid ids', 'FUNNEL_INVALID_IDS');
  return ok(await serviceOf(http).move(cardId, columnId));
});

/** `GET /api/attende/funnel/:cardId/conversation`: the deal's most recent conversation (or null). */
export const getFunnelConversation = route(guards, async (http) => {
  const cardId = http.params.cardId ?? '';
  if (!ID_RE.test(cardId)) throw new AppError(400, 'Invalid ids', 'FUNNEL_INVALID_IDS');
  return ok({ conversation: await serviceOf(http).conversation(cardId) });
});

/**
 * `GET /api/attende/funnel/export.csv`: streams the filtered funnel, read page by page from JSYNQ, at most
 * FUNNEL_EXPORT_MAX_ROWS rows. The board is resolved (and the filters validated) before the first byte, so those
 * errors still get a JSON status; a JSYNQ failure mid-stream ends the file early.
 */
export const getFunnelExport = route(exportGuards, async (http) => {
  const service = serviceOf(http);
  const query = parseFunnelQuery(http.query, { maxLimit: 100 });
  await service.board();
  const lines = service.exportCsv({ ...query, cursor: null });
  const first = await lines.next();
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      if (!first.done) controller.enqueue(encoder.encode(first.value));
    },
    async pull(controller) {
      try {
        const next = await lines.next();
        if (next.done) controller.close();
        else controller.enqueue(encoder.encode(next.value));
      } catch (error) {
        log.warn('funnel.export_failed', { error: errMessage(error) });
        controller.error(error);
      }
    },
    async cancel() {
      await lines.return(undefined);
    },
  });
  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="funnel.csv"',
      'X-Export-Row-Cap': String(FUNNEL_EXPORT_MAX_ROWS),
      'Cache-Control': 'no-store',
    },
  });
});
