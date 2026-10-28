import { conditionShapeIssues, evaluateLocalCondition, isWithinBusinessHours, type BusinessHours } from '../../modules/automations/lib/conditions';
import { signPayload, verifySignature } from '../../modules/jsynq-webhooks/signature';

const hours: BusinessHours = { enabled: true, timezone: 'America/Sao_Paulo', schedule: [{ day: 1, windows: [{ start: '09:00', end: '18:00' }] }] };
// 2026-10-19 is a Monday; 13:00 UTC = 10:00 in São Paulo.
const mondayMorning = new Date('2026-10-19T13:00:00Z');
const mondayNight = new Date('2026-10-19T23:30:00Z');

describe('local conditions', () => {
  const ctx = { text: 'Quero o plano PRO', at: mondayMorning, businessHours: hours, firstInbound: true };
  it('text, regex, first message and composition', () => {
    expect(evaluateLocalCondition({ type: 'contains', value: 'pro', caseInsensitive: true }, ctx)).toBe(true);
    expect(evaluateLocalCondition({ type: 'not_contains', value: 'cancelar' }, ctx)).toBe(true);
    expect(evaluateLocalCondition({ type: 'regex', pattern: 'plano\\s+pro' }, ctx)).toBe(true);
    expect(evaluateLocalCondition({ type: 'regex', pattern: '(a+)+$' }, ctx)).toBe(false);
    expect(evaluateLocalCondition({ type: 'first_inbound' }, ctx)).toBe(true);
    expect(evaluateLocalCondition({ type: 'all', clauses: [{ type: 'first_inbound' }, { type: 'contains', value: 'xyz' }] }, ctx)).toBe(false);
    expect(evaluateLocalCondition({ type: 'any', clauses: [{ type: 'first_inbound' }, { type: 'contains', value: 'xyz' }] }, ctx)).toBe(true);
  });

  it('business hours in the workspace timezone', () => {
    expect(isWithinBusinessHours(hours, mondayMorning)).toBe(true);
    expect(isWithinBusinessHours(hours, mondayNight)).toBe(false);
    expect(isWithinBusinessHours({ ...hours, enabled: false }, mondayNight)).toBe(true);
    expect(evaluateLocalCondition({ type: 'outside_business_hours' }, { ...ctx, at: mondayNight })).toBe(true);
  });

  it('conditions that need JSYNQ data never match locally', () => {
    expect(evaluateLocalCondition({ type: 'llm_match', labels: ['a', 'b'], match: 'a' }, ctx)).toBe(false);
  });

  it('shape issues', () => {
    expect(conditionShapeIssues({ type: 'contains', value: 'x' }, 'p')).toEqual([]);
    expect(conditionShapeIssues({ type: 'all', clauses: [] }, 'p')).toHaveLength(1);
    expect(conditionShapeIssues({ type: 'llm_match', labels: ['a', 'b'], match: 'c' }, 'p')).toHaveLength(1);
    expect(conditionShapeIssues({ type: 'nope' }, 'p')).toEqual([{ path: 'p', message: 'unknown condition type' }]);
  });
});

describe('JSYNQ webhook signature', () => {
  const secret = 'test-secret';
  const body = Buffer.from('{"id":"evt_1"}');
  const now = 1_800_000_000;
  it('accepts a fresh, correct signature', () => expect(verifySignature(secret, body, signPayload(secret, body, now), now + 10)).toBe(true));
  it('rejects a stale one, a wrong secret and a tampered body', () => {
    expect(verifySignature(secret, body, signPayload(secret, body, now), now + 301)).toBe(false);
    expect(verifySignature(secret, body, signPayload('other', body, now), now)).toBe(false);
    expect(verifySignature(secret, Buffer.from('{"id":"evt_2"}'), signPayload(secret, body, now), now)).toBe(false);
    expect(verifySignature(secret, body, undefined, now)).toBe(false);
  });
});
