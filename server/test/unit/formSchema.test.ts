import {
  FORM_LIMITS,
  fromTemplateBodySchema,
  validateAgentForm,
} from '../../modules/agents/lib/formSchema';
import { ATTENDE_TEMPLATES } from '../../modules/agents/templates';

const minimal = { businessName: 'Loja Azul' };
const sdr = {
  sdr: { goal: 'qualify', qualificationQuestions: ['Qual seu orçamento?'] },
};

describe('validateAgentForm', () => {
  it('applies defaults for a minimal receptionist form', () => {
    const r = validateAgentForm('receptionist', {
      ...minimal,
      businessDescription: 'Vendemos roupas.',
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.form).toMatchObject({
      language: 'pt',
      tone: 'friendly',
      disclosure: true,
      workingHours: null,
      offerings: [],
      handoff: { triggers: [], keywords: [] },
      receptionist: { faqs: [], policies: [] },
    });
  });

  it('requires a business name', () => {
    const r = validateAgentForm('sdr', { ...sdr });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.issues.map((i) => i.path)).toContain('businessName');
  });

  it('sdr needs at least one qualification question', () => {
    const r = validateAgentForm('sdr', {
      ...minimal,
      sdr: { goal: 'qualify', qualificationQuestions: [] },
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.issues[0]?.path).toBe('sdr.qualificationQuestions');
  });

  it('receptionist needs some content to answer from', () => {
    const r = validateAgentForm('receptionist', minimal);
    expect(r.ok).toBe(false);
  });

  it('drops the blocks of other templates', () => {
    const r = validateAgentForm('sdr', {
      ...minimal,
      ...sdr,
      closer: { goal: 'close_sale', offers: ['x'] },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.form.closer).toBeUndefined();
    expect(r.form.sdr).toBeDefined();
  });

  it('trims, strips control characters and dedupes list items', () => {
    const r = validateAgentForm('sdr', {
      ...minimal,
      sdr: {
        goal: 'qualify',
        qualificationQuestions: ['  Qual?\u0000 ', 'Qual?', 'Outra'],
      },
      businessName: '  Loja\u0007 Azul  ',
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.form.businessName).toBe('Loja Azul');
    expect(r.form.sdr?.qualificationQuestions).toEqual(['Qual?', 'Outra']);
  });

  it('enforces limits', () => {
    const tooMany = Array.from(
      { length: FORM_LIMITS.offerings + 1 },
      (_, i) => ({
        name: `Item ${i}`,
      })
    );
    expect(
      validateAgentForm('sdr', { ...minimal, ...sdr, offerings: tooMany }).ok
    ).toBe(false);
    expect(
      validateAgentForm('sdr', {
        ...minimal,
        ...sdr,
        businessName: 'x'.repeat(FORM_LIMITS.businessName + 1),
      }).ok
    ).toBe(false);
    expect(
      validateAgentForm('sdr', {
        ...minimal,
        ...sdr,
        maxRepliesPerContactPerDay: 1,
      }).ok
    ).toBe(false);
  });

  it('closer link must be https', () => {
    const closer = (url: string) =>
      validateAgentForm('closer', {
        ...minimal,
        closer: { goal: 'close_sale', callToActionUrl: url },
      });
    expect(closer('https://pay.example.com/x').ok).toBe(true);
    expect(closer('http://pay.example.com/x').ok).toBe(false);
    expect(closer('javascript:alert(1)').ok).toBe(false);
  });

  describe('working hours', () => {
    const hours = (days: unknown, timezone = 'America/Sao_Paulo') =>
      validateAgentForm('sdr', {
        ...minimal,
        ...sdr,
        workingHours: { timezone, days },
      });

    it('accepts valid hours', () => {
      expect(hours([{ day: 1, open: '09:00', close: '18:00' }]).ok).toBe(true);
    });
    it('rejects an unknown timezone', () => {
      expect(
        hours([{ day: 1, open: '09:00', close: '18:00' }], 'Mars/Base').ok
      ).toBe(false);
    });
    it('rejects close before open, bad times and duplicate days', () => {
      expect(hours([{ day: 1, open: '18:00', close: '09:00' }]).ok).toBe(false);
      expect(hours([{ day: 1, open: '9:00', close: '18:00' }]).ok).toBe(false);
      expect(
        hours([
          { day: 1, open: '09:00', close: '12:00' },
          { day: 1, open: '13:00', close: '18:00' },
        ]).ok
      ).toBe(false);
      expect(hours([{ day: 7, open: '09:00', close: '18:00' }]).ok).toBe(false);
    });
  });

  it('handoff target user must be an object id', () => {
    const t = (userId: string) =>
      validateAgentForm('sdr', {
        ...minimal,
        ...sdr,
        handoff: { target: { kind: 'user', userId } },
      });
    expect(t('a'.repeat(24)).ok).toBe(true);
    expect(t('nope').ok).toBe(false);
  });
});

describe('fromTemplateBodySchema', () => {
  const ok = {
    templateKey: 'sdr',
    form: {},
    lines: [{ channel: 'whatsapp', sessionId: 'a'.repeat(24) }],
    clientRequestId: 'req-12345678',
  };
  it('accepts a valid body', () => {
    expect(fromTemplateBodySchema.safeParse(ok).success).toBe(true);
  });
  it('rejects unknown templates, bad ids and short request ids', () => {
    expect(
      fromTemplateBodySchema.safeParse({ ...ok, templateKey: 'hacker' }).success
    ).toBe(false);
    expect(
      fromTemplateBodySchema.safeParse({
        ...ok,
        lines: [{ channel: 'whatsapp', sessionId: '123' }],
      }).success
    ).toBe(false);
    expect(
      fromTemplateBodySchema.safeParse({ ...ok, clientRequestId: 'x' }).success
    ).toBe(false);
  });
  it('caps the number of lines', () => {
    const lines = Array.from({ length: FORM_LIMITS.lines + 1 }, () => ({
      channel: 'whatsapp',
      sessionId: 'a'.repeat(24),
    }));
    expect(fromTemplateBodySchema.safeParse({ ...ok, lines }).success).toBe(
      false
    );
  });
});

describe('template descriptors', () => {
  it('declare every field path the schema understands, with 3-language labels', () => {
    for (const t of ATTENDE_TEMPLATES) {
      expect(t.steps.length).toBeGreaterThan(2);
      for (const step of t.steps) {
        for (const f of step.fields) {
          expect(f.label.pt && f.label.en && f.label.es).toBeTruthy();
        }
      }
      expect(t.channels.find((c) => c.key === 'whatsapp')?.available).toBe(
        true
      );
      expect(t.channels.find((c) => c.key === 'sms')?.beta).toBe(true);
    }
  });

  it('defaults let a client reach a valid form by adding only the business name', () => {
    const base = {
      businessName: 'Studio Lua',
      businessDescription: 'Estúdio de pilates.',
      sdr: { goal: 'qualify', qualificationQuestions: ['Já pratica pilates?'] },
    };
    for (const t of ATTENDE_TEMPLATES) {
      const merged = { ...(t.defaults as object), ...base };
      expect(validateAgentForm(t.key, merged).ok).toBe(true);
    }
  });
});
