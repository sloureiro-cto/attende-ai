import {
  parseChoiceReply,
  planChoiceDelivery,
  renderChoicesAsText,
} from '../../modules/automations/lib/advancedAutomationChoices';
import { nodeOutputs } from '../../modules/automations/lib/advancedAutomationGraph';
import {
  validateAdvancedAutomation,
  webhookUrlProblem,
} from '../../modules/automations/lib/validateAdvancedAutomation';
import type {
  AdvancedAutomationEdge,
  AdvancedAutomationNode,
} from '../../modules/automations/types';

const opts = [
  { id: 'quote', label: 'Cotação' },
  { id: 'human', label: 'Falar com atendente' },
  { id: 'pro', label: 'Pro' },
];

describe('parseChoiceReply', () => {
  it('prefers the interactive id', () => {
    expect(parseChoiceReply(opts, 'whatever', 'human')).toBe('human');
    expect(parseChoiceReply(opts, '1', 'ghost')).toBe('quote'); // unknown id falls back to text
  });
  it('understands the numbered menu, ignoring punctuation', () => {
    expect(parseChoiceReply(opts, '2')).toBe('human');
    expect(parseChoiceReply(opts, ' 3. ')).toBe('pro');
    expect(parseChoiceReply(opts, '4')).toBeNull();
    expect(parseChoiceReply(opts, '0')).toBeNull();
  });
  it('matches labels ignoring case and accents', () => {
    expect(parseChoiceReply(opts, 'COTACAO')).toBe('quote');
    expect(parseChoiceReply(opts, 'falar com atendente!')).toBe('human');
  });
  it('matches a label inside a sentence only when unambiguous', () => {
    expect(parseChoiceReply(opts, 'quero o plano pro por favor')).toBe('pro');
    expect(parseChoiceReply(opts, 'pro ou cotacao?')).toBeNull();
    expect(parseChoiceReply(opts, 'professor')).toBeNull(); // whole words only
  });
  it('returns null for empty or unrelated replies', () => {
    expect(parseChoiceReply(opts, '')).toBeNull();
    expect(parseChoiceReply(opts, '   ')).toBeNull();
    expect(parseChoiceReply(opts, 'bom dia')).toBeNull();
  });
});

describe('planChoiceDelivery / renderChoicesAsText', () => {
  const four = [...opts, { id: 'd', label: 'D' }];
  it('whatsapp: interactive only when the session supports it, otherwise numbered text', () => {
    expect(planChoiceDelivery('whatsapp', 'buttons', opts).delivery.kind).toBe(
      'text'
    );
    expect(
      planChoiceDelivery('whatsapp', 'buttons', opts, {
        whatsappInteractive: true,
      }).delivery.kind
    ).toBe('buttons');
    expect(
      planChoiceDelivery('whatsapp', 'buttons', four, {
        whatsappInteractive: true,
      }).delivery.kind
    ).toBe('list');
    expect(
      planChoiceDelivery('whatsapp', 'list', opts, {
        whatsappInteractive: true,
      }).delivery.kind
    ).toBe('list');
  });
  it('instagram: more than 3 options become quick replies, with a warning', () => {
    const plan = planChoiceDelivery('instagram', 'list', four);
    expect(plan.delivery.kind).toBe('quick_replies');
    expect(plan.warnings).toContain('instagram_options_sent_as_quick_replies');
    expect(planChoiceDelivery('instagram', 'buttons', opts).warnings).toEqual(
      []
    );
  });
  it('sms: always text', () => {
    expect(planChoiceDelivery('sms', 'buttons', opts).delivery.kind).toBe(
      'text'
    );
  });
  it('renders a numbered menu that parseChoiceReply understands', () => {
    const text = renderChoicesAsText('Escolha:', opts);
    expect(text).toBe('Escolha:\n\n1. Cotação\n2. Falar com atendente\n3. Pro');
    expect(parseChoiceReply(opts, '2')).toBe('human');
  });
});

const pos = { x: 0, y: 0 };
const msg = (
  id: string,
  over: Record<string, unknown> = {}
): AdvancedAutomationNode =>
  ({
    id,
    kind: 'send_message',
    text: 'hi',
    replyMode: 'none',
    ...pos,
    ...over,
  }) as AdvancedAutomationNode;
