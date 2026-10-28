import {
  isWithinWorkingHours,
  localClock,
  matchHandoff,
  normalizeForMatch,
  runDryRun,
} from '../../modules/agents/lib/dryRun';
import {
  AGENT_CAPABILITIES,
  AGENT_TOOL_NAMES,
  activeWindow,
  buildBindingPolicy,
} from '../../modules/agents/lib/agentProfile';
import { isOverLimit } from '../../modules/billing/deriveEntitlements';
import { validateAgentForm } from '../../modules/agents/lib/formSchema';
import type { AttendeeAgentForm } from '../../modules/agents/types';

const hours = {
  timezone: 'America/Sao_Paulo',
  days: [
    { day: 1, open: '09:00', close: '18:00' }, // Monday
    { day: 6, open: '09:00', close: '13:00' }, // Saturday
  ],
};

function makeForm(over: Record<string, unknown> = {}): AttendeeAgentForm {
  const r = validateAgentForm('sdr', {
    businessName: 'Loja',
    sdr: { goal: 'qualify', qualificationQuestions: ['Qual?'] },
    handoff: { keywords: ['Atendênte', 'gerente'], triggers: [] },
    ...over,
  });
  if (!r.ok) throw new Error(JSON.stringify(r.issues));
  return r.form;
}

describe('working hours', () => {
  // 2026-10-26 is a Monday. São Paulo is UTC-3 (no DST in October 2026).
  const monday = (h: number, m = 0) =>
    new Date(Date.UTC(2026, 9, 26, h + 3, m));

  it('reads the clock in the business timezone, not UTC', () => {
    expect(localClock(monday(10), hours.timezone)).toEqual({
      day: 1,
      minutes: 600,
    });
    // 01:00 UTC on Tuesday is still Monday 22:00 in São Paulo.
    expect(
      localClock(new Date(Date.UTC(2026, 9, 27, 1, 0)), hours.timezone)
    ).toEqual({
      day: 1,
      minutes: 22 * 60,
    });
  });

  it('is open inside the window, closed outside and on days without hours', () => {
    expect(isWithinWorkingHours(hours, monday(9))).toBe(true);
    expect(isWithinWorkingHours(hours, monday(17, 59))).toBe(true);
    expect(isWithinWorkingHours(hours, monday(18))).toBe(false);
    expect(isWithinWorkingHours(hours, monday(8, 59))).toBe(false);
    const tuesday = new Date(Date.UTC(2026, 9, 27, 13, 0));
    expect(isWithinWorkingHours(hours, tuesday)).toBe(false);
  });

  it('null hours means always open', () => {
    expect(isWithinWorkingHours(null, new Date())).toBe(true);
  });
});

describe('handoff matching', () => {
  it('normalizes accents, case and spaces', () => {
    expect(normalizeForMatch('  ATENDÊNTE   Humano ')).toBe('atendente humano');
  });
  it('matches the client keywords regardless of accents', () => {
    expect(matchHandoff('quero falar com o atendente', makeForm())).toEqual({
      by: 'keyword',
      value: 'Atendênte',
    });
  });
  it('matches built-in phrases in three languages', () => {
    const form = makeForm({ handoff: { keywords: [], triggers: [] } });
    expect(matchHandoff('Can I talk to a person?', form)?.by).toBe('builtin');
    expect(matchHandoff('quiero hablar con una persona', form)?.by).toBe(
      'builtin'
    );
    expect(matchHandoff('qual o preço?', form)).toBeNull();
  });
});

