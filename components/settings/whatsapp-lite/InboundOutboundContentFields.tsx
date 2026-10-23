"use client"

import { useEffect, useMemo, useState } from "react"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { BlastTemplateVarBinding } from "actions/whatsapp-lite/blastCampaignTypes"
import { listCloudTemplatesAction } from "actions/whatsapp-lite/cloudTemplates"
import type { UnifiedMessageTemplate } from "actions/whatsapp-lite/types"
import { listWorkspaceTemplatesAction } from "actions/whatsapp-lite/workspaceTemplates"
import {
  WorkflowConversationMultiParamPicker,
  WorkflowProjectMemberMultiParamPicker,
} from "app/(workspace-builder)/workflows/components/WorkflowEntityParamPickers"
import type { IColumn } from "app/_types/Column"
import type { IProject } from "app/_types/Project"
import type { IUser } from "app/_types/User"
import { Checkbox } from "components/Checkbox/Checkbox"
import MultiSelectInput from "components/SelectInput/MultiSelectInput"
import SelectInput from "components/SelectInput/SelectInput"
import { Label } from "components/ui/label"
import type { WorkspaceSettingsTranslationKey } from "lib/i18n/translations/workspaceSettings"
import type { OutboundWhatsAppRecipient } from "lib/projectAutomations/whatsappRecipients"
import { boardsForColumnPicker } from "lib/projects/listProjectBoardColumns"
import { extractTemplateVarKeys } from "lib/whatsapp-lite/templateVarBindings"
import type { VisualLinkedCardMatch } from "lib/whatsapp-lite/whatsappTemplateRuleBuilder"
import type { VisualOutboundContent } from "lib/whatsapp-lite/whatsappTemplateRuleBuilder"
import { waFieldHintClass, waFieldLabelClass } from "./waSettingsTypography"

type TFn = (key: WorkspaceSettingsTranslationKey, replacements?: Record<string, string | number>) => string

const CRM_FIELD_LABEL_KEYS: Record<string, WorkspaceSettingsTranslationKey> = {
  title: "blastCampaignCrmFieldTitle",
  contactName: "blastCampaignCrmFieldContactName",
  email: "blastCampaignCrmFieldEmail",
  phone: "blastCampaignCrmFieldPhone",
  company: "blastCampaignCrmFieldCompany",
  role: "blastCampaignCrmFieldRole",
  industry: "blastCampaignCrmFieldIndustry",
  estimateRevenue: "blastCampaignCrmFieldEstimateRevenue",
  message: "blastCampaignCrmFieldMessage",
}

function describeTemplateVarBinding(key: string, binding: BlastTemplateVarBinding | undefined, t: TFn): string {
  if (binding?.crmField) {
    const labelKey = CRM_FIELD_LABEL_KEYS[binding.crmField]
    return labelKey ? t(labelKey) : binding.crmField
  }
  if (binding?.defaultValue?.trim()) return binding.defaultValue.trim()
  return t("blastCampaignVarCrmFieldManual")
}

