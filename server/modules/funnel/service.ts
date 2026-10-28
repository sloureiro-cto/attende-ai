import 'server-only';
import type {
  ContactRow,
  ContactsPage,
  ConversationHandling,
  FunnelChannel,
  FunnelPage,
  FunnelRow,
  FunnelStage,
  StagesData,
  StageKind,
} from '../../../lib/attende/funnel/types';
import { AppError } from '../../lib/errors';
import { mapJsynqError, type JsynqCard, type UserClient } from '../../lib/jsynq';
import { TtlCache } from '../../lib/ttlCache';
import { forgetStageCounts, resolveFunnelBoard, stageCounts, stageKindOf, type FunnelBoard } from './board';
import {
  csvLine,
  decodeCursor,
  decodePageCursor,
  encodeCursor,
  encodePageCursor,
  MAX_STAGE_QUERIES,
  maskPhone,
  MIN_SEARCH_CHARS,
  toCardQuery,
  type FunnelFilters,
  type FunnelQuery,
} from './query';

/** Same default the CRM uses when a value carries no currency of its own. */
export const FUNNEL_DEFAULT_CURRENCY = 'USD';
export const FUNNEL_LABELS_PER_ROW = 4;
/** Hard cap of one CSV export. */
export const FUNNEL_EXPORT_MAX_ROWS = 10_000;
export const FUNNEL_EXPORT_PAGE = 100;
/** Deals read per contact on the contacts tab (JSYNQ's max page). A contact with more shows the newest 100. */
const DEALS_PER_CONTACT = 100;
const CONTACT_DEAL_CONCURRENCY = 6;

type Option = { text: string; color: string | null };
type Lookups = { labels: Map<string, Option>; sources: Map<string, Option>; owners: Map<string, { name: string | null; avatarUrl: string | null }> };
const lookups = new TtlCache<Lookups>(60_000, 2000);
export const clearFunnelLookups = () => lookups.clear();

const idOf = (v: unknown): string => (v == null ? '' : typeof v === 'object' ? String((v as { _id?: unknown })._id ?? '') : String(v));
const list = <T>(v: T[] | T | null | undefined): T[] => (Array.isArray(v) ? v : v == null ? [] : [v]);
const iso = (v: unknown): string | null => {
  if (typeof v !== 'string' && !(v instanceof Date)) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

const via = async <T>(fn: () => Promise<T>): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    throw mapJsynqError(error);
  }
};

/** Runs `fn` over `items` with at most `limit` in flight, keeping the order. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]!);
      }
    })
  );
  return out;
}

export const dealStatusOf = (cardStatus?: string | null): StageKind => stageKindOf(cardStatus);

/**
 * The deal value the CRM shows: the products' total when the deal has products, else its "estimated revenue" field.
 * Products are valued at the price stored on the deal line (JSYNQ re-applies catalog price books, which no list
 * route returns), after quantity and discount.
 */
export function dealValueOf(card: Pick<JsynqCard, 'cardProducts' | 'customFields'>): { value: number; hasValue: boolean } {
  const lines = card.cardProducts ?? [];
  if (lines.length > 0) {
    let cents = 0;
    for (const line of lines) {
      const qty = Math.max(0, Math.round(Number(line?.quantity) || 0));
      const subtotal = Math.max(0, Math.round(Number(line?.price) || 0)) * qty;
      const d = line?.discount;
      if (!d || !(Number(d.value) > 0)) cents += subtotal;
      else if (d.type === 'percentage') cents += Math.max(0, Math.round(subtotal - (subtotal * Math.min(100, Math.max(0, Number(d.value)))) / 100));
      else cents += Math.max(0, subtotal - Math.max(0, Math.round(Number(d.value))));
    }
    return { value: cents / 100, hasValue: true };
  }
  const raw = Number(card.customFields?.find((f) => f?.fieldId === 'estimateRevenue')?.value ?? 0);
  const value = Number.isFinite(raw) ? raw : 0;
  return { value, hasValue: value > 0 };
}

function currencyOf(card: JsynqCard): string {
  for (const f of card.customFields ?? []) {
    const v = f?.value as { currency?: unknown } | null | undefined;
    if (f?.fieldType === 'currency' && v && typeof v === 'object' && typeof v.currency === 'string') return v.currency.toUpperCase();
  }
  return FUNNEL_DEFAULT_CURRENCY;
}

