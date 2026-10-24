import type { ShellEntry } from "./shellTranslator"

/** Public pricing page. No prices live here: they come from the plans endpoint (or show as "at checkout"). */
export const pricingEntries = {
  pricingTitle: { en: "Simple plans that grow with you", pt: "Planos simples que crescem com você", es: "Planes simples que crecen contigo" },
  pricingSubtitle: {
    en: "An AI assistant that answers your customers on WhatsApp, Instagram and SMS. Start free for 7 days.",
    pt: "Um assistente de IA que atende os seus clientes no WhatsApp, Instagram e SMS. Comece grátis por 7 dias.",
    es: "Un asistente de IA que atiende a tus clientes en WhatsApp, Instagram y SMS. Empieza gratis por 7 días.",
  },
  pricingTrialBadge: { en: "7-day free trial", pt: "7 dias grátis para testar", es: "7 días de prueba gratis" },
  pricingTrialNote: { en: "Card required. Cancel anytime during the trial.", pt: "Cartão necessário. Cancele quando quiser durante o teste.", es: "Se requiere tarjeta. Cancela cuando quieras durante la prueba." },
  tierStarter: { en: "Starter", pt: "Starter", es: "Starter" },
  tierGrowth: { en: "Growth", pt: "Growth", es: "Growth" },
  tierScale: { en: "Scale", pt: "Scale", es: "Scale" },
  tierStarterFor: { en: "For a single store or small team", pt: "Para uma loja ou equipe pequena", es: "Para una tienda o equipo pequeño" },
  tierGrowthFor: { en: "For growing teams with several channels", pt: "Para equipes em crescimento com vários canais", es: "Para equipos en crecimiento con varios canales" },
  tierScaleFor: { en: "For high volume and many agents", pt: "Para alto volume e muitos agentes", es: "Para alto volumen y muchos agentes" },
  tierPopular: { en: "Most popular", pt: "Mais escolhido", es: "Más elegido" },
  limitLines: { en: "{count} WhatsApp / social lines", pt: "{count} linhas de WhatsApp / redes", es: "{count} líneas de WhatsApp / redes" },
  limitLine: { en: "1 WhatsApp / social line", pt: "1 linha de WhatsApp / redes", es: "1 línea de WhatsApp / redes" },
  limitAgents: { en: "{count} AI agents", pt: "{count} agentes de IA", es: "{count} agentes de IA" },
  limitAgent: { en: "1 AI agent", pt: "1 agente de IA", es: "1 agente de IA" },
  limitReplies: { en: "{count} AI replies per month", pt: "{count} respostas de IA por mês", es: "{count} respuestas de IA al mes" },
  limitSeats: { en: "{count} team seats", pt: "{count} usuários na equipe", es: "{count} usuarios en el equipo" },
  limitDocs: { en: "{count} knowledge documents", pt: "{count} documentos de conhecimento", es: "{count} documentos de conocimiento" },
  includedAll: { en: "Inbox, funnel, reports and classic automations included", pt: "Caixa de conversas, funil, relatórios e automações clássicas inclusas", es: "Bandeja, embudo, informes y automatizaciones clásicas incluidas" },
  pricePending: { en: "Price shown at checkout", pt: "Preço exibido no checkout", es: "Precio visible al pagar" },
  perMonth: { en: "/ month", pt: "/ mês", es: "/ mes" },
  startTrial: { en: "Start 7-day free trial", pt: "Começar teste grátis de 7 dias", es: "Empezar prueba gratis de 7 días" },
  pricingBook: { en: "Book a demo or training", pt: "Agendar demonstração ou treinamento", es: "Agendar demo o capacitación" },
  pricingHaveAccount: { en: "Already have an account?", pt: "Já tem conta?", es: "¿Ya tienes cuenta?" },
  pricingSignIn: { en: "Sign in", pt: "Entrar", es: "Iniciar sesión" },
  faqTitle: { en: "Questions, answered", pt: "Perguntas frequentes", es: "Preguntas frecuentes" },
  faqTrialQ: { en: "How does the free trial work?", pt: "Como funciona o teste grátis?", es: "¿Cómo funciona la prueba gratis?" },
  faqTrialA: {
    en: "You get 7 days with the full product. We ask for a card up front and only charge when the trial ends. Cancel before then and you pay nothing. During the trial there is a cap on messages sent.",
    pt: "Você usa o produto completo por 7 dias. Pedimos o cartão no início e só cobramos quando o teste termina. Cancele antes e você não paga nada. Durante o teste há um limite de mensagens enviadas.",
    es: "Usas el producto completo por 7 días. Pedimos la tarjeta al inicio y solo cobramos cuando termina la prueba. Cancela antes y no pagas nada. Durante la prueba hay un tope de mensajes enviados.",
  },
  faqLinesQ: { en: "Which numbers can I use?", pt: "Quais números posso usar?", es: "¿Qué números puedo usar?" },
  faqLinesA: {
    en: "Bring your own WhatsApp number by scanning a QR code. Instagram and SMS lines are available too, depending on your plan.",
    pt: "Traga o seu próprio número de WhatsApp lendo um QR code. Linhas de Instagram e SMS também estão disponíveis, conforme o plano.",
    es: "Trae tu propio número de WhatsApp escaneando un QR. También hay líneas de Instagram y SMS, según tu plan.",
  },
  faqAiQ: { en: "Does the AI know my business?", pt: "A IA conhece o meu negócio?", es: "¿La IA conoce mi negocio?" },
  faqAiA: {
    en: "Yes. You pick a ready-made model (SDR, Closer or Receptionist), answer a few simple questions and upload your documents. The agent answers using your information.",
    pt: "Sim. Você escolhe um modelo pronto (SDR, Closer ou Recepcionista), responde a poucas perguntas simples e envia os seus documentos. O agente responde com as suas informações.",
    es: "Sí. Eliges un modelo listo (SDR, Closer o Recepcionista), respondes unas preguntas simples y subes tus documentos. El agente responde con tu información.",
  },
  faqHumanQ: { en: "Can a person take over?", pt: "Uma pessoa pode assumir a conversa?", es: "¿Una persona puede tomar el control?" },
  faqHumanA: {
    en: "Always. You see every conversation live and can reply yourself at any time, or let the agent hand over when a customer asks for a person.",
    pt: "Sempre. Você vê todas as conversas ao vivo e pode responder a qualquer momento, ou deixar o agente passar para uma pessoa quando o cliente pedir.",
    es: "Siempre. Ves todas las conversaciones en vivo y puedes responder cuando quieras, o dejar que el agente pase a una persona cuando el cliente lo pida.",
  },
  faqChangeQ: { en: "Can I change plan later?", pt: "Posso mudar de plano depois?", es: "¿Puedo cambiar de plan después?" },
  faqChangeA: {
    en: "Yes, you can upgrade or downgrade at any time from the billing page.",
    pt: "Sim, você pode fazer upgrade ou downgrade a qualquer momento na página de cobrança.",
    es: "Sí, puedes mejorar o bajar de plan en cualquier momento desde la página de facturación.",
  },
} satisfies Record<string, ShellEntry>

export type PricingTranslationKey = keyof typeof pricingEntries
