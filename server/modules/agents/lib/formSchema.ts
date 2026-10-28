import 'server-only';
import { z } from 'zod';
import {
  ATTENDE_CHANNELS,
  ATTENDE_LANGUAGES,
  ATTENDE_TEMPLATE_KEYS,
  ATTENDE_TONES,
  type AttendeeAgentForm,
  type AttendeeTemplateKey,
} from '../types';

/** Hard limits, shared by validation and by the form descriptors returned to the frontend. */
export const FORM_LIMITS = {
  businessName: 80,
  businessDescription: 800,
  assistantName: 40,
  offerings: 20,
  offeringName: 80,
  offeringDescription: 240,
  offeringPrice: 60,
  handoffTriggers: 10,
  handoffKeywords: 15,
  handoffTriggerChars: 160,
  handoffKeywordChars: 40,
  handoffMessage: 240,
  qualificationQuestions: 8,
  questionChars: 200,
  idealCustomer: 400,
  offers: 10,
  offerChars: 200,
  objections: 10,
  objectionChars: 160,
  answerChars: 400,
  faqs: 30,
  faqQuestionChars: 160,
  faqAnswerChars: 500,
  policies: 10,
  policyChars: 240,
  bookingInstructions: 500,
  locations: 400,
  maxRepliesPerContactPerDay: { min: 5, max: 200, default: 40 },
  clientRequestId: 80,
  lines: 5,
} as const;

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Only what a form can legitimately carry; control characters never reach the prompt. */

const CONTROL_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;

export const cleanText = (value: string): string =>
  value.replace(CONTROL_CHARS, '').trim();

const text = (max: number) =>
  z.string().transform(cleanText).pipe(z.string().min(1).max(max));
const optionalText = (max: number) =>
  z
    .string()
    .transform(cleanText)
    .pipe(z.string().max(max))
    .optional()
    .transform((v) => (v ? v : undefined));
const textList = (maxItems: number, maxChars: number) =>
  z
    .array(text(maxChars))
    .max(maxItems)
    .default([])
    .transform((list) => [...new Set(list)]);

const isTimezone = (tz: string): boolean => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

const workingHoursSchema = z
  .object({
    timezone: z.string().refine(isTimezone, 'Invalid IANA timezone'),
    days: z
      .array(
        z.object({
          day: z.number().int().min(0).max(6),
          open: z.string().regex(HHMM),
          close: z.string().regex(HHMM),
        })
      )
      .min(1)
      .max(7),
  })
  .superRefine((value, ctx) => {
    const seen = new Set<number>();
    value.days.forEach((d, i) => {
      if (seen.has(d.day)) {
        ctx.addIssue({
          code: 'custom',
          path: ['days', i, 'day'],
          message: 'Duplicate weekday',
        });
      }
      seen.add(d.day);
      if (d.open >= d.close) {
        ctx.addIssue({
          code: 'custom',
          path: ['days', i, 'close'],
          message: 'close must be after open',
        });
      }
    });
  });

const baseFormSchema = z.object({
  businessName: text(FORM_LIMITS.businessName),
  businessDescription: optionalText(FORM_LIMITS.businessDescription),
  assistantName: optionalText(FORM_LIMITS.assistantName),
  language: z.enum(ATTENDE_LANGUAGES).default('pt'),
  tone: z.enum(ATTENDE_TONES).default('friendly'),
  disclosure: z.boolean().default(true),
  offerings: z
    .array(
      z.object({
        name: text(FORM_LIMITS.offeringName),
        description: optionalText(FORM_LIMITS.offeringDescription),
        price: optionalText(FORM_LIMITS.offeringPrice),
      })
    )
    .max(FORM_LIMITS.offerings)
    .default([]),
  workingHours: workingHoursSchema.nullable().default(null),
  handoff: z
    .object({
      triggers: textList(
        FORM_LIMITS.handoffTriggers,
        FORM_LIMITS.handoffTriggerChars
      ),
      keywords: textList(
        FORM_LIMITS.handoffKeywords,
        FORM_LIMITS.handoffKeywordChars
      ),
      message: optionalText(FORM_LIMITS.handoffMessage),
      target: z
        .object({
          kind: z.enum(['team', 'user']),
          userId: z
            .string()
            .regex(/^[0-9a-fA-F]{24}$/)
            .optional(),
        })
        .optional(),
    })
    .default({ triggers: [], keywords: [] }),
  maxRepliesPerContactPerDay: z
    .number()
    .int()
    .min(FORM_LIMITS.maxRepliesPerContactPerDay.min)
    .max(FORM_LIMITS.maxRepliesPerContactPerDay.max)
    .optional(),
  sdr: z
    .object({
      goal: z
        .enum(['book_meeting', 'collect_contact', 'qualify'])
        .default('qualify'),
      qualificationQuestions: textList(
        FORM_LIMITS.qualificationQuestions,
        FORM_LIMITS.questionChars
      ),
      idealCustomer: optionalText(FORM_LIMITS.idealCustomer),
    })
    .optional(),
  closer: z
    .object({
      goal: z.enum(['close_sale', 'schedule_call']).default('close_sale'),
      offers: textList(FORM_LIMITS.offers, FORM_LIMITS.offerChars),
      objections: z
        .array(
          z.object({
            objection: text(FORM_LIMITS.objectionChars),
            answer: text(FORM_LIMITS.answerChars),
          })
        )
        .max(FORM_LIMITS.objections)
        .default([]),
      callToActionUrl: z
        .string()
        .transform(cleanText)
        .pipe(z.string().url().max(300).startsWith('https://'))
        .optional(),
    })
    .optional(),
  receptionist: z
    .object({
      faqs: z
        .array(
          z.object({
            question: text(FORM_LIMITS.faqQuestionChars),
            answer: text(FORM_LIMITS.faqAnswerChars),
          })
        )
        .max(FORM_LIMITS.faqs)
        .default([]),
      policies: textList(FORM_LIMITS.policies, FORM_LIMITS.policyChars),
      bookingInstructions: optionalText(FORM_LIMITS.bookingInstructions),
      locations: optionalText(FORM_LIMITS.locations),
    })
    .optional(),
});

