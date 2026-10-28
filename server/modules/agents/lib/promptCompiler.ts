import 'server-only';
import type {
  AttendeeAgentForm,
  AttendeeLanguage,
  AttendeeTemplateKey,
} from '../types';
import { DAYS, DICTS, LABELS, PT, type Dict } from './promptDictionaries';

/**
 * Pure prompt compiler: template + form -> the agent's system prompt.
 *
 * Design rules (kept in the output so they are testable):
 *  - Business data is wrapped in <business_data> and sanitized: the client types it, but the
 *    prompt must stay well-formed (no tag injection, no control characters, bounded size).
 *  - The agent never invents prices, availability, deadlines, discounts, links or policies.
 *  - Contact messages and retrieved documents are DATA, never instructions.
 *  - Answers are short (WhatsApp), one question at a time, in the contact's language.
 *  - A person takes over when a trigger/keyword/safety condition matches (request_human_handoff).
 */

// --- sanitizing ------------------------------------------------------------------------------

const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;

/** One line of user text: no control chars, no angle brackets (tag injection), collapsed spaces. */
export function oneLine(value: string | undefined): string {
  return (value ?? '')
    .replace(CONTROL, '')
    .replace(/</g, '‹')
    .replace(/>/g, '›')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Multi-line user text: like `oneLine` but keeps (at most) paragraph breaks and drops markdown headings. */
export function block(value: string | undefined): string {
  return (value ?? '')
    .replace(CONTROL, '')
    .replace(/</g, '‹')
    .replace(/>/g, '›')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => l.replace(/^\s*#{1,6}\s*/, '').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const bullets = (items: string[]): string =>
  items.map((i) => `- ${i}`).join('\n');

const section = (title: string, body: string): string =>
  body.trim() ? `## ${title}\n${body.trim()}` : '';

function hoursBlock(form: AttendeeAgentForm, d: Dict): string {
  if (!form.workingHours) return d.alwaysOn;
  const names = DAYS[form.language];
  const days = [...form.workingHours.days].sort((a, b) => a.day - b.day);
  return [
    bullets(
      days.map((x) =>
        d.hoursLine(names[x.day] ?? String(x.day), x.open, x.close)
      )
    ),
    d.hoursTz(oneLine(form.workingHours.timezone)),
  ].join('\n');
}

function offeringsBlock(form: AttendeeAgentForm, d: Dict): string {
  if (!form.offerings.length) return d.noOfferings;
  return bullets(
    form.offerings.map((o) => {
      const parts = [oneLine(o.name)];
      if (o.description) parts.push(oneLine(o.description));
      parts.push(o.price ? d.price(oneLine(o.price)) : d.priceOnRequest);
      return parts.join(' — ');
    })
  );
}

function handoffBlock(form: AttendeeAgentForm, d: Dict): string {
  const out: string[] = [d.handoffIntro, '', bullets(d.handoffBuiltins)];
  if (form.handoff.triggers.length) {
    out.push(
      '',
      d.handoffTriggers,
      bullets(form.handoff.triggers.map(oneLine))
    );
  }
  if (form.handoff.keywords.length) {
    out.push(
      '',
      d.handoffKeywords,
      form.handoff.keywords.map((k) => `"${oneLine(k)}"`).join(', ')
    );
  }
  out.push(
    '',
    d.handoffHow(
      form.handoff.message ? oneLine(form.handoff.message) : undefined
    )
  );
  return out.join('\n');
}

function templateBlock(
  key: AttendeeTemplateKey,
  form: AttendeeAgentForm,
  d: Dict
): string {
  if (key === 'sdr' && form.sdr) {
    const s = form.sdr;
    return section(
      d.sections.goal,
      [
        d.sdr.goals[s.goal],
        '',
        d.sdr.questions,
        bullets(s.qualificationQuestions.map(oneLine)),
        '',
        d.sdr.howToAsk,
        s.idealCustomer ? `\n${d.sdr.ideal} ${oneLine(s.idealCustomer)}` : '',
        '',
        d.sdr.whenQualified,
      ].join('\n')
    );
  }
  if (key === 'closer' && form.closer) {
    const c = form.closer;
    return section(
      d.sections.goal,
      [
        d.closer.goals[c.goal],
        c.offers.length
          ? `\n${d.closer.offers}\n${bullets(c.offers.map(oneLine))}`
          : '',
        c.objections.length
          ? `\n${d.closer.objections}\n${bullets(
              c.objections.map((o) =>
                d.closer.objectionLine(oneLine(o.objection), oneLine(o.answer))
              )
            )}`
          : '',
        '',
        c.callToActionUrl
          ? d.closer.cta(oneLine(c.callToActionUrl))
          : d.closer.noCta,
        '',
        bullets(d.closer.ethics),
      ].join('\n')
    );
  }
  if (key === 'receptionist' && form.receptionist) {
    const r = form.receptionist;
    return [
      section(d.sections.goal, bullets(d.receptionist.routing)),
      r.faqs.length
        ? section(
            d.receptionist.faqs,
            r.faqs
              .map((f) =>
                d.receptionist.faqLine(oneLine(f.question), oneLine(f.answer))
              )
              .join('\n\n')
          )
        : '',
      r.policies.length
        ? section(d.receptionist.policies, bullets(r.policies.map(oneLine)))
        : '',
      r.bookingInstructions
        ? section(d.receptionist.booking, block(r.bookingInstructions))
        : '',
      r.locations ? section(d.receptionist.locations, block(r.locations)) : '',
    ]
      .filter(Boolean)
      .join('\n\n');
  }
  return '';
}

export type CompiledAgentProfile = {
  name: string;
  description: string;
  systemPrompt: string;
};

/** The assistant's display name, as it introduces itself. */
export function assistantDisplayName(form: AttendeeAgentForm): string {
  if (form.assistantName) return oneLine(form.assistantName);
  return {
    pt: 'o assistente virtual',
    en: 'the virtual assistant',
    es: 'el asistente virtual',
  }[form.language];
}

/** Compiles the full system prompt. Pure and deterministic: same input, same output. */
export function compileAgentPrompt(
  templateKey: AttendeeTemplateKey,
  form: AttendeeAgentForm
): string {
  const d = DICTS[form.language] ?? PT;
  const business = oneLine(form.businessName);

  const businessData = [
    '<business_data>',
    `${LABELS[form.language].name}: ${business}`,
    form.businessDescription
      ? `\n${d.sections.about}:\n${block(form.businessDescription)}`
      : '',
    `\n${d.sections.offerings}:\n${offeringsBlock(form, d)}`,
    `\n${d.sections.hours}:\n${hoursBlock(form, d)}`,
    '</business_data>',
  ]
    .filter((x) => x !== '')
    .join('\n');

  return [
    d.roleLine(assistantDisplayName(form), business, d.roles[templateKey]),
    `${LABELS[form.language].tone}: ${d.tone[form.tone]}.`,
    form.disclosure ? d.disclosureOn : d.disclosureOff,
    businessData,
    templateBlock(templateKey, form, d),
    section(d.sections.rules, bullets(d.rules)),
    section(d.sections.knowledge, bullets(d.knowledge)),
    section(d.sections.handoff, handoffBlock(form, d)),
    section(d.sections.security, bullets(d.security)),
  ]
    .filter(Boolean)
    .join('\n\n')
    .concat('\n');
}

const TEMPLATE_NAMES: Record<
  AttendeeTemplateKey,
  Record<AttendeeLanguage, string>
> = {
  sdr: { pt: 'SDR', en: 'SDR', es: 'SDR' },
  closer: { pt: 'Closer', en: 'Closer', es: 'Closer' },
  receptionist: {
    pt: 'Recepcionista',
    en: 'Receptionist',
    es: 'Recepcionista',
  },
};

/** Display name of the agent. Needs only the business name, so it is safe on any stored form. */
export function agentDisplayName(
  templateKey: AttendeeTemplateKey,
  form: Pick<AttendeeAgentForm, 'businessName' | 'language'>
): string {
  const label = TEMPLATE_NAMES[templateKey][form.language ?? 'pt'];
  return `${label} · ${oneLine(form.businessName)}`.slice(0, 100);
}

export function compileAgentProfile(
  templateKey: AttendeeTemplateKey,
  form: AttendeeAgentForm
): CompiledAgentProfile {
  const label = TEMPLATE_NAMES[templateKey][form.language];
  return {
    name: agentDisplayName(templateKey, form),
    description: `${label} — ${oneLine(form.businessName)}`.slice(0, 200),
    systemPrompt: compileAgentPrompt(templateKey, form),
  };
}
