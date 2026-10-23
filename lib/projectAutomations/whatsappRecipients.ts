export type OutboundPhoneRecipient =
  | { type: "lead_phone" }
  | { type: "assignee_phone" }
  | { type: "reporter_phone" }
  | { type: "session_owner_phone" }
  | { type: "workspace_user"; userId: string }
  | { type: "custom_phone"; phone: string }

export type OutboundConversationRecipient =
  | { type: "linked_conversation" }
  | { type: "custom_conversation"; conversationId: string }

export type OutboundWhatsAppRecipient = OutboundPhoneRecipient | OutboundConversationRecipient

export type WhatsAppContentMode = "free_text" | "workspace_shortcut" | "meta_template" | "ai_generate"

export type WhatsAppContentDraft = {
  mode: WhatsAppContentMode
  text: string
  templateId: string
  metaTemplateName: string
  metaLanguage: string
  agentId: string
  aiInstructions: string
}

export type PhoneRecipientsDraft = {
  kinds: Array<"lead_phone" | "assignee_phone" | "reporter_phone" | "session_owner_phone">
  workspaceUserIds: string[]
  customPhonesText: string
  /** linked_conversation = card-linked WA thread; custom_conversation = explicit group/direct id(s) */
  conversationKinds: Array<"linked_conversation">
  /** One or more explicit conversation/group ids. */
  customConversationIds: string[]
}

/** No fixed default — a saved automation is valid as long as it has at least one
 * recipient of ANY kind (phone, workspace user, custom number, or group); there is
 * no implicit fallback to "lead_phone" anymore. */
export const DEFAULT_PHONE_RECIPIENTS_DRAFT: PhoneRecipientsDraft = {
  kinds: [],
  workspaceUserIds: [],
  customPhonesText: "",
  conversationKinds: [],
  customConversationIds: [],
}

export const DEFAULT_WHATSAPP_CONTENT_DRAFT: WhatsAppContentDraft = {
  mode: "free_text",
  text: "",
  templateId: "",
  metaTemplateName: "",
  metaLanguage: "pt_BR",
  agentId: "",
  aiInstructions:
    "Gere uma mensagem WhatsApp curta e natural com base no contexto do card {{card.title}} / lead {{lead.name}}.",
}

/** True when the draft has at least one recipient of any kind — the only
 * requirement for a savable automation (no fixed recipient is mandatory). */
export function phoneRecipientsDraftHasAnyRecipient(draft: PhoneRecipientsDraft): boolean {
  return (
    draft.kinds.length > 0 ||
    draft.workspaceUserIds.some((id) => id.trim()) ||
    draft.customPhonesText
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .some(Boolean) ||
    draft.conversationKinds.length > 0 ||
    draft.customConversationIds.some((id) => id.trim())
  )
}

export function phoneRecipientsDraftToParams(draft: PhoneRecipientsDraft): OutboundWhatsAppRecipient[] {
  const out: OutboundWhatsAppRecipient[] = []
  for (const kind of draft.kinds) out.push({ type: kind })
  for (const userId of draft.workspaceUserIds) {
    const id = userId.trim()
    if (id) out.push({ type: "workspace_user", userId: id })
  }
  for (const phone of draft.customPhonesText
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean)) {
    out.push({ type: "custom_phone", phone })
  }
  for (const kind of draft.conversationKinds) out.push({ type: kind })
  for (const conversationId of draft.customConversationIds) {
    const convId = conversationId.trim()
    if (convId) out.push({ type: "custom_conversation", conversationId: convId })
  }
  return out
}

export function phoneRecipientsParamsToDraft(recipients: unknown): PhoneRecipientsDraft {
  if (!Array.isArray(recipients) || recipients.length === 0) {
    return { ...DEFAULT_PHONE_RECIPIENTS_DRAFT }
  }
  const kinds: PhoneRecipientsDraft["kinds"] = []
  const workspaceUserIds: string[] = []
  const customPhones: string[] = []
  const conversationKinds: PhoneRecipientsDraft["conversationKinds"] = []
  const customConversationIds: string[] = []
  for (const raw of recipients) {
    if (!raw || typeof raw !== "object") continue
    const r = raw as { type?: string; userId?: string; phone?: string; conversationId?: string }
    if (
      r.type === "lead_phone" ||
      r.type === "assignee_phone" ||
      r.type === "reporter_phone" ||
      r.type === "session_owner_phone"
    ) {
      if (!kinds.includes(r.type)) kinds.push(r.type)
    } else if (r.type === "workspace_user" && r.userId) {
      workspaceUserIds.push(String(r.userId))
    } else if (r.type === "custom_phone" && r.phone) {
      customPhones.push(String(r.phone))
    } else if (r.type === "linked_conversation") {
      if (!conversationKinds.includes("linked_conversation")) {
        conversationKinds.push("linked_conversation")
      }
    } else if (r.type === "custom_conversation" && r.conversationId) {
      customConversationIds.push(String(r.conversationId))
    }
  }
  return {
    kinds,
    workspaceUserIds,
    customPhonesText: customPhones.join(", "),
    conversationKinds,
    customConversationIds,
  }
}

export function whatsappContentDraftToParams(draft: WhatsAppContentDraft): {
  content: Record<string, unknown>
  text?: string
} {
  switch (draft.mode) {
    case "workspace_shortcut":
      return { content: { mode: "workspace_shortcut", templateId: draft.templateId.trim() } }
    case "meta_template":
      return {
        content: {
          mode: "meta_template",
          templateName: draft.metaTemplateName.trim(),
          language: draft.metaLanguage.trim() || "pt_BR",
        },
      }
    case "ai_generate":
      return {
        content: {
          mode: "ai_generate",
          agentId: draft.agentId.trim(),
          instructions: draft.aiInstructions.trim(),
        },
      }
    case "free_text":
    default:
      return {
        content: { mode: "free_text", text: draft.text.trim() },
        text: draft.text.trim(),
      }
  }
}

export function whatsappContentParamsToDraft(content: unknown, fallbackText?: string): WhatsAppContentDraft {
  const base = { ...DEFAULT_WHATSAPP_CONTENT_DRAFT }
  if (fallbackText) base.text = fallbackText
  if (!content || typeof content !== "object") {
    if (fallbackText) return { ...base, mode: "free_text", text: fallbackText }
    return base
  }
  const c = content as Record<string, unknown>
  const mode = c.mode
  if (mode === "workspace_shortcut") {
    return {
      ...base,
      mode: "workspace_shortcut",
      templateId: c.templateId != null ? String(c.templateId) : "",
    }
  }
  if (mode === "meta_template") {
    return {
      ...base,
      mode: "meta_template",
      metaTemplateName: c.templateName != null ? String(c.templateName) : "",
      metaLanguage: c.language != null ? String(c.language) : "pt_BR",
    }
  }
  if (mode === "ai_generate") {
    return {
      ...base,
      mode: "ai_generate",
      agentId: c.agentId != null ? String(c.agentId) : "",
      aiInstructions: c.instructions != null ? String(c.instructions) : base.aiInstructions,
    }
  }
  return {
    ...base,
    mode: "free_text",
    text: c.text != null ? String(c.text) : fallbackText || "",
  }
}
