import 'server-only';
/**
 * Attende-ai agent templates: a non-technical client fills a SHORT form and gets a real JSYNQ agent
 * (agent configuration + automation binding) whose system prompt is compiled from that form.
 */

export const ATTENDE_TEMPLATE_KEYS = ['sdr', 'closer', 'receptionist'] as const;
export type AttendeeTemplateKey = (typeof ATTENDE_TEMPLATE_KEYS)[number];

export const ATTENDE_LANGUAGES = ['pt', 'en', 'es'] as const;
export type AttendeeLanguage = (typeof ATTENDE_LANGUAGES)[number];

export const ATTENDE_TONES = [
  'friendly',
  'professional',
  'casual',
  'formal',
] as const;
export type AttendeeTone = (typeof ATTENDE_TONES)[number];

/** Channels an agent can answer on. Only WhatsApp is enabled in the MVP; the others are v2-ready. */
export const ATTENDE_CHANNELS = ['whatsapp', 'instagram', 'sms'] as const;
export type AttendeeChannel = (typeof ATTENDE_CHANNELS)[number];

export type AttendeeOffering = {
  name: string;
  description?: string;
  /** Free text exactly as the business wants it quoted ("R$ 199/mês"). Never invented by the agent. */
  price?: string;
};

export type AttendeeWorkingDay = {
  /** 0 = Sunday … 6 = Saturday. */
  day: number;
  /** 24h `HH:mm`. */
  open: string;
  close: string;
};

export type AttendeeWorkingHours = {
  /** IANA timezone, e.g. `America/Sao_Paulo`. */
  timezone: string;
  days: AttendeeWorkingDay[];
};

export type AttendeeHandoff = {
  /** Situations (free text) in which the agent must call a person. */
  triggers: string[];
  /** Words/phrases that always mean "I want a person". */
  keywords: string[];
  /** What the agent tells the contact right before handing over. */
  message?: string;
  /**
   * Who should take over. `team`: the conversation waits in the shared inbox for anyone. `user`: on an
   * automatic handover the Attende worker (phase 4) assigns it to that member through JSYNQ's conversation
   * assign route, unless it already has an assignee or the person left the workspace. Stored here only:
   * JSYNQ's binding policy has no assignee field.
   */
  target?: { kind: 'team' | 'user'; userId?: string };
};

export type AttendeeFaq = { question: string; answer: string };
export type AttendeeObjection = { objection: string; answer: string };

export type AttendeeSdrExtras = {
  goal: 'book_meeting' | 'collect_contact' | 'qualify';
  qualificationQuestions: string[];
  idealCustomer?: string;
};

export type AttendeeCloserExtras = {
  goal: 'close_sale' | 'schedule_call';
  offers: string[];
  objections: AttendeeObjection[];
  /** Payment link / scheduling link the agent may share. It never invents links. */
  callToActionUrl?: string;
};

export type AttendeeReceptionistExtras = {
  faqs: AttendeeFaq[];
  policies: string[];
  bookingInstructions?: string;
  locations?: string;
};

/** The whole setup form. Template-specific blocks are validated only for their template. */
export type AttendeeAgentForm = {
  businessName: string;
  businessDescription?: string;
  /** Name the assistant introduces itself with. Defaults to "assistente virtual". */
  assistantName?: string;
  language: AttendeeLanguage;
  tone: AttendeeTone;
  /** Say it is an AI assistant (first message and whenever asked). Default true. */
  disclosure: boolean;
  offerings: AttendeeOffering[];
  /** `null` = always on. */
  workingHours: AttendeeWorkingHours | null;
  handoff: AttendeeHandoff;
  /** Per-contact reply cap per day (cost and spam guard). */
  maxRepliesPerContactPerDay?: number;
  sdr?: AttendeeSdrExtras;
  closer?: AttendeeCloserExtras;
  receptionist?: AttendeeReceptionistExtras;
};

export const ATTENDE_AGENT_ERROR_CODES = {
  VALIDATION: 'ATTENDE_AGENT_VALIDATION',
  TEMPLATE_NOT_FOUND: 'ATTENDE_AGENT_TEMPLATE_NOT_FOUND',
  AGENT_NOT_FOUND: 'ATTENDE_AGENT_NOT_FOUND',
  LINE_NOT_FOUND: 'ATTENDE_AGENT_LINE_NOT_FOUND',
  LINE_NOT_CONNECTED: 'ATTENDE_AGENT_LINE_NOT_CONNECTED',
  QUOTA_AGENTS: 'ATTENDE_QUOTA_EXCEEDED',
  QUOTA_DOCS: 'ATTENDE_QUOTA_EXCEEDED',
  NOT_READY: 'ATTENDE_AGENT_NOT_READY',
  FILE_REJECTED: 'ATTENDE_AGENT_FILE_REJECTED',
} as const;
export type AttendeeAgentErrorCode =
  (typeof ATTENDE_AGENT_ERROR_CODES)[keyof typeof ATTENDE_AGENT_ERROR_CODES];

/**
 * Channels the product UI offers in the MVP. The API accepts all three (the binding runtime
 * already answers Instagram and SMS); the others are listed as `beta` by `GET /templates`.
 */
export const ATTENDE_UI_CHANNELS: readonly AttendeeChannel[] = ['whatsapp'];
