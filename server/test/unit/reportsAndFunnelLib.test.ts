import { decodeCursor, encodeCursor, csvCell, maskPhone, parseFunnelQuery, toCardQuery } from '../../modules/funnel/query';
import { dealValueOf, handlingOf } from '../../modules/funnel/service';
import {
  addDays,
  addLatencySample,
  aiResolutionRateOf,
  buildOverview,
  classifyConversation,
  dayCount,
  emptyLatency,
  enumerateDays,
  handoffRateOf,
  latencyAvgMs,
  latencyMedianMs,
  mergeLatency,
  normalizeReason,
  parseDayKey,
  resolveRange,
  topReasons,
  totalsOf,
  type DailyStatsRow,
} from '../../modules/reports/lib';
import { buildDayRows, classifyMessage } from '../../modules/reports/sync';

const NOW = new Date('2026-10-22T12:00:00Z');

/** The reference's pure tests (`attendeReportsPure.test.ts`), same inputs and numbers. */
describe('report days', () => {
  it('parses strictly and bounds the range', () => {
    expect(parseDayKey('2026-10-22')).toBe('2026-10-22');
    expect(() => parseDayKey('2026-02-30')).toThrow();
    expect(() => parseDayKey('22/10/2026')).toThrow();
    const r = resolveRange({}, NOW);
    expect(r).toMatchObject({ from: '2026-09-23', to: '2026-10-22', days: 30 });
    expect(r.previous).toEqual({ from: '2026-08-24', to: '2026-09-22' });
    expect(() => resolveRange({ to: '2026-10-23' }, NOW)).toThrow();
    expect(() => resolveRange({ from: '2026-10-22', to: '2026-10-01' }, NOW)).toThrow();
    expect(() => resolveRange({ from: '2025-01-01', to: '2026-10-22' }, NOW)).toThrow();
    expect(enumerateDays('2026-02-27', '2026-03-02')).toEqual(['2026-02-27', '2026-02-28', '2026-03-01', '2026-03-02']);
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(dayCount('2026-10-01', '2026-10-01')).toBe(1);
  });
});

describe('classifyConversation', () => {
  const base = { handedOff: false, aiReplyCount: 0, humanReplyCount: 0, lastMessageAt: new Date('2026-10-20T10:00:00Z'), lastMessageDirection: 'inbound' as const, createdAt: new Date('2026-10-20T09:00:00Z') };
  it('follows the reference order', () => {
    expect(classifyConversation({ ...base, handedOff: true, lastMessageAt: NOW }, NOW)).toBe('handed_off');
    expect(classifyConversation({ ...base, lastMessageAt: new Date(NOW.getTime() - 3_600_000) }, NOW)).toBe('open');
    expect(classifyConversation({ ...base, humanReplyCount: 1, aiReplyCount: 2, lastMessageDirection: 'outbound' }, NOW)).toBe('human_handled');
    expect(classifyConversation({ ...base, aiReplyCount: 1, lastMessageDirection: 'outbound' }, NOW)).toBe('resolved_by_ai');
    expect(classifyConversation({ ...base, aiReplyCount: 1 }, NOW)).toBe('abandoned');
    expect(classifyConversation(base, NOW)).toBe('abandoned');
  });
});

describe('latency and reasons', () => {
  it('averages and estimates the median from buckets', () => {
    const acc = emptyLatency();
    [20_000, 40_000, 400_000].forEach((ms) => addLatencySample(acc, ms));
    expect(latencyAvgMs(acc)).toBe(153_333);
    const median = latencyMedianMs(acc)!;
    expect(median).toBeGreaterThanOrEqual(30_000);
    expect(median).toBeLessThanOrEqual(60_000);
    const open = emptyLatency();
    addLatencySample(open, 90_000_000);
    expect(latencyMedianMs(open)).toBe(86_400_000);
    const a = emptyLatency();
    addLatencySample(a, -5);
    addLatencySample(a, Number.NaN);
    expect(latencyAvgMs(a)).toBeNull();
    mergeLatency(a, open);
    expect(a.count).toBe(1);
  });

  it('normalises and caps reasons', () => {
    expect(normalizeReason('  Needs   a human  ')).toBe('Needs a human');
    expect(normalizeReason(undefined)).toBe('unspecified');
    expect(normalizeReason('x'.repeat(200))).toHaveLength(80);
    expect(topReasons(new Map([['b', 2], ['a', 2], ['c', 5]]), 2)).toEqual([{ reason: 'c', count: 5 }, { reason: 'a', count: 2 }]);
  });
});