const edge = (
  from: string,
  output: string,
  to: string
): AdvancedAutomationEdge => ({
  id: `${from}_${output}_${to}`,
  from,
  output,
  to,
});

describe('nodeOutputs', () => {
  it('lists every exit the editor must draw', () => {
    expect(nodeOutputs(msg('a'))).toEqual(['next']);
    expect(nodeOutputs(msg('a', { replyMode: 'free' }))).toEqual([
      'answered',
      'send_failed',
    ]);
    expect(
      nodeOutputs(
        msg('a', {
          replyMode: 'list',
          options: [
            { id: 'x', label: 'X' },
            { id: 'y', label: 'Y' },
          ],
          noReplyMinutes: 5,
        })
      )
    ).toEqual(['x', 'y', 'other', 'no_reply', 'send_failed']);
    expect(
      nodeOutputs({
        id: 'c',
        kind: 'condition',
        rows: [
          { id: 'r1', name: 'a', condition: { type: 'contains', value: 'a' } },
        ],
        ...pos,
      })
    ).toEqual(['r1', 'none']);
    expect(
      nodeOutputs({
        id: 's',
        kind: 'split',
        paths: [{ id: 'a', name: 'A', percent: 50 }],
        ...pos,
      })
    ).toEqual(['a', 'else']);
    expect(nodeOutputs({ id: 'g', kind: 'stop', ...pos })).toEqual([]);
    expect(
      nodeOutputs({
        id: 'ai',
        kind: 'ai_agent',
        instruction: 'x',
        saveAnswerTo: 'f',
        ...pos,
      })
    ).toEqual(['understood', 'not_understood']);
  });
});

describe('webhookUrlProblem (SSRF screen)', () => {
  it('accepts a public https URL', () => {
    expect(webhookUrlProblem('https://hooks.example.com/path?x=1')).toBeNull();
  });
  it('rejects non-https, credentials, private/loopback hosts and IP literals', () => {
    for (const url of [
      'http://example.com',
      'ftp://example.com',
      'https://user:pass@example.com',
      'https://localhost/x',
      'https://api.localhost/x',
      'https://db.internal/x',
      'https://printer.local/x',
      'https://intranet/x',
      'https://127.0.0.1/x',
      'https://10.0.0.5/x',
      'https://169.254.169.254/latest/meta-data',
      'https://[::1]/x',
      'https://example.com:8443/x',
      'not a url',
      '',
    ]) {
      expect(webhookUrlProblem(url)).not.toBeNull();
    }
  });
});

