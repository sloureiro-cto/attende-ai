import type { ShellEntry } from "./shellTranslator"

/**
 * Activation: the home (/start) and the guided setup (/setup). The `act*` keys are the shared step wording, so both
 * screens always say the same thing. `{agent}` is the agent's own name (user content, never translated).
 */
export const onboardingEntries = {
  // Shared steps (same order as ACTIVATION_STEPS in lib/attende/activation.ts)
  actChannelTitle: { en: "Connect a channel", pt: "Conecte um canal", es: "Conecta un canal" },
  actChannelText: {
    en: "WhatsApp, Instagram or SMS: where your customers write to you.",
    pt: "WhatsApp, Instagram ou SMS: onde os seus clientes falam com você.",
    es: "WhatsApp, Instagram o SMS: donde tus clientes te escriben.",
  },
  actAgentTitle: { en: "Create your AI agent", pt: "Crie o seu agente de IA", es: "Crea tu agente de IA" },
  actAgentText: {
    en: "Choose what the agent does (qualify leads, help sell or answer and route) and answer a few questions about your business.",
    pt: "Escolha o que o agente faz (qualificar interessados, ajudar a vender ou atender e encaminhar) e responda algumas perguntas sobre o seu negócio.",
    es: "Elige qué hace el agente (calificar interesados, ayudar a vender o atender y derivar) y responde unas preguntas sobre tu negocio.",
  },
  actKnowledgeTitle: { en: "Tell it about your business", pt: "Informações do negócio", es: "Información del negocio" },
  actKnowledgeText: {
    en: "Describe the business in the setup or send documents (prices, FAQs, policies). Needed before turning the agent on.",
    pt: "Descreva o negócio na configuração ou envie documentos (preços, perguntas frequentes, políticas). Necessário antes de ativar.",
    es: "Describe el negocio en la configuración o envía documentos (precios, preguntas frecuentes, políticas). Necesario antes de activar.",
  },
  actTestTitle: { en: "Check the rules", pt: "Verifique as regras", es: "Verifica las reglas" },
  actTestText: {
    en: "Checks hours, channel and handover rules on the agent's page. It is not a conversation with the AI and sends nothing to customers.",
    pt: "Confere horário, canal e regras de transferência na página do agente. Não é uma conversa com a IA e não envia nada para clientes.",
    es: "Revisa horario, canal y reglas de traspaso en la página del agente. No es una conversación con la IA y no envía nada a los clientes.",
  },
  actActivateTitle: { en: "Turn the agent on in a channel", pt: "Ative o agente em um canal", es: "Activa el agente en un canal" },
  actActivateText: {
    en: "Choose the channel where it answers and turn it on. You can pause it at any time.",
    pt: "Escolha o canal em que ele atende e ligue o agente. Você pode pausar quando quiser.",
    es: "Elige el canal donde responde y actívalo. Puedes pausarlo cuando quieras.",
  },

  // Step states
  actStateDone: { en: "Done", pt: "Concluído", es: "Listo" },
  actStateTodo: { en: "To do", pt: "A fazer", es: "Pendiente" },
  actStateUnknown: { en: "Couldn't check", pt: "Não verificado", es: "Sin verificar" },

  // Why a step is in its state (one per StepCode)
  actCodeChannelConnected: { en: "A channel is connected.", pt: "Há um canal conectado.", es: "Hay un canal conectado." },
  actCodeChannelNone: { en: "No channel connected yet.", pt: "Nenhum canal conectado ainda.", es: "Aún no hay canales conectados." },
  actCodeChannelOffline: {
    en: "Your channels are disconnected. Reconnect one to continue.",
    pt: "Os seus canais estão desconectados. Reconecte um para continuar.",
    es: "Tus canales están desconectados. Reconecta uno para continuar.",
  },
  actCodeChannelUnknown: { en: "We couldn't check your channels.", pt: "Não foi possível verificar os seus canais.", es: "No pudimos verificar tus canales." },
  actCodeAgentCreated: { en: "Agent created: {agent}.", pt: "Agente criado: {agent}.", es: "Agente creado: {agent}." },
  actCodeAgentNone: { en: "No AI agent yet.", pt: "Nenhum agente de IA ainda.", es: "Aún no hay agentes de IA." },
  actCodeAgentsUnknown: { en: "We couldn't check your AI agents.", pt: "Não foi possível verificar os seus agentes de IA.", es: "No pudimos verificar tus agentes de IA." },
  actCodeKnowledgeAdded: { en: "Documents sent.", pt: "Documentos enviados.", es: "Documentos enviados." },
  actCodeKnowledgeDescription: {
    en: "The agent has a description of your business.",
    pt: "O agente tem uma descrição do seu negócio.",
    es: "El agente tiene una descripción de tu negocio.",
  },
  actCodeAfterAgent: { en: "Available after you create the agent.", pt: "Disponível após criar o agente.", es: "Disponible después de crear el agente." },
  actCodeKnowledgeNone: {
    en: "Not enough yet: the business name alone doesn't tell the agent what to answer.",
    pt: "Ainda não é suficiente: só o nome da empresa não diz ao agente o que responder.",
    es: "Aún no es suficiente: solo el nombre de la empresa no le dice al agente qué responder.",
  },
  actCodeTestPassed: {
    en: "Last rules check completed on {date}.",
    pt: "Última verificação de regras concluída em {date}.",
    es: "Última verificación de reglas completada el {date}.",
  },
  actCodeTestNotRun: {
    en: "No rules check since the last change to {agent}.",
    pt: "Nenhuma verificação de regras desde a última alteração em {agent}.",
    es: "Ninguna verificación de reglas desde el último cambio en {agent}.",
  },
  actCodeTestNeedsChannel: {
    en: "{agent} is not on a channel yet, and the check includes the channel.",
    pt: "{agent} ainda não está em um canal, e a verificação inclui o canal.",
    es: "{agent} aún no está en un canal, y la verificación incluye el canal.",
  },
  actCodeChannelOfAgentOffline: {
    en: "A channel of {agent} is disconnected.",
    pt: "Um canal de {agent} está desconectado.",
    es: "Un canal de {agent} está desconectado.",
  },
  actCodeActive: { en: "{agent} is answering customers.", pt: "{agent} está atendendo clientes.", es: "{agent} está atendiendo clientes." },
  actCodePaused: {
    en: "{agent} is on a channel but turned off.",
    pt: "{agent} está em um canal, mas desligado.",
    es: "{agent} está en un canal, pero desactivado.",
  },
  actCodeActivateNeedsChannel: { en: "{agent} is not on a channel yet.", pt: "{agent} ainda não está em um canal.", es: "{agent} aún no está en un canal." },
  actCodeActivateOffline: {
    en: "A channel of {agent} is disconnected, so it is not answering.",
    pt: "Um canal de {agent} está desconectado, então ele não está atendendo.",
    es: "Un canal de {agent} está desconectado, así que no está respondiendo.",
  },

  // Step actions
  actCtaConnectChannel: { en: "Connect a channel", pt: "Conectar um canal", es: "Conectar un canal" },
  actCtaReconnectChannel: { en: "Reconnect a channel", pt: "Reconectar um canal", es: "Reconectar un canal" },
  actCtaOpenChannels: { en: "Open channels", pt: "Abrir canais", es: "Abrir canales" },
  actCtaCreateAgent: { en: "Create AI agent", pt: "Criar agente de IA", es: "Crear agente de IA" },
  actCtaOpenAgents: { en: "Open AI agents", pt: "Abrir agentes de IA", es: "Abrir agentes de IA" },
  actCtaAddDocuments: { en: "Add information", pt: "Adicionar informações", es: "Añadir información" },
  actCtaTest: { en: "Check rules", pt: "Verificar regras", es: "Verificar reglas" },
  actCtaChooseChannel: { en: "Choose the agent's channel", pt: "Escolher o canal do agente", es: "Elegir el canal del agente" },
  actCtaTurnOn: { en: "Turn the agent on", pt: "Ligar o agente", es: "Activar el agente" },
  actCtaView: { en: "View", pt: "Ver", es: "Ver" },

  // Progress and loading
  actProgress: { en: "{done} of {total} steps done", pt: "{done} de {total} passos concluídos", es: "{done} de {total} pasos completados" },
  actProgressAria: { en: "Steps done", pt: "Passos concluídos", es: "Pasos completados" },
  actStepOf: { en: "Step {current} of {total}", pt: "Passo {current} de {total}", es: "Paso {current} de {total}" },
  actPartial: {
    en: "Some information could not be loaded, so some steps say “Couldn't check”.",
    pt: "Algumas informações não carregaram, então alguns passos aparecem como “Não verificado”.",
    es: "Parte de la información no cargó, así que algunos pasos dicen “Sin verificar”.",
  },
  actRetry: { en: "Try again", pt: "Tentar novamente", es: "Reintentar" },
  actRetrying: { en: "Checking…", pt: "Verificando…", es: "Verificando…" },
  actErrorTitle: { en: "We couldn't load your setup", pt: "Não foi possível carregar a sua configuração", es: "No pudimos cargar tu configuración" },
  actErrorText: {
    en: "Your channels and AI agents could not be read. Check your connection and try again.",
    pt: "Não foi possível ler os seus canais e agentes de IA. Confira a sua conexão e tente novamente.",
    es: "No pudimos leer tus canales y agentes de IA. Revisa tu conexión e inténtalo de nuevo.",
  },
  actNewTab: { en: "(opens in a new tab)", pt: "(abre em uma nova aba)", es: "(se abre en una pestaña nueva)" },

  // Home
  homeTitle: { en: "Home", pt: "Início", es: "Inicio" },
  homeSubtitleSetup: {
    en: "Get your first conversation answered by AI.",
    pt: "Coloque a IA para atender a sua primeira conversa.",
    es: "Haz que la IA responda tu primera conversación.",
  },
  homeSubtitleDaily: { en: "What needs you today.", pt: "O que precisa de você hoje.", es: "Lo que te necesita hoy." },
  homeNextStep: { en: "Next step", pt: "Próximo passo", es: "Siguiente paso" },
  homeChecklistTitle: { en: "Steps to your first AI conversation", pt: "Passos até a primeira conversa com IA", es: "Pasos hasta tu primera conversación con IA" },
  homeOpenSetup: { en: "Open the guided setup", pt: "Abrir a configuração guiada", es: "Abrir la configuración guiada" },
  homeChecklistAllDone: { en: "All steps are done.", pt: "Todos os passos estão concluídos.", es: "Todos los pasos están completados." },
  homeChecklistRemaining: { en: "Still recommended", pt: "Ainda recomendado", es: "Aún recomendado" },
  homeOptionalTitle: { en: "Optional", pt: "Opcional", es: "Opcional" },
  homeOptionalHint: {
    en: "These do not count toward the steps above.",
    pt: "Estes não contam nos passos acima.",
    es: "Estos no cuentan en los pasos de arriba.",
  },
  optTeamTitle: { en: "Invite your team", pt: "Convide a sua equipe", es: "Invita a tu equipo" },
  optTeamText: {
    en: "So people can take over when a customer needs a person.",
    pt: "Para que pessoas assumam quando o cliente precisar de atendimento humano.",
    es: "Para que personas tomen el control cuando el cliente necesite atención humana.",
  },
  optTeamPeopleOne: { en: "{count} person in the company", pt: "{count} pessoa na empresa", es: "{count} persona en la empresa" },
  optTeamPeopleOther: { en: "{count} people in the company", pt: "{count} pessoas na empresa", es: "{count} personas en la empresa" },
  optTeamUnknown: { en: "We couldn't check your team.", pt: "Não foi possível verificar a sua equipe.", es: "No pudimos verificar tu equipo." },
  optTeamCta: { en: "Invite people", pt: "Convidar pessoas", es: "Invitar personas" },
  optDemoTitle: { en: "Book a demo or training", pt: "Agende uma demonstração ou treinamento", es: "Agenda una demo o capacitación" },
  optDemoText: {
    en: "We show you the best setup for your business. Bookings are not tracked here.",
    pt: "Mostramos o melhor formato para o seu negócio. Os agendamentos não aparecem aqui.",
    es: "Te mostramos la mejor configuración para tu negocio. Las reservas no se registran aquí.",
  },
  optDemoCta: { en: "Book now", pt: "Agendar agora", es: "Agendar ahora" },

  // Home, day to day (after an agent answers)
  dailyWaitingTitle: { en: "Waiting for team", pt: "Aguardando equipe", es: "Esperando al equipo" },
  dailyConversationsOne: { en: "{count} conversation", pt: "{count} conversa", es: "{count} conversación" },
  dailyConversationsOther: { en: "{count} conversations", pt: "{count} conversas", es: "{count} conversaciones" },
  dailyWaitingNone: { en: "No one is waiting for the team.", pt: "Ninguém está aguardando a equipe.", es: "Nadie está esperando al equipo." },
  dailyUnreadOne: { en: "{count} unread", pt: "{count} não lida", es: "{count} sin leer" },
  dailyUnreadOther: { en: "{count} unread", pt: "{count} não lidas", es: "{count} sin leer" },
  dailyUnavailable: { en: "Not available right now.", pt: "Indisponível no momento.", es: "No disponible ahora." },
  dailyOpenConversations: { en: "Open conversations", pt: "Abrir conversas", es: "Abrir conversaciones" },
  dailyChannelsTitle: { en: "Channels", pt: "Canais", es: "Canales" },
  dailyChannelsAttentionOne: { en: "{count} channel needs attention", pt: "{count} canal precisa de atenção", es: "{count} canal necesita atención" },
  dailyChannelsAttentionOther: { en: "{count} channels need attention", pt: "{count} canais precisam de atenção", es: "{count} canales necesitan atención" },
  dailyChannelsOk: { en: "Every channel is connected.", pt: "Todos os canais estão conectados.", es: "Todos los canales están conectados." },
  dailyChannelsPartial: {
    en: "Some channels could not be checked.",
    pt: "Não foi possível verificar alguns canais.",
    es: "No pudimos verificar algunos canales.",
  },
  dailyAgentsTitle: { en: "AI agents", pt: "Agentes de IA", es: "Agentes de IA" },
  dailyAgentsActiveOne: { en: "{count} agent answering", pt: "{count} agente atendendo", es: "{count} agente respondiendo" },
  dailyAgentsActiveOther: { en: "{count} agents answering", pt: "{count} agentes atendendo", es: "{count} agentes respondiendo" },
  dailyAgentAnswering: { en: "Answering", pt: "Atendendo", es: "Respondiendo" },
  dailyAgentNotAnswering: {
    en: "Turned on, not answering: channel disconnected",
    pt: "Ligado, sem atender: canal desconectado",
    es: "Activado, sin responder: canal desconectado",
  },
  dailyMore: { en: "+{count} more", pt: "+{count} outros", es: "+{count} más" },

  // Channel labels and states
  channelWhatsapp: { en: "WhatsApp", pt: "WhatsApp", es: "WhatsApp" },
  channelInstagram: { en: "Instagram", pt: "Instagram", es: "Instagram" },
  channelSms: { en: "SMS", pt: "SMS", es: "SMS" },
  lineStateDisconnected: { en: "Disconnected", pt: "Desconectado", es: "Desconectado" },
  lineStateReconnecting: { en: "Reconnecting", pt: "Reconectando", es: "Reconectando" },
  lineStateQrPending: { en: "Waiting for the QR code scan", pt: "Aguardando a leitura do QR code", es: "Esperando el escaneo del QR" },
  lineStateError: { en: "Blocked, contact support", pt: "Bloqueado, fale com o suporte", es: "Bloqueado, contacta a soporte" },
  lineStatePendingSetup: { en: "Setup not finished", pt: "Configuração não concluída", es: "Configuración sin terminar" },

  // Guided setup (/setup)
  onbTitle: { en: "Guided setup", pt: "Configuração guiada", es: "Configuración guiada" },
  onbSubtitle: {
    en: "Five steps to your first conversation answered by AI.",
    pt: "Cinco passos até a primeira conversa atendida pela IA.",
    es: "Cinco pasos hasta tu primera conversación respondida por IA.",
  },
  onbStepsAria: { en: "Setup steps", pt: "Passos da configuração", es: "Pasos de la configuración" },
  onbBack: { en: "Previous step", pt: "Passo anterior", es: "Paso anterior" },
  onbNext: { en: "Next step", pt: "Próximo passo", es: "Siguiente paso" },
  onbConnectWhatsapp: { en: "Connect WhatsApp", pt: "Conectar WhatsApp", es: "Conectar WhatsApp" },
  onbOtherChannels: { en: "Instagram or SMS", pt: "Instagram ou SMS", es: "Instagram o SMS" },
  onbCheckAgain: { en: "Check again", pt: "Verificar de novo", es: "Verificar de nuevo" },
  onbFromAccount: {
    en: "Progress comes from your account, so it is the same on every device. Come back here after each step.",
    pt: "O progresso vem da sua conta, então é o mesmo em qualquer dispositivo. Volte aqui depois de cada passo.",
    es: "El progreso viene de tu cuenta, así que es el mismo en cualquier dispositivo. Vuelve aquí después de cada paso.",
  },
  onbActivatedTitle: {
    en: "Your AI agent is answering customers",
    pt: "O seu agente de IA está atendendo clientes",
    es: "Tu agente de IA está atendiendo clientes",
  },
  onbActivatedText: {
    en: "Follow the conversations in the inbox. The steps below stay here for reference.",
    pt: "Acompanhe as conversas na caixa de entrada. Os passos abaixo continuam aqui para consulta.",
    es: "Sigue las conversaciones en la bandeja de entrada. Los pasos de abajo siguen aquí como referencia.",
  },
  onbGoHome: { en: "Go to home", pt: "Ir para o início", es: "Ir al inicio" },
} satisfies Record<string, ShellEntry>

export type OnboardingTranslationKey = keyof typeof onboardingEntries
