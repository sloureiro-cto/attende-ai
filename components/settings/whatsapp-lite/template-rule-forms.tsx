"use client"

import { ArrowDown2, SearchNormal1 } from "iconsax-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Textarea } from "@/components/ui/textarea"
import { DEFAULT_LEAD_DISTRIBUTION_POLICY } from "@/lib/messaging/leadDistributionTypes"
import { cn } from "@/lib/utils"
import type { MessagingTemplateFlowChannel } from "@/lib/whatsapp-lite/messagingTemplateFlowActionLabels"
import {
  buildTemplateFlowActionLabels,
  templateFlowSendTextFieldLabelKey,
} from "@/lib/whatsapp-lite/messagingTemplateFlowActionLabels"
import type { VisualTriggerEvent } from "@/lib/whatsapp-lite/messagingTemplateVisualGraph"
import type {
  DelayUnit,
  EventDateDaysAheadOp,
  VisualAction,
  VisualWhen,
  VisualWhenType,
} from "@/lib/whatsapp-lite/whatsappTemplateRuleBuilder"
import { createVisualActionForType, createVisualWhenForType } from "@/lib/whatsapp-lite/whatsappTemplateRuleBuilder"
import { WorkflowConversationMultiParamPicker } from "app/(workspace-builder)/workflows/components/WorkflowEntityParamPickers"
import type { IColumn } from "app/_types/Column"
import type { IProject } from "app/_types/Project"
import type { IUser } from "app/_types/User"
import { ChatAgentAvatar } from "app/agent-chat/components/ChatAgentAvatar"
import { Checkbox } from "components/Checkbox/Checkbox"
import { ProjectBoardColumnPicker } from "components/Project/Automations/ProjectBoardColumnPicker"
import { SearchOption } from "components/SearchPopover/SearchOption"
import { SearchPopover } from "components/SearchPopover/SearchPopover"
import SelectInput from "components/SelectInput/SelectInput"
import { TemplateAdTokenPicker } from "components/settings/whatsapp-lite/AdFieldTokenPicker"
import { AgentSearchOptionRow } from "components/settings/whatsapp-lite/AgentSearchOptionRow"
import { Input } from "components/ui/input"
import { Label } from "components/ui/label"
import UserAvatar from "components/UserAvatar/UserAvatar"
import { useWorkspace } from "context/WorkspaceContext"
import type { WorkspaceSettingsTranslationKey } from "lib/i18n/translations/workspaceSettings"
import { boardsForColumnPicker, columnBoardId } from "lib/projects/listProjectBoardColumns"
import { insertAdToken } from "lib/whatsapp-lite/adAttribution"
import { llmLabelList } from "lib/whatsapp-lite/templateRuleBranches"
import {
  FollowupMessageListEditor,
  LinkedCardInConditionFields,
  OutboundContentEditor,
  SendToRecipientsFields,
  useInboundMessageTemplates,
} from "./InboundOutboundContentFields"
import { InstagramCommentPostPicker } from "./InstagramCommentPostPicker"
import { LeadDistributionActionFields } from "./LeadDistributionActionFields"
import { SearchSelectPopover } from "./SearchSelectPopover"
import { waFieldHintClass, waFieldLabelClass, waSearchPopoverScrollListClass } from "./waSettingsTypography"

type TFn = (key: WorkspaceSettingsTranslationKey, replacements?: Record<string, string | number>) => string

const NONE = "__none__"

const whenOptions: { value: VisualWhenType; labelKey: WorkspaceSettingsTranslationKey }[] = [
  { value: "first_inbound", labelKey: "whatsappLiteRuleTemplatesWhenFirstInbound" },
  { value: "instagram_comment", labelKey: "instagramLiteRuleTemplatesWhenComment" },
  { value: "chat_type", labelKey: "whatsappLiteRuleTemplatesWhenChatType" },
  { value: "from_group_in", labelKey: "whatsappLiteRuleTemplatesWhenFromGroup" },
  { value: "from_phone_in", labelKey: "whatsappLiteRuleTemplatesWhenFromPhone" },
  { value: "from_ad", labelKey: "whatsappLiteRuleTemplatesWhenFromAd" },
  { value: "contains", labelKey: "whatsappLiteRuleTemplatesWhenContains" },
  { value: "not_contains", labelKey: "whatsappLiteRuleTemplatesWhenNotContains" },
  { value: "regex", labelKey: "whatsappLiteRuleTemplatesWhenRegex" },
  { value: "linked_card_in", labelKey: "whatsappLiteRuleTemplatesWhenLinkedCard" },
  { value: "new_lead", labelKey: "whatsappLiteRuleTemplatesWhenNewLead" },
  { value: "llm_match", labelKey: "whatsappLiteRuleTemplatesWhenLlm" },
  { value: "llm_conversation_match", labelKey: "whatsappLiteRuleTemplatesWhenLlmConversation" },
  { value: "event_date_days_ahead", labelKey: "whatsappLiteRuleTemplatesWhenEventDateDaysAhead" },
  { value: "within_business_hours", labelKey: "whatsappLiteRuleTemplatesWhenWithinBusinessHours" },
  { value: "outside_business_hours", labelKey: "whatsappLiteRuleTemplatesWhenOutsideBusinessHours" },
]

const EVENT_DATE_OP_OPTIONS: { value: EventDateDaysAheadOp; labelKey: WorkspaceSettingsTranslationKey }[] = [
  { value: "gt", labelKey: "whatsappLiteRuleTemplatesEventDateOpGt" },
  { value: "gte", labelKey: "whatsappLiteRuleTemplatesEventDateOpGte" },
  { value: "lt", labelKey: "whatsappLiteRuleTemplatesEventDateOpLt" },
  { value: "lte", labelKey: "whatsappLiteRuleTemplatesEventDateOpLte" },
  { value: "eq", labelKey: "whatsappLiteRuleTemplatesEventDateOpEq" },
]

const CONVERSATION_STATE_OPTIONS: { value: string; labelKey: WorkspaceSettingsTranslationKey }[] = [
  { value: "new_lead", labelKey: "whatsappLiteConvStateNewLead" },
  { value: "qualifying", labelKey: "whatsappLiteConvStateQualifying" },
  { value: "waiting_response", labelKey: "whatsappLiteConvStateWaitingResponse" },
  { value: "negotiating", labelKey: "whatsappLiteConvStateNegotiating" },
  { value: "human_handoff", labelKey: "whatsappLiteConvStateHumanHandoff" },
  { value: "followup", labelKey: "whatsappLiteConvStateFollowup" },
  { value: "won", labelKey: "whatsappLiteConvStateWon" },
  { value: "lost", labelKey: "whatsappLiteConvStateLost" },
  { value: "blocked", labelKey: "whatsappLiteConvStateBlocked" },
  { value: "idle", labelKey: "whatsappLiteConvStateIdle" },
]

const DELAY_UNIT_OPTIONS: { value: DelayUnit; labelKey: WorkspaceSettingsTranslationKey }[] = [
  { value: "minutes", labelKey: "whatsappLiteDelayUnitMinutes" },
  { value: "hours", labelKey: "whatsappLiteDelayUnitHours" },
  { value: "days", labelKey: "whatsappLiteDelayUnitDays" },
  { value: "weeks", labelKey: "whatsappLiteDelayUnitWeeks" },
  { value: "months", labelKey: "whatsappLiteDelayUnitMonths" },
]

/** Mesmo padrão que project details / integrações (`SelectInput` + `size="small"`). */
export const waTemplateSelectInputTriggerClassNames =
  "w-full min-w-0 max-w-full overflow-hidden rounded-md border border-neutral-50 bg-white font-normal shadow-sm hover:bg-neutral-10"

/** Trigger alinhado à altura do `TextInput` `size="small"`. */
export const waTemplateSelectInputSmallTriggerClassNames = cn(
  waTemplateSelectInputTriggerClassNames,
  "h-8 min-h-8 py-0 text-body-12"
)

export const waTemplateSelectInputViewportClassNames =
  "!w-[var(--radix-select-trigger-width)] max-h-[min(280px,50vh)] overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]"

export { waSearchPopoverScrollListClass } from "./waSettingsTypography"

export const waTemplateSearchPopoverClassNames = {
  content: "z-[500] max-h-[min(360px,var(--radix-popper-available-height))] border border-neutral-100 p-0 shadow-sm",
  container: "flex min-h-0 w-[min(100vw-2rem,320px)] min-w-[260px] flex-col overflow-hidden",
  itemsContainer: waSearchPopoverScrollListClass,
  trigger: "w-full min-w-0",
} as const

export const waTemplateInputClassName =
  "h-8 min-h-8 rounded-md border border-neutral-50 bg-white px-2.5 text-body-12 shadow-sm md:text-body-12"