describe('validateAdvancedAutomation', () => {
  const ok = () => ({
    startNodeId: 'a',
    nodes: [
      msg('a', {
        replyMode: 'buttons',
        options: [
          { id: 'yes', label: 'Yes' },
          { id: 'no', label: 'No' },
        ],
      }),
      msg('b'),
    ],
    edges: [edge('a', 'yes', 'b')],
  });
  const messages = (
    automation: Parameters<typeof validateAdvancedAutomation>[0]
  ) =>
    validateAdvancedAutomation(automation).map(
      (i) => `${i.path}: ${i.message}`
    );

  it('accepts a valid automation', () => {
    expect(validateAdvancedAutomation(ok())).toEqual([]);
  });

  it('requires steps, a valid start and valid ids (and reserves the __ prefix)', () => {
    expect(validateAdvancedAutomation({ ...ok(), nodes: [] })).toHaveLength(1);
    expect(messages({ ...ok(), startNodeId: 'zzz' }).join()).toContain(
      'startNodeId'
    );
    expect(
      messages({ ...ok(), edges: [], nodes: [msg('a.b')] }).join()
    ).toContain('invalid id');
    expect(
      messages({ ...ok(), edges: [], nodes: [msg('__run__')] }).join()
    ).toContain('invalid id');
    expect(
      messages({ ...ok(), edges: [], nodes: [msg('a'), msg('a')] }).join()
    ).toContain('duplicate id');
  });

  it('enforces option limits per mode and label sizes', () => {
    const many = (n: number) =>
      Array.from({ length: n }, (_, i) => ({
        id: `o${i}`,
        label: `Option ${i}`,
      }));
    expect(
      messages({
        ...ok(),
        edges: [],
        nodes: [msg('a', { replyMode: 'buttons', options: many(4) })],
      }).join()
    ).toContain('at most 3');
    expect(
      messages({
        ...ok(),
        edges: [],
        nodes: [msg('a', { replyMode: 'list', options: many(10) })],
      })
    ).toEqual([]);
    expect(
      messages({
        ...ok(),
        edges: [],
        nodes: [msg('a', { replyMode: 'list', options: many(11) })],
      }).join()
    ).toContain('at most 10');
    expect(
      messages({
        ...ok(),
        edges: [],
        nodes: [
          msg('a', {
            replyMode: 'buttons',
            options: [{ id: 'x', label: 'x'.repeat(21) }],
          }),
        ],
      }).join()
    ).toContain('limited to 20');
    expect(
      messages({
        ...ok(),
        edges: [],
        nodes: [msg('a', { replyMode: 'buttons', options: [] })],
      }).join()
    ).toContain('at least one option');
  });

  it('rejects reserved or duplicate option ids and bad timings', () => {
    expect(
      messages({
        ...ok(),
        edges: [],
        nodes: [
          msg('a', {
            replyMode: 'list',
            options: [{ id: 'other', label: 'x' }],
          }),
        ],
      }).join()
    ).toContain('reserved');
    expect(
      messages({
        ...ok(),
        edges: [],
        nodes: [
          msg('a', {
            replyMode: 'list',
            options: [
              { id: 'x', label: 'x' },
              { id: 'x', label: 'y' },
            ],
          }),
        ],
      }).join()
    ).toContain('duplicate option');
    expect(
      messages({
        ...ok(),
        edges: [],
        nodes: [msg('a', { noReplyMinutes: 0, replyMode: 'free' })],
      }).join()
    ).toContain('noReplyMinutes');
    expect(
      messages({
        ...ok(),
        edges: [],
        nodes: [
          {
            id: 'w',
            kind: 'wait',
            minutes: 0,
            ...pos,
          } as AdvancedAutomationNode,
        ],
        startNodeId: 'w',
      }).join()
    ).toContain('wait');
  });

  it('checks edges: known endpoints, real exits, one destination per exit', () => {
    expect(
      messages({ ...ok(), edges: [edge('ghost', 'next', 'b')] }).join()
    ).toContain('unknown source');
    expect(
      messages({ ...ok(), edges: [edge('a', 'yes', 'ghost')] }).join()
    ).toContain('unknown target');
    expect(
      messages({ ...ok(), edges: [edge('a', 'maybe', 'b')] }).join()
    ).toContain('no exit "maybe"');
    expect(
      messages({
        ...ok(),
        edges: [edge('a', 'yes', 'b'), { ...edge('a', 'yes', 'a'), id: 'dup' }],
      }).join()
    ).toContain('connected twice');
  });

  it('validates split totals, webhook URLs and required fields on other steps', () => {
    const run = (node: AdvancedAutomationNode) =>
      messages({ startNodeId: node.id, nodes: [node], edges: [] }).join();
    expect(
      run({
        id: 's',
        kind: 'split',
        paths: [
          { id: 'a', name: 'A', percent: 70 },
          { id: 'b', name: 'B', percent: 40 },
        ],
        ...pos,
      })
    ).toContain('more than 100');
    expect(
      run({ id: 'w', kind: 'webhook', url: 'http://169.254.169.254', ...pos })
    ).toContain('https');
    expect(
      run({ id: 'g', kind: 'goto_automation', automationId: 'nope', ...pos })
    ).toContain('valid automation');
    expect(
      run({ id: 'm', kind: 'move_stage', columnId: 'nope', ...pos })
    ).toContain('valid column');
    expect(
      run({
        id: 'ai',
        kind: 'ai_agent',
        instruction: '',
        saveAnswerTo: '',
        ...pos,
      })
    ).toContain('instruction');
    expect(
      run({ id: 'x', kind: 'whatever' as never, ...pos } as never)
    ).toContain('unknown step type');
  });
});
