import 'server-only';
import { FORM_LIMITS } from '../lib/formSchema';
import {
  ATTENDE_UI_CHANNELS,
  type AttendeeAgentForm,
  type AttendeeChannel,
  type AttendeeTemplateKey,
} from '../types';

type L10n = { pt: string; en: string; es: string };

export type FieldKind =
  | 'text'
  | 'textarea'
  | 'select'
  | 'boolean'
  | 'list' // list of short strings
  | 'offerings' // [{name, description?, price?}]
  | 'workingHours'
  | 'faqs' // [{question, answer}]
  | 'objections' // [{objection, answer}]
  | 'url'
  | 'number';

export type FormField = {
  /** Dot path inside the form, e.g. `sdr.qualificationQuestions`. */
  path: string;
  kind: FieldKind;
  label: L10n;
  help?: L10n;
  placeholder?: L10n;
  required: boolean;
  /** Max characters (text) or items (list-like). */
  max?: number;
  /** Max characters of each item for list-like fields. */
  itemMax?: number;
  options?: Array<{ value: string; label: L10n }>;
  min?: number;
  /** `true` when the field is only informational in the MVP. */
  informational?: boolean;
};

export type FormStep = { key: string; title: L10n; fields: FormField[] };

export type AttendeeTemplateDescriptor = {
  key: AttendeeTemplateKey;
  category: 'sales' | 'support';
  name: L10n;
  tagline: L10n;
  description: L10n;
  /** Short bullets shown on the picker card. */
  highlights: L10n[];
  steps: FormStep[];
  /** Pre-filled values so a client can go live with 5 answers. */
  defaults: Partial<AttendeeAgentForm>;
  /** Channels offered in the UI (the API accepts all three). */
  channels: Array<{ key: AttendeeChannel; available: boolean; beta: boolean }>;
};

const TONE_OPTIONS = [
  {
    value: 'friendly',
    label: { pt: 'Simpático', en: 'Friendly', es: 'Amable' },
  },
  {
    value: 'professional',
    label: { pt: 'Profissional', en: 'Professional', es: 'Profesional' },
  },
  {
    value: 'casual',
    label: { pt: 'Descontraído', en: 'Casual', es: 'Relajado' },
  },
  { value: 'formal', label: { pt: 'Formal', en: 'Formal', es: 'Formal' } },
];

const LANG_OPTIONS = [
  {
    value: 'pt',
    label: { pt: 'Português', en: 'Portuguese', es: 'Portugués' },
  },
  { value: 'en', label: { pt: 'Inglês', en: 'English', es: 'Inglés' } },
  { value: 'es', label: { pt: 'Espanhol', en: 'Spanish', es: 'Español' } },
];

const aboutStep: FormStep = {
  key: 'business',
  title: {
    pt: 'Sobre o seu negócio',
    en: 'About your business',
    es: 'Sobre tu negocio',
  },
  fields: [
    {
      path: 'businessName',
      kind: 'text',
      required: true,
      max: FORM_LIMITS.businessName,
      label: {
        pt: 'Nome da empresa',
        en: 'Business name',
        es: 'Nombre de la empresa',
      },
    },
    {
      path: 'businessDescription',
      kind: 'textarea',
      required: false,
      max: FORM_LIMITS.businessDescription,
      label: {
        pt: 'O que a empresa faz',
        en: 'What the business does',
        es: 'Qué hace la empresa',
      },
      help: {
        pt: 'Duas ou três frases: o que vocês vendem, para quem e o que os diferencia.',
        en: 'Two or three sentences: what you sell, to whom and what makes you different.',
        es: 'Dos o tres frases: qué venden, a quién y qué los diferencia.',
      },
    },
    {
      path: 'offerings',
      kind: 'offerings',
      required: false,
      max: FORM_LIMITS.offerings,
      label: {
        pt: 'Produtos ou serviços',
        en: 'Products or services',
        es: 'Productos o servicios',
      },
      help: {
        pt: 'O assistente só informa preços que estiverem aqui. Sem preço, ele não cita valores.',
        en: 'The assistant only quotes prices listed here. Without a price, it never quotes values.',
        es: 'El asistente solo informa precios listados aquí. Sin precio, no cita valores.',
      },
    },
  ],
};