const row = (over: Partial<DailyStatsRow>): DailyStatsRow => ({
  day: '2026-10-20',
  channel: 'whatsapp',
  agentId: null,
  inboundMessages: 0,
  aiReplies: 0,
  automationReplies: 0,
  humanReplies: 0,
  aiFailed: 0,
  conversationsActive: 0,
  conversationsStarted: 0,
  handoffEvents: 0,
  outcomeResolvedByAi: 0,
  outcomeHandedOff: 0,
  outcomeHumanHandled: 0,
  outcomeAbandoned: 0,
  outcomeOpen: 0,
  leadsCreated: 0,
  frAi: emptyLatency(),
  frHuman: emptyLatency(),
  handoffReasons: [],
  ...over,
});

describe('buildOverview', () => {
  it('derives rates, deltas, zero-filled series and breakdowns (reference numbers)', () => {
    const range = resolveRange({ from: '2026-10-20', to: '2026-10-21' }, NOW);
    const o = buildOverview({
      range,
      current: [
        row({ agentId: 'a1', conversationsStarted: 4, outcomeResolvedByAi: 2, outcomeHandedOff: 1, outcomeOpen: 1, aiReplies: 8, leadsCreated: 2 }),
        row({ day: '2026-10-21', inboundMessages: 10, humanReplies: 3, conversationsActive: 5 }),
      ],
      previous: [row({ day: '2026-10-18', conversationsStarted: 2, outcomeResolvedByAi: 1, outcomeAbandoned: 1, aiReplies: 4 })],
      agentNames: new Map([['a1', 'SDR']]),
      generatedAt: NOW,
      status: { state: 'ready', lastSyncAt: null },
    });
    expect(o.kpis.conversations).toMatchObject({ value: 4, previous: 2, delta: 2, deltaPct: 1 });
    expect(o.kpis.handoffRate.value).toBeCloseTo(0.25);
    expect(o.kpis.aiResolutionRate.value).toBeCloseTo(2 / 3);
    expect(o.kpis.aiResolutionRate.previous).toBeCloseTo(0.5);
    expect(o.kpis.firstResponseAiAvgMs).toEqual({ value: null, previous: null, delta: null, deltaPct: null });
    expect(o.kpis.messagesPerActiveConversationDay.value).toBeCloseTo((10 + 8 + 3) / 5);
    expect(o.series.map((p) => p.day)).toEqual(['2026-10-20', '2026-10-21']);
    expect(o.byAgent[0]).toMatchObject({ agentId: 'a1', name: 'SDR', conversations: 4 });
    expect(o.byChannel.find((c) => c.channel === 'sms')?.conversations).toBe(0);
    expect(o.outcomes.total).toBe(4);
    expect(o.notAvailable).toEqual(expect.arrayContaining(['opt_outs', 'customer_satisfaction', 'after_hours_share']));
    expect(JSON.stringify(buildOverview({ range, current: [], previous: [], agentNames: new Map(), generatedAt: NOW, status: { state: 'ready', lastSyncAt: null } }))).not.toContain('NaN');
    const t = totalsOf([row({ conversationsStarted: 10, outcomeHandedOff: 3, outcomeOpen: 2, outcomeResolvedByAi: 4 })]);
    expect(handoffRateOf(t)).toBeCloseTo(0.3);
    expect(aiResolutionRateOf(t)).toBeCloseTo(0.5);
  });
});

