import { serviceErrorEntries } from "./serviceErrors"

/**
 * Strings of the Attende-ai reports page. Typed, en/pt/es, with `{name}`-style replacements.
 * Plurals are `_one` / `_other` pairs picked with `plural()` from `lib/attende/format.ts`.
 * Wording follows docs/attende/reports.md in the backend: proxies say they are estimates and nothing credits a
 * lead or a sale to the AI without a record that it did it.
 */
type Entry = { en: string; pt: string; es: string }

const entries = {
  pageTitle: { en: "Reports", pt: "Relatórios", es: "Informes" },
  pageSubtitle: {
    en: "Volume, speed and handoffs of the support on your channels.",
    pt: "Volume, velocidade e transferências do atendimento nos seus canais.",
    es: "Volumen, velocidad y transferencias de la atención en tus canales.",
  },

  // --- period and freshness (page bar) ---
  periodLabel: { en: "Period", pt: "Período", es: "Período" },
  periodValue: { en: "{range} (UTC days)", pt: "{range} (dias em UTC)", es: "{range} (días en UTC)" },
  periodCompare: { en: "Compared with {range}", pt: "Comparado com {range}", es: "Comparado con {range}" },
  freshness: {
    en: "Data refreshed every 10 minutes · fetched at {time}",
    pt: "Dados atualizados a cada 10 minutos · consultados às {time}",
    es: "Datos actualizados cada 10 minutos · consultados a las {time}",
  },
  freshnessInfoAria: { en: "How up to date is this report?", pt: "Quão atualizado está este relatório?", es: "¿Qué tan actualizado está este informe?" },
  freshnessHint: {
    en: "The report is rebuilt every 10 minutes. Today and yesterday can still change while conversations settle.",
    pt: "O relatório é recalculado a cada 10 minutos. Hoje e ontem ainda podem mudar enquanto as conversas se encerram.",
    es: "El informe se recalcula cada 10 minutos. Hoy y ayer aún pueden cambiar mientras las conversaciones se cierran.",
  },

  // --- filters ---
  filtersAria: { en: "Report filters", pt: "Filtros do relatório", es: "Filtros del informe" },
  rangeAria: { en: "Period", pt: "Período", es: "Período" },
  range7: { en: "7 days", pt: "7 dias", es: "7 días" },
  range30: { en: "30 days", pt: "30 dias", es: "30 días" },
  range90: { en: "90 days", pt: "90 dias", es: "90 días" },
  rangeCustom: { en: "Custom", pt: "Personalizado", es: "Personalizado" },
  rangeFrom: { en: "From", pt: "De", es: "Desde" },
  rangeTo: { en: "To", pt: "Até", es: "Hasta" },
  rangeApply: { en: "Apply", pt: "Aplicar", es: "Aplicar" },
  rangeInvalid: {
    en: "Pick a start that is not after the end, with an end that is not in the future.",
    pt: "Escolha um início que não seja depois do fim, e um fim que não esteja no futuro.",
    es: "Elige un inicio que no sea posterior al fin, y un fin que no esté en el futuro.",
  },
  rangeTooLong: { en: "The period can be at most 366 days.", pt: "O período pode ter no máximo 366 dias.", es: "El período puede tener como máximo 366 días." },
  channelAria: { en: "Channel", pt: "Canal", es: "Canal" },
  channelAll: { en: "All channels", pt: "Todos os canais", es: "Todos los canales" },
  channelWhatsapp: { en: "WhatsApp", pt: "WhatsApp", es: "WhatsApp" },
  channelInstagram: { en: "Instagram", pt: "Instagram", es: "Instagram" },
  channelSms: { en: "SMS", pt: "SMS", es: "SMS" },
  agentAria: { en: "AI agent", pt: "Agente de IA", es: "Agente de IA" },
  agentAll: { en: "All AI agents", pt: "Todos os agentes de IA", es: "Todos los agentes de IA" },
  agentNone: { en: "No AI agent", pt: "Sem agente de IA", es: "Sin agente de IA" },
  agentUnnamed: { en: "AI agent without a name", pt: "Agente de IA sem nome", es: "Agente de IA sin nombre" },
  resetFilters: { en: "Reset filters", pt: "Limpar filtros", es: "Limpiar filtros" },
  updating: { en: "Updating…", pt: "Atualizando…", es: "Actualizando…" },

  // --- KPI labels ---
  kpiConversations: { en: "New conversations", pt: "Novas conversas", es: "Nuevas conversaciones" },
  kpiAiReplies: { en: "AI replies", pt: "Respostas da IA", es: "Respuestas de la IA" },
  kpiAiResolutionRate: { en: "Possibly resolved by AI", pt: "Possivelmente resolvidas pela IA", es: "Posiblemente resueltas por la IA" },
  kpiHandoffRate: { en: "Handed to your team", pt: "Transferidas para a equipe", es: "Transferidas al equipo" },
  kpiFirstResponseAi: { en: "AI first reply (median)", pt: "1ª resposta da IA (mediana)", es: "1ª respuesta de la IA (mediana)" },
  kpiLeadsCreated: { en: "Conversations with a lead", pt: "Conversas com lead", es: "Conversaciones con lead" },
  kpiFirstResponseHuman: { en: "Team first reply (median)", pt: "1ª resposta da equipe (mediana)", es: "1ª respuesta del equipo (mediana)" },
  kpiHumanReplies: { en: "Team replies", pt: "Respostas da equipe", es: "Respuestas del equipo" },
  kpiAutomationReplies: { en: "Automation and rule replies", pt: "Respostas de Automações e regras", es: "Respuestas de Automatizaciones y reglas" },
  kpiMessagesPerConversation: { en: "Messages per active conversation-day", pt: "Mensagens por conversa ativa no dia", es: "Mensajes por conversación activa al día" },
  kpiAfterHours: { en: "Messages outside business hours", pt: "Mensagens fora do horário comercial", es: "Mensajes fuera del horario laboral" },
  secondaryTitle: { en: "More detail", pt: "Mais detalhes", es: "Más detalle" },
  headlineAria: { en: "Main indicators", pt: "Indicadores principais", es: "Indicadores principales" },
  estimateBadge: { en: "Estimate", pt: "Estimativa", es: "Estimación" },
  estimateBadgeAria: { en: "This number is an estimate", pt: "Este número é uma estimativa", es: "Este número es una estimación" },
  infoAria: { en: "What does {metric} mean?", pt: "O que significa {metric}?", es: "¿Qué significa {metric}?" },

  // --- what each KPI is measured on (base + period) ---
  basisStarted: { en: "Started {range}", pt: "Iniciadas em {range}", es: "Iniciadas en {range}" },
  basisSent: { en: "Sent {range}", pt: "Enviadas em {range}", es: "Enviadas en {range}" },
  basisMessages: { en: "Messages sent and received {range}", pt: "Mensagens enviadas e recebidas em {range}", es: "Mensajes enviados y recibidos en {range}" },
  basisCustomerMessages: { en: "Customer messages received {range}", pt: "Mensagens de clientes recebidas em {range}", es: "Mensajes de clientes recibidos en {range}" },
  basisOfStarted_one: {
    en: "{part} of {count} conversation started {range}",
    pt: "{part} de {count} conversa iniciada em {range}",
    es: "{part} de {count} conversación iniciada en {range}",
  },
  basisOfStarted_other: {
    en: "{part} of {count} conversations started {range}",
    pt: "{part} de {count} conversas iniciadas em {range}",
    es: "{part} de {count} conversaciones iniciadas en {range}",
  },
  basisOfSettled_one: {
    en: "{part} of {count} settled conversation started {range}",
    pt: "{part} de {count} conversa encerrada, iniciada em {range}",
    es: "{part} de {count} conversación cerrada, iniciada en {range}",
  },
  basisOfSettled_other: {
    en: "{part} of {count} settled conversations started {range}",
    pt: "{part} de {count} conversas encerradas, iniciadas em {range}",
    es: "{part} de {count} conversaciones cerradas, iniciadas en {range}",
  },
  basisOpenExcluded_one: {
    en: "1 conversation still open is not counted",
    pt: "1 conversa ainda em aberto não entra na conta",
    es: "1 conversación aún abierta no entra en la cuenta",
  },
  basisOpenExcluded_other: {
    en: "{count} conversations still open are not counted",
    pt: "{count} conversas ainda em aberto não entram na conta",
    es: "{count} conversaciones aún abiertas no entran en la cuenta",
  },
  basisFirstAi: {
    en: "Conversations started {range} with an AI reply within 48 h",
    pt: "Conversas iniciadas em {range} com resposta da IA em até 48 h",
    es: "Conversaciones iniciadas en {range} con respuesta de la IA en hasta 48 h",
  },
  basisFirstHuman: {
    en: "Conversations started {range} with a team reply within 48 h",
    pt: "Conversas iniciadas em {range} com resposta da equipe em até 48 h",
    es: "Conversaciones iniciadas en {range} con respuesta del equipo en hasta 48 h",
  },

  // --- definitions (from the backend contract) ---
  defConversations: {
    en: "Conversations that started in the period, on any channel. Internal and deleted conversations are not counted.",
    pt: "Conversas que começaram no período, em qualquer canal. Conversas internas e apagadas não entram.",
    es: "Conversaciones que empezaron en el período, en cualquier canal. No cuentan las internas ni las borradas.",
  },
  defAiReplies: {
    en: "Messages sent by an AI agent and not failed. Replies from Automations, rules and templates are counted separately.",
    pt: "Mensagens enviadas por um agente de IA, sem falha. Respostas de Automações, regras e modelos são contadas à parte.",
    es: "Mensajes enviados por un agente de IA, sin fallo. Las respuestas de Automatizaciones, reglas y plantillas se cuentan aparte.",
  },
  defAiResolutionRate: {
    en: "Estimate. The product does not record whether a problem was solved. A conversation counts here when only the AI replied, the AI sent the last message and the customer then stayed quiet for 24 hours. It does not mean the customer was satisfied: treat it as an upper bound. Conversations still open are left out of the base.",
    pt: "Estimativa. O produto não registra se o problema foi resolvido. Uma conversa conta aqui quando só a IA respondeu, a IA mandou a última mensagem e o cliente ficou 24 horas em silêncio. Não significa que o cliente ficou satisfeito: trate como um teto. Conversas ainda em aberto ficam fora da base.",
    es: "Estimación. El producto no registra si el problema se resolvió. Una conversación cuenta aquí cuando solo la IA respondió, la IA envió el último mensaje y el cliente guardó silencio 24 horas. No significa que el cliente quedara satisfecho: tómalo como un tope. Las conversaciones aún abiertas quedan fuera de la base.",
  },
  defHandoffRate: {
    en: "Share of the conversations that started in the period and were handed to your team at any point, including after the period ended.",
    pt: "Parte das conversas que começaram no período e foram transferidas para a equipe em algum momento, inclusive depois do fim do período.",
    es: "Parte de las conversaciones que empezaron en el período y se transfirieron al equipo en algún momento, incluso después de terminar el período.",
  },
  defFirstResponseAi: {
    en: "Estimate. Time between the customer's first message and the AI's first reply. The median is estimated from time ranges, so it is rounded. Replies after 48 hours are not counted. Wall-clock time, not business hours.",
    pt: "Estimativa. Tempo entre a primeira mensagem do cliente e a primeira resposta da IA. A mediana é estimada por faixas de tempo, por isso é arredondada. Respostas após 48 horas não entram. Tempo corrido, não horário comercial.",
    es: "Estimación. Tiempo entre el primer mensaje del cliente y la primera respuesta de la IA. La mediana se estima por rangos de tiempo, por eso es redondeada. No cuentan las respuestas tras 48 horas. Tiempo corrido, no horario laboral.",
  },
  defFirstResponseHuman: {
    en: "Estimate. The same measure for the first reply from your team, estimated from time ranges. Wall-clock time, not business hours.",
    pt: "Estimativa. A mesma medida para a primeira resposta da sua equipe, estimada por faixas de tempo. Tempo corrido, não horário comercial.",
    es: "Estimación. La misma medida para la primera respuesta de tu equipo, estimada por rangos de tiempo. Tiempo corrido, no horario laboral.",
  },
  defLeadsCreated: {
    en: "Estimate. Conversations linked to a lead (CRM card) created between 5 minutes before and 48 hours after the conversation started. Automations, rules and people create leads too, so this does not mean the AI created the lead or made a sale.",
    pt: "Estimativa. Conversas ligadas a um lead (card do CRM) criado entre 5 minutos antes e 48 horas depois do início da conversa. Automações, regras e pessoas também criam leads, então isso não significa que a IA criou o lead nem que houve venda.",
    es: "Estimación. Conversaciones vinculadas a un lead (tarjeta del CRM) creado entre 5 minutos antes y 48 horas después del inicio de la conversación. Las Automatizaciones, reglas y personas también crean leads, así que no significa que la IA creara el lead ni que hubiera una venta.",
  },
  defHumanReplies: {
    en: "Messages typed by your team in the inbox and not failed.",
    pt: "Mensagens escritas pela sua equipe na caixa de conversas, sem falha.",
    es: "Mensajes escritos por tu equipo en la bandeja, sin fallo.",
  },
  defAutomationReplies: {
    en: "Replies sent by Automations, rules and templates, not by an AI agent. The product does not record which of the three sent each one.",
    pt: "Respostas enviadas por Automações, regras e modelos, não por um agente de IA. O produto não registra qual dos três enviou cada uma.",
    es: "Respuestas enviadas por Automatizaciones, reglas y plantillas, no por un agente de IA. El producto no registra cuál de los tres envió cada una.",
  },
  defMessagesPerConversation: {
    en: "Messages divided by conversation-days with any message. A conversation active on 3 days counts 3 times.",
    pt: "Mensagens divididas pelos dias de conversa com alguma mensagem. Uma conversa ativa em 3 dias conta 3 vezes.",
    es: "Mensajes divididos por los días de conversación con algún mensaje. Una conversación activa en 3 días cuenta 3 veces.",
  },
  defAfterHours: {
    en: "Customer messages received outside the business hours you configured, as a share of all customer messages (15-minute precision).",
    pt: "Mensagens de clientes recebidas fora do horário comercial configurado, como parte de todas as mensagens de clientes (precisão de 15 minutos).",
    es: "Mensajes de clientes recibidos fuera del horario laboral configurado, como parte de todos los mensajes de clientes (precisión de 15 minutos).",
  },

  // --- deltas ---
  deltaVsPrevious: { en: "compared with {range}", pt: "em relação a {range}", es: "respecto a {range}" },
  deltaMore: { en: "{pct}% more", pt: "{pct}% a mais", es: "{pct}% más" },
  deltaLess: { en: "{pct}% less", pt: "{pct}% a menos", es: "{pct}% menos" },
  deltaPointsUp: { en: "{points} pts higher", pt: "{points} p.p. acima", es: "{points} p. p. más" },
  deltaPointsDown: { en: "{points} pts lower", pt: "{points} p.p. abaixo", es: "{points} p. p. menos" },
  deltaFlat: { en: "No change", pt: "Sem mudança", es: "Sin cambios" },
  deltaFromZero: { en: "Was 0 in {range}", pt: "Era 0 em {range}", es: "Era 0 en {range}" },
  deltaNoPrevious: { en: "No data for {range} to compare with", pt: "Sem dados de {range} para comparar", es: "Sin datos de {range} para comparar" },
  noData: { en: "No data", pt: "Sem dados", es: "Sin datos" },
  noDataHint: {
    en: "There is nothing to measure for this in the period.",
    pt: "Não há o que medir para isso no período.",
    es: "No hay nada que medir para esto en el período.",
  },

  // --- daily chart ---
  trendTitle: { en: "Activity per day", pt: "Atividade por dia", es: "Actividad por día" },
  trendSubtitle: {
    en: "New conversations, AI replies and team replies per UTC day.",
    pt: "Novas conversas, respostas da IA e da equipe por dia (UTC).",
    es: "Nuevas conversaciones, respuestas de la IA y del equipo por día (UTC).",
  },
  trendAria: {
    en: "Daily activity chart. Use the left and right arrow keys to inspect a day, Home and End for the first and last day, Escape to leave. The table view has the same numbers.",
    pt: "Gráfico da atividade diária. Use as setas esquerda e direita para ver um dia, Home e End para o primeiro e o último dia, Esc para sair. A visão em tabela tem os mesmos números.",
    es: "Gráfico de la actividad diaria. Usa las flechas izquierda y derecha para ver un día, Inicio y Fin para el primero y el último, Esc para salir. La vista de tabla tiene los mismos números.",
  },
  trendTableNote: {
    en: "Handoffs are counted on the day they happened. Conversations with a lead are counted on the day the conversation started.",
    pt: "Transferências contam no dia em que aconteceram. Conversas com lead contam no dia em que a conversa começou.",
    es: "Las transferencias cuentan el día en que ocurrieron. Las conversaciones con lead cuentan el día en que empezó la conversación.",
  },
  seriesConversations: { en: "New conversations", pt: "Novas conversas", es: "Nuevas conversaciones" },
  seriesAiReplies: { en: "AI replies", pt: "Respostas da IA", es: "Respuestas de la IA" },
  seriesHumanReplies: { en: "Team replies", pt: "Respostas da equipe", es: "Respuestas del equipo" },
  seriesHandoffs: { en: "Handoffs that day", pt: "Transferências no dia", es: "Transferencias del día" },
  seriesLeads: { en: "Conversations with a lead", pt: "Conversas com lead", es: "Conversaciones con lead" },
  seriesCustomerMessages: { en: "Customer messages", pt: "Mensagens de clientes", es: "Mensajes de clientes" },
  viewAria: { en: "Chart or table", pt: "Gráfico ou tabela", es: "Gráfico o tabla" },
  viewChart: { en: "Chart", pt: "Gráfico", es: "Gráfico" },
  viewTable: { en: "Table", pt: "Tabela", es: "Tabla" },
  tableDay: { en: "Day", pt: "Dia", es: "Día" },

  // --- outcomes ---
  outcomesTitle: { en: "How conversations ended", pt: "Como terminaram as conversas", es: "Cómo terminaron las conversaciones" },
  outcomesSubtitle_one: {
    en: "The {count} conversation started {range}, as of the last update.",
    pt: "A {count} conversa iniciada em {range}, na última atualização.",
    es: "La {count} conversación iniciada en {range}, en la última actualización.",
  },
  outcomesSubtitle_other: {
    en: "The {count} conversations started {range}, as of the last update.",
    pt: "As {count} conversas iniciadas em {range}, na última atualização.",
    es: "Las {count} conversaciones iniciadas en {range}, en la última actualización.",
  },
  outcomeResolvedByAi: { en: "Possibly resolved by AI", pt: "Possivelmente resolvidas pela IA", es: "Posiblemente resueltas por la IA" },
  outcomeHandedOff: { en: "Handed to your team", pt: "Transferidas para a equipe", es: "Transferidas al equipo" },
  outcomeHumanHandled: { en: "Human handling, no handoff", pt: "Atendimento humano sem transferência", es: "Atención humana sin transferencia" },
  outcomeAbandoned: { en: "No outcome", pt: "Sem desfecho", es: "Sin desenlace" },
  outcomeOpen: { en: "Still open", pt: "Ainda em aberto", es: "Aún abiertas" },
  outcomeDefResolvedByAi: {
    en: "Estimate: only the AI replied, it sent the last message and the customer stayed quiet for 24 hours.",
    pt: "Estimativa: só a IA respondeu, ela mandou a última mensagem e o cliente ficou 24 horas em silêncio.",
    es: "Estimación: solo la IA respondió, envió el último mensaje y el cliente guardó silencio 24 horas.",
  },
  outcomeDefHandedOff: { en: "Handed to your team at some point.", pt: "Foram transferidas para a equipe em algum momento.", es: "Se transfirieron al equipo en algún momento." },
  outcomeDefHumanHandled: {
    en: "Someone on your team replied without a formal handoff.",
    pt: "Alguém da equipe respondeu sem uma transferência formal.",
    es: "Alguien del equipo respondió sin una transferencia formal.",
  },
  outcomeDefAbandoned: {
    en: "Neither the AI nor your team replied, or the customer sent the last message.",
    pt: "Nem a IA nem a equipe responderam, ou o cliente mandou a última mensagem.",
    es: "Ni la IA ni el equipo respondieron, o el cliente envió el último mensaje.",
  },
  outcomeDefOpen: { en: "Last message less than 24 hours ago.", pt: "Última mensagem há menos de 24 horas.", es: "Último mensaje hace menos de 24 horas." },
  outcomesEmpty: { en: "No conversations started in this period.", pt: "Nenhuma conversa começou neste período.", es: "Ninguna conversación empezó en este período." },
  outcomesAria: { en: "Share of conversations by outcome. The list below has the numbers.", pt: "Parte das conversas por desfecho. A lista abaixo tem os números.", es: "Parte de las conversaciones por desenlace. La lista de abajo tiene los números." },

  // --- tables ---
  agentsTitle: { en: "By AI agent", pt: "Por agente de IA", es: "Por agente de IA" },
  agentsHint: {
    en: "Each conversation is credited to the AI agent that sent its first AI reply. “No AI agent” groups your team, Automations, rules and unanswered conversations.",
    pt: "Cada conversa é creditada ao agente de IA que enviou a primeira resposta da IA. “Sem agente de IA” reúne a equipe, Automações, regras e conversas sem resposta.",
    es: "Cada conversación se acredita al agente de IA que envió su primera respuesta de IA. “Sin agente de IA” agrupa al equipo, Automatizaciones, reglas y conversaciones sin respuesta.",
  },
  agentsEmpty: { en: "No activity by AI agent in this period.", pt: "Sem atividade por agente de IA neste período.", es: "Sin actividad por agente de IA en este período." },
  colAgent: { en: "AI agent", pt: "Agente de IA", es: "Agente de IA" },
  colConversations: { en: "New conversations", pt: "Novas conversas", es: "Nuevas conversaciones" },
  colAiReplies: { en: "AI replies", pt: "Respostas da IA", es: "Respuestas de la IA" },
  colHandoff: { en: "Handed to team", pt: "Transferidas", es: "Transferidas" },
  colResolution: { en: "Possibly resolved by AI", pt: "Possivelmente resolvidas pela IA", es: "Posiblemente resueltas por la IA" },
  colFirstResponse: { en: "AI 1st reply (median)", pt: "1ª resposta da IA (mediana)", es: "1ª respuesta de la IA (mediana)" },
  colLeads: { en: "With a lead", pt: "Com lead", es: "Con lead" },
  tablesFootnote: {
    en: "“Possibly resolved by AI” and the AI first reply are estimates (see the definitions above). Rates are shares of the new conversations of each AI agent or channel; “No data” means there was nothing to measure.",
    pt: "“Possivelmente resolvidas pela IA” e a 1ª resposta da IA são estimativas (veja as definições acima). As taxas são partes das novas conversas de cada agente de IA ou canal; “Sem dados” significa que não havia o que medir.",
    es: "“Posiblemente resueltas por la IA” y la 1ª respuesta de la IA son estimaciones (ver las definiciones arriba). Las tasas son partes de las nuevas conversaciones de cada agente de IA o canal; “Sin datos” significa que no había nada que medir.",
  },
  rowShare_one: { en: "{part} of {count} conversation", pt: "{part} de {count} conversa", es: "{part} de {count} conversación" },
  rowShare_other: { en: "{part} of {count} conversations", pt: "{part} de {count} conversas", es: "{part} de {count} conversaciones" },
  channelsTitle: { en: "By channel", pt: "Por canal", es: "Por canal" },
  colChannel: { en: "Channel", pt: "Canal", es: "Canal" },
  colCustomerMessages: { en: "Customer messages", pt: "Mensagens de clientes", es: "Mensajes de clientes" },
  colTeamReplies: { en: "Team replies", pt: "Respostas da equipe", es: "Respuestas del equipo" },

  reasonsTitle: { en: "Why conversations were handed over", pt: "Por que as conversas foram transferidas", es: "Por qué se transfirieron las conversaciones" },
  reasonsHint: {
    en: "Free text written by rules and people, grouped by similar wording (top 10).",
    pt: "Texto livre escrito por regras e pessoas, agrupado por redação parecida (10 mais comuns).",
    es: "Texto libre escrito por reglas y personas, agrupado por redacción parecida (10 más comunes).",
  },
  reasonsEmpty: { en: "No handoff reasons were recorded in this period.", pt: "Nenhum motivo de transferência foi registrado neste período.", es: "No se registraron motivos de transferencia en este período." },
  reasonCount_one: { en: "1 time", pt: "1 vez", es: "1 vez" },
  reasonCount_other: { en: "{count} times", pt: "{count} vezes", es: "{count} veces" },

  // --- insights ---
  insightsTitle: { en: "What stands out", pt: "O que chama atenção", es: "Lo que destaca" },
  insightBusiestDay: {
    en: "{day} had the most new conversations: {count}.",
    pt: "{day} teve mais novas conversas: {count}.",
    es: "{day} tuvo más conversaciones nuevas: {count}.",
  },
  insightTopHandoffReason: {
    en: "The most common handoff reason is “{reason}” ({times}).",
    pt: "O motivo de transferência mais comum é “{reason}” ({times}).",
    es: "El motivo de transferencia más común es “{reason}” ({times}).",
  },
  insightResolutionUp: {
    en: "Possible AI resolution is {points} points higher than in the previous period (estimate).",
    pt: "A possível resolução pela IA está {points} pontos acima do período anterior (estimativa).",
    es: "La posible resolución por la IA está {points} puntos por encima del período anterior (estimación).",
  },
  insightResolutionDown: {
    en: "Possible AI resolution is {points} points lower than in the previous period (estimate).",
    pt: "A possível resolução pela IA está {points} pontos abaixo do período anterior (estimativa).",
    es: "La posible resolución por la IA está {points} puntos por debajo del período anterior (estimación).",
  },
  insightHandoffUp: {
    en: "Handoffs to your team rose by {points} points compared with the previous period.",
    pt: "As transferências para a equipe subiram {points} pontos em relação ao período anterior.",
    es: "Las transferencias al equipo subieron {points} puntos respecto al período anterior.",
  },
  insightHandoffDown: {
    en: "Handoffs to your team fell by {points} points compared with the previous period.",
    pt: "As transferências para a equipe caíram {points} pontos em relação ao período anterior.",
    es: "Las transferencias al equipo bajaron {points} puntos respecto al período anterior.",
  },
  insightBestAgent: {
    en: "{name} has the highest share of conversations possibly resolved by AI ({rate}, estimate).",
    pt: "{name} tem a maior parte de conversas possivelmente resolvidas pela IA ({rate}, estimativa).",
    es: "{name} tiene la mayor parte de conversaciones posiblemente resueltas por la IA ({rate}, estimación).",
  },
  insightSlowAi: {
    en: "The AI takes about {time} to send its first reply (estimate). Check the AI agent's active hours.",
    pt: "A IA leva cerca de {time} para a primeira resposta (estimativa). Confira o horário de atuação do agente de IA.",
    es: "La IA tarda unos {time} en la primera respuesta (estimación). Revisa el horario de actuación del agente de IA.",
  },

  // --- not measured / reading guide ---
  notMeasuredTitle: { en: "Not measured", pt: "Não medido", es: "No medido" },
  notMeasuredHint: {
    en: "These numbers are not collected today, so we show nothing instead of a made-up value.",
    pt: "Estes números não são coletados hoje, por isso não mostramos nada em vez de inventar um valor.",
    es: "Estos números no se recopilan hoy, por eso no mostramos nada en lugar de inventar un valor.",
  },
  notMeasuredOptOuts: { en: "Customers who asked to stop receiving messages", pt: "Clientes que pediram para parar de receber mensagens", es: "Clientes que pidieron dejar de recibir mensajes" },
  notMeasuredCsat: { en: "Customer satisfaction score", pt: "Nota de satisfação do cliente", es: "Nota de satisfacción del cliente" },
  notMeasuredConfirmed: { en: "Problems confirmed as solved", pt: "Problemas confirmados como resolvidos", es: "Problemas confirmados como resueltos" },
  notMeasuredAfterHours: {
    en: "Messages outside business hours (set your business hours to see this)",
    pt: "Mensagens fora do horário comercial (configure o horário comercial para ver)",
    es: "Mensajes fuera del horario laboral (configura tu horario laboral para verlo)",
  },
  notMeasuredSales: {
    en: "Sales or revenue generated by the AI (no sale is linked to an AI reply)",
    pt: "Vendas ou receita geradas pela IA (nenhuma venda é ligada a uma resposta da IA)",
    es: "Ventas o ingresos generados por la IA (ninguna venta se vincula a una respuesta de la IA)",
  },
  honestyTitle: { en: "How to read these numbers", pt: "Como ler estes números", es: "Cómo leer estos números" },
  honestyBody: {
    en: "Figures marked “Estimate” are approximations built from message timing, not confirmed results. Days are in UTC. Conversations are judged when the report is refreshed, so today and yesterday can still change a little. A day before reports were turned on for your workspace shows as 0.",
    pt: "Os números marcados como “Estimativa” são aproximações feitas a partir do horário das mensagens, não resultados confirmados. Os dias são em UTC. As conversas são avaliadas quando o relatório é atualizado, então hoje e ontem ainda podem mudar um pouco. Um dia anterior à ativação dos relatórios no seu espaço de trabalho aparece como 0.",
    es: "Las cifras marcadas como “Estimación” son aproximaciones hechas a partir de la hora de los mensajes, no resultados confirmados. Los días son en UTC. Las conversaciones se evalúan cuando se actualiza el informe, así que hoy y ayer aún pueden cambiar un poco. Un día anterior a la activación de los informes en tu espacio de trabajo aparece como 0.",
  },

  // --- states ---
  emptyTitle: { en: "No numbers for this period yet", pt: "Ainda não há números neste período", es: "Aún no hay números en este período" },
  emptyHint: {
    en: "Reports are rebuilt every 10 minutes from your conversations. If you just started, check back shortly or pick a longer period.",
    pt: "Os relatórios são recalculados a cada 10 minutos a partir das suas conversas. Se você acabou de começar, volte daqui a pouco ou escolha um período maior.",
    es: "Los informes se recalculan cada 10 minutos a partir de tus conversaciones. Si acabas de empezar, vuelve en un rato o elige un período más largo.",
  },
  emptyCtaLines: { en: "Open conversations", pt: "Ver conversas", es: "Ver conversaciones" },
  emptyCtaAgents: { en: "Create an AI agent", pt: "Criar um agente de IA", es: "Crear un agente de IA" },
  emptyCtaBook: { en: "Book a demo or training", pt: "Agendar demonstração ou treinamento", es: "Agendar demostración o capacitación" },
  emptyFilteredTitle: { en: "No activity for these filters", pt: "Sem atividade para estes filtros", es: "Sin actividad para estos filtros" },
  emptyFilteredHint: { en: "Try a longer period or another channel or AI agent.", pt: "Tente um período maior ou outro canal ou agente de IA.", es: "Prueba un período más largo u otro canal o agente de IA." },

  loadError: { en: "We could not load your report.", pt: "Não foi possível carregar o seu relatório.", es: "No pudimos cargar tu informe." },
  loadErrorHint: {
    en: "Check your connection and try again. Your filters are kept.",
    pt: "Confira a sua conexão e tente novamente. Os filtros continuam como estão.",
    es: "Revisa tu conexión e inténtalo de nuevo. Los filtros se mantienen.",
  },
  loadErrorStale: {
    en: "We could not update the report. The numbers below are from the previous filters.",
    pt: "Não foi possível atualizar o relatório. Os números abaixo são dos filtros anteriores.",
    es: "No pudimos actualizar el informe. Los números de abajo son de los filtros anteriores.",
  },
  invalidFiltersTitle: { en: "These filters cannot be used", pt: "Estes filtros não podem ser usados", es: "Estos filtros no se pueden usar" },
  invalidFiltersHint: {
    en: "The period must end today or earlier and be at most 366 days long.",
    pt: "O período deve terminar hoje ou antes e ter no máximo 366 dias.",
    es: "El período debe terminar hoy o antes y tener como máximo 366 días.",
  },
  retry: { en: "Try again", pt: "Tentar novamente", es: "Intentar de nuevo" },
  gateInactiveTitle: { en: "Reports are paused", pt: "Os relatórios estão pausados", es: "Los informes están en pausa" },
  gateInactiveHint: {
    en: "Your trial ended or your subscription is not active. Check your subscription to see your reports again.",
    pt: "O seu período de teste acabou ou a assinatura não está ativa. Confira a sua assinatura para voltar a ver os relatórios.",
    es: "Tu prueba terminó o tu suscripción no está activa. Revisa tu suscripción para volver a ver los informes.",
  },
  gateInactiveCta: { en: "Go to subscription", pt: "Ir para a assinatura", es: "Ir a la suscripción" },

  // --- export ---
  exportCsv: { en: "Export CSV", pt: "Exportar CSV", es: "Exportar CSV" },
  exportDaily: { en: "Daily activity", pt: "Atividade diária", es: "Actividad diaria" },
  exportAgents: { en: "By AI agent", pt: "Por agente de IA", es: "Por agente de IA" },
  exportChannels: { en: "By channel", pt: "Por canal", es: "Por canal" },
  exportOutcomes: { en: "How conversations ended", pt: "Como terminaram as conversas", es: "Cómo terminaron las conversaciones" },
  exportMenuAria: { en: "Export CSV: choose what to export", pt: "Exportar CSV: escolha o que exportar", es: "Exportar CSV: elige qué exportar" },
  csvShare: { en: "Share (%)", pt: "Parte (%)", es: "Parte (%)" },
  csvOutcome: { en: "Outcome", pt: "Desfecho", es: "Desenlace" },
  csvCount: { en: "Conversations", pt: "Conversas", es: "Conversaciones" },
  csvHandoffPct: { en: "Handed to team (%)", pt: "Transferidas (%)", es: "Transferidas (%)" },
  csvResolutionPct: { en: "Possibly resolved by AI, estimate (%)", pt: "Possivelmente resolvidas pela IA, estimativa (%)", es: "Posiblemente resueltas por la IA, estimación (%)" },
  csvFirstResponseSec: { en: "AI 1st reply, estimated median (s)", pt: "1ª resposta da IA, mediana estimada (s)", es: "1ª respuesta de la IA, mediana estimada (s)" },
  ...serviceErrorEntries,
} satisfies Record<string, Entry>

export type AttendeReportsKey = keyof typeof entries
export type AttendeReportsLanguage = "english" | "portuguese" | "spanish"

const LANGUAGE_FIELD = { english: "en", portuguese: "pt", spanish: "es" } as const

/** Keys that come in `_one` / `_other` pairs, by their stem (`reasonCount` for `reasonCount_one`). */
export type AttendeReportsPluralKey = { [K in AttendeReportsKey]: K extends `${infer Stem}_one` ? (`${Stem}_other` extends AttendeReportsKey ? Stem : never) : never }[AttendeReportsKey]

export function translateAttendeReports(
  language: AttendeReportsLanguage,
  key: AttendeReportsKey,
  replacements?: Record<string, string | number>
): string {
  const entry: Entry | undefined = entries[key]
  if (!entry) return String(key)
  let text = entry[LANGUAGE_FIELD[language]] || entry.en
  if (replacements) {
    for (const [name, value] of Object.entries(replacements)) {
      text = text.split(`{${name}}`).join(String(value))
    }
  }
  return text
}

export const attendeReportsKeys = Object.keys(entries) as AttendeReportsKey[]
export const attendeReportsEntries: Record<AttendeReportsKey, Entry> = entries