const styleStep: FormStep = {
  key: 'style',
  title: {
    pt: 'Como o assistente fala',
    en: 'How the assistant talks',
    es: 'Cómo habla el asistente',
  },
  fields: [
    {
      path: 'assistantName',
      kind: 'text',
      required: false,
      max: FORM_LIMITS.assistantName,
      label: {
        pt: 'Nome do assistente',
        en: 'Assistant name',
        es: 'Nombre del asistente',
      },
      placeholder: { pt: 'Ex.: Luna', en: 'E.g. Luna', es: 'Ej.: Luna' },
    },
    {
      path: 'language',
      kind: 'select',
      required: true,
      options: LANG_OPTIONS,
      label: {
        pt: 'Idioma principal',
        en: 'Main language',
        es: 'Idioma principal',
      },
    },
    {
      path: 'tone',
      kind: 'select',
      required: true,
      options: TONE_OPTIONS,
      label: { pt: 'Tom de voz', en: 'Tone of voice', es: 'Tono de voz' },
    },
    {
      path: 'disclosure',
      kind: 'boolean',
      required: false,
      label: {
        pt: 'Avisar que é um assistente virtual',
        en: 'Say it is a virtual assistant',
        es: 'Avisar que es un asistente virtual',
      },
      help: {
        pt: 'Recomendado. Ele sempre responde com honestidade se perguntarem.',
        en: 'Recommended. It always answers honestly if asked.',
        es: 'Recomendado. Siempre responde con honestidad si le preguntan.',
      },
    },
  ],
};

const hoursAndHandoffStep: FormStep = {
  key: 'handoff',
  title: {
    pt: 'Horário e atendimento humano',
    en: 'Hours and human support',
    es: 'Horario y atención humana',
  },
  fields: [
    {
      path: 'workingHours',
      kind: 'workingHours',
      required: false,
      label: {
        pt: 'Horário de atendimento',
        en: 'Opening hours',
        es: 'Horario de atención',
      },
      help: {
        pt: 'Fora do horário o assistente não responde. Deixe vazio para atender o tempo todo.',
        en: 'Outside these hours the assistant does not reply. Leave empty to answer all the time.',
        es: 'Fuera del horario el asistente no responde. Déjalo vacío para atender siempre.',
      },
    },
    {
      path: 'handoff.triggers',
      kind: 'list',
      required: false,
      max: FORM_LIMITS.handoffTriggers,
      itemMax: FORM_LIMITS.handoffTriggerChars,
      label: {
        pt: 'Quando chamar uma pessoa',
        en: 'When to call a person',
        es: 'Cuándo llamar a una persona',
      },
      placeholder: {
        pt: 'Ex.: cliente quer negociar desconto',
        en: 'E.g. customer wants to negotiate a discount',
        es: 'Ej.: el cliente quiere negociar descuento',
      },
    },
    {
      path: 'handoff.keywords',
      kind: 'list',
      required: false,
      max: FORM_LIMITS.handoffKeywords,
      itemMax: FORM_LIMITS.handoffKeywordChars,
      label: {
        pt: 'Palavras que chamam uma pessoa',
        en: 'Words that call a person',
        es: 'Palabras que llaman a una persona',
      },
      placeholder: {
        pt: 'Ex.: atendente',
        en: 'E.g. agent',
        es: 'Ej.: agente',
      },
    },
    {
      path: 'handoff.message',
      kind: 'text',
      required: false,
      max: FORM_LIMITS.handoffMessage,
      label: {
        pt: 'O que dizer ao passar para uma pessoa',
        en: 'What to say when handing over',
        es: 'Qué decir al pasar a una persona',
      },
      placeholder: {
        pt: 'Vou chamar alguém da equipe para continuar com você.',
        en: 'I will get someone from the team to continue with you.',
        es: 'Voy a llamar a alguien del equipo para continuar contigo.',
      },
    },
    {
      path: 'handoff.target',
      kind: 'select',
      required: false,
      options: [
        {
          value: 'team',
          label: {
            pt: 'Toda a equipe',
            en: 'The whole team',
            es: 'Todo el equipo',
          },
        },
        {
          value: 'user',
          label: {
            pt: 'Uma pessoa específica',
            en: 'A specific person',
            es: 'Una persona específica',
          },
        },
      ],
      label: { pt: 'Quem assume', en: 'Who takes over', es: 'Quién asume' },
    },
    {
      path: 'maxRepliesPerContactPerDay',
      kind: 'number',
      required: false,
      min: FORM_LIMITS.maxRepliesPerContactPerDay.min,
      max: FORM_LIMITS.maxRepliesPerContactPerDay.max,
      label: {
        pt: 'Limite de respostas por contato por dia',
        en: 'Replies per contact per day',
        es: 'Límite de respuestas por contacto al día',
      },
    },
  ],
};