function ClassifierResultFields({
  when,
  onWhenChange,
  t,
  readOnly,
}: {
  when: VisualWhen
  onWhenChange: (next: VisualWhen) => void
  t: TFn
  readOnly: boolean
}) {
  const [draft, setDraft] = useState("")
  const labels = llmLabelList(when).filter((label) => label.toLowerCase() !== "else")
  const match = (when.llmMatch ?? "").trim().toLowerCase()

  const commit = (nextLabels: string[], nextMatch?: string) => {
    const seen = new Set<string>()
    const unique: string[] = []
    for (const label of nextLabels) {
      const trimmed = label.trim()
      const key = trimmed.toLowerCase()
      if (!trimmed || seen.has(key) || key === "else") continue
      seen.add(key)
      unique.push(trimmed)
    }
    const requested = (nextMatch ?? when.llmMatch ?? "").trim()
    const chosen = unique.find((label) => label.toLowerCase() === requested.toLowerCase()) ?? unique[0] ?? ""
    onWhenChange({ ...when, llmLabelsText: unique.join(", "), llmMatch: chosen })
  }

  return (
    <div className="space-y-2">
      <Label className={waFieldLabelClass}>{t("whatsappLiteRuleTemplatesLlmLabelsLabel")}</Label>
      <p className={waFieldHintClass}>{t("whatsappLiteRuleTemplatesLlmResultsHint")}</p>
      {labels.map((label, index) => {
        const isTop = label.toLowerCase() === match
        return (
          <div key={`${label.toLowerCase()}-${index}`} className="flex items-center gap-2">
            <Input
              value={label}
              readOnly={readOnly}
              className={waTemplateInputClassName}
              onChange={(event) => {
                const next = labels.map((item, i) => (i === index ? event.target.value : item))
                commit(next, isTop ? event.target.value : when.llmMatch)
              }}
            />
            <button
              type="button"
              disabled={readOnly}
              className={cn(
                "shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold",
                isTop ? "bg-[#eef7f3] text-[#153426]" : "text-neutral-500 hover:bg-neutral-10"
              )}
              onClick={() => commit(labels, label)}
            >
              {t("whatsappLiteRuleTemplatesLlmTopPath")}
            </button>
            <button
              type="button"
              disabled={readOnly}
              className="shrink-0 px-1 text-body-12 text-neutral-400 hover:text-neutral-700"
              onClick={() => commit(labels.filter((_, i) => i !== index))}
              aria-label={label}
            >
              ×
            </button>
          </div>
        )
      })}
      <div className="flex items-center gap-2">
        <Input
          value={draft}
          readOnly={readOnly}
          placeholder="lead_live_brasil"
          className={waTemplateInputClassName}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return
            event.preventDefault()
            if (!draft.trim()) return
            commit([...labels, draft])
            setDraft("")
          }}
        />
        <button
          type="button"
          disabled={readOnly || !draft.trim()}
          className="shrink-0 rounded-md border border-neutral-100 bg-white px-2 py-1 text-body-12 font-medium text-neutral-700 disabled:opacity-40"
          onClick={() => {
            if (!draft.trim()) return
            commit([...labels, draft])
            setDraft("")
          }}
        >
          {t("whatsappLiteRuleTemplatesLlmAddResult")}
        </button>
      </div>
    </div>
  )
}

