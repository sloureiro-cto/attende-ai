import type { AgentLanguage, TemplateKey } from "./types"

type ByLang<T> = Record<AgentLanguage, T>

/** Greeting per tone and agent language; `{intro}` is who the agent says it is (see `firstMessage`). */
const GREETINGS: Record<string, ByLang<string>> = {
  friendly: { pt: "Oi! Eu sou {intro}. Como posso ajudar?", en: "Hi! I'm {intro}. How can I help?", es: "¡Hola! Soy {intro}. ¿En qué puedo ayudarte?" },
  professional: { pt: "Olá, aqui é {intro}. Em que posso ajudar?", en: "Hello, this is {intro}. How can I help you?", es: "Hola, soy {intro}. ¿En qué puedo ayudarte?" },
  casual: { pt: "E aí! Aqui é {intro}. Me conta o que você precisa.", en: "Hey! It's {intro}. Tell me what you need.", es: "¡Hey! Soy {intro}. Cuéntame qué necesitas." },
  formal: { pt: "Bom dia. Aqui é {intro}. Como posso atendê-lo(a)?", en: "Good day. This is {intro}. How may I assist you?", es: "Buen día. Le atiende {intro}. ¿En qué puedo ayudarle?" },
}

/** Mirrors the backend: without a name the agent introduces itself as "the virtual assistant" (assistantDisplayName). */
const INTRO: ByLang<{ disclosed: string; named: string; unnamed: string }> = {
  pt: { disclosed: "{name}, assistente virtual de {business}", named: "{name}, de {business}", unnamed: "o assistente virtual de {business}" },
  en: { disclosed: "{name}, the virtual assistant of {business}", named: "{name} from {business}", unnamed: "the virtual assistant of {business}" },
  es: { disclosed: "{name}, asistente virtual de {business}", named: "{name}, de {business}", unnamed: "el asistente virtual de {business}" },
}

/**
 * An illustrative first message in the AGENT's language (not the screen's), with its name, the business, the tone and,
 * when `disclosure` is on, the virtual-assistant notice the backend asks for in the first message. The AI writes the
 * real message; this only makes the choices concrete.
 */
export function firstMessage(input: { tone: string; language: AgentLanguage; assistant: string; business: string; disclosure: boolean }): string {
  const name = input.assistant.trim()
  const business = input.business.trim() || "…"
  const forms = INTRO[input.language] ?? INTRO.pt
  const intro = (name ? (input.disclosure ? forms.disclosed : forms.named) : forms.unnamed).split("{name}").join(name).split("{business}").join(business)
  const greeting = (GREETINGS[input.tone] ?? GREETINGS.friendly!)[input.language] ?? GREETINGS.friendly!.pt
  return greeting.split("{intro}").join(intro)
}

/**
 * Extra reasons to hand a conversation to a person ("Call a person when…"), filling `handoff.triggers`. The cases the
 * backend always includes (asks for a person, complaints, contested charges/refunds/exceptional negotiation, no answer) are shown apart and not repeated here.
 */
export const HANDOFF_SUGGESTIONS: ByLang<string[]> = {
  pt: ["O cliente pede uma proposta personalizada", "O cliente quer fazer um pedido grande ou para empresa", "O cliente quer agendar uma visita ou reunião"],
  en: ["The customer asks for a custom quote", "The customer wants a large or business order", "The customer wants to book a visit or meeting"],
  es: ["El cliente pide una propuesta personalizada", "El cliente quiere un pedido grande o para empresa", "El cliente quiere agendar una visita o reunión"],
}

export const KEYWORD_SUGGESTIONS: ByLang<string[]> = {
  pt: ["atendente", "humano", "pessoa", "gerente"],
  en: ["agent", "human", "person", "manager"],
  es: ["agente", "humano", "persona", "gerente"],
}

/** Short names of the days, Sunday first (index = day number in the contract). */
export const DAY_LABELS: ByLang<readonly string[]> = {
  pt: ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"],
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  es: ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"],
}

export type ExampleTurn = { from: "customer" | "agent"; text: string }

/** A three-bubble example per template, so the picker shows what the agent sounds like. */
export const EXAMPLE_CONVERSATIONS: Record<TemplateKey, ByLang<ExampleTurn[]>> = {
  sdr: {
    pt: [
      { from: "customer", text: "Oi, vi o anúncio de vocês. Como funciona?" },
      { from: "agent", text: "Oi! Posso te explicar rapidinho. Para indicar o melhor plano, quantas pessoas vão usar?" },
      { from: "customer", text: "Somos 5 na equipe." },
    ],
    en: [
      { from: "customer", text: "Hi, I saw your ad. How does it work?" },
      { from: "agent", text: "Hi! Happy to explain. To suggest the best plan, how many people will use it?" },
      { from: "customer", text: "There are 5 of us." },
    ],
    es: [
      { from: "customer", text: "Hola, vi su anuncio. ¿Cómo funciona?" },
      { from: "agent", text: "¡Hola! Con gusto te explico. Para sugerir el mejor plan, ¿cuántas personas lo usarán?" },
      { from: "customer", text: "Somos 5 en el equipo." },
    ],
  },
  closer: {
    pt: [
      { from: "customer", text: "Gostei, mas achei um pouco caro." },
      { from: "agent", text: "Entendo! O valor inclui acompanhamento mensal. Posso te mostrar o que está incluso?" },
      { from: "customer", text: "Pode, por favor." },
    ],
    en: [
      { from: "customer", text: "I like it, but it feels a bit expensive." },
      { from: "agent", text: "I understand! The price includes monthly follow-up. Want me to show what's included?" },
      { from: "customer", text: "Yes, please." },
    ],
    es: [
      { from: "customer", text: "Me gustó, pero lo veo algo caro." },
      { from: "agent", text: "¡Entiendo! El precio incluye seguimiento mensual. ¿Te muestro qué incluye?" },
      { from: "customer", text: "Sí, por favor." },
    ],
  },
  receptionist: {
    pt: [
      { from: "customer", text: "Vocês abrem aos sábados?" },
      { from: "agent", text: "Abrimos sim, das 9h às 13h. Quer que eu deixe um horário reservado?" },
      { from: "customer", text: "Quero, às 10h." },
    ],
    en: [
      { from: "customer", text: "Are you open on Saturdays?" },
      { from: "agent", text: "Yes, from 9am to 1pm. Would you like me to hold a time for you?" },
      { from: "customer", text: "Yes, 10am." },
    ],
    es: [
      { from: "customer", text: "¿Abren los sábados?" },
      { from: "agent", text: "Sí, de 9 a 13 h. ¿Quieres que te reserve un horario?" },
      { from: "customer", text: "Sí, a las 10." },
    ],
  },
}
