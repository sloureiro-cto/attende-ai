import 'server-only';
import {
  ADVANCED_AUTOMATION_LIMITS,
  type AdvancedAutomationChannel,
  type AdvancedAutomationChoice,
} from '../types';

export type ChoiceDelivery =
  | { kind: 'buttons'; options: AdvancedAutomationChoice[] }
  | { kind: 'list'; options: AdvancedAutomationChoice[] }
  | { kind: 'quick_replies'; options: AdvancedAutomationChoice[] }
  | { kind: 'text'; options: AdvancedAutomationChoice[] };

export type ChannelCapabilities = {
  /** WhatsApp Cloud API sessions can send interactive buttons/lists; Baileys sessions cannot. */
  whatsappInteractive?: boolean;
};

/**
 * How a set of options reaches the contact on a channel. Interactive messages need channel
 * support; everything else degrades to a numbered text menu, which `parseChoiceReply` also
 * understands, so the flow works the same way on every channel.
 */
export function planChoiceDelivery(
  channel: AdvancedAutomationChannel,
  mode: 'buttons' | 'list',
  options: AdvancedAutomationChoice[],
  caps: ChannelCapabilities = {}
): { delivery: ChoiceDelivery; warnings: string[] } {
  const warnings: string[] = [];
  if (channel === 'whatsapp') {
    if (!caps.whatsappInteractive) {
      warnings.push('interactive_unavailable_sent_as_text');
      return { delivery: { kind: 'text', options }, warnings };
    }
    return mode === 'buttons' &&
      options.length <= ADVANCED_AUTOMATION_LIMITS.buttons
      ? { delivery: { kind: 'buttons', options }, warnings }
      : { delivery: { kind: 'list', options }, warnings };
  }
  if (channel === 'instagram') {
    if (options.length > ADVANCED_AUTOMATION_LIMITS.buttons) {
      warnings.push('instagram_options_sent_as_quick_replies');
    }
    return { delivery: { kind: 'quick_replies', options }, warnings };
  }
  warnings.push('sms_options_sent_as_text');
  return { delivery: { kind: 'text', options }, warnings };
}

/** "text\n\n1. A\n2. B" — the universal fallback. */
export function renderChoicesAsText(
  text: string,
  options: AdvancedAutomationChoice[]
): string {
  const menu = options.map((o, i) => `${i + 1}. ${o.label}`).join('\n');
  return [text.trim(), menu].filter(Boolean).join('\n\n');
}

const normalize = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Maps a contact's reply to one of the options. Returns the option id, or null for "other".
 * Order: interactive reply id, "1"/"2" (numbered menu), exact label, then a label that appears
 * as a whole word/phrase in the reply when exactly one option does (so "quero o plano pro"
 * picks "Pro" but a reply mentioning two options is ambiguous and falls to "other").
 */
export function parseChoiceReply(
  options: AdvancedAutomationChoice[],
  text: string,
  optionId?: string
): string | null {
  if (optionId) {
    const byId = options.find((o) => o.id === optionId);
    if (byId) return byId.id;
  }
  const norm = normalize(text);
  if (!norm) return null;

  const numeric = /^(\d{1,2})[.)]?$/.exec(norm);
  if (numeric) {
    const index = Number(numeric[1]) - 1;
    return options[index]?.id ?? null;
  }

  const exact = options.filter((o) => normalize(o.label) === norm);
  if (exact.length === 1) return exact[0]!.id;

  const padded = ` ${norm} `;
  const contained = options.filter((o) => {
    const label = normalize(o.label);
    return label.length > 0 && padded.includes(` ${label} `);
  });
  return contained.length === 1 ? contained[0]!.id : null;
}
