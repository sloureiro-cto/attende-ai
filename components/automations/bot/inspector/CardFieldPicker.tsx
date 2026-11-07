"use client"

import { useEffect, useId, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import type { ICardFieldDefinition } from "actions/projects/cardFieldDefinitions"
import type { IProject } from "app/_types/Project"
import type { IUser } from "app/_types/User"
import { actionClass } from "components/bots-app/ui/actionStyles"
import type { AutomationsTFn } from "components/automations/ui/useAutomationsT"
import { SearchSelectPopover } from "components/settings/whatsapp-lite/SearchSelectPopover"
import { waTemplateSelectInputTriggerClassNames } from "components/settings/whatsapp-lite/template-rule-forms"
import TextInput from "components/TextInput/TextInput"
import { useWorkspace } from "context/WorkspaceContext"
import { membersFromWorkspaceUsers } from "lib/automations/botAssignees"
import type { AutomationsTranslationKey } from "lib/i18n/translations/automations"
import { boardRefsFromProject } from "lib/projects/projectBoardRefs"
import { getUserDisplayName } from "lib/users/userDisplay"
import { BotSelect } from "../BotSelect"
import type { BotLookups } from "../useBotLookups"

/** The value types a field input knows. `owner` is the lead's owner (a member id). */
export type FieldValueType =
  | "text"
  | "textarea"
  | "email"
  | "url"
  | "number"
  | "currency"
  | "date"
  | "datetime"
  | "time"
  | "select"
  | "multiselect"
  | "boolean"
  | "owner"

export type FieldOption = {
  fieldId: string
  /** Translation key (standard fields) or the board's own name (custom fields, never translated). */
  labelKey?: AutomationsTranslationKey
  name?: string
  type: FieldValueType
  options?: string[]
  standard: boolean
}

/**
 * Lead/deal fields every board has: the card title and owner, and JSYNQ's CRM fields (their ids are the ones the
 * JSYNQ card routes accept in `customFields`).
 */
export const STANDARD_FIELDS: FieldOption[] = [
  { fieldId: "card:title", labelKey: "advancedAutomationStdFieldTitle", type: "text", standard: true },
  { fieldId: "contactName", labelKey: "advancedAutomationStdFieldContactName", type: "text", standard: true },
  { fieldId: "email", labelKey: "advancedAutomationStdFieldEmail", type: "email", standard: true },
  { fieldId: "phone", labelKey: "advancedAutomationStdFieldPhone", type: "text", standard: true },
  { fieldId: "company", labelKey: "advancedAutomationStdFieldCompany", type: "text", standard: true },
  { fieldId: "estimateRevenue", labelKey: "advancedAutomationStdFieldValue", type: "currency", standard: true },
  { fieldId: "card:owner", labelKey: "advancedAutomationStdFieldOwner", type: "owner", standard: true },
]

/** Variables a value may use (rendered by the runtime). */
export const VALUE_VARIABLES = ["{{lead.name}}", "{{lead.phone}}", "{{lead.email}}", "{{answer}}"] as const

const VALUE_TYPES = new Set<string>([
  "text",
  "textarea",
  "email",
  "url",
  "number",
  "currency",
  "date",
  "datetime",
  "time",
  "select",
  "multiselect",
  "boolean",
])

/** Standard fields first, then the board's custom value fields (files, buttons and groups cannot be filled). */
export function fieldOptions(defs: ICardFieldDefinition[], opts: { includeOwner?: boolean } = {}): FieldOption[] {
  const standard = STANDARD_FIELDS.filter((f) => opts.includeOwner !== false || f.type !== "owner")
  const taken = new Set(STANDARD_FIELDS.map((f) => f.fieldId))
  const custom = defs
    .filter((d) => (d.kind ?? "field") === "field" && VALUE_TYPES.has(d.fieldType) && !taken.has(d.fieldId))
    .map<FieldOption>((d) => ({
      fieldId: d.fieldId,
      name: d.fieldName,
      type: d.fieldType as FieldValueType,
      options: d.options,
      standard: false,
    }))
  return [...standard, ...custom]
}

export const isVariable = (value: string) => /^\s*\{\{[^}]+\}\}\s*$/.test(value)

const TYPE_KEYS: Record<FieldValueType, AutomationsTranslationKey> = {
  text: "advancedAutomationFieldTypeText",
  textarea: "advancedAutomationFieldTypeText",
  email: "advancedAutomationFieldTypeEmail",
  url: "advancedAutomationFieldTypeUrl",
  number: "advancedAutomationFieldTypeNumber",
  currency: "advancedAutomationFieldTypeCurrency",
  date: "advancedAutomationFieldTypeDate",
  datetime: "advancedAutomationFieldTypeDate",
  time: "advancedAutomationFieldTypeTime",
  select: "advancedAutomationFieldTypeSelect",
  multiselect: "advancedAutomationFieldTypeSelect",
  boolean: "advancedAutomationFieldTypeBoolean",
  owner: "advancedAutomationFieldTypeMember",
}