/** Which template-specific block each template requires. */
const EXTRAS_KEY: Record<
  AttendeeTemplateKey,
  'sdr' | 'closer' | 'receptionist'
> = { sdr: 'sdr', closer: 'closer', receptionist: 'receptionist' };

export type FormValidation =
  | { ok: true; form: AttendeeAgentForm }
  | { ok: false; issues: Array<{ path: string; message: string }> };

/**
 * Validates and normalizes a form for one template. The template's own block is required (with
 * defaults), blocks of other templates are dropped so a stored form never carries stale data.
 */
export function validateAgentForm(
  templateKey: AttendeeTemplateKey,
  input: unknown
): FormValidation {
  const parsed = baseFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      })),
    };
  }
  const data = parsed.data;
  const key = EXTRAS_KEY[templateKey];
  const extras = (data as Record<string, unknown>)[key];
  if (extras === undefined) {
    // An empty block is valid: every field has a default. Re-parse to apply them.
    const reparsed = baseFormSchema.safeParse({
      ...(input as object),
      [key]: {},
    });
    if (!reparsed.success) {
      return {
        ok: false,
        issues: reparsed.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      };
    }
    return finalize(templateKey, reparsed.data);
  }
  return finalize(templateKey, data);
}

function finalize(
  templateKey: AttendeeTemplateKey,
  data: z.infer<typeof baseFormSchema>
): FormValidation {
  const key = EXTRAS_KEY[templateKey];
  const issues: Array<{ path: string; message: string }> = [];
  if (templateKey === 'sdr' && data.sdr) {
    if (data.sdr.qualificationQuestions.length === 0) {
      issues.push({
        path: 'sdr.qualificationQuestions',
        message: 'Add at least one qualification question',
      });
    }
  }
  if (templateKey === 'receptionist' && data.receptionist) {
    if (
      data.receptionist.faqs.length === 0 &&
      data.offerings.length === 0 &&
      !data.businessDescription
    ) {
      issues.push({
        path: 'receptionist.faqs',
        message: 'Add FAQs, offerings or a business description',
      });
    }
  }
  if (issues.length) return { ok: false, issues };

  const { sdr, closer, receptionist, ...rest } = data;
  const form = {
    ...rest,
    ...(key === 'sdr' && sdr ? { sdr } : {}),
    ...(key === 'closer' && closer ? { closer } : {}),
    ...(key === 'receptionist' && receptionist ? { receptionist } : {}),
  } as AttendeeAgentForm;
  return { ok: true, form };
}

export const fromTemplateBodySchema = z.object({
  templateKey: z.enum(ATTENDE_TEMPLATE_KEYS),
  form: z.unknown(),
  /** Session ids of the lines the agent answers on (WhatsApp/Instagram/SMS sessions). */
  lines: z
    .array(
      z.object({
        channel: z.enum(ATTENDE_CHANNELS),
        sessionId: z.string().regex(/^[0-9a-fA-F]{24}$/),
      })
    )
    .max(FORM_LIMITS.lines)
    .default([]),
  /** Idempotency: the same id returns the agent created the first time. */
  clientRequestId: z.string().min(8).max(FORM_LIMITS.clientRequestId),
  /** Optional CRM destination for leads created from conversations. */
  crm: z
    .object({
      projectId: z.string().regex(/^[0-9a-fA-F]{24}$/),
      columnId: z.string().regex(/^[0-9a-fA-F]{24}$/),
    })
    .optional(),
});
export type FromTemplateBody = z.infer<typeof fromTemplateBodySchema>;

export const patchSetupBodySchema = z.object({
  form: z.unknown(),
  lines: fromTemplateBodySchema.shape.lines.optional(),
  crm: fromTemplateBodySchema.shape.crm.nullable().optional(),
});
export type PatchSetupBody = z.infer<typeof patchSetupBodySchema>;
