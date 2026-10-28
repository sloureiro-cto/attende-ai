import 'server-only';
import { createHash } from 'crypto';
import { AppError } from '../../lib/errors';

const ID_RE = /^[a-f0-9]{24}$/i;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const CURSOR_RE = /^[A-Za-z0-9_-]{1,2048}$/;

export const PAGE_SIZES = [25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 50;
export const MAX_SEARCH_CHARS = 80;
export const MIN_SEARCH_CHARS = 2;
/** Several stages are read as one list by merging one JSYNQ query per stage: never more than this many at once. */
export const MAX_STAGE_QUERIES = 8;

export type FunnelSort = 'updated_desc' | 'updated_asc';

/** The funnel filters JSYNQ's card list can apply (see `toCardQuery`). */
export type FunnelFilters = {
  stages: string[];
  q: string;
  assignee: string | null;
  label: string | null;
  source: string | null;
  createdFrom: string | null;
  createdTo: string | null;
  sort: FunnelSort;
};

export type FunnelQuery = FunnelFilters & { limit: number; cursor: string | null; maskPhone: boolean };

/**
 * Filters the app still sends but no existing JSYNQ list can apply to cards (they need the card's conversation). They
 * are accepted and ignored, so an old link keeps working; the app no longer offers them.
 */
export const UNSUPPORTED_FILTERS = ['channel', 'hasOpenConversation', 'agentHandling'] as const;

const isDay = (v: string) => DAY_RE.test(v) && new Date(`${v}T00:00:00.000Z`).toISOString().slice(0, 10) === v;
const id = (v: string | undefined): string | null => (v && ID_RE.test(v) ? v.toLowerCase() : null);
const bad = (reference: string) => new AppError(400, 'Invalid funnel query', reference);

/** Query string -> filters. Ids and dates are validated; anything malformed is refused (the app never sends it). */
export function parseFunnelQuery(query: Record<string, string>, opts: { maxLimit?: number } = {}): FunnelQuery {
  const stages = (query.stage ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (stages.some((s) => !ID_RE.test(s))) throw bad('FUNNEL_INVALID_IDS');
  for (const key of ['assignee', 'label', 'source'] as const) if (query[key] && !ID_RE.test(query[key]!)) throw bad('FUNNEL_INVALID_IDS');
  for (const key of ['createdFrom', 'createdTo'] as const) if (query[key] && !isDay(query[key]!)) throw bad('FUNNEL_INVALID_DATE');
  const q = (query.q ?? '').trim().slice(0, MAX_SEARCH_CHARS);
  const limitRaw = Number(query.limit ?? DEFAULT_PAGE_SIZE);
  const limit = opts.maxLimit ?? ((PAGE_SIZES as readonly number[]).includes(limitRaw) ? limitRaw : DEFAULT_PAGE_SIZE);
  const cursor = query.cursor ? query.cursor : null;
  if (cursor && !CURSOR_RE.test(cursor)) throw bad('FUNNEL_INVALID_CURSOR');
  return {
    stages: [...new Set(stages.map((s) => s.toLowerCase()))].slice(0, 50),
    q: q.length >= MIN_SEARCH_CHARS ? q : '',
    assignee: id(query.assignee),
    label: id(query.label),
    source: id(query.source),
    createdFrom: query.createdFrom ?? null,
    createdTo: query.createdTo ?? null,
    sort: query.sort === 'updated_asc' ? 'updated_asc' : 'updated_desc',
    limit,
    cursor,
    maskPhone: query.maskPhone === 'true',
  };
}

/** One JSYNQ `GET /api/projects/:p/cards/paginated` query for a filter set (no page / column: callers add them). */
export function toCardQuery(f: FunnelFilters, boardId: string): Record<string, string> {
  const q: Record<string, string> = { boardId, orderBy: f.sort === 'updated_asc' ? 'updatedAt:asc' : 'updatedAt:desc' };
  // JSYNQ matches the card title, slug and the contact-name / company fields (not phone or e-mail).
  if (f.q) q.search = f.q;
  if (f.assignee) q.assignee = f.assignee;
  if (f.label) q.labels = f.label;
  if (f.source) q.leadSources = f.source;
  if (f.createdFrom) q.createdAtFrom = `${f.createdFrom}T00:00:00.000Z`;
  if (f.createdTo) q.createdAtTo = `${f.createdTo}T23:59:59.999Z`;
  return q;
}

// --- cursor ----------------------------------------------------------------------------------------
// The card list pages by skip/limit. A funnel page merges one list per stage (or one for the whole board), so the
// cursor carries the offset reached in each list, and a hash of the filters it was minted for.

export type FunnelCursor = { offsets: Record<string, number> };

const filterHash = (f: FunnelFilters): string =>
  createHash('sha256')
    .update(JSON.stringify([f.stages.slice().sort(), f.q, f.assignee, f.label, f.source, f.createdFrom, f.createdTo, f.sort]))
    .digest('base64url')
    .slice(0, 12);

export function encodeCursor(f: FunnelFilters, offsets: Record<string, number>): string {
  return Buffer.from(JSON.stringify({ v: 1, f: filterHash(f), o: offsets })).toString('base64url');
}

/** 400 `FUNNEL_INVALID_CURSOR` for a cursor that is malformed or was minted for other filters. */
export function decodeCursor(cursor: string | null, f: FunnelFilters): FunnelCursor {
  if (!cursor) return { offsets: {} };
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
  } catch {
    throw bad('FUNNEL_INVALID_CURSOR');
  }
  const c = parsed as { v?: unknown; f?: unknown; o?: unknown };
  if (c?.v !== 1 || c.f !== filterHash(f) || !c.o || typeof c.o !== 'object') throw bad('FUNNEL_INVALID_CURSOR');
  const offsets: Record<string, number> = {};
  for (const [key, value] of Object.entries(c.o as Record<string, unknown>)) {
    if ((key !== '*' && !ID_RE.test(key)) || !Number.isInteger(value) || (value as number) < 0 || (value as number) > 1_000_000) throw bad('FUNNEL_INVALID_CURSOR');
    offsets[key] = value as number;
  }
  return { offsets };
}

/** Contacts page by page number (the directory's own paging). */
export function encodePageCursor(page: number, q: string): string {
  return Buffer.from(JSON.stringify({ v: 1, p: page, q })).toString('base64url');
}

export function decodePageCursor(cursor: string | null, q: string): number {
  if (!cursor) return 1;
  try {
    const c = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as { v?: unknown; p?: unknown; q?: unknown };
    if (c.v === 1 && Number.isInteger(c.p) && (c.p as number) >= 1 && (c.p as number) <= 10_000 && c.q === q) return c.p as number;
  } catch {
    // falls through
  }
  throw bad('FUNNEL_INVALID_CURSOR');
}

/** Phone for display: keeps the country/area prefix and the last two digits. */
export function maskPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 6) return '•'.repeat(digits.length);
  return `${digits.slice(0, 4)}${'•'.repeat(digits.length - 6)}${digits.slice(-2)}`;
}

/**
 * CSV cell encoding. Beyond quoting, a cell that starts with = + - @ (or a tab/CR) is prefixed with a quote so a
 * spreadsheet never evaluates contact-controlled text as a formula.
 */
export function csvCell(value: unknown): string {
  if (value == null) return '';
  let s = typeof value === 'string' ? value : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const csvLine = (cells: unknown[]): string => cells.map(csvCell).join(',') + '\r\n';