/** `conversationState` -> how the conversation is being handled (JSYNQ's `mapSupportStatus`). */
export function handlingOf(state?: string | null): ConversationHandling {
  if (state === 'qualifying') return 'qualifying';
  if (state === 'human_handoff') return 'human';
  if (state === 'won' || state === 'lost' || state === 'blocked') return 'closed';
  return 'ai_agent';
}

export function toFunnelRow(card: JsynqCard, stages: Map<string, FunnelStage>, l: Lookups, mask: boolean): FunnelRow {
  const contact = list(card.contactIds).find((c): c is Exclude<typeof c, string> => !!c && typeof c === 'object');
  const ownerId = idOf(list(card.assignedUsers)[0]);
  const owner = ownerId ? l.owners.get(ownerId) : undefined;
  const { value, hasValue } = dealValueOf(card);
  const phone = contact?.phone ?? null;
  return {
    cardId: idOf(card._id),
    title: card.title ?? '',
    contact: contact
      ? { id: idOf(contact._id), name: contact.fullName ?? null, phone: mask ? maskPhone(phone) : phone, email: contact.email ?? null, avatarUrl: contact.avatarUrl ?? null }
      : null,
    stage: stages.get(idOf(card.column)) ?? null,
    deal: hasValue ? { value, currency: currencyOf(card), status: dealStatusOf(card.cardStatus) } : null,
    owner: ownerId ? { id: ownerId, name: owner?.name ?? null, avatarUrl: owner?.avatarUrl ?? null } : null,
    labels: list(card.labels)
      .map(idOf)
      .slice(0, FUNNEL_LABELS_PER_ROW)
      .flatMap((id) => {
        const o = l.labels.get(id);
        return o ? [{ id, text: o.text, color: o.color }] : [];
      }),
    sources: list(card.leadSource)
      .map(idOf)
      .flatMap((id) => {
        const o = l.sources.get(id);
        return o ? [{ id, text: o.text }] : [];
      }),
    lastMessageAt: iso(card.lastMessageAt),
    // The card lists carry no conversation; the drawer asks for it (`GET /api/attende/funnel/:cardId/conversation`).
    conversation: null,
    createdAt: iso(card.createdAt) ?? '',
    updatedAt: iso(card.updatedAt) ?? '',
  };
}

type Ctx = { client: UserClient; userId: string; workspaceId: string };
const keyOf = (ctx: Ctx) => `${ctx.userId}:${ctx.workspaceId}`;

/** Order of the merged list: JSYNQ's own sort (`updatedAt`, then `_id`, both in the requested direction). */
const compareCards = (dir: 1 | -1) => (a: JsynqCard, b: JsynqCard) => {
  const ua = iso(a.updatedAt) ?? '';
  const ub = iso(b.updatedAt) ?? '';
  if (ua !== ub) return ua < ub ? -dir : dir;
  const ia = idOf(a._id);
  const ib = idOf(b._id);
  return ia === ib ? 0 : ia < ib ? -dir : dir;
};

export class FunnelService {
  constructor(private readonly ctx: Ctx) {}

  board(): Promise<FunnelBoard> {
    return resolveFunnelBoard(this.ctx.client, keyOf(this.ctx));
  }

  private async lookups(board: FunnelBoard): Promise<Lookups> {
    const { client, workspaceId } = this.ctx;
    return lookups.getOrLoad(`${keyOf(this.ctx)}:${board.projectId}:${board.boardId}`, async () => {
      // A list that fails only leaves those names out of the rows.
      const [labels, sources, users] = await Promise.all([
        client.listLabels(board.projectId, board.boardId).catch(() => []),
        client.listLeadSources(board.projectId, board.boardId).catch(() => []),
        client.listWorkspaceUsers(workspaceId).catch(() => []),
      ]);
      return {
        labels: new Map(labels.map((x) => [idOf(x._id), { text: x.text ?? '', color: x.color ?? null }])),
        sources: new Map(sources.map((x) => [idOf(x._id), { text: x.text ?? '', color: x.color ?? null }])),
        owners: new Map(users.map((u) => [String(u.id), { name: u.name || u.email || null, avatarUrl: u.image ?? null }])),
      };
    });
  }

