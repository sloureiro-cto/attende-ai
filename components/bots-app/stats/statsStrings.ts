/**
 * Strings of the automation stats page (route /bots/[id]/stats). Same shape as lib/i18n/translations/botsApp.ts (typed, en/pt/es), kept in
 * the stats folder so the page ships and merges on its own.
 */
type Entry = { en: string; pt: string; es: string }

const entries = {
  title: { en: "Automation performance", pt: "Desempenho da automação", es: "Rendimiento de la automatización" },
  subtitle: {
    en: "How leads move through {name}, step by step.",
    pt: "Como os leads avançam em {name}, passo a passo.",
    es: "Cómo avanzan los leads en {name}, paso a paso.",
  },
  back: { en: "Back to automations", pt: "Voltar para as automações", es: "Volver a las automatizaciones" },
  openBuilder: { en: "Open in builder", pt: "Abrir no construtor", es: "Abrir en el constructor" },
  rangeAria: { en: "Period", pt: "Período", es: "Período" },
  range7: { en: "7 days", pt: "7 dias", es: "7 días" },
  range30: { en: "30 days", pt: "30 dias", es: "30 días" },
  range90: { en: "90 days", pt: "90 dias", es: "90 días" },
  // kpis
  kpiStarted: { en: "Started", pt: "Iniciadas", es: "Iniciadas" },
  kpiStartedHint: {
    en: "Conversations that entered the automation",
    pt: "Conversas que entraram na automação",
    es: "Conversaciones que entraron a la automatización",
  },
  kpiCompleted: { en: "Completed", pt: "Concluídas", es: "Completadas" },
  kpiCompletedHint: {
    en: "{pct} of the {started} started",
    pt: "{pct} do total de {started} iniciadas",
    es: "{pct} del total de {started} iniciadas",
  },
  kpiNoBase: { en: "No conversation started", pt: "Nenhuma conversa iniciada", es: "Ninguna conversación iniciada" },
  kpiHandedOff: { en: "Handed to a person", pt: "Passadas a uma pessoa", es: "Pasadas a una persona" },
  kpiHandedOffHint: {
    en: "{pct} of the {started} started",
    pt: "{pct} do total de {started} iniciadas",
    es: "{pct} del total de {started} iniciadas",
  },
  kpiStopped: { en: "Stopped", pt: "Interrompidas", es: "Detenidas" },
  kpiStoppedHint: {
    en: "A person replied or the automation was paused",
    pt: "Uma pessoa respondeu ou a automação foi pausada",
    es: "Una persona respondió o la automatización se pausó",
  },
  kpiFailed: { en: "Failed", pt: "Com falha", es: "Con error" },
  kpiFailedHint: {
    en: "Could not send or lost its step",
    pt: "Não enviou ou perdeu o passo",
    es: "No se envió o perdió su paso",
  },
  kpiInProgress: { en: "Still running", pt: "Em andamento", es: "En curso" },
  kpiInProgressHint: {
    en: "Waiting for a reply or a timer",
    pt: "Aguardando resposta ou um tempo",
    es: "Esperando respuesta o un tiempo",
  },
  kpiSuccess: { en: "Reached an end", pt: "Chegaram a um fim", es: "Llegaron a un fin" },
  kpiSuccessHint: {
    en: "Completed or handed to a person ({count} of {started})",
    pt: "Concluídas ou passadas a uma pessoa ({count} de {started})",
    es: "Completadas o pasadas a una persona ({count} de {started})",
  },
  // trend
  trendTitle: { en: "Runs per day", pt: "Execuções por dia", es: "Ejecuciones por día" },
  trendSeriesStarted: { en: "Started", pt: "Iniciadas", es: "Iniciadas" },
  trendSeriesCompleted: { en: "Completed", pt: "Concluídas", es: "Completadas" },
  trendAria: {
    en: "Line chart of runs per day. {started} started and {completed} completed in the period.",
    pt: "Gráfico de linhas das execuções por dia. {started} iniciadas e {completed} concluídas no período.",
    es: "Gráfico de líneas de ejecuciones por día. {started} iniciadas y {completed} completadas en el período.",
  },
  viewChart: { en: "Chart", pt: "Gráfico", es: "Gráfico" },
  viewTable: { en: "Table", pt: "Tabela", es: "Tabla" },
  viewAria: { en: "Show as", pt: "Mostrar como", es: "Mostrar como" },
  tableDay: { en: "Day", pt: "Dia", es: "Día" },
  tableHandedOff: { en: "Handed off", pt: "Passadas", es: "Pasadas" },
  tableStopped: { en: "Stopped", pt: "Interrompidas", es: "Detenidas" },
  tableFailed: { en: "Failed", pt: "Com falha", es: "Con error" },
  tableStep: { en: "Step", pt: "Passo", es: "Paso" },
  tableReached: { en: "Reached", pt: "Chegaram", es: "Llegaron" },
  tableDropOff: { en: "Did not continue", pt: "Não seguiram", es: "No continuaron" },
  // funnel
  funnelTitle: { en: "Where leads go", pt: "Para onde os leads vão", es: "Adónde van los leads" },
  funnelSubtitle: {
    en: "How many leads reached each step and which way they took.",
    pt: "Quantos leads chegaram a cada passo e que saída tomaram.",
    es: "Cuántos leads llegaron a cada paso y qué salida tomaron.",
  },
  stepReached: { en: "{count} reached", pt: "{count} chegaram", es: "{count} llegaron" },
  stepShareOfStarted: { en: "{pct} of started", pt: "{pct} das iniciadas", es: "{pct} de las iniciadas" },
  stepEnds: { en: "Ends the flow", pt: "Encerra o fluxo", es: "Termina el flujo" },
  stepNoTraffic: { en: "No leads yet", pt: "Nenhum lead ainda", es: "Aún ningún lead" },
  stepDropOff: {
    en: "{count} did not continue ({pct})",
    pt: "{count} não seguiram ({pct})",
    es: "{count} no continuaron ({pct})",
  },
  stepFallback: { en: "Step {n}", pt: "Passo {n}", es: "Paso {n}" },
  // drop-offs
  dropTitle: { en: "Biggest drop-offs", pt: "Maiores quedas", es: "Mayores caídas" },
  dropSubtitle: {
    en: "Steps where the most leads stopped answering or were left waiting.",
    pt: "Passos em que mais leads deixaram de responder ou ficaram esperando.",
    es: "Pasos donde más leads dejaron de responder o quedaron esperando.",
  },
  dropNone: {
    en: "No step is losing leads right now.",
    pt: "Nenhum passo está perdendo leads agora.",
    es: "Ningún paso está perdiendo leads ahora.",
  },
  dropNeedMore: {
    en: "Drop-offs show once a step has at least 5 leads.",
    pt: "As quedas aparecem quando um passo tem pelo menos 5 leads.",
    es: "Las caídas aparecen cuando un paso tiene al menos 5 leads.",
  },
  dropRate: {
    en: "{pct} of the {count} that arrived",
    pt: "{pct} dos {count} que chegaram",
    es: "{pct} de los {count} que llegaron",
  },
  dropLost: { en: "{count} lost", pt: "{count} perdidos", es: "{count} perdidos" },
  // states
  emptyTitle: {
    en: "No runs in this period",
    pt: "Nenhuma execução neste período",
    es: "Ninguna ejecución en este período",
  },
  emptyBody: {
    en: "Once leads start talking to this automation, you will see them here. Try a longer period.",
    pt: "Quando os leads começarem a conversar com esta automação, você os verá aqui. Tente um período maior.",
    es: "Cuando los leads empiecen a hablar con esta automatización, los verás aquí. Prueba un período más largo.",
  },
  errorTitle: {
    en: "We could not load the stats",
    pt: "Não foi possível carregar as estatísticas",
    es: "No pudimos cargar las estadísticas",
  },
  errorBody: {
    en: "Try again in a moment.",
    pt: "Tente novamente em instantes.",
    es: "Inténtalo de nuevo en un momento.",
  },
  retry: { en: "Try again", pt: "Tentar novamente", es: "Intentar de nuevo" },
  loadingAria: { en: "Loading stats", pt: "Carregando estatísticas", es: "Cargando estadísticas" },
  trendLoadError: {
    en: "The daily chart is not available right now.",
    pt: "O gráfico diário não está disponível agora.",
    es: "El gráfico diario no está disponible ahora.",
  },
  statsNote: {
    en: "Counts are per UTC day. Runs still in progress appear in Started and later in their outcome.",
    pt: "As contagens são por dia UTC. Execuções em andamento aparecem em Iniciadas e depois no resultado.",
    es: "Los conteos son por día UTC. Las ejecuciones en curso aparecen en Iniciadas y luego en su resultado.",
  },
} satisfies Record<string, Entry>

export type StatsKey = keyof typeof entries
export const statsEntries = entries
export const statsKeys = Object.keys(entries) as StatsKey[]

export function translateStats(
  language: "english" | "portuguese" | "spanish",
  key: StatsKey,
  replacements?: Record<string, string | number>
): string {
  const entry: Entry = entries[key]
  const field = language === "portuguese" ? "pt" : language === "spanish" ? "es" : "en"
  let text = entry[field] ?? entry.en
  if (replacements)
    for (const [name, value] of Object.entries(replacements)) text = text.split(`{${name}}`).join(String(value))
  return text
}