export const fieldLabel = (f: FieldOption, t: AutomationsTFn) => (f.labelKey ? t(f.labelKey) : f.name ?? f.fieldId)

export type FieldSelection = { projectId: string; boardId: string; fieldId: string; fieldType?: string }

/**
 * Project -> board -> field. The board matters: JSYNQ keeps a board's custom fields on that board's layout, so a
 * project alone lists none. The loaded definition of the chosen field is reported so the value input fits its type.
 */
export function CardFieldPicker({
  value,
  onChange,
  projects,
  lookups,
  t,
  includeOwner = true,
  only,
  onField,
}: {
  value: Partial<FieldSelection> & { fieldId: string }
  onChange: (next: FieldSelection) => void
  projects: IProject[]
  lookups: BotLookups
  t: AutomationsTFn
  /** `card:owner` is not offered where only text is written (a reply). */
  includeOwner?: boolean
  /** Keep only some fields (e.g. dates for a date trigger). */
  only?: (field: FieldOption) => boolean
  /** The chosen field's option, once known. */
  onField?: (field: FieldOption | undefined) => void
}) {
  const [projectId, setProjectId] = useState(value.projectId || (projects.length === 1 ? projects[0]!._id : ""))
  const [boardId, setBoardId] = useState(value.boardId ?? "")
  const project = projects.find((p) => p._id === projectId)
  const boards = useMemo(() => (project ? boardRefsFromProject(project) : []), [project])

  // A project with a single board needs no board choice.
  useEffect(() => {
    if (projectId && !boardId && boards.length === 1) setBoardId(boards[0]!.boardId)
  }, [projectId, boardId, boards])

  const { loadFields } = lookups
  useEffect(() => {
    if (projectId && boardId) loadFields(projectId, boardId)
  }, [projectId, boardId, loadFields])

  const loaded = projectId && boardId ? lookups.fields[`${projectId}:${boardId}`] : undefined
  const options = useMemo(() => {
    const all = fieldOptions(loaded?.data ?? [], { includeOwner })
    return only ? all.filter(only) : all
  }, [loaded?.data, includeOwner, only])
  const selected = options.find((o) => o.fieldId === value.fieldId)
  useEffect(() => {
    onField?.(selected)
  }, [selected, onField])

  const items = useMemo(() => {
    const list = options.map((o) => ({
      value: o.fieldId,
      displayName: fieldLabel(o, t),
      description: o.standard
        ? t("advancedAutomationFieldGroupStandard")
        : `${t("advancedAutomationFieldGroupCustom")} · ${t(TYPE_KEYS[o.type])}`,
    }))
    // A field saved earlier that this board does not list (renamed, removed, other board) stays visible.
    return value.fieldId && !list.some((i) => i.value === value.fieldId)
      ? [{ value: value.fieldId, displayName: value.fieldId, description: "" }, ...list]
      : list
  }, [options, t, value.fieldId])

  const projectItems = useMemo(() => projects.map((p) => ({ value: p._id, label: p.title || p._id })), [projects])
  const pick = (fieldId: string) => {
    const option = options.find((o) => o.fieldId === fieldId)
    onChange({ projectId, boardId, fieldId, ...(option ? { fieldType: option.type } : {}) })
  }

  const customCount = options.filter((o) => !o.standard).length

  return (
    <div className="flex flex-col gap-2">
      <SearchSelectPopover
        value={projectId}
        onChange={(next) => {
          setProjectId(next)
          setBoardId("")
        }}
        items={projectItems}
        placeholder={t("advancedAutomationPickProject")}
        searchPlaceholder={t("advancedAutomationSearch")}
        emptyLabel={t("advancedAutomationNoProjects")}
        triggerClassNames={cn(waTemplateSelectInputTriggerClassNames, "h-8")}
      />
      {projectId && boards.length === 0 ? (
        <p className="text-body-12 text-neutral-500">{t("advancedAutomationNoBoards")}</p>
      ) : null}
      {projectId && boards.length > 1 ? (
        <BotSelect
          value={boardId}
          onValueChange={setBoardId}
          placeholder={t("advancedAutomationPickBoard")}
          items={boards.map((b) => ({ value: b.boardId, displayName: b.title }))}
        />
      ) : null}
      {projectId && boardId ? (
        loaded?.status === "error" ? (
          <div className="flex flex-col gap-2 rounded-md bg-error-clean px-3 py-2" role="alert">
            <p className="text-body-12 text-error-darkest">{t("advancedAutomationFieldsError")}</p>
            <button
              type="button"
              className={actionClass({ variant: "secondary", size: "sm" })}
              onClick={() => loadFields(projectId, boardId)}
            >
              {t("advancedAutomationRetry")}
            </button>
          </div>
        ) : (
          <>
            <BotSelect
              value={value.fieldId}
              onValueChange={pick}
              placeholder={
                loaded?.status === "ready" ? t("advancedAutomationPickField") : t("advancedAutomationLoading")
              }
              items={items}
            />
            {loaded?.status === "ready" && customCount === 0 && !only ? (
              <p className="text-body-11 text-neutral-500">{t("advancedAutomationNoCustomFields")}</p>
            ) : null}
          </>
        )
      ) : null}
    </div>
  )
}