describe('message classification', () => {
  it('tells contact, AI, automation and human messages apart from what the inbox API returns', () => {
    expect(classifyMessage({ _id: '1', direction: 'inbound', senderType: 'contact' })).toBe('inbound');
    expect(classifyMessage({ _id: '1', direction: 'outbound', senderType: 'agent', agentExecutionId: 'e', senderAgent: { source: 'agent' } })).toBe('ai');
    expect(classifyMessage({ _id: '1', direction: 'outbound', senderType: 'agent', agentExecutionId: 'e', status: 'failed' })).toBe('aiFailed');
    // A template rule runs as an execution too: JSYNQ labels it `inbound_rule`.
    expect(classifyMessage({ _id: '1', direction: 'outbound', senderType: 'agent', agentExecutionId: 'e', senderAgent: { source: 'inbound_rule' } })).toBe('automation');
    expect(classifyMessage({ _id: '1', direction: 'outbound', senderType: 'agent' })).toBe('automation');
    expect(classifyMessage({ _id: '1', direction: 'outbound', senderType: 'user' })).toBe('human');
    expect(classifyMessage({ _id: '1', direction: 'outbound', senderType: 'user', status: 'failed' })).toBeNull();
  });

  it('builds no row for a day nothing happened', () => {
    expect(buildDayRows('2026-10-20', [], NOW)).toEqual([]);
  });
});

describe('funnel query', () => {
  const id = 'a'.repeat(24);
  it('validates and maps the filters onto the JSYNQ card list', () => {
    const q = parseFunnelQuery({ stage: `${id}`, q: 'ana', assignee: id, label: id, source: id, createdFrom: '2026-10-01', sort: 'updated_asc', limit: '100', channel: 'sms', hasOpenConversation: 'true' });
    expect(q).toMatchObject({ stages: [id], q: 'ana', limit: 100, sort: 'updated_asc' });
    expect(toCardQuery(q, 'b')).toEqual({ boardId: 'b', orderBy: 'updatedAt:asc', search: 'ana', assignee: id, labels: id, leadSources: id, createdAtFrom: '2026-10-01T00:00:00.000Z' });
    expect(parseFunnelQuery({ q: 'a' }).q).toBe('');
    expect(parseFunnelQuery({ limit: '7' }).limit).toBe(50);
    expect(() => parseFunnelQuery({ stage: 'nope' })).toThrow();
    expect(() => parseFunnelQuery({ createdFrom: '2026-02-30' })).toThrow();
  });

  it('binds a cursor to its filters', () => {
    const f = parseFunnelQuery({ stage: id });
    const cursor = encodeCursor(f, { [id]: 25 });
    expect(decodeCursor(cursor, f)).toEqual({ offsets: { [id]: 25 } });
    expect(() => decodeCursor(cursor, parseFunnelQuery({}))).toThrow();
    expect(() => decodeCursor('bm9wZQ', f)).toThrow();
  });

  it('values deals like the CRM and keeps CSV cells inert', () => {
    expect(dealValueOf({ cardProducts: [{ quantity: 3, price: 1000, discount: { type: 'fixed', value: 500 } }], customFields: [] })).toEqual({ value: 25, hasValue: true });
    expect(dealValueOf({ cardProducts: [], customFields: [{ fieldId: 'estimateRevenue', value: '1200.5' }] })).toEqual({ value: 1200.5, hasValue: true });
    expect(dealValueOf({ cardProducts: [], customFields: [] }).hasValue).toBe(false);
    expect(csvCell('=SUM(A1)')).toBe("'=SUM(A1)");
    expect(csvCell('a,"b"')).toBe('"a,""b"""');
    expect(maskPhone('+55 11 99999-8888')).toBe('5511•••••••88');
    expect(handlingOf('human_handoff')).toBe('human');
    expect(handlingOf('won')).toBe('closed');
    expect(handlingOf(undefined)).toBe('ai_agent');
  });
});