function TemplateVariableLegend({ template, t }: { template: UnifiedMessageTemplate | undefined; t: TFn }) {
  if (!template?.body) return null
  const keys = extractTemplateVarKeys(template.body)
  if (keys.length === 0) return null

  return (
    <div className="rounded-md border border-neutral-50 bg-neutral-10/60 px-3 py-2">
      <p className="mb-1.5 text-body-11 font-medium text-neutral-600">
        {t("whatsappLiteTemplateVarsFound", { count: String(keys.length) })}
      </p>
      <ul className="space-y-1">
        {keys.map((key) => (
          <li key={key} className="flex flex-wrap items-baseline gap-x-2 text-body-11 text-neutral-600">
            <code className="rounded bg-white px-1 font-mono text-[10px] text-neutral-700">{`{{${key}}}`}</code>
            <span className="text-neutral-500">→</span>
            <span>{describeTemplateVarBinding(key, template.varBindings?.[key], t)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

const NONE = "__none__"
const ANY_COLUMN = "__any_column__"

const selectTrigger =
  "w-full min-w-0 max-w-full overflow-hidden rounded-md border border-neutral-50 bg-white font-normal shadow-sm hover:bg-neutral-10"
const selectViewport =
  "!w-[var(--radix-select-trigger-width)] max-h-[min(280px,50vh)] overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]"

function templateLabel(tpl: UnifiedMessageTemplate): string {
  const badge = tpl.source === "meta" ? "Meta" : tpl.shortcut ? `:${tpl.shortcut}` : "Atalho"
  const varCount = extractTemplateVarKeys(tpl.body ?? "").length
  const varSuffix = varCount > 0 ? ` · ${varCount} var` : ""
  return `${tpl.name} (${badge})${varSuffix}`
}

export function OutboundContentEditor({
  value,
  onChange,
  t,
  templates,
  label,
  allowEmptyText = false,
}: {
  value: VisualOutboundContent
  onChange: (next: VisualOutboundContent) => void
  t: TFn
  templates: UnifiedMessageTemplate[]
  label?: string
  allowEmptyText?: boolean
}) {
  const sourceItems = useMemo(
    () => [
      { value: "text", displayName: t("whatsappLiteOutboundSourceText") },
      { value: "workspace", displayName: t("whatsappLiteOutboundSourceShortcut") },
      { value: "meta", displayName: t("whatsappLiteOutboundSourceMeta") },
    ],
    [t]
  )

  const filteredTemplates = useMemo(() => {
    if (value.source === "workspace") return templates.filter((x) => x.source === "workspace")
    if (value.source === "meta") return templates.filter((x) => x.source === "meta")
    return []
  }, [templates, value.source])

  const templateItems = useMemo(
    () => [
      { value: NONE, displayName: t("whatsappLiteOutboundPickTemplate") },
      ...filteredTemplates.map((tpl) => ({ value: tpl.id, displayName: templateLabel(tpl) })),
    ],
    [filteredTemplates, t]
  )

  const selectedTemplate = useMemo(() => {
    if (value.source === "text" || !value.templateId) return undefined
    return filteredTemplates.find((x) => x.id === value.templateId)
  }, [filteredTemplates, value.source, value.templateId])

  return (
    <div className="min-w-0 space-y-2">
      {label ? <Label className={waFieldLabelClass}>{label}</Label> : null}
      <SelectInput
        size="small"
        inheritTriggerWidth
        portalClassNames="z-[500]"
        value={value.source}
        items={sourceItems}
        triggerClassNames={selectTrigger}
        viewportClassNames={selectViewport}
        onValueChange={(v) => {
          const source = (v as VisualOutboundContent["source"]) || "text"
          onChange({ source, text: value.text ?? "", templateId: "", templateName: "", language: "" })
        }}
      />

      {value.source !== "text" ? (
        <SelectInput
          size="small"
          inheritTriggerWidth
          portalClassNames="z-[500]"
          value={value.templateId || NONE}
          items={templateItems}
          triggerClassNames={selectTrigger}
          viewportClassNames={selectViewport}
          onValueChange={(v) => {
            if (v === NONE) {
              onChange({ ...value, templateId: "", templateName: "", text: value.text ?? "" })
              return
            }
            const tpl = filteredTemplates.find((x) => x.id === v)
            if (!tpl) return
            onChange({
              source: tpl.source === "meta" ? "meta" : "workspace",
              templateId: tpl.id,
              templateName: tpl.name,
              language: tpl.language,
              text: tpl.body ?? "",
            })
          }}
        />
      ) : null}

      {selectedTemplate ? <TemplateVariableLegend template={selectedTemplate} t={t} /> : null}

      <Textarea
        value={value.text ?? ""}
        onChange={(e) =>
          onChange({ ...value, source: value.source === "text" ? "text" : value.source, text: e.target.value })
        }
        className="min-h-[88px] text-body-12"
        placeholder={allowEmptyText ? t("whatsappLiteOutboundTextOptional") : t("whatsappLiteOutboundTextPlaceholder")}
        spellCheck
      />
      {value.source !== "text" ? <p className={waFieldHintClass}>{t("whatsappLiteOutboundTemplateHint")}</p> : null}
    </div>
  )
}

export function useInboundMessageTemplates(): {
  templates: UnifiedMessageTemplate[]
  loading: boolean
} {
  const [templates, setTemplates] = useState<UnifiedMessageTemplate[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void Promise.all([listWorkspaceTemplatesAction(), listCloudTemplatesAction()]).then(([wsRes, cloudRes]) => {
      if (cancelled) return
      const mapped: UnifiedMessageTemplate[] = []
      if (wsRes.success) {
        for (const tpl of wsRes.data ?? []) {
          mapped.push({
            source: "workspace",
            id: tpl._id,
            name: tpl.name,
            placeholders: extractTemplateVarKeys(tpl.body ?? ""),
            body: tpl.body,
            shortcut: tpl.shortcut,
            varBindings: tpl.varBindings,
            attachments: tpl.attachments,
          })
        }
      }
      if (cloudRes.success) {
        for (const tpl of cloudRes.data ?? []) {
          if (tpl.status && tpl.status !== "APPROVED") continue
          const bodyComp = Array.isArray(tpl.components)
            ? (tpl.components as Array<{ type?: string; text?: string }>).find(
                (c) => String(c.type ?? "").toUpperCase() === "BODY"
              )
            : undefined
          mapped.push({
            source: "meta",
            id: tpl._id,
            name: tpl.name,
            placeholders: extractTemplateVarKeys(bodyComp?.text ?? ""),
            body: bodyComp?.text ?? "",
            language: tpl.language,
            category: tpl.category,
            status: tpl.status,
            varBindings: tpl.varBindings,
          })
        }
      }
      setTemplates(mapped)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return { templates, loading }
}

/** Follow-up message list with add/remove + shortcut/template picker (no --- separator). */
export function FollowupMessageListEditor({
  contents,
  onChange,
  t,
  templates,
  disabled,
}: {
  contents: VisualOutboundContent[]
  onChange: (next: VisualOutboundContent[]) => void
  t: TFn
  templates: UnifiedMessageTemplate[]
  disabled?: boolean
}) {
  return (
    <div className={cn("space-y-3", disabled && "pointer-events-none opacity-60")}>
      {contents.map((content, idx) => (
        <div key={`fu-msg-${idx}`} className="space-y-2 rounded-md border border-neutral-100 p-3">
          <div className="flex items-center justify-between gap-2">
            <Label className={waFieldLabelClass}>{t("whatsappLiteFollowupMessageN", { n: idx + 1 })}</Label>
            <button
              type="button"
              className="text-body-11 text-neutral-500 hover:text-red-600"
              onClick={() => onChange(contents.filter((_, i) => i !== idx))}
            >
              {t("whatsappLiteFollowupRemoveMessage")}
            </button>
          </div>
          <OutboundContentEditor
            value={content}
            onChange={(next) => onChange(contents.map((c, i) => (i === idx ? next : c)))}
            t={t}
            templates={templates}
          />
        </div>
      ))}
      <button
        type="button"
        className="w-full rounded-md border border-dashed border-neutral-200 px-3 py-2 text-body-12 text-neutral-700 hover:bg-neutral-10"
        onClick={() => onChange([...contents, { source: "text", text: "" }])}
      >
        {t("whatsappLiteFollowupAddMessage")}
      </button>
    </div>
  )
}

export function LinkedCardInConditionFields({
  rows,
  onChange,
  mode = "in",
  onModeChange,
  showModeToggle = true,
  hintKey,
  crmProjects,
  columnsByProjectId,
  onRequestColumns,
  t,
}: {
  rows: VisualLinkedCardMatch[]
  onChange: (next: VisualLinkedCardMatch[]) => void
  mode?: "in" | "not_in"
  onModeChange?: (mode: "in" | "not_in") => void
  showModeToggle?: boolean
  hintKey?: import("lib/i18n/translations/workspaceSettings").WorkspaceSettingsTranslationKey
  crmProjects: IProject[]
  columnsByProjectId: Record<string, IColumn[]>
  onRequestColumns: (projectId: string, boardId?: string) => void
  t: TFn
}) {
  const projectItems = useMemo(
    () => [
      { value: NONE, displayName: t("whatsappLiteRuleTemplatesPickProject") },
      ...crmProjects.map((p) => ({
        value: p._id,
        displayName: p.title?.trim() || p._id,
      })),
    ],
    [crmProjects, t]
  )

  return (
    <div className="space-y-3">
      {showModeToggle ? (
        <div className="space-y-1.5">
          <Label className={waFieldLabelClass}>{t("whatsappLiteRuleTemplatesLinkedCardMode")}</Label>
          <div className="flex rounded-md border border-neutral-100 bg-neutral-50 p-0.5 text-body-12">
            <button
              type="button"
              onClick={() => onModeChange?.("in")}
              className={cn(
                "flex-1 rounded px-3 py-1 transition-colors",
                mode === "in"
                  ? "bg-white font-medium text-neutral-900 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-700"
              )}
            >
              {t("whatsappLiteRuleTemplatesLinkedCardModeIn")}
            </button>
            <button
              type="button"
              onClick={() => onModeChange?.("not_in")}
              className={cn(
                "flex-1 rounded px-3 py-1 transition-colors",
                mode === "not_in"
                  ? "bg-white font-medium text-neutral-900 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-700"
              )}
            >
              {t("whatsappLiteRuleTemplatesLinkedCardModeNotIn")}
            </button>
          </div>
        </div>
      ) : null}
      <p className={waFieldHintClass}>
        {hintKey
          ? t(hintKey)
          : mode === "not_in"
          ? t("whatsappLiteRuleTemplatesLinkedCardHintNotIn")
          : t("whatsappLiteRuleTemplatesLinkedCardHint")}
      </p>
      {rows.map((row, idx) => {
        const columns = columnsByProjectId[row.projectId] ?? []
        const project = crmProjects.find((p) => p._id === row.projectId)
        const boards = boardsForColumnPicker(project, columns)
        const boardId = (row.boardId ?? "").trim()
        const columnsForBoard = boardId ? columns.filter((c) => String(c.board || "") === boardId) : columns
        const columnItems = [
          { value: ANY_COLUMN, displayName: t("whatsappLiteRuleTemplatesAnyColumn") },
          ...columnsForBoard.map((c) => ({
            value: c._id,
            displayName: (c.title || c._id).trim(),
          })),
        ]
        const selectedColumns = row.columnIds.length === 0 ? [ANY_COLUMN] : row.columnIds
        const boardItems = [
          { value: NONE, displayName: t("whatsappLiteLeadBoard") },
          ...boards.map((board) => ({ value: board.boardId, displayName: board.title })),
        ]
        return (
          <div key={`lc-${idx}`} className="space-y-2 rounded-md border border-neutral-100 p-3">
            <div className="flex items-center justify-between gap-2">
              <Label className={waFieldLabelClass}>{t("whatsappLiteRuleTemplatesLinkedCardRow", { n: idx + 1 })}</Label>
              {rows.length > 1 ? (
                <button
                  type="button"
                  className="text-body-11 text-neutral-500 hover:text-red-600"
                  onClick={() => onChange(rows.filter((_, i) => i !== idx))}
                >
                  {t("whatsappLiteFollowupRemoveMessage")}
                </button>
              ) : null}
            </div>
            <SelectInput
              size="small"
              inheritTriggerWidth
              portalClassNames="z-[500]"
              value={row.projectId || NONE}
              items={projectItems}
              triggerClassNames={selectTrigger}
              viewportClassNames={selectViewport}
              onValueChange={(v) => {
                const pid = v === NONE ? "" : v
                onChange(rows.map((r, i) => (i === idx ? { projectId: pid, boardId: "", columnIds: [] } : r)))
                if (pid) onRequestColumns(pid)
              }}
            />
            {boards.length > 1 ? (
              <SelectInput
                size="small"
                inheritTriggerWidth
                portalClassNames="z-[500]"
                value={boardId || NONE}
                items={boardItems}
                triggerClassNames={selectTrigger}
                viewportClassNames={selectViewport}
                disabled={!row.projectId}
                onValueChange={(v) => {
                  const nextBoard = v === NONE ? "" : v
                  onChange(rows.map((r, i) => (i === idx ? { ...r, boardId: nextBoard, columnIds: [] } : r)))
                  if (row.projectId && nextBoard) onRequestColumns(row.projectId, nextBoard)
                }}
              />
            ) : null}
            <MultiSelectInput
              size="small"
              portalClassNames="z-[500]"
              placeholder={t("whatsappLiteRuleTemplatesAnyColumn")}
              value={selectedColumns}
              items={columnItems}
              disabled={!row.projectId}
              triggerClassNames="w-full min-h-8 justify-between border border-neutral-border px-3 py-1.5 text-left text-body-12 font-normal"
              onValueChange={(vals) => {
                const next = vals.filter((v) => v !== ANY_COLUMN)
                // Selecting "any column" alone clears specific columns.
                if (vals.includes(ANY_COLUMN) && next.length === 0) {
                  onChange(rows.map((r, i) => (i === idx ? { ...r, columnIds: [] } : r)))
                  return
                }
                onChange(rows.map((r, i) => (i === idx ? { ...r, columnIds: next } : r)))
              }}
            />
          </div>
        )
      })}
      <button
        type="button"
        className="w-full rounded-md border border-dashed border-neutral-200 px-3 py-2 text-body-12 text-neutral-700 hover:bg-neutral-10"
        onClick={() => onChange([...rows, { projectId: "", boardId: "", columnIds: [] }])}
      >
        {t("whatsappLiteRuleTemplatesAddLinkedCardOr")}
      </button>
    </div>
  )
}

/** Recipient composer for the `send_to_recipients` action — assignee/reporter of the
 * linked CRM card (if any), workspace users, custom phone numbers, and one or more
 * WhatsApp groups. Mirrors the recipient model already used by project automations. */
export function SendToRecipientsFields({
  recipients,
  onChange,
  users,
  sessionId,
  t,
}: {
  recipients: OutboundWhatsAppRecipient[]
  onChange: (next: OutboundWhatsAppRecipient[]) => void
  users: IUser[]
  /** WhatsApp session used to load the group picker. */
  sessionId?: string
  t: TFn
}) {
  const hasBareKind = (kind: "assignee_phone" | "reporter_phone") => recipients.some((r) => r.type === kind)
  const toggleBareKind = (kind: "assignee_phone" | "reporter_phone", on: boolean) => {
    onChange(on ? [...recipients, { type: kind }] : recipients.filter((r) => r.type !== kind))
  }

  const workspaceUserIds = recipients
    .filter((r): r is Extract<OutboundWhatsAppRecipient, { type: "workspace_user" }> => r.type === "workspace_user")
    .map((r) => r.userId)
  const customPhonesText = recipients
    .filter((r): r is Extract<OutboundWhatsAppRecipient, { type: "custom_phone" }> => r.type === "custom_phone")
    .map((r) => r.phone)
    .join(", ")
  const groupIds = recipients
    .filter(
      (r): r is Extract<OutboundWhatsAppRecipient, { type: "custom_conversation" }> => r.type === "custom_conversation"
    )
    .map((r) => r.conversationId)
  // Each "otherThanX" preserves every OTHER category when a given field is edited.
  const otherThanWorkspaceUsers = recipients.filter((r) => r.type !== "workspace_user")
  const otherThanCustomPhones = recipients.filter((r) => r.type !== "custom_phone")
  const otherThanGroups = recipients.filter((r) => r.type !== "custom_conversation")

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="flex items-center gap-2 text-body-12 text-neutral-700">
          <Checkbox
            checked={hasBareKind("assignee_phone")}
            onCheckedChange={(c) => toggleBareKind("assignee_phone", c === true)}
          />
          {t("whatsappLiteRuleTemplatesRecipientAssignee")}
        </label>
        <label className="flex items-center gap-2 text-body-12 text-neutral-700">
          <Checkbox
            checked={hasBareKind("reporter_phone")}
            onCheckedChange={(c) => toggleBareKind("reporter_phone", c === true)}
          />
          {t("whatsappLiteRuleTemplatesRecipientReporter")}
        </label>
        <p className={waFieldHintClass}>{t("whatsappLiteRuleTemplatesRecipientCardHint")}</p>
      </div>

      <div className="space-y-1">
        <Label className={waFieldLabelClass}>{t("whatsappLiteRuleTemplatesRecipientUsers")}</Label>
        <WorkflowProjectMemberMultiParamPicker
          users={users}
          value={workspaceUserIds.join(",")}
          onChange={(csv) => {
            const ids = csv
              .split(/[,;\n]/)
              .map((s) => s.trim())
              .filter(Boolean)
            onChange([
              ...otherThanWorkspaceUsers,
              ...ids.map((userId) => ({ type: "workspace_user" as const, userId })),
            ])
          }}
          labels={{
            noneLabel: t("whatsappLiteRuleTemplatesRecipientUsersPlaceholder"),
            searchPlaceholder: t("whatsappLiteRuleTemplatesRecipientUsersSearch"),
          }}
        />
      </div>

      <div className="space-y-1">
        <Label className={waFieldLabelClass}>{t("whatsappLiteRuleTemplatesRecipientCustomPhones")}</Label>
        <input
          className="h-8 w-full rounded-md border border-neutral-50 bg-white px-2.5 text-body-12 shadow-sm"
          placeholder="+15551234567, +5511999999999"
          value={customPhonesText}
          onChange={(e) => {
            const phones = e.target.value
              .split(/[,;\n]/)
              .map((s) => s.trim())
              .filter(Boolean)
            onChange([...otherThanCustomPhones, ...phones.map((phone) => ({ type: "custom_phone" as const, phone }))])
          }}
        />
      </div>

      <div className="space-y-1">
        <Label className={waFieldLabelClass}>{t("whatsappLiteRuleTemplatesRecipientGroups")}</Label>
        <WorkflowConversationMultiParamPicker
          sessionId={sessionId ?? ""}
          value={groupIds.join(", ")}
          onChange={(csv) => {
            const ids = csv
              .split(/[,;\n]/)
              .map((s) => s.trim())
              .filter(Boolean)
            onChange([
              ...otherThanGroups,
              ...ids.map((conversationId) => ({ type: "custom_conversation" as const, conversationId })),
            ])
          }}
          chatType="group"
          labels={{
            searchPlaceholder: t("whatsappLiteRuleTemplatesGroupSearch"),
            noneLabel: t("whatsappLiteRuleTemplatesGroupNone"),
            blockedMessage: t("whatsappLiteRuleTemplatesGroupNeedSession"),
          }}
        />
        <p className={waFieldHintClass}>{t("whatsappLiteRuleTemplatesRecipientGroupsHint")}</p>
      </div>
    </div>
  )
}