  /**
   * One page of cards. Without a stage filter it is one JSYNQ list for the board; with stages, one list per stage
   * (JSYNQ filters by a single column), merged in sort order. Each list is read from its offset in the cursor: one or
   * two JSYNQ pages of `limit` cards, so a page costs at most 2 x stages requests and never more than that many cards.
   */
  private async cardPage(board: FunnelBoard, q: FunnelQuery): Promise<{ cards: JsynqCard[]; nextCursor: string | null; hasMore: boolean }> {
    const onBoard = new Set(board.stages.map((s) => s.id));
    let sources: string[] = ['*'];
    if (q.stages.length > 0) {
      const wanted = q.stages.filter((s) => onBoard.has(s));
      if (wanted.length === 0) return { cards: [], nextCursor: null, hasMore: false };
      if (wanted.length < onBoard.size) sources = wanted;
    }
    if (sources.length > MAX_STAGE_QUERIES) throw new AppError(400, `Pick at most ${MAX_STAGE_QUERIES} stages`, 'FUNNEL_TOO_MANY_STAGES');
    const filters: FunnelFilters = q;
    const { offsets } = decodeCursor(q.cursor, filters);
    const base = toCardQuery(filters, board.boardId);
    const limit = q.limit;

    const read = async (source: string) => {
      const offset = offsets[source] ?? 0;
      const query = { ...base, ...(source === '*' ? {} : { columnId: source }), limit };
      const page = Math.floor(offset / limit) + 1;
      const first = await via(() => this.ctx.client.listCardsPage(board.projectId, { ...query, page }));
      let cards = first.cards.slice(offset % limit);
      if (cards.length < limit && offset + cards.length < first.total) {
        const second = await via(() => this.ctx.client.listCardsPage(board.projectId, { ...query, page: page + 1 }));
        cards = cards.concat(second.cards);
      }
      return { source, offset, total: first.total, cards: cards.slice(0, limit) };
    };
    const lists = await Promise.all(sources.map(read));

    const merged = lists.flatMap((l) => l.cards.map((card) => ({ card, source: l.source })));
    merged.sort((a, b) => compareCards(q.sort === 'updated_asc' ? 1 : -1)(a.card, b.card));
    const taken = merged.slice(0, limit);
    const next: Record<string, number> = {};
    let hasMore = false;
    for (const l of lists) {
      next[l.source] = l.offset + taken.filter((t) => t.source === l.source).length;
      if (next[l.source]! < l.total) hasMore = true;
    }
    return { cards: taken.map((t) => t.card), nextCursor: hasMore ? encodeCursor(filters, next) : null, hasMore };
  }

  async page(q: FunnelQuery): Promise<FunnelPage> {
    const board = await this.board();
    const [page, l] = await Promise.all([this.cardPage(board, q), this.lookups(board)]);
    const stages = new Map(board.stages.map((s) => [s.id, s]));
    return {
      items: page.cards.map((c) => toFunnelRow(c, stages, l, q.maskPhone)),
      nextCursor: page.nextCursor,
      hasMore: page.hasMore,
      partial: false,
      board: { id: board.boardId, projectId: board.projectId },
    };
  }

  async stages(): Promise<StagesData> {
    const board = await this.board();
    const totals = await stageCounts(this.ctx.client, board, keyOf(this.ctx));
    const stages = board.stages.map((s) => ({ ...s, count: totals[s.id] ?? 0 }));
    return { board: { id: board.boardId, projectId: board.projectId }, stages, total: stages.reduce((sum, s) => sum + s.count, 0) };
  }

  /**
   * Contact directory, ordered by name (`GET /api/workspaces/:w/directory`, contacts only, search on name, phone,
   * Instagram and e-mail). Deal counts come from each contact's deals (`/contacts/:id/deals`, one call per contact on
   * the page, at most 6 at a time), keeping only the deals on the funnel board.
   */
  async contacts(params: { q: string; limit: number; cursor: string | null; maskPhone: boolean }): Promise<ContactsPage> {
    const board = await this.board();
    const q = params.q.trim().length >= MIN_SEARCH_CHARS ? params.q.trim() : '';
    const page = decodePageCursor(params.cursor, q);
    const dir = await via(() =>
      this.ctx.client.listDirectory(this.ctx.workspaceId, { type: 'contact', sortBy: 'name', sortDir: 'asc', page, limit: params.limit, search: q || undefined })
    );
    const stages = new Map(board.stages.map((s) => [s.id, s]));
    const items = await mapLimit(dir.items, CONTACT_DEAL_CONCURRENCY, async (c): Promise<ContactRow> => {
      const contactId = c.contactId || c.id;
      const deals = { total: 0, open: 0, won: 0, lost: 0 };
      let latestStage: FunnelStage | null = null;
      let latestCardId: string | null = null;
      // A failed lookup leaves this contact's counts at zero; the directory itself still renders.
      const all = await this.ctx.client.listContactDeals(this.ctx.workspaceId, contactId, DEALS_PER_CONTACT).catch(() => []);
      for (const d of all) {
        const stage = d.columnId ? stages.get(String(d.columnId)) : undefined;
        if (!stage) continue;
        deals.total += 1;
        deals[dealStatusOf(d.cardStatus) === 'won' ? 'won' : dealStatusOf(d.cardStatus) === 'lost' ? 'lost' : 'open'] += 1;
        if (!latestCardId) {
          latestCardId = String(d.id);
          latestStage = stage;
        }
      }
      return {
        id: contactId,
        name: c.name ?? null,
        phone: params.maskPhone ? maskPhone(c.phone) : c.phone || null,
        email: c.email || null,
        avatarUrl: c.avatarUrl ?? null,
        responsibleUserId: c.responsibleUserId ?? null,
        deals,
        latestStage,
        latestCardId,
        createdAt: c.createdAt ?? '',
        updatedAt: c.updatedAt ?? '',
      };
    });
    return { items, nextCursor: dir.hasNextPage ? encodePageCursor(page + 1, q) : null, hasMore: dir.hasNextPage };
  }