describe('runDryRun', () => {
  const at = new Date(Date.UTC(2026, 9, 26, 13, 0)); // Monday 10:00 São Paulo
  const input = (over: Partial<Parameters<typeof runDryRun>[0]> = {}) => ({
    form: makeForm({ workingHours: hours }),
    promptLength: 2000,
    lines: [{ connected: true }],
    documentCount: 2,
    at,
    ...over,
  });

  it('passes and would reply when everything is in place', () => {
    const r = runDryRun(input({ message: 'Oi, quanto custa?' }));
    expect(r).toMatchObject({
      mode: 'dry_run',
      nothingSent: true,
      passed: true,
      wouldReply: true,
      reason: 'ok',
      handoff: null,
    });
  });

  it('does not pass without lines or with a disconnected line', () => {
    expect(runDryRun(input({ lines: [] })).passed).toBe(false);
    const r = runDryRun(
      input({ lines: [{ connected: true }, { connected: false }] })
    );
    expect(r.passed).toBe(false);
    expect(r.checks.find((c) => c.key === 'lines_connected')?.detail).toBe(
      'some_lines_disconnected'
    );
    expect(runDryRun(input({ lines: [{ connected: false }] })).reason).toBe(
      'no_line_connected'
    );
  });

  it('outside hours it would not reply but the setup still passes', () => {
    const night = new Date(Date.UTC(2026, 9, 27, 4, 0)); // Monday 01:00 São Paulo
    const r = runDryRun(input({ at: night }));
    expect(r.passed).toBe(true);
    expect(r.wouldReply).toBe(false);
    expect(r.reason).toBe('outside_working_hours');
  });

  it('flags a handoff request and advises on missing documents', () => {
    const r = runDryRun(
      input({ message: 'passa para o gerente', documentCount: 0 })
    );
    expect(r.reason).toBe('handoff_requested');
    expect(r.wouldReply).toBe(false);
    expect(r.checks.find((c) => c.key === 'knowledge')).toMatchObject({
      ok: false,
      severity: 'info',
    });
    expect(r.passed).toBe(true);
  });
});

describe('agent profile', () => {
  it('lists only knowledge search and human handoff and keeps the capability lock-down', () => {
    expect([...AGENT_TOOL_NAMES]).toEqual([
      'search_knowledge_base',
      'request_human_handoff',
    ]);
    expect(AGENT_CAPABILITIES).toEqual({
      internetAccess: false,
      workspaceDataAccess: false,
      knowledgeBaseAccess: true,
    });
  });

  it('opens nothing beyond answering this contact', () => {
    const p = buildBindingPolicy(makeForm());
    expect(p).toMatchObject({
      sendReply: true,
      stopOnUserIntervention: true,
      workspaceAccess: 'none',
      allowMessagingOtherContacts: false,
      allowReadingOtherConversations: false,
      allowImageGeneration: false,
      allowHumanHandoff: true,
      autoCreateLead: false,
      maxRepliesPerDay: 40,
    });
  });

  it('uses the union of the weekday windows as the single active window', () => {
    const form = makeForm({ workingHours: hours });
    expect(activeWindow(form)).toEqual({
      start: '09:00',
      end: '18:00',
      timezone: 'America/Sao_Paulo',
    });
    const p = buildBindingPolicy(form);
    expect(p).toMatchObject({
      activeHoursStart: '09:00',
      activeHoursEnd: '18:00',
      timezone: 'America/Sao_Paulo',
    });
  });

  it('has no window for an always-on business', () => {
    expect(activeWindow(makeForm())).toBeNull();
    expect(buildBindingPolicy(makeForm())).not.toHaveProperty(
      'activeHoursStart'
    );
  });

  it('creates leads only when a CRM destination is given', () => {
    const p = buildBindingPolicy(makeForm(), {
      projectId: 'a'.repeat(24),
      columnId: 'b'.repeat(24),
    });
    expect(p).toMatchObject({
      autoCreateLead: true,
      autoCreateLeadSourceText: 'Attende-ai',
    });
  });

  it('honours the per-contact reply cap from the form', () => {
    expect(
      buildBindingPolicy(makeForm({ maxRepliesPerContactPerDay: 12 }))
        .maxRepliesPerDay
    ).toBe(12);
  });
});

describe('isOverLimit', () => {
  it('treats negative and missing limits as unlimited', () => {
    expect(isOverLimit(-1, 999)).toBe(false);
    expect(isOverLimit(undefined, 999)).toBe(false);
  });
  it('blocks at the limit', () => {
    expect(isOverLimit(1, 0)).toBe(false);
    expect(isOverLimit(1, 1)).toBe(true);
    expect(isOverLimit(0, 0)).toBe(true);
  });
});

describe('buildBindingPolicy handoff assignee', () => {
  const base = validateAgentForm('receptionist', {
    businessName: 'Loja',
    businessDescription: 'Uma loja de roupas no centro.',
    handoff: { triggers: [], keywords: [], target: { kind: 'user', userId: 'f'.repeat(24) } },
  });

  it('never sends handoffAssigneeUserId (not a staging binding field; the phase-4 worker assigns)', () => {
    if (!base.ok) throw new Error(JSON.stringify(base.issues));
    expect(base.form.handoff.target).toEqual({ kind: 'user', userId: 'f'.repeat(24) });
    expect(buildBindingPolicy(base.form)).not.toHaveProperty('handoffAssigneeUserId');
    expect(buildBindingPolicy(base.form).allowHumanHandoff).toBe(true);
  });
});
