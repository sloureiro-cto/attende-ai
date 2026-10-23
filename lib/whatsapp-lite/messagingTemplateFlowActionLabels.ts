import type { WorkspaceSettingsTranslationKey } from "lib/i18n/translations/workspaceSettings"
import type { VisualActionType } from "./whatsappTemplateRuleBuilder"

export type MessagingTemplateFlowChannel = "whatsapp" | "sms" | "instagram"

type TFn = (key: WorkspaceSettingsTranslationKey, replacements?: Record<string, string | number>) => string

const ACTION_LABEL_KEYS: Record<VisualActionType, WorkspaceSettingsTranslationKey> = {
  execute_agent: "whatsappLiteRuleTemplatesActionExecuteAgent",
  move_linked_card: "whatsappLiteRuleTemplatesActionMoveCard",
  clone_linked_card: "whatsappLiteRuleTemplatesActionCloneCard",
  send_text: "whatsappLiteRuleTemplatesActionSendText",
  send_to_recipients: "whatsappLiteRuleTemplatesActionSendToRecipients",
  schedule_followup: "whatsappLiteRuleTemplatesActionScheduleFollowup",
  add_label: "whatsappLiteRuleTemplatesActionAddLabel",
  set_lead_source: "whatsappLiteRuleTemplatesActionSetLeadSource",
  transition_state: "whatsappLiteRuleTemplatesActionTransitionState",
  disable_auto_reply: "whatsappLiteRuleTemplatesActionDisableAutoReply",
  enable_conversation_agent: "whatsappLiteRuleTemplatesActionEnableConversationAgent",
  distribute_lead: "whatsappLiteRuleTemplatesActionDistributeLead",
  assign_conversation: "whatsappLiteRuleTemplatesActionAssignConversation",
  route_to_crm: "whatsappLiteRuleTemplatesActionRouteToCrm",
  reply_to_comment: "instagramLiteRuleTemplatesActionReplyToComment",
  create_lead: "whatsappLiteRuleTemplatesActionCreateLead",
  create_contact: "whatsappLiteRuleTemplatesActionCreateContact",
  stop_flow: "whatsappLiteRuleTemplatesActionStopFlow",
}

const SMS_ACTION_LABEL_OVERRIDES: Partial<Record<VisualActionType, WorkspaceSettingsTranslationKey>> = {
  send_text: "smsLiteRuleTemplatesActionSendText",
}

const INSTAGRAM_ACTION_LABEL_OVERRIDES: Partial<Record<VisualActionType, WorkspaceSettingsTranslationKey>> = {
  send_text: "instagramLiteRuleTemplatesActionSendText",
}

/**
 * Actions hidden per channel.
 * - `send_to_recipients` notifies phone numbers / WhatsApp groups through WhatsApp sessions,
 *   which SMS and Instagram runners cannot resolve.
 * - `reply_to_comment` only exists on Instagram.
 */
const SMS_EXCLUDED_ACTION_TYPES: VisualActionType[] = ["send_to_recipients", "reply_to_comment"]

const INSTAGRAM_EXCLUDED_ACTION_TYPES: VisualActionType[] = ["send_to_recipients"]

const ALL_ACTION_TYPES: VisualActionType[] = [
  "execute_agent",
  "move_linked_card",
  "clone_linked_card",
  "send_text",
  "send_to_recipients",
  "schedule_followup",
  "add_label",
  "set_lead_source",
  "transition_state",
  "disable_auto_reply",
  "enable_conversation_agent",
  "distribute_lead",
  "assign_conversation",
  "route_to_crm",
  "reply_to_comment",
  "create_lead",
  "create_contact",
  "stop_flow",
]

export function templateFlowActionTypesForChannel(channel: MessagingTemplateFlowChannel): VisualActionType[] {
  if (channel === "sms") {
    return ALL_ACTION_TYPES.filter((type) => !SMS_EXCLUDED_ACTION_TYPES.includes(type))
  }
  if (channel === "instagram") {
    return ALL_ACTION_TYPES.filter((type) => !INSTAGRAM_EXCLUDED_ACTION_TYPES.includes(type))
  }
  return ALL_ACTION_TYPES.filter((type) => type !== "reply_to_comment")
}

export function templateFlowActionLabelKey(
  channel: MessagingTemplateFlowChannel,
  type: VisualActionType
): WorkspaceSettingsTranslationKey {
  if (channel === "instagram") {
    return INSTAGRAM_ACTION_LABEL_OVERRIDES[type] ?? ACTION_LABEL_KEYS[type]
  }
  if (channel === "sms") {
    return SMS_ACTION_LABEL_OVERRIDES[type] ?? ACTION_LABEL_KEYS[type]
  }
  return ACTION_LABEL_KEYS[type]
}

export function templateFlowActionLabel(channel: MessagingTemplateFlowChannel, type: VisualActionType, t: TFn): string {
  return t(templateFlowActionLabelKey(channel, type))
}

export function buildTemplateFlowActionLabels(
  channel: MessagingTemplateFlowChannel,
  t: TFn
): Partial<Record<VisualActionType, string>> {
  return Object.fromEntries(
    templateFlowActionTypesForChannel(channel).map((type) => [type, templateFlowActionLabel(channel, type, t)])
  ) as Partial<Record<VisualActionType, string>>
}

export function templateFlowSendTextFieldLabelKey(
  channel: MessagingTemplateFlowChannel
): WorkspaceSettingsTranslationKey {
  if (channel === "instagram") return "instagramLiteRuleTemplatesSendTextLabel"
  if (channel === "sms") return "smsLiteRuleTemplatesSendTextLabel"
  return "whatsappLiteRuleTemplatesSendTextLabel"
}