/** Workspace members: the context list, else the members endpoint. */
export function useMembers(lookups: BotLookups, enabled = true) {
  const { selectedWorkspace } = useWorkspace()
  const contextMembers = useMemo(() => (selectedWorkspace?.members ?? []) as IUser[], [selectedWorkspace?.members])
  const { loadUsers } = lookups
  useEffect(() => {
    if (enabled && contextMembers.length === 0) loadUsers()
  }, [enabled, contextMembers.length, loadUsers])
  const fallback = useMemo(() => membersFromWorkspaceUsers(lookups.users.data), [lookups.users.data])
  return contextMembers.length > 0
    ? { members: contextMembers, status: "ready" as const }
    : { members: fallback, status: lookups.users.status }
}

/** One member of the workspace (owner of a lead, who gets a conversation). */
export function MemberSelect({
  value,
  onChange,
  lookups,
  t,
  ariaLabel,
}: {
  value: string
  onChange: (userId: string) => void
  lookups: BotLookups
  t: AutomationsTFn
  ariaLabel?: string
}) {
  const { members, status } = useMembers(lookups)
  const items = useMemo(() => {
    const list = members.map((m) => ({ value: String(m._id), displayName: getUserDisplayName(m) }))
    return value && !list.some((i) => i.value === value)
      ? [{ value, displayName: t("advancedAutomationMemberGone") }, ...list]
      : list
  }, [members, value, t])
  return (
    <div className="flex flex-col gap-1" aria-label={ariaLabel}>
      <BotSelect
        value={value}
        onValueChange={onChange}
        placeholder={status === "loading" ? t("advancedAutomationLoading") : t("advancedAutomationPickMember")}
        items={items}
        emptyContent={<p className="px-3 py-2 text-body-12 text-neutral-500">{t("advancedAutomationMembersEmpty")}</p>}
      />
      {status === "error" ? (
        <p className="text-body-12 text-error-darkest">{t("advancedAutomationMembersError")}</p>
      ) : null}
    </div>
  )
}

/** Variable chips: a click puts the variable in the value (appended to text, replacing a typed value). */
export function VariableChips({ onPick, t }: { onPick: (variable: string) => void; t: AutomationsTFn }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-body-11 text-neutral-500">{t("advancedAutomationVariables")}</span>
      {VALUE_VARIABLES.map((v) => (
        <button
          key={v}
          type="button"
          className={actionClass({ variant: "ghost", size: "sm", className: "h-6 px-2 text-body-11" })}
          onClick={() => onPick(v)}
        >
          {v}
        </button>
      ))}
    </div>
  )
}

/** The value of a field, with the input its type needs. Variables are always allowed. */
export function FieldValueInput({
  field,
  value,
  onChange,
  lookups,
  t,
  label,
}: {
  field: FieldOption | undefined
  value: string
  onChange: (value: string) => void
  lookups: BotLookups
  t: AutomationsTFn
  label: string
}) {
  const id = useId()
  const type: FieldValueType = field?.type ?? "text"
  const variableItems = VALUE_VARIABLES.map((v) => ({
    value: v,
    displayName: v,
    description: t("advancedAutomationVariable"),
  }))
  const replace = (v: string) => onChange(v)
  const append = (v: string) => onChange(`${value}${v}`)

  if (type === "owner") {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-body-12 font-semibold text-neutral-700">{label}</span>
        <MemberSelect value={value} onChange={onChange} lookups={lookups} t={t} />
      </div>
    )
  }
  if (type === "select" || type === "multiselect" || type === "boolean") {
    const base =
      type === "boolean"
        ? [
            { value: "true", displayName: t("advancedAutomationYes") },
            { value: "false", displayName: t("advancedAutomationNo") },
          ]
        : (field?.options ?? []).map((o) => ({ value: o, displayName: o }))
    const items = [...base, ...variableItems]
    if (value && !items.some((i) => i.value === value)) items.unshift({ value, displayName: value })
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-body-12 font-semibold text-neutral-700">{label}</span>
        <BotSelect
          value={value}
          onValueChange={onChange}
          placeholder={t("advancedAutomationPickValue")}
          items={items}
        />
      </div>
    )
  }
  const typed = type === "date" || type === "datetime" || type === "time"
  const inputType = typed && !isVariable(value) ? (type === "datetime" ? "datetime-local" : type) : "text"
  const numeric = type === "number" || type === "currency"
  return (
    <div className="flex flex-col gap-1.5">
      <TextInput
        id={id}
        size="small"
        type={inputType}
        label={label}
        inputMode={numeric ? "decimal" : undefined}
        value={value}
        maxLength={1000}
        onChange={(e) => onChange(e.target.value)}
        helperText={
          numeric
            ? t("advancedAutomationNumberHint")
            : typed
            ? t("advancedAutomationDateHint")
            : t("advancedAutomationValueHint")
        }
        hideErrorMessage
        removeOptionalText
      />
      <VariableChips onPick={typed || numeric ? replace : append} t={t} />
    </div>
  )
}