  /**
   * Moves a deal to another stage of the funnel board through the card update the CRM kanban uses
   * (`PUT /api/projects/:p/cards/:id {column}`): JSYNQ records it (audit log) and fires the `card.moved` automations.
   */
  async move(cardId: string, columnId: string): Promise<{ cardId: string; stage: FunnelStage | null }> {
    const board = await this.board();
    const stage = board.stages.find((s) => s.id === columnId);
    if (!stage) throw new AppError(404, 'Stage not found on the funnel board', 'FUNNEL_STAGE_NOT_FOUND');
    await via(() => this.ctx.client.moveCard(board.projectId, cardId, columnId));
    forgetStageCounts(board, keyOf(this.ctx));
    return { cardId, stage };
  }

  /** The card's most recent conversation on any channel (three JSYNQ calls), for the deal drawer. */
  async conversation(cardId: string): Promise<FunnelRow['conversation']> {
    const board = await this.board();
    const channels: FunnelChannel[] = ['whatsapp', 'instagram', 'sms'];
    const found = await Promise.all(
      channels.map(async (channel) => {
        const rows = await this.ctx.client.listCardConversations(board.projectId, cardId, channel).catch(() => []);
        return rows.filter((c) => !c.deletedAt).map((c) => ({ channel, c }));
      })
    );
    let best: FunnelRow['conversation'] = null;
    for (const { channel, c } of found.flat()) {
      const ref = { channel, id: String(c._id), sessionId: c.sessionId ? String(c.sessionId) : null, lastMessageAt: iso(c.lastMessageAt), handling: handlingOf(c.conversationState) };
      if (!best || (ref.lastMessageAt ?? '') > (best.lastMessageAt ?? '')) best = ref;
    }
    return best;
  }

  /** CSV of the filtered funnel, page by page (100 cards per page), never more than FUNNEL_EXPORT_MAX_ROWS rows. */
  async *exportCsv(q: FunnelQuery): AsyncGenerator<string> {
    yield csvLine(['name', 'phone', 'email', 'stage', 'deal_value', 'deal_currency', 'deal_status', 'owner', 'labels', 'source', 'last_message_at', 'created_at', 'updated_at']);
    let cursor: string | null = null;
    let rows = 0;
    for (;;) {
      const page = await this.page({ ...q, limit: Math.min(FUNNEL_EXPORT_PAGE, FUNNEL_EXPORT_MAX_ROWS - rows), cursor });
      let chunk = '';
      for (const r of page.items) {
        chunk += csvLine([
          r.contact?.name || r.title,
          r.contact?.phone,
          r.contact?.email,
          r.stage?.name,
          r.deal?.value,
          r.deal?.currency,
          r.deal?.status,
          r.owner?.name,
          r.labels.map((x) => x.text).join('; '),
          r.sources.map((x) => x.text).join('; '),
          r.lastMessageAt,
          r.createdAt,
          r.updatedAt,
        ]);
      }
      if (chunk) yield chunk;
      rows += page.items.length;
      if (!page.hasMore || !page.nextCursor || rows >= FUNNEL_EXPORT_MAX_ROWS || page.items.length === 0) return;
      cursor = page.nextCursor;
    }
  }
}
