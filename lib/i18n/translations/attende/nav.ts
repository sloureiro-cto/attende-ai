import type { ShellEntry } from "./shellTranslator"

/** Navigation, trial banner, usage meter and booking CTA. The home (/start) strings live in onboarding.ts. */
export const navEntries = {
  navMain: { en: "Main navigation", pt: "Navegação principal", es: "Navegación principal" },
  navHome: { en: "Home", pt: "Início", es: "Inicio" },
  navInbox: { en: "Conversations", pt: "Conversas", es: "Conversaciones" },
  navFunnel: { en: "Funnel", pt: "Funil", es: "Embudo" },
  navAgents: { en: "AI agents", pt: "Agentes de IA", es: "Agentes de IA" },
  navLines: { en: "Channels", pt: "Canais", es: "Canales" },
  navBots: { en: "Automations", pt: "Automações", es: "Automatizaciones" },
  navReports: { en: "Reports", pt: "Relatórios", es: "Informes" },
  navTeam: { en: "Team", pt: "Equipe", es: "Equipo" },
  navBilling: { en: "Billing", pt: "Cobrança", es: "Facturación" },
  sidebarCollapse: { en: "Collapse menu", pt: "Recolher menu", es: "Contraer menú" },
  sidebarExpand: { en: "Expand menu", pt: "Expandir menu", es: "Expandir menú" },
  themeToDark: { en: "Switch to dark theme", pt: "Usar tema escuro", es: "Usar tema oscuro" },
  themeToLight: { en: "Switch to light theme", pt: "Usar tema claro", es: "Usar tema claro" },
  navMore: { en: "More", pt: "Mais", es: "Más" },
  navOpenMenu: { en: "Open menu", pt: "Abrir menu", es: "Abrir menú" },
  navMenuTitle: { en: "Menu", pt: "Menu", es: "Menú" },
  navMenuDescription: { en: "Move between the sections of the app.", pt: "Navegue entre as seções do app.", es: "Navega entre las secciones de la app." },

  bookDemo: { en: "Book a demo or training", pt: "Agendar demonstração ou treinamento", es: "Agendar demo o capacitación" },
  bookDemoShort: { en: "Book a demo", pt: "Agendar demo", es: "Agendar demo" },
  bookDemoHint: { en: "Talk to our team and get set up faster.", pt: "Fale com a nossa equipe e comece mais rápido.", es: "Habla con nuestro equipo y empieza más rápido." },

  trialDaysLeft: { en: "{days} days left in your trial", pt: "Restam {days} dias do seu teste", es: "Te quedan {days} días de prueba" },
  trialOneDayLeft: { en: "1 day left in your trial", pt: "Resta 1 dia do seu teste", es: "Te queda 1 día de prueba" },
  trialLastDay: { en: "Your trial ends today", pt: "Seu teste termina hoje", es: "Tu prueba termina hoy" },
  trialEnded: { en: "Your trial has ended", pt: "Seu teste terminou", es: "Tu prueba terminó" },
  trialUpgrade: { en: "Choose a plan", pt: "Escolher um plano", es: "Elegir un plan" },
  pastDue: { en: "We could not charge your card", pt: "Não conseguimos cobrar o seu cartão", es: "No pudimos cobrar tu tarjeta" },
  pastDueFix: { en: "Update payment", pt: "Atualizar pagamento", es: "Actualizar pago" },
  canceled: { en: "Your subscription is canceled", pt: "Sua assinatura está cancelada", es: "Tu suscripción está cancelada" },
  canceledReactivate: { en: "Reactivate", pt: "Reativar", es: "Reactivar" },

  usageOf: { en: "{used} of {limit}", pt: "{used} de {limit}", es: "{used} de {limit}" },
  usageUnlimited: { en: "{used} used", pt: "{used} em uso", es: "{used} en uso" },
  usageFull: { en: "Limit reached", pt: "Limite atingido", es: "Límite alcanzado" },
  usageNearLimit: { en: "Almost at the limit", pt: "Quase no limite", es: "Casi en el límite" },
} satisfies Record<string, ShellEntry>

export type NavTranslationKey = keyof typeof navEntries
