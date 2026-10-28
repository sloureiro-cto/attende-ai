import 'server-only';
import type { AttendeeAgentForm, AttendeeWorkingHours } from '../types';

/** Lowercase, accent-less, single-spaced: "Atendênte  Humano" matches "atendente humano". */
export function normalizeForMatch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Local weekday (0 = Sunday) and minutes since midnight of `at` in an IANA timezone. */
export function localClock(
  at: Date,
  timezone: string
): { day: number; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(
    get('weekday')
  );
  return {
    day: day < 0 ? 0 : day,
    minutes: Number(get('hour')) * 60 + Number(get('minute')),
  };
}

const toMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

/** `null` hours = always open. A closed weekday (no entry) is closed all day. */
export function isWithinWorkingHours(
  hours: AttendeeWorkingHours | null,
  at: Date
): boolean {
  if (!hours) return true;
  const { day, minutes } = localClock(at, hours.timezone);
  const today = hours.days.find((d) => d.day === day);
  if (!today) return false;
  return minutes >= toMinutes(today.open) && minutes < toMinutes(today.close);
}

export type HandoffMatch =
  | { by: 'keyword'; value: string }
  | { by: 'builtin'; value: string }
  | null;

/** Phrases that always mean "I want a person", on top of the client's own keywords. */
const BUILTIN_HUMAN_PHRASES = [
  'falar com um humano',
  'falar com uma pessoa',
  'falar com atendente',
  'atendente',
  'speak to a human',
  'talk to a person',
  'human agent',
  'hablar con una persona',
  'hablar con un humano',
  'agente humano',
];

export function matchHandoff(
  message: string,
  form: AttendeeAgentForm
): HandoffMatch {
  const text = normalizeForMatch(message);
  if (!text) return null;
  for (const keyword of form.handoff.keywords) {
    const k = normalizeForMatch(keyword);
    if (k && text.includes(k)) return { by: 'keyword', value: keyword };
  }
  for (const phrase of BUILTIN_HUMAN_PHRASES) {
    if (text.includes(normalizeForMatch(phrase))) {
      return { by: 'builtin', value: phrase };
    }
  }
  return null;
}

export type DryRunCheck = {
  key:
    | 'prompt'
    | 'lines'
    | 'lines_connected'
    | 'knowledge'
    | 'working_hours'
    | 'handoff';
  ok: boolean;
  /** `blocking` checks must pass to count as a passed test; `info` ones only advise. */
  severity: 'blocking' | 'info';
  detail?: string;
};

export type DryRunInput = {
  form: AttendeeAgentForm;
  promptLength: number;
  lines: Array<{ connected: boolean }>;
  documentCount: number;
  message?: string;
  at: Date;
};

export type DryRunResult = {
  mode: 'dry_run';
  /** Always true: no model is called and nothing is sent to any contact. */
  nothingSent: true;
  passed: boolean;
  wouldReply: boolean;
  reason:
    | 'ok'
    | 'outside_working_hours'
    | 'handoff_requested'
    | 'no_line_connected';
  handoff: HandoffMatch;
  checks: DryRunCheck[];
};

export function runDryRun(input: DryRunInput): DryRunResult {
  const withinHours = isWithinWorkingHours(input.form.workingHours, input.at);
  const handoff = input.message
    ? matchHandoff(input.message, input.form)
    : null;
  const anyConnected = input.lines.some((l) => l.connected);

  const checks: DryRunCheck[] = [
    { key: 'prompt', ok: input.promptLength > 200, severity: 'blocking' },
    { key: 'lines', ok: input.lines.length > 0, severity: 'blocking' },
    {
      key: 'lines_connected',
      ok: input.lines.length > 0 && input.lines.every((l) => l.connected),
      severity: 'blocking',
      detail: anyConnected ? 'some_lines_disconnected' : undefined,
    },
    {
      key: 'knowledge',
      ok: input.documentCount > 0,
      severity: 'info',
      detail: input.documentCount > 0 ? undefined : 'no_documents',
    },
    {
      key: 'working_hours',
      ok: withinHours,
      severity: 'info',
      detail: withinHours ? undefined : 'outside_working_hours',
    },
    {
      key: 'handoff',
      ok: true,
      severity: 'info',
      detail: handoff ? `${handoff.by}:${handoff.value}` : undefined,
    },
  ];

  let reason: DryRunResult['reason'] = 'ok';
  if (!anyConnected) reason = 'no_line_connected';
  else if (!withinHours) reason = 'outside_working_hours';
  else if (handoff) reason = 'handoff_requested';

  return {
    mode: 'dry_run',
    nothingSent: true,
    passed: checks.filter((c) => c.severity === 'blocking').every((c) => c.ok),
    wouldReply: reason === 'ok',
    reason,
    handoff,
    checks,
  };
}