export function TemplateWhenFields({
  when,
  onWhenChange,
  t,
  llmWhenEnabled = true,
  groupChatConditionsEnabled = true,
  conditionIndex = 0,
  conditionsCount = 1,
  crmProjects = [],
  columnsByProjectId = {},
  onRequestColumns,
  conversationPickerSessionId,
  instagramPostBrowseSessions,
  channel = "whatsapp",
  triggerEvent,
}: {
  when: VisualWhen
  onWhenChange: (next: VisualWhen) => void
  t: TFn
  llmWhenEnabled?: boolean
  /** When false (hide group messages), chat_type / from_group_in conditions are hidden/disabled. */
  groupChatConditionsEnabled?: boolean
  conditionIndex?: number
  conditionsCount?: number
  crmProjects?: IProject[]
  columnsByProjectId?: Record<string, IColumn[]>
  onRequestColumns?: (projectId: string, boardId?: string) => void
  /** WhatsApp session used to load the group picker for from_group_in. */
  conversationPickerSessionId?: string
  /** Instagram accounts whose posts can be listed in the comment picker. */
  instagramPostBrowseSessions?: Array<{ _id: string; label: string }>
  channel?: MessagingTemplateFlowChannel
  /** When the event is already a comment, the comment condition is redundant. */
  triggerEvent?: VisualTriggerEvent
}) {
  const [whenOpen, setWhenOpen] = useState(false)
  const [whenSearch, setWhenSearch] = useState("")
  const setWhenSearchCb = useCallback((v: string) => setWhenSearch(v), [])

  const whenItems = useMemo(() => {
    const llmTypes = new Set<VisualWhenType>(["llm_match", "llm_conversation_match"])
    const opts = whenOptions.filter((o) => {
      if (!llmWhenEnabled && llmTypes.has(o.value) && when.type !== o.value) return false
      if (!groupChatConditionsEnabled && o.value === "chat_type" && when.type !== "chat_type") return false
      if (!groupChatConditionsEnabled && o.value === "from_group_in" && when.type !== "from_group_in") return false
      if (channel !== "instagram" && o.value === "instagram_comment" && when.type !== "instagram_comment") return false
      // Click-to-WhatsApp ads only exist on WhatsApp (official Cloud API numbers).
      if (channel !== "whatsapp" && o.value === "from_ad" && when.type !== "from_ad") return false
      // Instagram contacts have no phone number, so a phone condition could never match.
      if (channel === "instagram" && o.value === "from_phone_in" && when.type !== "from_phone_in") return false
      if (triggerEvent === "comment_received" && o.value === "instagram_comment") return false
      return true
    })
    return opts.map((o) => ({ value: o.value, displayName: t(o.labelKey) }))
  }, [t, llmWhenEnabled, groupChatConditionsEnabled, when.type, channel, triggerEvent])

  const whenQuery = whenSearch.trim().toLowerCase()
  const filteredWhenItems = useMemo(() => {
    if (!whenQuery) return whenItems
    return whenItems.filter((item) => item.displayName.toLowerCase().includes(whenQuery))
  }, [whenItems, whenQuery])

  const selectedWhenLabel = whenItems.find((item) => item.value === when.type)?.displayName ?? when.type

  const whenOptionItems = filteredWhenItems.map((item) => (
    <SearchOption key={item.value} value={item.value} className="w-full">
      <span className="block truncate text-left text-body-14 text-neutral-900">{item.displayName}</span>
    </SearchOption>
  ))

  const titleLabel = `${t("whatsappLiteRuleTemplatesConditionLabel")} ${conditionIndex + 1}`

  return (
    <div className="min-w-0 space-y-3 overflow-hidden">
      <div className="flex items-center gap-2">
        <div className="h-4 w-1 shrink-0 rounded-full bg-[#153426]" aria-hidden />
        <Label className="text-body-12 font-semibold text-neutral-900">{titleLabel}</Label>
      </div>
      {!llmWhenEnabled && (when.type === "llm_match" || when.type === "llm_conversation_match") ? (
        <p className={waFieldHintClass}>{t("whatsappLiteAiAutomationRequiresPlan")}</p>
      ) : null}
      <SearchPopover
        modal={false}
        open={whenOpen}
        onOpenChange={(next) => {
          setWhenOpen(next)
          if (!next) setWhenSearch("")
        }}
        value={when.type}
        onChange={(v) => {
          if (typeof v !== "string" || !v) return
          onWhenChange(createVisualWhenForType(v as VisualWhenType))
          setWhenOpen(false)
          setWhenSearch("")
        }}
        searchValue={whenSearch}
        setSearchValue={setWhenSearchCb}
        inputPlaceholder={t("whatsappLiteRuleTemplatesWhenSearch")}
        items={whenOptionItems}
        multipleSelect={false}
        showSearchInput
        emptyContent={
          <div className="px-3 py-4 text-center text-body-12 text-neutral-500">
            {t("whatsappLiteRuleTemplatesWhenNoMatch")}
          </div>
        }
        classNames={{
          content:
            "z-[500] max-h-[min(360px,var(--radix-popper-available-height))] border border-neutral-100 p-0 shadow-sm",
          container: "flex min-h-0 w-[min(100vw-2rem,320px)] min-w-[260px] flex-col overflow-hidden",
          itemsContainer:
            "max-h-[min(280px,calc(var(--radix-popper-available-height)-120px))] min-h-0 overflow-y-auto overscroll-contain",
          trigger: "w-full min-w-0",
        }}
      >
        <button
          type="button"
          disabled={!llmWhenEnabled && (when.type === "llm_match" || when.type === "llm_conversation_match")}
          className={cn(
            waTemplateSelectInputTriggerClassNames,
            "flex h-8 items-center gap-2 px-2.5 text-body-12 disabled:opacity-60"
          )}
          aria-haspopup="listbox"
        >
          <span className="min-w-0 flex-1 truncate text-left">{selectedWhenLabel}</span>
          <ArrowDown2 size={16} variant="Linear" className={cn("shrink-0", whenOpen && "rotate-180")} aria-hidden />
        </button>
      </SearchPopover>

      {!groupChatConditionsEnabled && when.type === "chat_type" ? (
        <p className={waFieldHintClass}>{t("whatsappLiteRuleTemplatesWhenChatTypeDisabled")}</p>
      ) : null}

      {when.type === "chat_type" ? (
        <div className="space-y-2">
          <Label className={waFieldLabelClass}>{t("whatsappLiteRuleTemplatesWhenChatType")}</Label>
          <SelectInput
            size="small"
            inheritTriggerWidth
            portalClassNames="z-[500]"
            value={when.chatTypeValue ?? "direct"}
            items={[
              { value: "direct", displayName: t("whatsappLiteRuleTemplatesWhenChatTypeDirect") },
              { value: "group", displayName: t("whatsappLiteRuleTemplatesWhenChatTypeGroup") },
              { value: "any", displayName: t("whatsappLiteRuleTemplatesWhenChatTypeAny") },
            ]}
            triggerClassNames={waTemplateSelectInputTriggerClassNames}
            viewportClassNames={waTemplateSelectInputViewportClassNames}
            disabled={!groupChatConditionsEnabled}
            onValueChange={(v) => {
              if (v !== "direct" && v !== "group" && v !== "any") return
              onWhenChange({ ...when, chatTypeValue: v })
            }}
          />
          <p className={waFieldHintClass}>{t("whatsappLiteRuleTemplatesWhenChatTypeHint")}</p>
        </div>
      ) : null}

      {!groupChatConditionsEnabled && when.type === "from_group_in" ? (
        <p className={waFieldHintClass}>{t("whatsappLiteRuleTemplatesWhenChatTypeDisabled")}</p>
      ) : null}

      {when.type === "from_group_in" ? (
        <div className="space-y-2">
          <Label className={waFieldLabelClass}>{t("whatsappLiteRuleTemplatesWhenFromGroupMode")}</Label>
          <SelectInput
            size="small"
            inheritTriggerWidth
            portalClassNames="z-[500]"
            value={when.fromGroupMode ?? "in"}
            items={[
              { value: "in", displayName: t("whatsappLiteRuleTemplatesWhenModeIn") },
              { value: "not_in", displayName: t("whatsappLiteRuleTemplatesWhenModeNotIn") },
            ]}
            triggerClassNames={waTemplateSelectInputTriggerClassNames}
            viewportClassNames={waTemplateSelectInputViewportClassNames}
            disabled={!groupChatConditionsEnabled}
            onValueChange={(v) => {
              if (v !== "in" && v !== "not_in") return
              onWhenChange({ ...when, fromGroupMode: v })
            }}
          />
          <Label className={waFieldLabelClass}>{t("whatsappLiteRuleTemplatesWhenFromGroupLabel")}</Label>
          <WorkflowConversationMultiParamPicker
            sessionId={conversationPickerSessionId ?? ""}
            value={(when.fromGroupIds ?? []).join(", ")}
            onChange={(csv) =>
              onWhenChange({
                ...when,
                fromGroupIds: csv
                  .split(/[,;\n]/)
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            chatType="group"
            disabled={!groupChatConditionsEnabled}
            labels={{
              searchPlaceholder: t("whatsappLiteRuleTemplatesGroupSearch"),
              noneLabel: t("whatsappLiteRuleTemplatesGroupNone"),
              blockedMessage: t("whatsappLiteRuleTemplatesGroupNeedSession"),
            }}
          />
          <p className={waFieldHintClass}>{t("whatsappLiteRuleTemplatesWhenFromGroupHint")}</p>
        </div>
      ) : null}

      {when.type === "from_phone_in" ? (
        <div className="space-y-2">
          <Label className={waFieldLabelClass}>{t("whatsappLiteRuleTemplatesWhenFromPhoneMode")}</Label>
          <SelectInput
            size="small"
            inheritTriggerWidth
            portalClassNames="z-[500]"
            value={when.fromPhoneMode ?? "in"}
            items={[
              { value: "in", displayName: t("whatsappLiteRuleTemplatesWhenModeIn") },
              { value: "not_in", displayName: t("whatsappLiteRuleTemplatesWhenModeNotIn") },
            ]}
            triggerClassNames={waTemplateSelectInputTriggerClassNames}
            viewportClassNames={waTemplateSelectInputViewportClassNames}
            onValueChange={(v) => {
              if (v !== "in" && v !== "not_in") return
              onWhenChange({ ...when, fromPhoneMode: v })
            }}
          />
          <Label className={waFieldLabelClass}>{t("whatsappLiteRuleTemplatesWhenFromPhoneLabel")}</Label>
          <Textarea
            value={when.fromPhonesText ?? ""}
            onChange={(e) => onWhenChange({ ...when, fromPhonesText: e.target.value })}
            placeholder="+55 11 98888-7777, +1 555 123 4567"
            className="min-h-[64px] text-body-12"
          />
          <p className={waFieldHintClass}>{t("whatsappLiteRuleTemplatesWhenFromPhoneHint")}</p>
        </div>
      ) : null}

      {when.type === "from_ad" ? (
        <div className="space-y-2">
          <p className={waFieldHintClass}>{t("whatsappLiteRuleTemplatesWhenFromAdHint")}</p>
          <Label className={waFieldLabelClass}>{t("whatsappLiteRuleTemplatesWhenFromAdMatch")}</Label>
          <SelectInput
            size="small"
            inheritTriggerWidth
            portalClassNames="z-[500]"
            value={when.fromAdMatch ?? "any"}
            items={[
              { value: "any", displayName: t("whatsappLiteRuleTemplatesWhenFromAdAny") },
              { value: "ad_in", displayName: t("whatsappLiteRuleTemplatesWhenFromAdIds") },
              { value: "campaign_in", displayName: t("whatsappLiteRuleTemplatesWhenFromAdCampaigns") },
              { value: "headline_contains", displayName: t("whatsappLiteRuleTemplatesWhenFromAdHeadline") },
            ]}
            triggerClassNames={waTemplateSelectInputTriggerClassNames}
            viewportClassNames={waTemplateSelectInputViewportClassNames}
            onValueChange={(v) => {
              if (v !== "any" && v !== "ad_in" && v !== "campaign_in" && v !== "headline_contains") return
              onWhenChange({ ...when, fromAdMatch: v })
            }}
          />
          {when.fromAdMatch === "ad_in" ? (
            <Textarea
              value={when.fromAdIdsText ?? ""}
              onChange={(e) => onWhenChange({ ...when, fromAdIdsText: e.target.value })}
              placeholder="120226305854810726, 120226305854810727"
              className="min-h-[64px] text-body-12"
            />
          ) : null}
          {when.fromAdMatch === "campaign_in" ? (
            <>
              <Textarea
                value={when.fromAdCampaignIdsText ?? ""}
                onChange={(e) => onWhenChange({ ...when, fromAdCampaignIdsText: e.target.value })}
                placeholder="120210000000000001"
                className="min-h-[64px] text-body-12"
              />
              <p className={waFieldHintClass}>{t("whatsappLiteRuleTemplatesWhenFromAdCampaignsHint")}</p>
            </>
          ) : null}
          {when.fromAdMatch === "headline_contains" ? (
            <Input
              value={when.fromAdHeadline ?? ""}
              onChange={(e) => onWhenChange({ ...when, fromAdHeadline: e.target.value })}
              placeholder="Black Friday"
              className={waTemplateInputClassName}
            />
          ) : null}
          <Label className={waFieldLabelClass}>{t("whatsappLiteRuleTemplatesWhenFromAdScope")}</Label>
          <SelectInput
            size="small"
            inheritTriggerWidth
            portalClassNames="z-[500]"
            value={when.fromAdScope ?? "current_message"}
            items={[
              { value: "current_message", displayName: t("whatsappLiteRuleTemplatesWhenFromAdScopeMessage") },
              { value: "conversation", displayName: t("whatsappLiteRuleTemplatesWhenFromAdScopeConversation") },
            ]}
            triggerClassNames={waTemplateSelectInputTriggerClassNames}
            viewportClassNames={waTemplateSelectInputViewportClassNames}
            onValueChange={(v) =>
              onWhenChange({ ...when, fromAdScope: v === "conversation" ? "conversation" : "current_message" })
            }
          />
        </div>
      ) : null}

      {when.type === "contains" || when.type === "not_contains" ? (
        <div className="grid gap-3">
          <div className="space-y-1">
            <Label className={waFieldLabelClass}>{t("whatsappLiteRuleTemplatesContainsPhrase")}</Label>
            <Input
              value={when.containsValue ?? ""}
              onChange={(e) => onWhenChange({ ...when, containsValue: e.target.value })}
              placeholder="preço, orçamento…"
              className={waTemplateInputClassName}
            />
          </div>
          <label className="flex items-center gap-2 text-body-12 text-neutral-700">
            <Checkbox
              checked={when.containsCaseInsensitive !== false}
              onCheckedChange={(c) => onWhenChange({ ...when, containsCaseInsensitive: c === true })}
            />
            {t("whatsappLiteRuleTemplatesIgnoreCase")}
          </label>
        </div>
      ) : null}

      {when.type === "regex" ? (
        <div className="space-y-1">
          <Label className={waFieldLabelClass}>{t("whatsappLiteRuleTemplatesRegexPatternLabel")}</Label>
          <Input
            value={when.regexPattern ?? ""}
            onChange={(e) => onWhenChange({ ...when, regexPattern: e.target.value })}
            placeholder="orcamento|orçamento"
            className={waTemplateInputClassName}
          />
        </div>
      ) : null}

      {when.type === "linked_card_in" ? (
        <LinkedCardInConditionFields
          rows={when.linkedCardAnyOf ?? [{ projectId: "", columnIds: [] }]}
          mode={when.linkedCardMode ?? "in"}
          onModeChange={(linkedCardMode) => onWhenChange({ ...when, linkedCardMode })}
          onChange={(linkedCardAnyOf) => onWhenChange({ ...when, linkedCardAnyOf })}
          crmProjects={crmProjects}
          columnsByProjectId={columnsByProjectId}
          onRequestColumns={onRequestColumns ?? (() => undefined)}
          t={t}
        />
      ) : null}

      {when.type === "new_lead" ? (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className={waFieldLabelClass}>{t("whatsappLiteRuleTemplatesNewLeadScope")}</Label>
            <div className="flex rounded-md border border-neutral-100 bg-neutral-50 p-0.5 text-body-12">
              <button
                type="button"
                onClick={() => onWhenChange({ ...when, newLeadScope: "workspace" })}
                className={cn(
                  "flex-1 rounded px-3 py-1 transition-colors",
                  (when.newLeadScope ?? "workspace") === "workspace"
                    ? "bg-white font-medium text-neutral-900 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-700"
                )}
              >
                {t("whatsappLiteRuleTemplatesNewLeadScopeWorkspace")}
              </button>
              <button
                type="button"
                onClick={() =>
                  onWhenChange({
                    ...when,
                    newLeadScope: "project",
                    newLeadProjectId: when.newLeadProjectId ?? "",
                    newLeadBoardId: when.newLeadBoardId ?? "",
                    newLeadColumnIds: when.newLeadColumnIds ?? [],
                  })
                }
                className={cn(
                  "flex-1 rounded px-3 py-1 transition-colors",
                  when.newLeadScope === "project"
                    ? "bg-white font-medium text-neutral-900 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-700"
                )}
              >
                {t("whatsappLiteRuleTemplatesNewLeadScopeFunnel")}
              </button>
            </div>
          </div>
          {(when.newLeadScope ?? "workspace") === "workspace" ? (
            <p className={waFieldHintClass}>{t("whatsappLiteRuleTemplatesNewLeadWorkspaceHint")}</p>
          ) : (
            <LinkedCardInConditionFields
              rows={[
                {
                  projectId: when.newLeadProjectId ?? "",
                  boardId: when.newLeadBoardId ?? "",
                  columnIds: when.newLeadColumnIds ?? [],
                },
              ]}
              showModeToggle={false}
              hintKey="whatsappLiteRuleTemplatesNewLeadFunnelHint"
              onChange={(rows) =>
                onWhenChange({
                  ...when,
                  newLeadProjectId: rows[0]?.projectId ?? "",
                  newLeadBoardId: rows[0]?.boardId ?? "",
                  newLeadColumnIds: rows[0]?.columnIds ?? [],
                })
              }
              crmProjects={crmProjects}
              columnsByProjectId={columnsByProjectId}
              onRequestColumns={onRequestColumns ?? (() => undefined)}
              t={t}
            />
          )}
        </div>
      ) : null}

      {when.type === "llm_match" ? (
        <div className={cn("grid gap-3", !llmWhenEnabled && "pointer-events-none opacity-60")}>
          <ClassifierResultFields
            when={when}
            onWhenChange={onWhenChange}
            t={t}
            readOnly={!llmWhenEnabled}
          />
          <div className="space-y-1">
            <Label className={waFieldLabelClass}>{t("whatsappLiteRuleTemplatesLlmHintLabel")}</Label>
            <Input
              value={when.llmHint ?? ""}
              onChange={(e) => onWhenChange({ ...when, llmHint: e.target.value })}
              className={waTemplateInputClassName}
              readOnly={!llmWhenEnabled}
            />
          </div>
        </div>
      ) : null}

      {when.type === "llm_conversation_match" ? (
        <div className={cn("grid gap-3", !llmWhenEnabled && "pointer-events-none opacity-60")}>
          <div className="space-y-1">
            <Label className={waFieldLabelClass}>{t("whatsappLiteRuleTemplatesLlmConvPromptLabel")}</Label>
            <Textarea
              value={when.llmConversationPrompt ?? ""}
              onChange={(e) => onWhenChange({ ...when, llmConversationPrompt: e.target.value })}
              placeholder={t("whatsappLiteRuleTemplatesLlmConvPromptPlaceholder")}
              className="min-h-[80px] text-body-12"
              readOnly={!llmWhenEnabled}
            />
          </div>
          <ClassifierResultFields
            when={when}
            onWhenChange={onWhenChange}
            t={t}
            readOnly={!llmWhenEnabled}
          />
          <div className="space-y-1">
            <Label className={waFieldLabelClass}>{t("whatsappLiteRuleTemplatesLlmHintLabel")}</Label>
            <Input
              value={when.llmHint ?? ""}
              onChange={(e) => onWhenChange({ ...when, llmHint: e.target.value })}
              className={waTemplateInputClassName}
              readOnly={!llmWhenEnabled}
            />
          </div>
        </div>
      ) : null}

      {when.type === "event_date_days_ahead" ? (
        <div className="grid gap-3">
          <p className={waFieldHintClass}>{t("whatsappLiteRuleTemplatesEventDateHint")}</p>
          <div className="space-y-1">
            <Label className={waFieldLabelClass}>{t("whatsappLiteRuleTemplatesEventDateOpLabel")}</Label>
            <SelectInput
              size="small"
              inheritTriggerWidth
              portalClassNames="z-[500]"
              value={when.eventDateOp ?? "gt"}
              items={EVENT_DATE_OP_OPTIONS.map((opt) => ({
                value: opt.value,
                displayName: t(opt.labelKey),
              }))}
              triggerClassNames={waTemplateSelectInputTriggerClassNames}
              viewportClassNames={waTemplateSelectInputViewportClassNames}
              onValueChange={(v) => {
                if (v !== "gt" && v !== "gte" && v !== "lt" && v !== "lte" && v !== "eq") return
                onWhenChange({ ...when, eventDateOp: v })
              }}
            />
          </div>
          <div className="space-y-1">
            <Label className={waFieldLabelClass}>{t("whatsappLiteRuleTemplatesEventDateDaysLabel")}</Label>
            <Input
              type="number"
              min={0}
              step={1}
              value={when.eventDateDays ?? 30}
              onChange={(e) => {
                const n = Number.parseInt(e.target.value, 10)
                onWhenChange({
                  ...when,
                  eventDateDays: Number.isFinite(n) && n >= 0 ? n : 0,
                })
              }}
              className={waTemplateInputClassName}
            />
          </div>
          <label className="flex cursor-pointer items-start gap-2">
            <Checkbox
              checked={when.eventDateMatchIfMissing === true}
              onCheckedChange={(checked) => onWhenChange({ ...when, eventDateMatchIfMissing: checked === true })}
              className="mt-0.5"
            />
            <span className="text-body-12 text-neutral-700">
              {t("whatsappLiteRuleTemplatesEventDateMatchIfMissing")}
            </span>
          </label>
        </div>
      ) : null}

      {when.type === "instagram_comment" ? (
        <div className="space-y-3">
          <label className="flex cursor-pointer items-start gap-2">
            <Checkbox
              checked={(when.commentPostScope ?? "all") === "all"}
              onCheckedChange={(checked) =>
                onWhenChange({
                  ...when,
                  commentPostScope: checked === true ? "all" : "selected",
                })
              }
              className="mt-0.5"
            />
            <span className="text-body-12 text-neutral-700">{t("instagramLiteRuleTemplatesWhenCommentAll")}</span>
          </label>
          {(when.commentPostScope ?? "all") !== "all" ? (
            <InstagramCommentPostPicker
              sessions={instagramPostBrowseSessions ?? []}
              selectedIds={when.commentPostIds ?? []}
              onChange={(commentPostIds) => onWhenChange({ ...when, commentPostIds, commentPostScope: "selected" })}
              t={t}
            />
          ) : null}
          <div className="space-y-2">
            <Label className={waFieldLabelClass}>{t("instagramLiteRuleTemplatesCommentTextMatch")}</Label>
            <SelectInput
              size="small"
              inheritTriggerWidth
              portalClassNames="z-[500]"
              value={when.commentTextMatch ?? "any"}
              items={[
                { value: "any", displayName: t("instagramLiteRuleTemplatesCommentTextAny") },
                { value: "contains", displayName: t("whatsappLiteRuleTemplatesWhenContains") },
                { value: "not_contains", displayName: t("whatsappLiteRuleTemplatesWhenNotContains") },
              ]}
              triggerClassNames={waTemplateSelectInputTriggerClassNames}
              viewportClassNames={waTemplateSelectInputViewportClassNames}
              onValueChange={(v) => {
                if (v !== "any" && v !== "contains" && v !== "not_contains") return
                onWhenChange({ ...when, commentTextMatch: v })
              }}
            />
            {(when.commentTextMatch ?? "any") !== "any" ? (
              <div className="grid gap-3">
                <Input
                  value={when.commentTextValue ?? ""}
                  onChange={(e) => onWhenChange({ ...when, commentTextValue: e.target.value })}
                  placeholder="preço, orçamento…"
                  className={waTemplateInputClassName}
                />
                <label className="flex items-center gap-2 text-body-12 text-neutral-700">
                  <Checkbox
                    checked={when.commentTextCaseInsensitive !== false}
                    onCheckedChange={(c) => onWhenChange({ ...when, commentTextCaseInsensitive: c === true })}
                  />
                  {t("whatsappLiteRuleTemplatesIgnoreCase")}
                </label>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function ExpandableAgentSearch({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (next: string) => void
  placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleOpen = () => {
    if (open) {
      inputRef.current?.focus()
      return
    }
    setOpen(true)
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  return (
    <div
      className={cn(
        "flex min-h-7 items-center rounded border border-neutral-50 bg-white",
        open ? "min-w-[160px] flex-1 gap-2 px-2 py-1" : "size-7 shrink-0 justify-center px-0"
      )}
    >
      <button
        type="button"
        onClick={handleOpen}
        aria-label={placeholder}
        className="flex size-4 shrink-0 items-center justify-center"
      >
        <SearchNormal1 className="size-4 text-neutral-500" />
      </button>
      <input
        ref={inputRef}
        placeholder={placeholder}
        aria-label={placeholder}
        className={cn(
          "bg-transparent text-xs text-neutral-900 placeholder:text-neutral-100 focus:outline-none focus:ring-0",
          open ? "w-full min-w-[80px]" : "w-0 p-0"
        )}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => {
          if (!value.trim()) setOpen(false)
        }}
        value={value}
      />
    </div>
  )
}

export function TemplateActionFields({
  action,
  onActionChange,
  agents,
  crmProjects,
  columnsByProjectId,
  onRequestColumns,
  t,
  agentAutoReplyEnabled = true,
  channel = "whatsapp",
  conversationPickerSessionId,
}: {
  action: VisualAction
  onActionChange: (next: VisualAction) => void
  agents: Array<{ _id: string; name: string; icon?: string | null }>
  crmProjects: IProject[]
  columnsByProjectId: Record<string, IColumn[]>
  onRequestColumns: (projectId: string, boardId?: string) => void
  t: TFn
  agentAutoReplyEnabled?: boolean
  channel?: MessagingTemplateFlowChannel
  /** WhatsApp session used to load the group picker for send_text group targeting. */
  conversationPickerSessionId?: string
}) {
  const [agentSearch, setAgentSearch] = useState("")
  const [agentGridQuery, setAgentGridQuery] = useState("")
  const [pickOpen, setPickOpen] = useState(false)
  const [actionTypeSearch, setActionTypeSearch] = useState("")
  const [actionTypeOpen, setActionTypeOpen] = useState(false)
  const [assignUserSearch, setAssignUserSearch] = useState("")
  const [assignUserOpen, setAssignUserOpen] = useState(false)

  const { selectedWorkspace } = useWorkspace()
  const team = (selectedWorkspace?.members ?? []) as IUser[]
  const { templates: messageTemplates } = useInboundMessageTemplates()

  const setAgentSearchCb = useCallback((q: string) => setAgentSearch(q), [])
  const setActionTypeSearchCb = useCallback((q: string) => setActionTypeSearch(q), [])
  const setAssignUserSearchCb = useCallback((q: string) => setAssignUserSearch(q), [])
  const qq = agentSearch.trim().toLowerCase()
  const filteredAgents = !qq
    ? agents
    : agents.filter((a) => {
        const name = (a.name?.trim() ?? "").toLowerCase()
        return name.includes(qq) || a._id.toLowerCase().includes(qq)
      })
  const gridQuery = agentGridQuery.trim().toLowerCase()
  const gridAgents = !gridQuery
    ? agents
    : agents.filter((a) => {
        const name = (a.name?.trim() ?? "").toLowerCase()
        return name.includes(gridQuery) || a._id.toLowerCase().includes(gridQuery)
      })

  const agentItems = filteredAgents.map((a) => (
    <SearchOption key={a._id} value={a._id} className="w-full">
      <AgentSearchOptionRow name={a.name?.trim() || a._id} icon={a.icon} />
    </SearchOption>
  ))

  const selectedFollowupAgent = agents.find((a) => a._id === action.followupAgentId)

  const projectValue = (action.moveProjectId ?? "").trim() || NONE

  const actionTypeItems = useMemo(() => {
    const labels = buildTemplateFlowActionLabels(channel, t)
    return Object.entries(labels).map(([value, displayName]) => ({
      value: value as VisualAction["type"],
      displayName,
    }))
  }, [channel, t])

  const projectSearchItems = useMemo(
    () => [
      { value: NONE, label: t("whatsappLiteRuleTemplatesPickProject") },
      ...crmProjects.map((p) => ({ value: p._id, label: p.title || p._id })),
    ],
    [t, crmProjects]
  )

  const moveColumns = columnsByProjectId[action.moveProjectId ?? ""] ?? []
  const moveProject = crmProjects.find((p) => p._id === action.moveProjectId)
  const moveBoards = boardsForColumnPicker(moveProject, moveColumns)
  const destinationLabel = moveBoards.length > 1 ? t("whatsappLiteLeadBoard") : t("whatsappLiteRuleTemplatesMoveColumn")

  const soleBoardId = moveBoards.length === 1 ? moveBoards[0]!.boardId : ""

  useEffect(() => {
    if (action.type !== "create_lead") return
    if ((action.boardId ?? "").trim()) return
    if (!soleBoardId) return
    onActionChange({ ...action, boardId: soleBoardId })
    const pid = (action.moveProjectId ?? "").trim()
    if (pid) onRequestColumns(pid, soleBoardId)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed once when the only tab is known
  }, [action.type, action.boardId, soleBoardId, action.moveProjectId])

  const delayUnitItems = useMemo(
    () => DELAY_UNIT_OPTIONS.map((o) => ({ value: o.value, displayName: t(o.labelKey) })),
    [t]
  )

  const stateItems = useMemo(
    () => CONVERSATION_STATE_OPTIONS.map((o) => ({ value: o.value, displayName: t(o.labelKey) })),
    [t]
  )

  const actionTypeQuery = actionTypeSearch.trim().toLowerCase()
  const filteredActionTypeItems = useMemo(() => {
    if (!actionTypeQuery) return actionTypeItems
    return actionTypeItems.filter((item) => item.displayName.toLowerCase().includes(actionTypeQuery))
  }, [actionTypeItems, actionTypeQuery])

  const selectedActionTypeLabel = actionTypeItems.find((item) => item.value === action.type)?.displayName ?? action.type

  const actionTypeOptionItems = filteredActionTypeItems.map((item) => (
    <SearchOption key={item.value} value={item.value} className="w-full">
      <span className="block truncate text-left text-body-14 text-neutral-900">{item.displayName}</span>
    </SearchOption>
  ))

  return (
    <div className="min-w-0 space-y-3 overflow-hidden">
      <div className="flex items-center gap-2">
        <div className="h-4 w-1 shrink-0 rounded-full bg-[#45ad7e]" aria-hidden />
        <Label className="text-body-12 font-semibold text-neutral-900">
          {t("whatsappLiteRuleTemplatesActionType")}
        </Label>
      </div>
      <SearchPopover
        modal={false}
        open={actionTypeOpen}
        onOpenChange={(next) => {
          setActionTypeOpen(next)
          if (!next) setActionTypeSearch("")
        }}
        value={action.type}
        onChange={(v) => {
          if (typeof v !== "string" || !v) return
          onActionChange(createVisualActionForType(v as VisualAction["type"], agentAutoReplyEnabled))
          setActionTypeOpen(false)
          setActionTypeSearch("")
        }}
        searchValue={actionTypeSearch}
        setSearchValue={setActionTypeSearchCb}
        inputPlaceholder={t("whatsappLiteRuleTemplatesActionSearch")}
        items={actionTypeOptionItems}
        multipleSelect={false}
        showSearchInput
        emptyContent={
          <div className="px-3 py-4 text-center text-body-12 text-neutral-500">
            {t("whatsappLiteRuleTemplatesActionNoMatch")}
          </div>
        }
        classNames={{
          content:
            "z-[500] max-h-[min(360px,var(--radix-popper-available-height))] border border-neutral-50 p-0 shadow-lg",
          container: "flex min-h-0 w-[min(100vw-2rem,320px)] min-w-[240px] flex-col overflow-hidden",
          itemsContainer: "max-h-[min(280px,calc(var(--radix-popper-available-height)-120px))] min-h-0 overflow-y-auto",
          trigger: "w-full min-w-0",
        }}
      >
        <button
          type="button"
          className={cn(
            "nodrag nopan flex h-8 min-h-8 w-full items-center justify-between gap-2 rounded-md border border-neutral-50 bg-white px-2.5 text-body-12 shadow-sm"
          )}
          aria-haspopup="listbox"
        >
          <span className="min-w-0 flex-1 truncate text-left">{selectedActionTypeLabel}</span>
          <ArrowDown2
            size={16}
            variant="Linear"
            className={cn("shrink-0", actionTypeOpen && "rotate-180")}
            aria-hidden
          />
        </button>
      </SearchPopover>

      {action.type === "execute_agent" || action.type === "enable_conversation_agent" ? (
        <div className="flex flex-col gap-4 pt-1">
          <div className="flex flex-col gap-1">
            <div className="flex w-full items-center gap-2">
              <p className="shrink-0 text-body-14 font-semibold leading-[1.3] text-neutral-500">
                {t("whatsappLiteRuleTemplatesChooseAgent")}
              </p>
              <div className="ml-auto flex min-w-0 flex-1 justify-end">
                <ExpandableAgentSearch
                  value={agentGridQuery}
                  onChange={setAgentGridQuery}
                  placeholder={t("whatsappLiteRuleTemplatesAgentSearch")}
                />
              </div>
            </div>
            {agents.length === 0 ? (
              <p className="text-body-12 text-neutral-500">{t("whatsappLiteRuleTemplatesNoAgentsInWorkspace")}</p>
            ) : gridAgents.length === 0 ? (
              <p className="text-body-12 text-neutral-500">{t("whatsappLiteRuleTemplatesAgentNoMatch")}</p>
            ) : (
              <div className="flex w-full flex-wrap content-start gap-2">
                {gridAgents.map((agent) => {
                  const name = agent.name?.trim() || agent._id
                  const selected = agent._id === action.agentId
                  return (
                    <button
                      key={agent._id}
                      type="button"
                      aria-pressed={selected}
                      title={name}
                      onClick={() => onActionChange({ ...action, agentId: agent._id })}
                      className={cn(
                        "flex w-[88px] flex-col items-center justify-center gap-2 rounded-lg border p-2",
                        selected ? "border-primary bg-primary-clean" : "border-neutral-50 bg-white"
                      )}
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border-[2.857px] border-solid border-white">
                        <ChatAgentAvatar icon={agent.icon} name={name} size="lg" hideRing />
                      </span>
                      <span className="w-full truncate text-center text-body-12 font-semibold text-neutral-500">
                        {name}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
          {action.type === "execute_agent" ? (
            <div className={cn("flex flex-col gap-1", !agentAutoReplyEnabled && "opacity-70")}>
              <label className="flex w-full items-center gap-2">
                <Checkbox
                  checked={agentAutoReplyEnabled && action.sendReply !== false}
                  disabled={!agentAutoReplyEnabled}
                  onCheckedChange={(c) => onActionChange({ ...action, sendReply: c === true })}
                />
                <span className="min-w-0 flex-1 text-body-12 font-normal leading-[1.2] text-neutral-500">
                  {t("whatsappLiteRuleTemplatesSendReply")}
                </span>
              </label>
              {!agentAutoReplyEnabled ? (
                <span className={waFieldHintClass}>{t("whatsappLiteAiAutomationRequiresPlan")}</span>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : action.type === "stop_flow" ? (
        <p className={waFieldHintClass}>{t("whatsappLiteRuleTemplatesStopFlowHint")}</p>
      ) : action.type === "disable_auto_reply" ? null : action.type === "reply_to_comment" ? (
        <div className="space-y-1">
          <Label className={waFieldLabelClass}>{t("instagramLiteRuleTemplatesReplyLabel")}</Label>
          <Textarea
            value={action.text ?? ""}
            onChange={(e) => onActionChange({ ...action, text: e.target.value })}
            className="min-h-[88px] rounded-md border border-neutral-50 text-body-12"
          />
        </div>
      ) : action.type === "send_text" ? (
        <div className="grid min-w-0 gap-3">
          <OutboundContentEditor
            label={t(templateFlowSendTextFieldLabelKey(channel))}
            value={
              action.outboundContent ?? {
                source: "text",
                text: action.text ?? "",
              }
            }
            onChange={(outboundContent) =>
              onActionChange({
                ...action,
                outboundContent,
                text: outboundContent.text ?? "",
              })
            }
            t={t}
            templates={messageTemplates}
          />
        </div>
      ) : action.type === "send_to_recipients" ? (
        <div className="grid min-w-0 gap-3">
          <OutboundContentEditor
            label={t(templateFlowSendTextFieldLabelKey(channel))}
            value={
              action.outboundContent ?? {
                source: "text",
                text: "",
              }
            }
            onChange={(outboundContent) => onActionChange({ ...action, outboundContent })}
            t={t}
            templates={messageTemplates}
          />
          <div className="space-y-1 border-t border-neutral-100 pt-3">
            <Label className={waFieldLabelClass}>{t("whatsappLiteRuleTemplatesRecipients")}</Label>
            <SendToRecipientsFields
              recipients={action.recipients ?? []}
              onChange={(recipients) => onActionChange({ ...action, recipients })}
              users={team}
              sessionId={conversationPickerSessionId}
              t={t}
            />
          </div>
        </div>
      ) : action.type === "schedule_followup" ? (
        <div className="grid min-w-0 gap-3">
          {/* Timing mode toggle */}
          <div className="space-y-1.5">
            <Label className={waFieldLabelClass}>{t("whatsappLiteFollowupFirstDelay")}</Label>
            <div className="flex rounded-md border border-neutral-100 bg-neutral-50 p-0.5 text-body-12">
              <button
                type="button"
                onClick={() => onActionChange({ ...action, followupSendAtLocalTime: "" })}
                className={cn(
                  "flex-1 rounded px-3 py-1 transition-colors",
                  !action.followupSendAtLocalTime
                    ? "bg-white font-medium text-neutral-900 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-700"
                )}
              >
                {t("whatsappLiteFollowupTimingModeAfter")}
              </button>
              <button
                type="button"
                onClick={() =>
                  onActionChange({
                    ...action,
                    followupSendAtLocalTime: action.followupSendAtLocalTime || "09:00",
                  })
                }
                className={cn(
                  "flex-1 rounded px-3 py-1 transition-colors",
                  action.followupSendAtLocalTime
                    ? "bg-white font-medium text-neutral-900 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-700"
                )}
              >
                {t("whatsappLiteFollowupTimingModeAt")}
              </button>
            </div>

            {/* Relative delay */}
            {!action.followupSendAtLocalTime && (
              <div className="flex min-w-0 items-center gap-2 pt-1">
                <Input
                  type="number"
                  min={1}
                  value={action.followupDelayMinutes ?? 30}
                  onChange={(e) =>
                    onActionChange({ ...action, followupDelayMinutes: parseInt(e.target.value, 10) || 1 })
                  }
                  className={cn(waTemplateInputClassName, "w-20 shrink-0")}
                />
                <div className="min-w-0 flex-1">
                  <SelectInput
                    size="small"
                    inheritTriggerWidth
                    portalClassNames="z-[500]"
                    value={action.followupDelayUnit ?? "minutes"}
                    items={delayUnitItems}
                    triggerClassNames={waTemplateSelectInputTriggerClassNames}
                    viewportClassNames={waTemplateSelectInputViewportClassNames}
                    onValueChange={(v) => onActionChange({ ...action, followupDelayUnit: v as DelayUnit })}
                  />
                </div>
              </div>
            )}

            {/* Specific time */}
            {action.followupSendAtLocalTime !== undefined && action.followupSendAtLocalTime !== "" && (
              <div className="pt-1">
                <Input
                  type="time"
                  value={action.followupSendAtLocalTime}
                  onChange={(e) => onActionChange({ ...action, followupSendAtLocalTime: e.target.value })}
                  className={cn(waTemplateInputClassName, "w-32")}
                />
              </div>
            )}
          </div>

          {/* Subsequent interval — only meaningful when maxFollowups > 1 */}
          {(action.followupMax ?? 1) > 1 && (
            <div className="space-y-1.5">
              <Label className={waFieldLabelClass}>{t("whatsappLiteFollowupSubsequentDelay")}</Label>
              <div className="flex min-w-0 items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  value={action.followupSubsequentDelayHours ?? 24}
                  onChange={(e) =>
                    onActionChange({ ...action, followupSubsequentDelayHours: parseInt(e.target.value, 10) || 1 })
                  }
                  className={cn(waTemplateInputClassName, "w-20 shrink-0")}
                />
                <div className="min-w-0 flex-1">
                  <SelectInput
                    size="small"
                    inheritTriggerWidth
                    portalClassNames="z-[500]"
                    value={action.followupSubsequentDelayUnit ?? "hours"}
                    items={delayUnitItems}
                    triggerClassNames={waTemplateSelectInputTriggerClassNames}
                    viewportClassNames={waTemplateSelectInputViewportClassNames}
                    onValueChange={(v) => onActionChange({ ...action, followupSubsequentDelayUnit: v as DelayUnit })}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="space-y-1">
            <Label className={waFieldLabelClass}>{t("whatsappLiteFollowupMax")}</Label>
            <Input
              type="number"
              min={1}
              max={10}
              value={action.followupMax ?? 1}
              onChange={(e) =>
                onActionChange({
                  ...action,
                  followupMax: Math.min(10, Math.max(1, parseInt(e.target.value, 10) || 1)),
                })
              }
              className={cn(waTemplateInputClassName, "w-20")}
            />
          </div>

          <label className="flex min-w-0 items-start gap-2 text-body-12 text-neutral-700">
            <Checkbox
              className="mt-0.5 shrink-0"
              checked={action.followupStopOnReply !== false}
              onCheckedChange={(c) => onActionChange({ ...action, followupStopOnReply: c === true })}
            />
            <span className="min-w-0 flex-1 leading-snug">{t("whatsappLiteFollowupStopOnReply")}</span>
          </label>
          <label className="flex min-w-0 items-start gap-2 text-body-12 text-neutral-700">
            <Checkbox
              className="mt-0.5 shrink-0"
              checked={action.followupRequireBusinessHours === true}
              onCheckedChange={(c) => onActionChange({ ...action, followupRequireBusinessHours: c === true })}
            />
            <span className="min-w-0 flex-1 leading-snug">{t("whatsappLiteFollowupRequireBusinessHours")}</span>
          </label>

          <label className="flex min-w-0 items-start gap-2 text-body-12 text-neutral-700">
            <Checkbox
              className="mt-0.5 shrink-0"
              checked={action.followupScheduleFromConversation === true}
              onCheckedChange={(c) =>
                onActionChange({
                  ...action,
                  followupScheduleFromConversation: c === true,
                  ...(c === true && !action.followupEventOffsets?.length
                    ? { followupEventOffsets: [{ amount: 30, unit: "days" }] }
                    : {}),
                })
              }
            />
            <span className="min-w-0 flex-1 leading-snug">{t("whatsappLiteFollowupScheduleFromConversation")}</span>
          </label>
          {action.followupScheduleFromConversation ? (
            <div className="space-y-2 rounded-md border border-neutral-100 bg-neutral-10/40 p-3">
              <p className={waFieldHintClass}>{t("whatsappLiteFollowupScheduleFromConversationHint")}</p>
              <Label className={waFieldLabelClass}>{t("whatsappLiteFollowupEventOffsets")}</Label>
              <p className={waFieldHintClass}>{t("whatsappLiteFollowupEventOffsetsHint")}</p>
              {(action.followupEventOffsets?.length ? action.followupEventOffsets : [{ amount: 30, unit: "days" }]).map(
                (offset, idx) => {
                  const offsets = action.followupEventOffsets?.length
                    ? action.followupEventOffsets
                    : [{ amount: 30, unit: "days" as DelayUnit }]
                  return (
                    <div key={idx} className="flex min-w-0 items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        value={offset.amount}
                        onChange={(e) =>
                          onActionChange({
                            ...action,
                            followupEventOffsets: offsets.map((o, i) =>
                              i === idx ? { ...o, amount: Math.max(0, parseInt(e.target.value, 10) || 0) } : o
                            ),
                          })
                        }
                        className={cn(waTemplateInputClassName, "w-20 shrink-0")}
                      />
                      <div className="min-w-0 flex-1">
                        <SelectInput
                          size="small"
                          inheritTriggerWidth
                          portalClassNames="z-[500]"
                          value={offset.unit}
                          items={delayUnitItems}
                          triggerClassNames={waTemplateSelectInputTriggerClassNames}
                          viewportClassNames={waTemplateSelectInputViewportClassNames}
                          onValueChange={(v) =>
                            onActionChange({
                              ...action,
                              followupEventOffsets: offsets.map((o, i) =>
                                i === idx ? { ...o, unit: (v as DelayUnit) || "days" } : o
                              ),
                            })
                          }
                        />
                      </div>
                      <button
                        type="button"
                        disabled={offsets.length <= 1}
                        onClick={() =>
                          onActionChange({
                            ...action,
                            followupEventOffsets: offsets.filter((_, i) => i !== idx),
                          })
                        }
                        className="shrink-0 text-body-11 text-neutral-500 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {t("whatsappLiteFollowupRemoveMessage")}
                      </button>
                    </div>
                  )
                }
              )}
              <button
                type="button"
                onClick={() =>
                  onActionChange({
                    ...action,
                    followupEventOffsets: [
                      ...(action.followupEventOffsets?.length
                        ? action.followupEventOffsets
                        : [{ amount: 30, unit: "days" as DelayUnit }]),
                      { amount: 30, unit: "minutes" },
                    ],
                  })
                }
                className="w-full rounded-md border border-dashed border-neutral-200 px-3 py-2 text-body-12 text-neutral-700 hover:bg-neutral-10"
              >
                {t("whatsappLiteFollowupAddEventOffset")}
              </button>
            </div>
          ) : null}

          <label className="flex min-w-0 items-start gap-2 text-body-12 text-neutral-700">
            <Checkbox
              className="mt-0.5 shrink-0"
              checked={action.followupUseAgentGenerated === true}
              onCheckedChange={(c) => onActionChange({ ...action, followupUseAgentGenerated: c === true })}
            />
            <span className="min-w-0 flex-1 leading-snug">{t("whatsappLiteFollowupUseAgent")}</span>
          </label>
          {action.followupUseAgentGenerated ? (
            <div className="space-y-2 pl-6">
              <p className={waFieldHintClass}>{t("whatsappLiteFollowupUseAgentConversationHint")}</p>
              <div className="space-y-1">
                <Label className={waFieldLabelClass}>{t("whatsappLiteAgent")}</Label>
                <SearchPopover
                  modal={false}
                  open={pickOpen}
                  onOpenChange={(next) => {
                    setPickOpen(next)
                    if (!next) setAgentSearch("")
                  }}
                  value={action.followupAgentId ?? ""}
                  onChange={(v) => {
                    if (typeof v !== "string" || !v) return
                    onActionChange({ ...action, followupAgentId: v })
                    setPickOpen(false)
                    setAgentSearch("")
                  }}
                  searchValue={agentSearch}
                  setSearchValue={setAgentSearchCb}
                  inputPlaceholder={t("whatsappLiteRuleTemplatesAgentSearch")}
                  items={agentItems}
                  multipleSelect={false}
                  showSearchInput
                  emptyContent={
                    <div className="px-3 py-4 text-center text-body-12 text-neutral-500">
                      {agents.length === 0
                        ? t("whatsappLiteRuleTemplatesNoAgentsInWorkspace")
                        : t("whatsappLiteRuleTemplatesAgentNoMatch")}
                    </div>
                  }
                  classNames={{
                    content:
                      "z-[500] max-h-[min(320px,var(--radix-popper-available-height))] border border-neutral-50 p-0 shadow-lg",
                    container: "flex min-h-0 w-[min(100vw-2rem,300px)] min-w-[240px] flex-col overflow-hidden",
                    itemsContainer:
                      "max-h-[min(260px,calc(var(--radix-popper-available-height)-120px))] min-h-0 overflow-y-auto",
                    trigger: "w-full min-w-0",
                  }}
                >
                  <button
                    type="button"
                    className={cn(
                      "nodrag nopan flex h-8 min-h-8 w-full items-center justify-between gap-2 rounded-md border border-neutral-50 bg-white px-2.5 text-body-12 shadow-sm",
                      !(action.followupAgentId ?? "").trim() && "text-neutral-500"
                    )}
                    aria-haspopup="listbox"
                  >
                    <span className="flex min-w-0 flex-1 items-center gap-2">
                      {selectedFollowupAgent ? (
                        <ChatAgentAvatar
                          icon={selectedFollowupAgent.icon}
                          name={selectedFollowupAgent.name?.trim() || selectedFollowupAgent._id}
                          size="xs"
                        />
                      ) : null}
                      <span className="min-w-0 truncate text-left">
                        {selectedFollowupAgent?.name?.trim() ||
                          selectedFollowupAgent?._id ||
                          t("whatsappLiteRuleTemplatesPickAgent")}
                      </span>
                    </span>
                    <ArrowDown2
                      size={16}
                      variant="Linear"
                      className={cn("shrink-0", pickOpen && "rotate-180")}
                      aria-hidden
                    />
                  </button>
                </SearchPopover>
                <p className={waFieldHintClass}>{t("whatsappLiteFollowupAgentFallbackHint")}</p>
              </div>
            </div>
          ) : null}

          <div className="space-y-1">
            <Label className={waFieldLabelClass}>{t("whatsappLiteRuleTemplatesFollowupMessages")}</Label>
            {action.followupUseAgentGenerated ? (
              <p className={waFieldHintClass}>{t("whatsappLiteFollowupMessagesOptionalWithAiHint")}</p>
            ) : null}
            <FollowupMessageListEditor
              contents={
                action.followupMessageContents?.length
                  ? action.followupMessageContents
                  : (action.followupMessages ?? []).map((text) => ({ source: "text" as const, text }))
              }
              onChange={(followupMessageContents) =>
                onActionChange({
                  ...action,
                  followupMessageContents,
                  followupMessages: followupMessageContents.map((c) => c.text ?? ""),
                })
              }
              t={t}
              templates={messageTemplates}
            />
          </div>
        </div>
      ) : action.type === "move_linked_card" || action.type === "clone_linked_card" ? (
        <div className="grid min-w-0 gap-3">
          <div className="space-y-1">
            <Label className={waFieldLabelClass}>{t("whatsappLiteRuleTemplatesMoveProject")}</Label>
            <SearchSelectPopover
              value={projectValue}
              onChange={(v) => {
                const pid = v === NONE ? "" : v
                onActionChange({ ...action, moveProjectId: pid, columnId: "", boardId: "" })
                if (pid) onRequestColumns(pid)
              }}
              items={projectSearchItems}
              placeholder={t("whatsappLiteRuleTemplatesPickProject")}
              searchPlaceholder={t("whatsappLiteLeadProjectSearch")}
              emptyLabel={t("whatsappLiteLeadProjectNoMatch")}
              triggerClassNames={waTemplateSelectInputTriggerClassNames}
            />
          </div>
          <div className="space-y-1">
            <Label className={waFieldLabelClass}>{destinationLabel}</Label>
            <ProjectBoardColumnPicker
              boards={moveBoards}
              columns={moveColumns}
              value={action.columnId ?? ""}
              boardValue={action.boardId ?? ""}
              onChange={(columnId) => {
                const col = moveColumns.find((c) => c._id === columnId)
                onActionChange({
                  ...action,
                  columnId,
                  boardId: columnBoardId(col?.board) || action.boardId,
                })
              }}
              onBoardChange={(boardId) => {
                const col = moveColumns.find((c) => c._id === action.columnId)
                const keep = Boolean(col && boardId && columnBoardId(col.board) === boardId)
                onActionChange({
                  ...action,
                  boardId,
                  columnId: keep ? action.columnId : "",
                })
                const pid = (action.moveProjectId ?? "").trim()
                if (pid && boardId) onRequestColumns(pid, boardId)
              }}
              noneLabel={t("whatsappLiteRuleTemplatesPickColumn")}
              boardPlaceholder={t("whatsappLiteLeadBoard")}
              columnPlaceholder={t("whatsappLiteRuleTemplatesPickColumn")}
              portalClassNames="z-[500]"
              triggerClassNames={waTemplateSelectInputTriggerClassNames}
              disabled={!(action.moveProjectId ?? "").trim()}
            />
          </div>
        </div>
      ) : action.type === "add_label" ? (
        <div className="grid gap-3">
          <div className="space-y-1">
            <Label className={waFieldLabelClass}>{t("whatsappLiteRuleTemplatesLabelText")}</Label>
            <div className="flex items-center gap-2">
              <Input
                value={action.labelText ?? ""}
                onChange={(e) => onActionChange({ ...action, labelText: e.target.value })}
                placeholder={t("whatsappLiteRuleTemplatesLabelTextPlaceholder")}
                className={waTemplateInputClassName}
              />
              {channel === "whatsapp" ? (
                <TemplateAdTokenPicker
                  onPick={(key) => onActionChange({ ...action, labelText: insertAdToken(action.labelText, key) })}
                />
              ) : null}
            </div>
          </div>
          <div className="space-y-1">
            <Label className={waFieldLabelClass}>{t("whatsappLiteRuleTemplatesLabelColor")}</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={action.labelColor ?? "#6366f1"}
                onChange={(e) => onActionChange({ ...action, labelColor: e.target.value })}
                className="h-8 w-10 cursor-pointer rounded-md border border-neutral-50"
              />
              <span className="text-body-11 text-neutral-500">{action.labelColor ?? "#6366f1"}</span>
            </div>
          </div>
        </div>
      ) : action.type === "set_lead_source" ? (
        <div className="space-y-1">
          <Label className={waFieldLabelClass}>{t("whatsappLiteRuleTemplatesLeadSourceText")}</Label>
          <div className="flex items-center gap-2">
            <Input
              value={action.leadSourceText ?? ""}
              onChange={(e) => onActionChange({ ...action, leadSourceText: e.target.value })}
              placeholder={t("whatsappLiteRuleTemplatesLeadSourcePlaceholder")}
              className={waTemplateInputClassName}
            />
            {channel === "whatsapp" ? (
              <TemplateAdTokenPicker
                onPick={(key) =>
                  onActionChange({ ...action, leadSourceText: insertAdToken(action.leadSourceText, key) })
                }
              />
            ) : null}
          </div>
          {channel === "whatsapp" ? (
            <p className={waFieldHintClass}>{t("whatsappLiteRuleTemplatesAdTokensHint")}</p>
          ) : null}
        </div>
      ) : action.type === "transition_state" ? (
        <div className="space-y-1">
          <Label className={waFieldLabelClass}>{t("whatsappLiteRuleTemplatesTransitionStateLabel")}</Label>
          <SelectInput
            size="small"
            inheritTriggerWidth
            portalClassNames="z-[500]"
            value={action.transitionState ?? "human_handoff"}
            items={stateItems}
            triggerClassNames={waTemplateSelectInputTriggerClassNames}
            viewportClassNames={waTemplateSelectInputViewportClassNames}
            onValueChange={(v) => onActionChange({ ...action, transitionState: v })}
          />
        </div>
      ) : action.type === "distribute_lead" ? (
        <LeadDistributionActionFields
          policy={action.leadDist ?? DEFAULT_LEAD_DISTRIBUTION_POLICY}
          crmProjects={crmProjects}
          variant="full"
          onChange={(leadDist) => onActionChange({ ...action, leadDist })}
        />
      ) : action.type === "assign_conversation" ? (
        <div className="grid min-w-0 gap-3">
          <div className="space-y-1">
            <Label className={waFieldLabelClass}>{t("whatsappLiteRuleTemplatesAssignUserOptional")}</Label>
            <SearchPopover
              modal={false}
              open={assignUserOpen}
              onOpenChange={(next) => {
                setAssignUserOpen(next)
                if (!next) setAssignUserSearch("")
              }}
              multipleSelect={false}
              searchValue={assignUserSearch}
              setSearchValue={setAssignUserSearchCb}
              value={(action.assignUserId ?? "").trim() || NONE}
              onChange={(v) => {
                const raw = typeof v === "string" ? v : String(Array.isArray(v) ? v[0] : v)
                onActionChange({ ...action, assignUserId: raw === NONE ? "" : raw })
                setAssignUserOpen(false)
                setAssignUserSearch("")
              }}
              inputPlaceholder={t("whatsappLiteRuleTemplatesAssignUserSearch")}
              items={[
                <SearchOption key={NONE} value={NONE} className="w-full">
                  <span className="block truncate text-left text-body-14 text-neutral-600">
                    {t("whatsappLiteRuleTemplatesAssignUserRoundRobin")}
                  </span>
                </SearchOption>,
                ...team
                  .filter((u) => u.name.toLowerCase().includes(assignUserSearch.trim().toLowerCase()))
                  .map((user) => (
                    <SearchOption key={user._id} value={user._id!.toString()} className="w-full">
                      <div className="flex items-center gap-2">
                        <UserAvatar size="small" user={user} />
                        <span className="truncate text-body-14 text-neutral-900">{user.name}</span>
                      </div>
                    </SearchOption>
                  )),
              ]}
              showSearchInput
              classNames={waTemplateSearchPopoverClassNames}
            >
              <button
                type="button"
                className={cn(
                  waTemplateSelectInputTriggerClassNames,
                  "flex h-8 items-center gap-2 px-2.5 text-body-12"
                )}
              >
                {(action.assignUserId ?? "").trim() ? (
                  <>
                    <UserAvatar size="small" user={team.find((u) => u._id === action.assignUserId) ?? team[0]!} />
                    <span className="min-w-0 flex-1 truncate text-left">
                      {team.find((u) => u._id === action.assignUserId)?.name ?? action.assignUserId}
                    </span>
                  </>
                ) : (
                  <span className="min-w-0 flex-1 truncate text-left text-neutral-500">
                    {t("whatsappLiteRuleTemplatesAssignUserRoundRobin")}
                  </span>
                )}
                <ArrowDown2
                  size={16}
                  variant="Linear"
                  className={cn("shrink-0", assignUserOpen && "rotate-180")}
                  aria-hidden
                />
              </button>
            </SearchPopover>
          </div>
          {!(action.assignUserId ?? "").trim() ? (
            <LeadDistributionActionFields
              policy={action.leadDist ?? { assignMode: "member_list", userIds: [] }}
              crmProjects={crmProjects}
              variant="assign_only"
              onChange={(leadDist) => onActionChange({ ...action, leadDist })}
            />
          ) : null}
        </div>
      ) : action.type === "route_to_crm" ? (
        <div className="grid min-w-0 gap-3">
          <div className="space-y-1">
            <Label className={waFieldLabelClass}>{t("whatsappLiteRuleTemplatesMoveProject")}</Label>
            <SearchSelectPopover
              value={projectValue}
              onChange={(v) => {
                const pid = v === NONE ? "" : v
                onActionChange({ ...action, moveProjectId: pid, columnId: "", boardId: "" })
                if (pid) onRequestColumns(pid)
              }}
              items={projectSearchItems}
              placeholder={t("whatsappLiteRuleTemplatesPickProject")}
              searchPlaceholder={t("whatsappLiteLeadProjectSearch")}
              emptyLabel={t("whatsappLiteLeadProjectNoMatch")}
              triggerClassNames={waTemplateSelectInputTriggerClassNames}
            />
          </div>
          <div className="space-y-1">
            <Label className={waFieldLabelClass}>{destinationLabel}</Label>
            <ProjectBoardColumnPicker
              boards={moveBoards}
              columns={moveColumns}
              value={action.columnId ?? ""}
              boardValue={action.boardId ?? ""}
              onChange={(columnId) => {
                const col = moveColumns.find((c) => c._id === columnId)
                onActionChange({
                  ...action,
                  columnId,
                  boardId: columnBoardId(col?.board) || action.boardId,
                })
              }}
              onBoardChange={(boardId) => {
                const col = moveColumns.find((c) => c._id === action.columnId)
                const keep = Boolean(col && boardId && columnBoardId(col.board) === boardId)
                onActionChange({
                  ...action,
                  boardId,
                  columnId: keep ? action.columnId : "",
                })
                const pid = (action.moveProjectId ?? "").trim()
                if (pid && boardId) onRequestColumns(pid, boardId)
              }}
              noneLabel={t("whatsappLiteRuleTemplatesPickColumn")}
              boardPlaceholder={t("whatsappLiteLeadBoard")}
              columnPlaceholder={t("whatsappLiteRuleTemplatesPickColumn")}
              portalClassNames="z-[500]"
              triggerClassNames={waTemplateSelectInputTriggerClassNames}
              disabled={!(action.moveProjectId ?? "").trim()}
            />
          </div>
          <LeadDistributionActionFields
            policy={action.leadDist ?? { assignMode: "none" }}
            crmProjects={crmProjects}
            variant="route_assign"
            onChange={(leadDist) => onActionChange({ ...action, leadDist })}
          />
        </div>
      ) : action.type === "create_contact" ? (
        <p className={waFieldHintClass}>{t("whatsappLiteRuleTemplatesCreateContactHint")}</p>
      ) : action.type === "create_lead" ? (
        <div className="grid min-w-0 gap-3">
          <p className={waFieldHintClass}>{t("whatsappLiteRuleTemplatesCreateLeadHint")}</p>
          <div className="space-y-1">
            <Label className={waFieldLabelClass}>{t("whatsappLiteRuleTemplatesMoveProject")}</Label>
            <SearchSelectPopover
              value={projectValue}
              onChange={(v) => {
                const pid = v === NONE ? "" : v
                onActionChange({ ...action, moveProjectId: pid, columnId: "", boardId: "" })
                if (pid) onRequestColumns(pid)
              }}
              items={projectSearchItems}
              placeholder={t("whatsappLiteRuleTemplatesPickProject")}
              searchPlaceholder={t("whatsappLiteLeadProjectSearch")}
              emptyLabel={t("whatsappLiteLeadProjectNoMatch")}
              triggerClassNames={waTemplateSelectInputTriggerClassNames}
            />
          </div>
          <div className="space-y-1">
            <Label className={waFieldLabelClass}>{destinationLabel}</Label>
            <ProjectBoardColumnPicker
              boards={moveBoards}
              columns={moveColumns}
              value={action.columnId ?? ""}
              boardValue={action.boardId ?? ""}
              onChange={(columnId) => {
                const col = moveColumns.find((c) => c._id === columnId)
                onActionChange({
                  ...action,
                  columnId,
                  boardId: columnBoardId(col?.board) || action.boardId,
                })
              }}
              onBoardChange={(boardId) => {
                const col = moveColumns.find((c) => c._id === action.columnId)
                const keep = Boolean(col && boardId && columnBoardId(col.board) === boardId)
                onActionChange({
                  ...action,
                  boardId,
                  columnId: keep ? action.columnId : "",
                })
                const pid = (action.moveProjectId ?? "").trim()
                if (pid && boardId) onRequestColumns(pid, boardId)
              }}
              noneLabel={t("whatsappLiteRuleTemplatesPickColumn")}
              boardPlaceholder={t("whatsappLiteLeadBoard")}
              columnPlaceholder={t("whatsappLiteRuleTemplatesPickColumn")}
              portalClassNames="z-[500]"
              triggerClassNames={waTemplateSelectInputTriggerClassNames}
              disabled={!(action.moveProjectId ?? "").trim()}
            />
          </div>
          <div className="space-y-1">
            <Label className={waFieldLabelClass}>{t("whatsappLiteRuleTemplatesCreateLeadSource")}</Label>
            <div className="flex items-center gap-2">
              <Input
                value={action.createLeadSourceText ?? ""}
                onChange={(e) => onActionChange({ ...action, createLeadSourceText: e.target.value })}
                className={waTemplateInputClassName}
              />
              {channel === "whatsapp" ? (
                <TemplateAdTokenPicker
                  onPick={(key) =>
                    onActionChange({ ...action, createLeadSourceText: insertAdToken(action.createLeadSourceText, key) })
                  }
                />
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
