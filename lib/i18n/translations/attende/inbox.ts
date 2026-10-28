/** Strings of the Attende-ai inbox. Typed, en/pt/es, with `{name}`-style replacements. */
type Entry = { en: string; pt: string; es: string }

const entries = {
  pageTitle: { en: "Inbox", pt: "Conversas", es: "Conversaciones" },
  searchPlaceholder: { en: "Name, number or @user", pt: "Nome, número ou @usuário", es: "Nombre, número o @usuario" },
  searchAria: {
    en: "Search conversations by name, number, @user or last message",
    pt: "Buscar conversas por nome, número, @usuário ou última mensagem",
    es: "Buscar conversaciones por nombre, número, @usuario o último mensaje",
  },

  filterAll: { en: "All", pt: "Todas", es: "Todas" },
  filterUnread: { en: "Unread", pt: "Não lidas", es: "No leídas" },
  filterAi: { en: "Open for the AI", pt: "Abertas para a IA", es: "Abiertas para la IA" },
  filterAiHelp: {
    en: "Ongoing conversations not in human handling. The AI only answers them if an agent is active on the channel.",
    pt: "Conversas em andamento fora do atendimento humano. A IA só responde se houver um agente ativo no canal.",
    es: "Conversaciones en curso fuera de la atención humana. La IA solo responde si hay un agente activo en el canal.",
  },
  filterHuman: { en: "Human handling", pt: "Atendimento humano", es: "Atención humana" },
  filterHumanHelp: {
    en: "Someone on the team took them over: the AI does not answer.",
    pt: "Alguém da equipe assumiu: a IA não responde.",
    es: "Alguien del equipo las asumió: la IA no responde.",
  },
  filterWaitingTeam: { en: "Waiting for team", pt: "Aguardando equipe", es: "Esperando al equipo" },
  filterWaitingTeamHelp: {
    en: "The customer's last message has no reply yet, from the team or the AI.",
    pt: "A última mensagem é do cliente e ainda não teve resposta, nem da equipe nem da IA.",
    es: "El último mensaje es del cliente y aún no tiene respuesta, ni del equipo ni de la IA.",
  },
  filterUnreadHelp: {
    en: "The customer wrote, nobody replied and nobody on the team opened the conversation since. Read status is shared by the team.",
    pt: "O cliente escreveu, ninguém respondeu e ninguém da equipe abriu a conversa desde então. A leitura é compartilhada pela equipe.",
    es: "El cliente escribió, nadie respondió y nadie del equipo abrió la conversación desde entonces. La lectura es compartida por el equipo.",
  },
  tabCountAria: {
    en: "{label}: {conversations} across all your channels",
    pt: "{label}: {conversations} em todos os seus canais",
    es: "{label}: {conversations} en todos tus canales",
  },
  countsScopeHint: {
    en: "Counts include every conversation you can access, without the channel and search filters.",
    pt: "Os números contam todas as conversas a que você tem acesso, sem os filtros de canal e busca.",
    es: "Los números cuentan todas las conversaciones a las que tienes acceso, sin los filtros de canal y búsqueda.",
  },
  conversationsOne: { en: "{count} conversation", pt: "{count} conversa", es: "{count} conversación" },
  conversationsOther: { en: "{count} conversations", pt: "{count} conversas", es: "{count} conversaciones" },
  listCountAllOne: { en: "{count} conversation", pt: "{count} conversa", es: "{count} conversación" },
  listCountAllOther: { en: "{count} conversations", pt: "{count} conversas", es: "{count} conversaciones" },
  listCountFilteredOne: { en: "{count} conversation matches", pt: "{count} conversa encontrada", es: "{count} conversación encontrada" },
  listCountFilteredOther: { en: "{count} conversations match", pt: "{count} conversas encontradas", es: "{count} conversaciones encontradas" },
  listCountLoadedOne: { en: "{count} conversation loaded, more below", pt: "{count} conversa carregada, há mais", es: "{count} conversación cargada, hay más" },
  listCountLoadedOther: { en: "{count} conversations loaded, more below", pt: "{count} conversas carregadas, há mais", es: "{count} conversaciones cargadas, hay más" },
  moreFilters: { en: "Filters", pt: "Filtros", es: "Filtros" },
  moreFiltersActive: { en: "Filters ({count} on)", pt: "Filtros ({count} ativos)", es: "Filtros ({count} activos)" },
  filterHandlingTitle: { en: "Handling", pt: "Atendimento", es: "Atención" },
  filtersAria: { en: "Filter conversations", pt: "Filtrar conversas", es: "Filtrar conversaciones" },
  channelWhatsapp: { en: "WhatsApp", pt: "WhatsApp", es: "WhatsApp" },
  channelInstagram: { en: "Instagram", pt: "Instagram", es: "Instagram" },
  channelSms: { en: "SMS", pt: "SMS", es: "SMS" },
  channelAria: { en: "Channel", pt: "Canal", es: "Canal" },

  listEmptyTitle: { en: "No conversations yet", pt: "Ainda não há conversas", es: "Aún no hay conversaciones" },
  listEmptyHint: {
    en: "When a customer writes to one of your channels, the conversation shows up here.",
    pt: "Quando um cliente escrever para um dos seus canais, a conversa aparece aqui.",
    es: "Cuando un cliente escriba a uno de tus canales, la conversación aparece aquí.",
  },
  listNoMatchTitle: { en: "Nothing matches these filters", pt: "Nada corresponde a estes filtros", es: "Nada coincide con estos filtros" },
  listNoMatchHint: { en: "Try another filter or clear the search.", pt: "Tente outro filtro ou limpe a busca.", es: "Prueba otro filtro o borra la búsqueda." },
  clearFilters: { en: "Clear filters", pt: "Limpar filtros", es: "Borrar filtros" },
  listError: { en: "We could not load your conversations.", pt: "Não foi possível carregar as suas conversas.", es: "No pudimos cargar tus conversaciones." },
  retry: { en: "Try again", pt: "Tentar novamente", es: "Intentar de nuevo" },
  loadMore: { en: "Load more", pt: "Carregar mais", es: "Cargar más" },
  loadingMore: { en: "Loading…", pt: "Carregando…", es: "Cargando…" },
  liveConnected: { en: "Live", pt: "Ao vivo", es: "En vivo" },
  liveReconnecting: { en: "Reconnecting…", pt: "Reconectando…", es: "Reconectando…" },
  unreadBadge: { en: "{count} unread", pt: "{count} não lidas", es: "{count} sin leer" },

  untitledContact: { en: "Unknown contact", pt: "Contato sem nome", es: "Contacto sin nombre" },
  noMessagesYet: { en: "No messages yet", pt: "Ainda sem mensagens", es: "Aún sin mensajes" },
  lastMessageSent: { en: "Last message sent by your side", pt: "Última mensagem enviada por vocês", es: "Último mensaje enviado por ustedes" },
  rowAi: { en: "AI", pt: "IA", es: "IA" },
  rowHuman: { en: "Human", pt: "Humano", es: "Humano" },

  selectConversationTitle: { en: "Choose a conversation", pt: "Escolha uma conversa", es: "Elige una conversación" },
  selectConversationHint: {
    en: "Pick one from the list to read it and reply in real time.",
    pt: "Selecione uma na lista para ler e responder em tempo real.",
    es: "Selecciona una de la lista para leerla y responder en tiempo real.",
  },
  backToList: { en: "Back to conversations", pt: "Voltar às conversas", es: "Volver a las conversaciones" },
  threadError: { en: "We could not load this conversation.", pt: "Não foi possível carregar esta conversa.", es: "No pudimos cargar esta conversación." },
  threadEmpty: { en: "No messages in this conversation yet.", pt: "Ainda não há mensagens nesta conversa.", es: "Aún no hay mensajes en esta conversación." },
  loadOlder: { en: "Show earlier messages", pt: "Ver mensagens anteriores", es: "Ver mensajes anteriores" },
  newMessagesLive: { en: "New message from {name}", pt: "Nova mensagem de {name}", es: "Nuevo mensaje de {name}" },
  messagesRegion: { en: "Messages", pt: "Mensagens", es: "Mensajes" },
  jumpToLatest: { en: "Latest messages", pt: "Mensagens mais recentes", es: "Mensajes más recientes" },

  authorContact: { en: "Customer", pt: "Cliente", es: "Cliente" },
  authorAi: { en: "AI", pt: "IA", es: "IA" },
  authorAiNamed: { en: "{name} (AI)", pt: "{name} (IA)", es: "{name} (IA)" },
  authorHuman: { en: "Team", pt: "Equipe", es: "Equipo" },
  authorAutomation: { en: "Automatic reply", pt: "Resposta automática", es: "Respuesta automática" },
  srAuthor: { en: "{author}:", pt: "{author}:", es: "{author}:" },
  attachment: { en: "Attachment", pt: "Anexo", es: "Adjunto" },
  deletedMessage: { en: "This message was deleted", pt: "Esta mensagem foi apagada", es: "Este mensaje fue eliminado" },

  statusSending: { en: "Sending…", pt: "Enviando…", es: "Enviando…" },
  statusSent: { en: "Sent", pt: "Enviada", es: "Enviado" },
  statusDelivered: { en: "Delivered", pt: "Entregue", es: "Entregado" },
  statusRead: { en: "Read", pt: "Lida", es: "Leído" },
  statusFailed: { en: "Not delivered", pt: "Não entregue", es: "No entregado" },
  statusNotSent: { en: "Not sent", pt: "Não enviada", es: "No enviado" },
  statusFailedHelp: {
    en: "The channel did not deliver this message to the customer.",
    pt: "O canal não entregou esta mensagem ao cliente.",
    es: "El canal no entregó este mensaje al cliente.",
  },

  handlingRegion: { en: "Who answers this conversation", pt: "Quem atende esta conversa", es: "Quién atiende esta conversación" },
  handlingAiChip: { en: "AI active", pt: "IA ativa", es: "IA activa" },
  handlingHumanChip: { en: "Human handling", pt: "Atendimento humano", es: "Atención humana" },
  handlingNoneChip: { en: "No AI", pt: "Sem IA", es: "Sin IA" },
  handlingAiDesc: { en: "{name} answers in this conversation.", pt: "{name} responde nesta conversa.", es: "{name} responde en esta conversación." },
  handlingAiDescUnnamed: { en: "An AI agent answers in this conversation.", pt: "Um agente de IA responde nesta conversa.", es: "Un agente de IA responde en esta conversación." },
  handlingHumanDesc: {
    en: "The AI does not answer here until someone returns the conversation to it.",
    pt: "A IA não responde aqui até alguém devolver a conversa para ela.",
    es: "La IA no responde aquí hasta que alguien le devuelva la conversación.",
  },
  handlingNoneDesc: { en: "No AI agent answers in this conversation.", pt: "Nenhum agente de IA responde nesta conversa.", es: "Ningún agente de IA responde en esta conversación." },
  handlingBlockedDesc: { en: "This conversation is blocked: the AI does not answer.", pt: "Esta conversa está bloqueada: a IA não responde.", es: "Esta conversación está bloqueada: la IA no responde." },
  takeOver: { en: "Take over", pt: "Assumir conversa", es: "Asumir conversación" },
  returnToAi: { en: "Return to AI", pt: "Devolver para a IA", es: "Devolver a la IA" },
  takingOver: { en: "Taking over…", pt: "Assumindo…", es: "Asumiendo…" },
  returningToAi: { en: "Returning…", pt: "Devolvendo…", es: "Devolviendo…" },
  takeOverHint: {
    en: "The AI stops answering in this conversation only. The agent stays active in the others.",
    pt: "A IA para de responder só nesta conversa. O agente continua ativo nas outras.",
    es: "La IA deja de responder solo en esta conversación. El agente sigue activo en las demás.",
  },
  returnHint: {
    en: "The channel's AI agent answers again from the customer's next message.",
    pt: "O agente de IA do canal volta a responder a partir da próxima mensagem do cliente.",
    es: "El agente de IA del canal vuelve a responder desde el próximo mensaje del cliente.",
  },
  handlingScopeLink: { en: "AI agents", pt: "Agentes de IA", es: "Agentes de IA" },
  handlingScopeHint: {
    en: "This applies to this conversation only. To turn an agent on or off for every conversation, open AI agents.",
    pt: "Isto vale só para esta conversa. Para ligar ou desligar um agente em todas as conversas, abra Agentes de IA.",
    es: "Esto vale solo para esta conversación. Para activar o desactivar un agente en todas las conversaciones, abre Agentes de IA.",
  },
  takeOverDone: {
    en: "You took over. The AI no longer answers in this conversation.",
    pt: "Você assumiu. A IA não responde mais nesta conversa.",
    es: "Asumiste la conversación. La IA ya no responde en ella.",
  },
  returnDone: { en: "The AI is answering this conversation again.", pt: "A IA voltou a atender esta conversa.", es: "La IA volvió a atender esta conversación." },
  returnDoneNoAgent: {
    en: "The conversation left human handling, but no AI agent covers this channel.",
    pt: "A conversa saiu do atendimento humano, mas nenhum agente de IA atende este canal.",
    es: "La conversación salió de la atención humana, pero ningún agente de IA atiende este canal.",
  },
  takeOverError: { en: "We could not take over. Try again.", pt: "Não foi possível assumir. Tente novamente.", es: "No pudimos asumir. Inténtalo de nuevo." },
  returnError: { en: "We could not return it to the AI. Try again.", pt: "Não foi possível devolver para a IA. Tente novamente.", es: "No pudimos devolverla a la IA. Inténtalo de nuevo." },
  handlingNotAllowed: {
    en: "This conversation's phase ({phase}) does not allow this change.",
    pt: "A fase atual desta conversa ({phase}) não permite essa mudança.",
    es: "La fase actual de esta conversación ({phase}) no permite este cambio.",
  },
  handlingForbidden: {
    en: "You do not have access to change who answers this conversation.",
    pt: "Você não tem acesso para mudar quem atende esta conversa.",
    es: "No tienes acceso para cambiar quién atiende esta conversación.",
  },
  composerTakeOverPlaceholder: {
    en: "AI active. Sending takes the conversation over…",
    pt: "IA ativa. Ao enviar, você assume a conversa…",
    es: "IA activa. Al enviar, asumes la conversación…",
  },
  windowClosedShort: { en: "Window closed", pt: "Janela fechada", es: "Ventana cerrada" },
  windowLeftShort: { en: "{hours} h", pt: "{hours} h", es: "{hours} h" },
  windowLeftMinutesShort: { en: "{minutes} min", pt: "{minutes} min", es: "{minutes} min" },
  composerPlaceholder: { en: "Write a message", pt: "Escreva uma mensagem", es: "Escribe un mensaje" },
  composerAria: { en: "Message", pt: "Mensagem", es: "Mensaje" },
  send: { en: "Send", pt: "Enviar", es: "Enviar" },
  retrySend: { en: "Try again", pt: "Tentar novamente", es: "Intentar de nuevo" },
  discardFailed: { en: "Discard", pt: "Descartar", es: "Descartar" },
  sendFailed: { en: "Message not sent", pt: "Mensagem não enviada", es: "Mensaje no enviado" },
  sendFailedQuota: {
    en: "Not sent: your plan reached its limit of sent messages",
    pt: "Não enviada: seu plano atingiu o limite de mensagens enviadas",
    es: "No enviado: tu plan alcanzó el límite de mensajes enviados",
  },
  sendFailedPlanInactive: {
    en: "Not sent: your plan is not active",
    pt: "Não enviada: seu plano não está ativo",
    es: "No enviado: tu plan no está activo",
  },
  composerHint: { en: "Enter to send, Shift+Enter for a new line", pt: "Enter envia, Shift+Enter quebra a linha", es: "Enter envía, Shift+Enter nueva línea" },
  windowOpenHours: { en: "Reply window: {hours} h left", pt: "Janela de resposta: faltam {hours} h", es: "Ventana de respuesta: quedan {hours} h" },
  windowOpenMinutes: { en: "Reply window closes in {minutes} min", pt: "A janela de resposta fecha em {minutes} min", es: "La ventana de respuesta cierra en {minutes} min" },
  windowHelp: {
    en: "On official WhatsApp lines you can reply freely for 24 hours after the customer's last message.",
    pt: "Em linhas oficiais do WhatsApp, você responde livremente por 24 horas depois da última mensagem do cliente.",
    es: "En líneas oficiales de WhatsApp respondes libremente durante 24 horas tras el último mensaje del cliente.",
  },
  windowClosedTitle: { en: "The 24-hour window is closed", pt: "A janela de 24 horas fechou", es: "La ventana de 24 horas está cerrada" },
  windowClosedBody: {
    en: "Until the customer writes again, WhatsApp only accepts approved templates.",
    pt: "Até o cliente escrever de novo, o WhatsApp só aceita modelos aprovados.",
    es: "Hasta que el cliente vuelva a escribir, WhatsApp solo acepta plantillas aprobadas.",
  },
  windowChooseTemplate: { en: "Send a template", pt: "Enviar modelo", es: "Enviar plantilla" },
  windowTemplateLabel: { en: "Template", pt: "Modelo", es: "Plantilla" },
  windowTemplatePlaceholder: { en: "Choose an approved template", pt: "Escolha um modelo aprovado", es: "Elige una plantilla aprobada" },
  windowTemplatesLoading: { en: "Loading templates…", pt: "Carregando modelos…", es: "Cargando plantillas…" },
  windowTemplatesNone: {
    en: "This line has no approved templates yet. Create one in JSYNQ under WhatsApp templates.",
    pt: "Esta linha ainda não tem modelos aprovados. Crie um no JSYNQ, em Modelos do WhatsApp.",
    es: "Esta línea aún no tiene plantillas aprobadas. Crea una en JSYNQ, en Plantillas de WhatsApp.",
  },
  windowTemplatesError: { en: "We could not load the templates.", pt: "Não foi possível carregar os modelos.", es: "No pudimos cargar las plantillas." },
  windowTemplateVar: { en: "Value for {{{n}}}", pt: "Valor de {{{n}}}", es: "Valor de {{{n}}}" },
  windowTemplateHeaderUrl: { en: "Link to the image, video or file", pt: "Link da imagem, vídeo ou arquivo", es: "Enlace de la imagen, video o archivo" },
  windowTemplatePreview: { en: "Preview", pt: "Prévia", es: "Vista previa" },
  windowTemplateFillAll: { en: "Fill in every value before sending.", pt: "Preencha todos os valores antes de enviar.", es: "Completa todos los valores antes de enviar." },
  windowTemplateSent: { en: "Template sent", pt: "Modelo enviado", es: "Plantilla enviada" },
  windowTemplateSendError: { en: "We could not send the template.", pt: "Não foi possível enviar o modelo.", es: "No pudimos enviar la plantilla." },
  cancel: { en: "Cancel", pt: "Cancelar", es: "Cancelar" },
  groupReadOnly: {
    en: "Group conversations are read-only here.",
    pt: "Conversas de grupo são somente leitura aqui.",
    es: "Las conversaciones de grupo son de solo lectura aquí.",
  },

  presenceViewing: { en: "{name} is viewing", pt: "{name} está vendo", es: "{name} está viendo" },
  presenceTyping: { en: "{name} is typing…", pt: "{name} está digitando…", es: "{name} está escribiendo…" },

  panelTitle: { en: "Contact", pt: "Contato", es: "Contacto" },
  panelToggleShow: { en: "Show contact details", pt: "Mostrar dados do contato", es: "Mostrar datos del contacto" },
  panelToggleHide: { en: "Hide contact details", pt: "Ocultar dados do contato", es: "Ocultar datos del contacto" },
  panelOpen: { en: "Contact details", pt: "Dados do contato", es: "Datos del contacto" },
  panelClose: { en: "Close contact details", pt: "Fechar dados do contato", es: "Cerrar datos del contacto" },
  panelChannel: { en: "Channel", pt: "Canal", es: "Canal" },
  panelChannelValue: { en: "{channel} · {line}", pt: "{channel} · {line}", es: "{channel} · {line}" },
  panelNoContact: { en: "No phone or e-mail", pt: "Sem telefone ou e-mail", es: "Sin teléfono ni e-mail" },
  panelStageUnknown: { en: "Stage unavailable right now", pt: "Etapa indisponível no momento", es: "Etapa no disponible ahora" },
  panelStage: { en: "Funnel stage", pt: "Etapa do funil", es: "Etapa del embudo" },
  panelStageNone: { en: "Not in the funnel yet", pt: "Ainda fora do funil", es: "Aún fuera del embudo" },
  panelStatus: { en: "Conversation phase", pt: "Fase da conversa", es: "Fase de la conversación" },
  panelAssigned: { en: "Owner", pt: "Responsável", es: "Responsable" },
  panelUnassigned: { en: "No owner", pt: "Sem responsável", es: "Sin responsable" },
  panelLabels: { en: "Labels", pt: "Etiquetas", es: "Etiquetas" },
  panelNoLabels: { en: "No labels", pt: "Sem etiquetas", es: "Sin etiquetas" },
  panelDeal: { en: "Deal title", pt: "Título da negociação", es: "Título de la negociación" },
  panelOpenFunnel: { en: "Open in funnel", pt: "Abrir no funil", es: "Abrir en el embudo" },
  panelOpenFunnelHint: {
    en: "Opens the deal in the funnel. Going back brings you to this conversation.",
    pt: "Abre a negociação no funil. Ao voltar, você retorna a esta conversa.",
    es: "Abre la negociación en el embudo. Al volver, regresas a esta conversación.",
  },

  stateNewLead: { en: "New lead", pt: "Novo lead", es: "Nuevo lead" },
  stateQualifying: { en: "Qualifying", pt: "Qualificando", es: "Calificando" },
  stateWaitingResponse: { en: "Waiting for the customer", pt: "Aguardando o cliente", es: "Esperando al cliente" },
  stateNegotiating: { en: "Negotiating", pt: "Negociando", es: "Negociando" },
  stateHumanHandoff: { en: "Human handling", pt: "Atendimento humano", es: "Atención humana" },
  stateFollowup: { en: "Follow-up", pt: "Follow-up", es: "Seguimiento" },
  stateIdle: { en: "Idle", pt: "Parada", es: "Inactiva" },
  stateWon: { en: "Won", pt: "Ganha", es: "Ganada" },
  stateLost: { en: "Lost", pt: "Perdida", es: "Perdida" },
  stateBlocked: { en: "Blocked", pt: "Bloqueada", es: "Bloqueada" },
} satisfies Record<string, Entry>

export type AttendeInboxKey = keyof typeof entries
export type AttendeInboxLanguage = "english" | "portuguese" | "spanish"

const LANGUAGE_FIELD = { english: "en", portuguese: "pt", spanish: "es" } as const

export function translateAttendeInbox(
  language: AttendeInboxLanguage,
  key: AttendeInboxKey,
  replacements?: Record<string, string | number>
): string {
  const entry: Entry = entries[key]
  let text = entry[LANGUAGE_FIELD[language]] ?? entry.en
  if (replacements) {
    for (const [name, value] of Object.entries(replacements)) {
      text = text.split(`{${name}}`).join(String(value))
    }
  }
  return text
}

export const attendeInboxKeys = Object.keys(entries) as AttendeInboxKey[]
export const attendeInboxEntries: Record<AttendeInboxKey, Entry> = entries
