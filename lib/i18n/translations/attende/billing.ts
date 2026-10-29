import { serviceErrorEntries } from "./serviceErrors"
import type { ShellEntry } from "./shellTranslator"

/** Billing page and the blocking screen shown when the trial ended or the subscription is inactive. */
export const billingEntries = {
  billTitle: { en: "Plan and billing", pt: "Plano e cobrança", es: "Plan y facturación" },
  billSubtitle: {
    en: "Your plan, what it includes, what you used and your invoices.",
    pt: "Seu plano, o que ele inclui, o que você usou e suas faturas.",
    es: "Tu plan, lo que incluye, lo que usaste y tus facturas.",
  },
  billLoadError: {
    en: "We could not load your plan.",
    pt: "Não foi possível carregar seu plano.",
    es: "No pudimos cargar tu plan.",
  },
  billRetry: { en: "Try again", pt: "Tentar novamente", es: "Intentar de nuevo" },

  // ---- Plan summary ----
  billCurrentPlan: { en: "Current plan", pt: "Plano atual", es: "Plan actual" },
  billNoPlan: { en: "No Attende-ai plan", pt: "Nenhum plano Attende-ai", es: "Ningún plan de Attende-ai" },
  billStatusTrialing: { en: "Free trial", pt: "Teste grátis", es: "Prueba gratis" },
  billStatusActive: { en: "Active", pt: "Ativo", es: "Activo" },
  billStatusPastDue: { en: "Payment overdue", pt: "Pagamento em atraso", es: "Pago atrasado" },
  billStatusCanceled: { en: "Canceled", pt: "Cancelado", es: "Cancelado" },
  billStatusNone: { en: "Not subscribed", pt: "Sem assinatura", es: "Sin suscripción" },
  billPriceLabel: { en: "Price", pt: "Valor", es: "Precio" },
  billPriceMonthly: { en: "{price} per month", pt: "{price} por mês", es: "{price} al mes" },
  billPriceYearly: { en: "{price} per year", pt: "{price} por ano", es: "{price} al año" },
  billPriceEveryMonths: { en: "{price} every {count} months", pt: "{price} a cada {count} meses", es: "{price} cada {count} meses" },
  billPriceUnknown: {
    en: "Price not available here. See it in the billing portal.",
    pt: "Valor indisponível aqui. Consulte no portal de pagamento.",
    es: "Precio no disponible aquí. Consúltalo en el portal de pago.",
  },
  billTrialEndsIn: { en: "{days} days left in your trial", pt: "Restam {days} dias do seu teste", es: "Te quedan {days} días de prueba" },
  billTrialEndsToday: { en: "Your trial ends today", pt: "Seu teste termina hoje", es: "Tu prueba termina hoy" },
  billTrialEndsOn: { en: "Trial ends on {date}", pt: "O teste termina em {date}", es: "La prueba termina el {date}" },
  billAfterTrialCharge: {
    en: "After the trial, {price} is charged automatically to the saved card unless you cancel before {date}.",
    pt: "Depois do teste, {price} será cobrado automaticamente no cartão cadastrado, a menos que você cancele antes de {date}.",
    es: "Después de la prueba, se cobrará {price} automáticamente en la tarjeta guardada, salvo que canceles antes del {date}.",
  },
  billAfterTrialNoSubscription: {
    en: "No charge is scheduled. To keep your assistant answering after the trial, you need to subscribe to a plan.",
    pt: "Nenhuma cobrança programada. Para o assistente continuar respondendo depois do teste, é preciso contratar um plano.",
    es: "No hay ningún cobro programado. Para que el asistente siga respondiendo después de la prueba, debes contratar un plan.",
  },
  billNextCharge: { en: "Next charge on {date}: {price}", pt: "Próxima cobrança em {date}: {price}", es: "Próximo cobro el {date}: {price}" },
  billNoChargeScheduled: { en: "No charge scheduled.", pt: "Nenhuma cobrança programada.", es: "No hay cobros programados." },
  billCanceledOn: { en: "Canceled on {date}.", pt: "Cancelada em {date}.", es: "Cancelada el {date}." },
  billCancelsOn: { en: "Cancels on {date}", pt: "Será cancelada em {date}", es: "Se cancela el {date}" },
  billCancelsOnHint: {
    en: "Your plan stays active until then and nothing else will be charged. Changed your mind? Keep your subscription.",
    pt: "Seu plano continua ativo até lá e nada mais será cobrado. Mudou de ideia? Mantenha sua assinatura.",
    es: "Tu plan sigue activo hasta entonces y no se cobrará nada más. ¿Cambiaste de idea? Mantén tu suscripción.",
  },
  billManage: { en: "Manage", pt: "Gerenciar", es: "Gestionar" },
  billTrialOutbound: {
    en: "{used} of {cap} trial messages sent",
    pt: "{used} de {cap} mensagens do teste enviadas",
    es: "{used} de {cap} mensajes de la prueba enviados",
  },
  billPastDueHint: {
    en: "We could not charge your card. Update it to keep your channels and assistant running.",
    pt: "Não conseguimos cobrar seu cartão. Atualize-o para manter seus canais e o assistente funcionando.",
    es: "No pudimos cobrar tu tarjeta. Actualízala para mantener tus canales y tu asistente funcionando.",
  },
  billCanceledHint: {
    en: "Your assistant does not answer while there is no active plan. Agents, documents and conversations are kept.",
    pt: "O assistente não responde enquanto não houver um plano ativo. Agentes, documentos e conversas ficam guardados.",
    es: "El asistente no responde mientras no haya un plan activo. Los agentes, documentos y conversaciones se conservan.",
  },
  billNoPlanHint: {
    en: "This company has no Attende-ai plan yet. Talk to our team to subscribe.",
    pt: "Esta empresa ainda não tem um plano Attende-ai. Fale com a nossa equipe para assinar.",
    es: "Esta empresa aún no tiene un plan de Attende-ai. Habla con nuestro equipo para suscribirte.",
  },
  billSubscribe: { en: "Subscribe to a plan", pt: "Assinar plano", es: "Suscribirse a un plan" },
  billSeePlans: { en: "See plans and prices", pt: "Ver planos e preços", es: "Ver planes y precios" },

  // ---- Included vs used ----
  billIncludedTitle: { en: "Included in your plan", pt: "Incluído no seu plano", es: "Incluido en tu plan" },
  billUsedTitle: { en: "Used this month", pt: "Usado neste mês", es: "Usado este mes" },
  billUsedMonth: { en: "Usage in {month}", pt: "Uso em {month}", es: "Uso en {month}" },
  billLimitLines: { en: "Channels", pt: "Canais", es: "Canales" },
  billLimitAgents: { en: "AI agents", pt: "Agentes de IA", es: "Agentes de IA" },
  billLimitReplies: { en: "AI replies per month", pt: "Respostas de IA por mês", es: "Respuestas de IA por mes" },
  billLimitSeats: { en: "Team seats", pt: "Usuários da equipe", es: "Usuarios del equipo" },
  billLimitDocs: { en: "Documents", pt: "Documentos", es: "Documentos" },
  billUnlimited: { en: "Unlimited", pt: "Ilimitado", es: "Ilimitado" },
  billUsageOf: { en: "{used} of {limit}", pt: "{used} de {limit}", es: "{used} de {limit}" },
  billUsageCount: { en: "{used} in use", pt: "{used} em uso", es: "{used} en uso" },
  billUsageValueUnavailable: {
    en: "Not available right now",
    pt: "Indisponível no momento",
    es: "No disponible ahora",
  },
  billTrialOutboundUnavailable: {
    en: "Trial messages sent: not available right now (limit {cap}). It is not zero: we just could not read it.",
    pt: "Mensagens do teste enviadas: indisponível no momento (limite {cap}). Não é zero: só não conseguimos ler agora.",
    es: "Mensajes de la prueba enviados: no disponible ahora (límite {cap}). No es cero: solo no pudimos leerlo.",
  },
  billNoSubscriptionPortal: {
    en: "This workspace has no subscription to manage yet.",
    pt: "Este workspace ainda não tem uma assinatura para gerenciar.",
    es: "Este workspace aún no tiene una suscripción para gestionar.",
  },
  billUsageUnavailable: {
    en: "Usage is not available right now. It is not zero: we just could not read it.",
    pt: "O consumo está indisponível no momento. Não é zero: só não conseguimos ler agora.",
    es: "El consumo no está disponible ahora. No es cero: solo no pudimos leerlo.",
  },
  billIncludedUnknown: {
    en: "The limits of this plan are not available.",
    pt: "Os limites deste plano não estão disponíveis.",
    es: "Los límites de este plan no están disponibles.",
  },
  billLimitRuleReplies: {
    en: "When AI replies run out, the assistant stops answering until next month; your team can keep answering in Conversations.",
    pt: "Quando as respostas de IA acabam, o assistente para de responder até o próximo mês; sua equipe continua respondendo em Conversas.",
    es: "Cuando se agotan las respuestas de IA, el asistente deja de responder hasta el próximo mes; tu equipo puede seguir respondiendo en Conversaciones.",
  },
  billLimitRuleCreate: {
    en: "At the channel or document limit, new ones can't be added until the plan allows more.",
    pt: "No limite de canais ou documentos, não é possível adicionar novos até o plano permitir mais.",
    es: "En el límite de canales o documentos, no se pueden añadir nuevos hasta que el plan lo permita.",
  },
  billLimitRuleTrial: {
    en: "During the trial, up to {cap} messages can be sent.",
    pt: "Durante o teste, é possível enviar até {cap} mensagens.",
    es: "Durante la prueba se pueden enviar hasta {cap} mensajes.",
  },

  // ---- Manage ----
  billManageTitle: { en: "Manage your subscription", pt: "Gerenciar assinatura", es: "Gestionar suscripción" },
  billManageBody: {
    en: "Change plan or cancel here. Card updates open the secure Stripe portal.",
    pt: "Mude de plano ou cancele aqui. A atualização do cartão abre o portal seguro da Stripe.",
    es: "Cambia de plan o cancela aquí. La tarjeta se actualiza en el portal seguro de Stripe.",
  },
  billChangePlan: { en: "Change plan", pt: "Mudar de plano", es: "Cambiar de plan" },
  billUpdateCard: { en: "Update card", pt: "Atualizar cartão", es: "Actualizar tarjeta" },
  billCancel: { en: "Cancel subscription", pt: "Cancelar assinatura", es: "Cancelar suscripción" },
  billPortalFailed: {
    en: "We could not open the billing portal. Try again.",
    pt: "Não foi possível abrir o portal de pagamento. Tente novamente.",
    es: "No pudimos abrir el portal de pago. Inténtalo de nuevo.",
  },
  billCancelTitle: { en: "Cancel your subscription?", pt: "Cancelar sua assinatura?", es: "¿Cancelar tu suscripción?" },
  billCancelBody: {
    en: "It stays active until the end of the current period and nothing else is charged; you can undo it until then. After it ends, the assistant stops answering; agents, documents and conversations are kept.",
    pt: "Ela continua ativa até o fim do período atual e nada mais é cobrado; você pode desfazer até lá. Quando terminar, o assistente para de responder; agentes, documentos e conversas ficam guardados.",
    es: "Sigue activa hasta el final del período actual y no se cobra nada más; puedes deshacerlo hasta entonces. Cuando termine, el asistente deja de responder; los agentes, documentos y conversaciones se conservan.",
  },
  billCancelConfirm: { en: "Cancel at period end", pt: "Cancelar no fim do período", es: "Cancelar al final del período" },
  billCancelDone: { en: "Your subscription will end at the end of the period.", pt: "Sua assinatura termina no fim do período.", es: "Tu suscripción termina al final del período." },
  billResume: { en: "Keep my subscription", pt: "Manter minha assinatura", es: "Mantener mi suscripción" },
  billResumeDone: { en: "Your subscription will continue.", pt: "Sua assinatura vai continuar.", es: "Tu suscripción continuará." },
  billActionFailed: {
    en: "We could not change your subscription. Try again.",
    pt: "Não foi possível alterar sua assinatura. Tente novamente.",
    es: "No pudimos cambiar tu suscripción. Inténtalo de nuevo.",
  },
  billOwnerOnly: {
    en: "Only the owner of this company can change its subscription.",
    pt: "Só o dono desta empresa pode alterar a assinatura.",
    es: "Solo el propietario de esta empresa puede cambiar la suscripción.",
  },
  billChangePlanTitle: { en: "Change plan", pt: "Mudar de plano", es: "Cambiar de plan" },
  billChangePlanBody: {
    en: "The new price applies now; the difference for the rest of this period is prorated on your next invoice.",
    pt: "O novo valor vale a partir de agora; a diferença do restante deste período é proporcional e vem na próxima fatura.",
    es: "El nuevo precio aplica desde ahora; la diferencia del resto de este período se prorratea en tu próxima factura.",
  },
  billChangePlanCurrent: { en: "Current plan", pt: "Plano atual", es: "Plan actual" },
  billChangePlanTo: { en: "Switch to {plan}", pt: "Mudar para {plan}", es: "Cambiar a {plan}" },
  billChangePlanDone: { en: "Your plan was changed to {plan}.", pt: "Seu plano foi alterado para {plan}.", es: "Tu plan se cambió a {plan}." },
  billEndedTitle: { en: "This subscription has ended", pt: "Esta assinatura terminou", es: "Esta suscripción terminó" },
  billEndedBody: {
    en: "An ended subscription cannot be restarted here. Contact our support and we will reactivate it with you; your agents, documents and conversations are kept.",
    pt: "Uma assinatura encerrada não pode ser reativada por aqui. Fale com o nosso suporte e reativamos com você; seus agentes, documentos e conversas estão guardados.",
    es: "Una suscripción terminada no se puede reactivar aquí. Habla con nuestro soporte y la reactivamos contigo; tus agentes, documentos y conversaciones se conservan.",
  },
  billContactSupport: { en: "Contact support", pt: "Falar com o suporte", es: "Contactar soporte" },
  billIncludedJsynq: { en: "Included in your JSYNQ plan", pt: "Incluído no seu plano JSYNQ", es: "Incluido en tu plan JSYNQ" },
  billIncludedJsynqBody: {
    en: "This company pays a JSYNQ plan, so Attende-ai comes with it at no extra cost, with the Profissional limits. Billing is managed in JSYNQ.",
    pt: "Esta empresa paga um plano JSYNQ, então o Attende-ai vem junto sem custo extra, com os limites do Profissional. A cobrança é gerenciada no JSYNQ.",
    es: "Esta empresa paga un plan JSYNQ, así que Attende-ai viene incluido sin costo extra, con los límites del Profissional. La facturación se gestiona en JSYNQ.",
  },
  billManageInJsynq: { en: "Manage billing in JSYNQ", pt: "Gerenciar cobrança no JSYNQ", es: "Gestionar facturación en JSYNQ" },
  billCancelKeep: { en: "Keep my plan", pt: "Manter meu plano", es: "Mantener mi plan" },

  // ---- Invoices ----
  billInvoices: { en: "Invoices", pt: "Faturas", es: "Facturas" },
  billInvoicesHint: {
    en: "Invoices of this company's subscription.",
    pt: "Faturas da assinatura desta empresa.",
    es: "Facturas de la suscripción de esta empresa.",
  },
  billInvoicesLoading: { en: "Loading invoices…", pt: "Carregando faturas…", es: "Cargando facturas…" },
  billInvoicesEmpty: { en: "No invoices yet.", pt: "Ainda não há faturas.", es: "Aún no hay facturas." },
  billInvoicesError: { en: "We could not load your invoices.", pt: "Não foi possível carregar suas faturas.", es: "No pudimos cargar tus facturas." },
  billInvoiceStatusPaid: { en: "Paid", pt: "Paga", es: "Pagada" },
  billInvoiceStatusOpen: { en: "Open", pt: "Em aberto", es: "Abierta" },
  billInvoiceStatusVoid: { en: "Voided", pt: "Anulada", es: "Anulada" },
  billInvoiceStatusUncollectible: { en: "Uncollectible", pt: "Não cobrável", es: "Incobrable" },
  billInvoiceStatusDraft: { en: "Draft", pt: "Rascunho", es: "Borrador" },
  billInvoiceView: { en: "View invoice {number}", pt: "Ver fatura {number}", es: "Ver factura {number}" },
  billInvoiceDownload: { en: "Download PDF of invoice {number}", pt: "Baixar PDF da fatura {number}", es: "Descargar PDF de la factura {number}" },
  billInvoiceNoNumber: { en: "no number", pt: "sem número", es: "sin número" },

  gateTrialExpiredTitle: { en: "Your free trial has ended", pt: "Seu teste grátis terminou", es: "Tu prueba gratis terminó" },
  gateTrialExpiredBody: {
    en: "Choose a plan to turn your assistant back on. Your agents, documents and conversations are kept.",
    pt: "Escolha um plano para religar seu assistente. Seus agentes, documentos e conversas foram mantidos.",
    es: "Elige un plan para volver a activar tu asistente. Tus agentes, documentos y conversaciones se mantienen.",
  },
  gateInactiveTitle: { en: "Your subscription is not active", pt: "Sua assinatura não está ativa", es: "Tu suscripción no está activa" },
  gateInactiveBody: {
    en: "Update your payment details or choose a plan to keep using the assistant.",
    pt: "Atualize os dados de pagamento ou escolha um plano para continuar usando o assistente.",
    es: "Actualiza tus datos de pago o elige un plan para seguir usando el asistente.",
  },
  gateChoosePlan: { en: "Choose a plan", pt: "Escolher um plano", es: "Elegir un plan" },
  gateTalk: { en: "Talk to us", pt: "Falar com a gente", es: "Hablar con nosotros" },
  ...serviceErrorEntries,
} satisfies Record<string, ShellEntry>

export type BillingTranslationKey = keyof typeof billingEntries
