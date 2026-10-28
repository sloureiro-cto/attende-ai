import 'server-only';
import { utcDay } from './advancedAutomationStats';

export type DailyStatsPoint = {
  /** UTC day, `YYYY-MM-DD`. */
  day: string;
  started: number;
  completed: number;
  handedOff: number;
  stopped: number;
  failed: number;
};

type DayDoc = {
  day?: string;
  started?: number;
  completed?: number;
  handedOff?: number;
  stopped?: number;
  failed?: number;
};

const DAY_MS = 86_400_000;

/**
 * One point per UTC day over the window ending `now` (inclusive), oldest first. Days without a
 * bucket are zero-filled so a chart never has to guess at gaps. Pure.
 */
export function buildDailySeries(
  docs: DayDoc[],
  days: number,
  now: Date
): DailyStatsPoint[] {
  const byDay = new Map<string, DayDoc>();
  for (const doc of docs) if (doc.day) byDay.set(doc.day, doc);
  const today = Date.parse(`${utcDay(now)}T00:00:00.000Z`);
  const out: DailyStatsPoint[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const day = utcDay(new Date(today - i * DAY_MS));
    const doc = byDay.get(day);
    out.push({
      day,
      started: doc?.started ?? 0,
      completed: doc?.completed ?? 0,
      handedOff: doc?.handedOff ?? 0,
      stopped: doc?.stopped ?? 0,
      failed: doc?.failed ?? 0,
    });
  }
  return out;
}
