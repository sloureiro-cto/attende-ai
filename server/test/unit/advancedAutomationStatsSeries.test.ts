import { buildDailySeries } from '../../modules/automations/lib/advancedAutomationStatsSeries';

const NOW = new Date('2026-10-22T15:30:00Z');

describe('buildDailySeries', () => {
  it('returns one point per UTC day ending today, oldest first, zero-filled', () => {
    const series = buildDailySeries(
      [{ day: '2026-10-21', started: 5, completed: 2, handedOff: 1 }],
      3,
      NOW
    );
    expect(series.map((p) => p.day)).toEqual([
      '2026-10-20',
      '2026-10-21',
      '2026-10-22',
    ]);
    expect(series[0]).toEqual({
      day: '2026-10-20',
      started: 0,
      completed: 0,
      handedOff: 0,
      stopped: 0,
      failed: 0,
    });
    expect(series[1]).toMatchObject({ started: 5, completed: 2, handedOff: 1 });
  });

  it('ignores buckets outside the window and docs without a day', () => {
    const series = buildDailySeries(
      [{ day: '2026-09-01', started: 9 }, { started: 4 }],
      2,
      NOW
    );
    expect(series.map((p) => p.started)).toEqual([0, 0]);
  });

  it('keeps month and year boundaries contiguous', () => {
    const series = buildDailySeries([], 3, new Date('2026-01-01T01:00:00Z'));
    expect(series.map((p) => p.day)).toEqual([
      '2025-12-30',
      '2025-12-31',
      '2026-01-01',
    ]);
  });
});