const CHANNELS: AttendeeTemplateDescriptor['channels'] = [
  {
    key: 'whatsapp',
    available: ATTENDE_UI_CHANNELS.includes('whatsapp'),
    beta: false,
  },
  {
    key: 'instagram',
    available: ATTENDE_UI_CHANNELS.includes('instagram'),
    beta: true,
  },
  { key: 'sms', available: ATTENDE_UI_CHANNELS.includes('sms'), beta: true },
];

const COMMON_DEFAULTS: Partial<AttendeeAgentForm> = {
  language: 'pt',
  tone: 'friendly',
  disclosure: true,
  offerings: [],
  workingHours: null,
  handoff: {
    triggers: [],
    keywords: ['atendente', 'humano', 'falar com uma pessoa'],
  },
};

export const ATTENDE_TEMPLATES: AttendeeTemplateDescriptor[] = [
  {
    key: 'sdr',
    category: 'sales',
    name: { pt: 'SDR', en: 'SDR', es: 'SDR' },
    tagline: {
      pt: 'Recebe os contatos novos e descobre quem tem interesse',
      en: 'Welcomes new contacts and finds who is interested',
      es: 'Recibe contactos nuevos y descubre quién tiene interés',
    },
    description: {
      pt: 'Responde na hora, faz as perguntas certas e entrega para a equipe só quem está pronto para conversar.',
      en: 'Replies instantly, asks the right questions and hands over to the team only those ready to talk.',
      es: 'Responde al instante, hace las preguntas correctas y entrega al equipo solo a quien está listo para hablar.',
    },
    highlights: [
      {
        pt: 'Qualifica com as suas perguntas',
        en: 'Qualifies with your questions',
        es: 'Califica con tus preguntas',
      },
      {
        pt: 'Agenda ou coleta o contato',
        en: 'Books a meeting or collects the contact',
        es: 'Agenda o recoge el contacto',
      },
      {
        pt: 'Passa para uma pessoa no momento certo',
        en: 'Hands over at the right moment',
        es: 'Pasa a una persona en el momento justo',
      },
    ],
    steps: [
      aboutStep,
      {
        key: 'sdr',
        title: {
          pt: 'Como qualificar',
          en: 'How to qualify',
          es: 'Cómo calificar',
        },
        fields: [
          {
            path: 'sdr.goal',
            kind: 'select',
            required: true,
            options: [
              {
                value: 'qualify',
                label: {
                  pt: 'Qualificar o interesse',
                  en: 'Qualify interest',
                  es: 'Calificar el interés',
                },
              },
              {
                value: 'book_meeting',
                label: {
                  pt: 'Agendar uma conversa',
                  en: 'Book a conversation',
                  es: 'Agendar una conversación',
                },
              },
              {
                value: 'collect_contact',
                label: {
                  pt: 'Coletar nome e contato',
                  en: 'Collect name and contact',
                  es: 'Recoger nombre y contacto',
                },
              },
            ],
            label: { pt: 'Objetivo', en: 'Goal', es: 'Objetivo' },
          },
          {
            path: 'sdr.qualificationQuestions',
            kind: 'list',
            required: true,
            max: FORM_LIMITS.qualificationQuestions,
            itemMax: FORM_LIMITS.questionChars,
            label: {
              pt: 'Perguntas de qualificação',
              en: 'Qualification questions',
              es: 'Preguntas de calificación',
            },
            placeholder: {
              pt: 'Ex.: Para quando você precisa?',
              en: 'E.g. When do you need it?',
              es: 'Ej.: ¿Para cuándo lo necesitas?',
            },
          },
          {
            path: 'sdr.idealCustomer',
            kind: 'textarea',
            required: false,
            max: FORM_LIMITS.idealCustomer,
            label: {
              pt: 'Cliente ideal',
              en: 'Ideal customer',
              es: 'Cliente ideal',
            },
          },
        ],
      },
      styleStep,
      hoursAndHandoffStep,
    ],
    defaults: {
      ...COMMON_DEFAULTS,
      sdr: {
        goal: 'qualify',
        qualificationQuestions: [
          'O que você está procurando?',
          'Para quando você precisa?',
          'Você já tem um orçamento em mente?',
        ],
      },
    },
    channels: CHANNELS,
  },
  {
    key: 'closer',
    category: 'sales',
    name: { pt: 'Closer', en: 'Closer', es: 'Closer' },
    tagline: {
      pt: 'Conduz a conversa até a decisão de compra',
      en: 'Guides the conversation to a buying decision',
      es: 'Lleva la conversación hasta la decisión de compra',
    },
    description: {
      pt: 'Apresenta suas ofertas, responde objeções com as respostas que você definir e leva a pessoa ao link ou a uma conversa de fechamento.',
      en: 'Presents your offers, answers objections with the answers you define and leads the person to your link or a closing conversation.',
      es: 'Presenta tus ofertas, responde objeciones con las respuestas que definas y lleva a la persona a tu enlace o a una conversación de cierre.',
    },
    highlights: [
      {
        pt: 'Usa só as suas ofertas e preços',
        en: 'Uses only your offers and prices',
        es: 'Usa solo tus ofertas y precios',
      },
      {
        pt: 'Responde objeções do seu jeito',
        en: 'Answers objections your way',
        es: 'Responde objeciones a tu manera',
      },
      {
        pt: 'Sem pressão nem urgência falsa',
        en: 'No pressure, no fake urgency',
        es: 'Sin presión ni urgencia falsa',
      },
    ],
    steps: [
      aboutStep,
      {
        key: 'closer',
        title: { pt: 'Como fechar', en: 'How to close', es: 'Cómo cerrar' },
        fields: [
          {
            path: 'closer.goal',
            kind: 'select',
            required: true,
            options: [
              {
                value: 'close_sale',
                label: {
                  pt: 'Fechar a venda',
                  en: 'Close the sale',
                  es: 'Cerrar la venta',
                },
              },
              {
                value: 'schedule_call',
                label: {
                  pt: 'Agendar conversa de fechamento',
                  en: 'Book a closing call',
                  es: 'Agendar llamada de cierre',
                },
              },
            ],
            label: { pt: 'Objetivo', en: 'Goal', es: 'Objetivo' },
          },
          {
            path: 'closer.offers',
            kind: 'list',
            required: false,
            max: FORM_LIMITS.offers,
            itemMax: FORM_LIMITS.offerChars,
            label: {
              pt: 'Ofertas e condições',
              en: 'Offers and conditions',
              es: 'Ofertas y condiciones',
            },
            placeholder: {
              pt: 'Ex.: Plano anual com 2 meses grátis',
              en: 'E.g. Annual plan with 2 months free',
              es: 'Ej.: Plan anual con 2 meses gratis',
            },
          },
          {
            path: 'closer.objections',
            kind: 'objections',
            required: false,
            max: FORM_LIMITS.objections,
            label: {
              pt: 'Objeções e respostas',
              en: 'Objections and answers',
              es: 'Objeciones y respuestas',
            },
          },
          {
            path: 'closer.callToActionUrl',
            kind: 'url',
            required: false,
            label: {
              pt: 'Link de compra ou agenda',
              en: 'Checkout or booking link',
              es: 'Enlace de compra o agenda',
            },
            help: {
              pt: 'Só o seu link (https). O assistente nunca inventa links.',
              en: 'Only your link (https). The assistant never invents links.',
              es: 'Solo tu enlace (https). El asistente nunca inventa enlaces.',
            },
          },
        ],
      },
      styleStep,
      hoursAndHandoffStep,
    ],
    defaults: {
      ...COMMON_DEFAULTS,
      closer: { goal: 'close_sale', offers: [], objections: [] },
    },
    channels: CHANNELS,
  },
  {
    key: 'receptionist',
    category: 'support',
    name: { pt: 'Recepcionista', en: 'Receptionist', es: 'Recepcionista' },
    tagline: {
      pt: 'Atende, tira dúvidas e encaminha 24 horas por dia',
      en: 'Greets, answers questions and routes, around the clock',
      es: 'Atiende, resuelve dudas y deriva las 24 horas',
    },
    description: {
      pt: 'Responde as perguntas mais comuns com as respostas que você cadastrar, usa seus documentos e chama uma pessoa quando precisa.',
      en: 'Answers the most common questions with the answers you register, uses your documents and calls a person when needed.',
      es: 'Responde las preguntas más comunes con las respuestas que registres, usa tus documentos y llama a una persona cuando hace falta.',
    },
    highlights: [
      {
        pt: 'Perguntas frequentes e políticas',
        en: 'FAQs and policies',
        es: 'Preguntas frecuentes y políticas',
      },
      {
        pt: 'Lê os seus documentos',
        en: 'Reads your documents',
        es: 'Lee tus documentos',
      },
      {
        pt: 'Encaminha agendamentos e reclamações',
        en: 'Routes bookings and complaints',
        es: 'Deriva citas y quejas',
      },
    ],
    steps: [
      aboutStep,
      {
        key: 'receptionist',
        title: {
          pt: 'O que responder',
          en: 'What to answer',
          es: 'Qué responder',
        },
        fields: [
          {
            path: 'receptionist.faqs',
            kind: 'faqs',
            required: false,
            max: FORM_LIMITS.faqs,
            label: {
              pt: 'Perguntas frequentes',
              en: 'Frequently asked questions',
              es: 'Preguntas frecuentes',
            },
          },
          {
            path: 'receptionist.policies',
            kind: 'list',
            required: false,
            max: FORM_LIMITS.policies,
            itemMax: FORM_LIMITS.policyChars,
            label: { pt: 'Políticas', en: 'Policies', es: 'Políticas' },
            placeholder: {
              pt: 'Ex.: Cancelamentos até 24h antes, sem custo',
              en: 'E.g. Free cancellation up to 24h before',
              es: 'Ej.: Cancelación gratuita hasta 24 h antes',
            },
          },
          {
            path: 'receptionist.bookingInstructions',
            kind: 'textarea',
            required: false,
            max: FORM_LIMITS.bookingInstructions,
            label: {
              pt: 'Como agendar',
              en: 'How to book',
              es: 'Cómo agendar',
            },
          },
          {
            path: 'receptionist.locations',
            kind: 'textarea',
            required: false,
            max: FORM_LIMITS.locations,
            label: { pt: 'Endereços', en: 'Addresses', es: 'Direcciones' },
          },
        ],
      },
      styleStep,
      hoursAndHandoffStep,
    ],
    defaults: {
      ...COMMON_DEFAULTS,
      tone: 'professional',
      receptionist: { faqs: [], policies: [] },
    },
    channels: CHANNELS,
  },
];

export function getTemplate(
  key: string
): AttendeeTemplateDescriptor | undefined {
  return ATTENDE_TEMPLATES.find((t) => t.key === key);
}
