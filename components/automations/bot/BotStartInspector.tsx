"use client"

import { Play, X } from "lucide-react"
import { type Dispatch, memo, useCallback, useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { rotateAdvancedAutomationWebhookSecretAction } from "actions/messaging-automations/advancedAutomations"
import type { IProject } from "app/_types/Project"
import { actionClass } from "components/bots-app/ui/actionStyles"
import { channelLabelKey } from "components/automations/ui/ChannelFilter"
import { automationsKey, type AutomationsTFn, useAutomationsT } from "components/automations/ui/useAutomationsT"
import IconButton from "components/IconButton/IconButton"
import { SearchSelectPopover } from "components/settings/whatsapp-lite/SearchSelectPopover"
import { waTemplateSelectInputTriggerClassNames } from "components/settings/whatsapp-lite/template-rule-forms"
import { TextArea } from "components/TextArea/TextArea"
import TextInput from "components/TextInput/TextInput"
import { formatDateTime } from "lib/attende/format"
import type { BotBuilderAction, BotDraft } from "lib/automations/botBuilderState"
import {
  isCrmTrigger,
  isTimeTrigger,
  parseKeywords,
  runsOnLeads,
  TRIGGER_GROUPS,
  withTriggerKind,
} from "lib/automations/botTrigger"
import type { EditorContextData } from "lib/automations/editorContext"
import {
  type AdvancedAutomationTrigger,
  type AdvancedAutomationWebhookInfo,
  type AutomationChannel,
  TRIGGER_LIMITS,
} from "lib/automations/types"
import { boardRefsFromProject, columnBoardId } from "lib/projects/projectBoardRefs"
import { DurationField, FieldBlock, StagePicker, SwitchRow } from "./BotInspectorControls"
import { BotLabelPicker } from "./BotLabelPicker"
import { BotSelect } from "./BotSelect"
import { CardFieldPicker, type FieldOption, MemberSelect } from "./inspector/CardFieldPicker"
import type { BotLookups } from "./useBotLookups"

type Props = {
  draft: BotDraft
  dispatch: Dispatch<BotBuilderAction>
  onClose: () => void
  ctx: EditorContextData
  lookups: BotLookups
  /** Webhook state of the saved automation (absent for a new one). */
  webhook?: AdvancedAutomationWebhookInfo
}

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const
const isDateField = (f: FieldOption) => f.type === "date" || f.type === "datetime"
const DEFAULT_HEADER = "X-Attende-Secret"

/** Project -> board (no stage): where the CRM triggers listen. */
function BoardPicker({
  projectId,
  boardId,
  projects,
  onChange,
  t,
}: {
  projectId: string
  boardId: string
  projects: IProject[]
  onChange: (next: { projectId: string; boardId: string }) => void
  t: AutomationsTFn
}) {
  const project = projects.find((p) => p._id === projectId)
  const boards = useMemo(() => (project ? boardRefsFromProject(project) : []), [project])
  useEffect(() => {
    if (projectId && !boardId && boards.length === 1) onChange({ projectId, boardId: boards[0]!.boardId })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed the only board once
  }, [projectId, boardId, boards])
  const projectItems = useMemo(() => projects.map((p) => ({ value: p._id, label: p.title || p._id })), [projects])
  return (
    <div className="flex flex-col gap-2">
      <SearchSelectPopover
        value={projectId}
        onChange={(next) => onChange({ projectId: next, boardId: "" })}
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
          onValueChange={(next) => onChange({ projectId, boardId: next })}
          placeholder={t("advancedAutomationPickBoard")}
          items={boards.map((b) => ({ value: b.boardId, displayName: b.title }))}
        />
      ) : null}
    </div>
  )
}

/** Common filters: channel, board and stages, labels. */
function TriggerFilters({
  trigger,
  channels,
  ctx,
  lookups,
  setTrigger,
  t,
}: {
  trigger: AdvancedAutomationTrigger
  channels: AutomationChannel[]
  ctx: EditorContextData
  lookups: BotLookups
  setTrigger: (patch: Partial<AdvancedAutomationTrigger>) => void
  t: AutomationsTFn
}) {
  const filters = trigger.filters ?? {}
  const setFilters = (patch: Partial<NonNullable<AdvancedAutomationTrigger["filters"]>>) => {
    const next = { ...filters, ...patch }
    for (const k of Object.keys(next) as Array<keyof typeof next>) {
      const v = next[k]
      if (v === undefined || v === "" || (Array.isArray(v) && v.length === 0)) delete next[k]
    }
    setTrigger({ filters: Object.keys(next).length ? next : undefined })
  }
  const projectId = filters.projectId ?? ""
  const boardId = filters.boardId ?? ""
  const { loadProjectColumns } = lookups
  useEffect(() => {
    if (projectId && boardId) loadProjectColumns(projectId, boardId, ctx.crmProjects)
  }, [projectId, boardId, ctx.crmProjects, loadProjectColumns])
  const columns = useMemo(
    () => (lookups.projectColumns[projectId]?.data ?? []).filter((c) => columnBoardId(c.board) === boardId),
    [lookups.projectColumns, projectId, boardId]
  )
  const selectedColumns = filters.columnIds ?? []
  const [labelsText, setLabelsText] = useState((filters.labels ?? []).join(", "))

  return (
    <fieldset className="flex flex-col gap-3 rounded-md border border-neutral-border p-3">
      <legend className="px-1 text-body-12 font-semibold text-neutral-700">
        {t("advancedAutomationTriggerFilters")}
      </legend>
      <p className="text-body-11 text-neutral-500">{t("advancedAutomationTriggerFiltersHint")}</p>
      {channels.length > 1 ? (
        <FieldBlock label={t("advancedAutomationFilterChannels")}>
          <div className="flex flex-wrap gap-3">
            {channels.map((c) => {
              const checked = (filters.channels ?? []).includes(c)
              return (
                <label key={c} className="flex items-center gap-1.5 text-body-13 text-neutral-900">
                  <input
                    type="checkbox"
                    className="accent-primary-dark"
                    checked={checked}
                    onChange={() =>
                      setFilters({
                        channels: checked
                          ? (filters.channels ?? []).filter((x) => x !== c)
                          : [...(filters.channels ?? []), c],
                      })
                    }
                  />
                  {t(channelLabelKey(c))}
                </label>
              )
            })}
          </div>
        </FieldBlock>
      ) : null}
      <FieldBlock label={t("advancedAutomationFilterBoard")}>
        <BoardPicker
          projectId={projectId}
          boardId={boardId}
          projects={ctx.crmProjects}
          t={t}
          onChange={(next) =>
            setFilters({
              projectId: next.projectId || undefined,
              boardId: next.boardId || undefined,
              columnIds: undefined,
            })
          }
        />
        {projectId ? (
          <button
            type="button"
            className={cn(actionClass({ variant: "ghost", size: "sm" }), "self-start")}
            onClick={() => setFilters({ projectId: undefined, boardId: undefined, columnIds: undefined })}
          >
            {t("advancedAutomationFilterClear")}
          </button>
        ) : null}
      </FieldBlock>
      {boardId && columns.length > 0 ? (
        <FieldBlock label={t("advancedAutomationFilterStages")} hint={t("advancedAutomationFilterStagesHint")}>
          <div className="flex flex-col gap-1.5">
            {columns.map((c) => {
              const checked = selectedColumns.includes(c._id)
              return (
                <label key={c._id} className="flex items-center gap-1.5 text-body-13 text-neutral-900">
                  <input
                    type="checkbox"
                    className="accent-primary-dark"
                    checked={checked}
                    onChange={() =>
                      setFilters({
                        columnIds: checked ? selectedColumns.filter((x) => x !== c._id) : [...selectedColumns, c._id],
                      })
                    }
                  />
                  {c.title}
                </label>
              )
            })}
          </div>
        </FieldBlock>
      ) : null}
      <TextInput
        size="small"
        label={t("advancedAutomationFilterLabels")}
        value={labelsText}
        placeholder={t("advancedAutomationFilterLabelsPlaceholder")}
        onChange={(e) => setLabelsText(e.target.value)}
        onBlur={() => setFilters({ labels: parseKeywords(labelsText) })}
        helperText={t("advancedAutomationFilterLabelsHint")}
        hideErrorMessage
        removeOptionalText
      />
    </fieldset>
  )
}

/** Webhook URL, header and the secret (shown once, after it is generated or rotated). */
export function WebhookSection({
  automationId,
  info,
  t,
  language,
}: {
  automationId?: string
  info?: AdvancedAutomationWebhookInfo
  t: AutomationsTFn
  language: string
}) {
  const [secret, setSecret] = useState<string | null>(null)
  const [header, setHeader] = useState(DEFAULT_HEADER)
  const [configured, setConfigured] = useState(info?.configured === true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  if (!automationId) return <p className="text-body-12 text-neutral-500">{t("advancedAutomationWebhookSaveFirst")}</p>
  const path = info?.path ?? `/api/automations/hooks/${automationId}`
  const url = `${typeof window !== "undefined" ? window.location.origin : ""}${path}`
  const copy = (what: string, text: string) => {
    void navigator.clipboard?.writeText(text).then(
      () => setCopied(what),
      () => setCopied(null)
    )
  }
  const rotate = async () => {
    setBusy(true)
    setError(false)
    const res = await rotateAdvancedAutomationWebhookSecretAction(automationId)
    setBusy(false)
    if (!res.success) {
      setError(true)
      return
    }
    setSecret(res.data.secret)
    setHeader(res.data.header || DEFAULT_HEADER)
    setConfigured(true)
  }
  return (
    <div className="flex flex-col gap-2 rounded-md border border-neutral-border p-3">
      <span className="text-body-12 font-semibold text-neutral-700">{t("advancedAutomationWebhookUrl")}</span>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded bg-neutral-10 px-2 py-1 text-body-11 text-neutral-900">
          {url}
        </code>
        <button
          type="button"
          className={actionClass({ variant: "secondary", size: "sm" })}
          onClick={() => copy("url", url)}
        >
          {copied === "url" ? t("advancedAutomationCopied") : t("advancedAutomationCopy")}
        </button>
      </div>
      <p className="text-body-11 text-neutral-500">{t("advancedAutomationWebhookHeaderHint", { header })}</p>
      <p className="text-body-11 text-neutral-500">
        {configured
          ? info?.setAt && !secret
            ? t("advancedAutomationWebhookSecretSetAt", { date: formatDateTime(info.setAt, language) })
            : t("advancedAutomationWebhookSecretSet")
          : t("advancedAutomationWebhookSecretNone")}
      </p>
      {secret ? (
        <div
          className="flex flex-col gap-1.5 rounded-md border border-warning-lighter bg-warning-clean p-2"
          role="status"
        >
          <p className="text-body-12 font-semibold text-warning-darkest">{t("advancedAutomationWebhookSecretOnce")}</p>
          <div className="flex items-center gap-2">
            <code
              className="min-w-0 flex-1 break-all rounded bg-white px-2 py-1 text-body-11 text-neutral-900"
              data-testid="webhook-secret"
            >
              {secret}
            </code>
            <button
              type="button"
              className={actionClass({ variant: "secondary", size: "sm" })}
              onClick={() => copy("secret", secret)}
            >
              {copied === "secret" ? t("advancedAutomationCopied") : t("advancedAutomationCopy")}
            </button>
          </div>
        </div>
      ) : null}
      <button
        type="button"
        disabled={busy}
        className={cn(actionClass({ variant: configured ? "secondary" : "primary", size: "sm" }), "self-start")}
        onClick={() => void rotate()}
      >
        {configured ? t("advancedAutomationWebhookRotate") : t("advancedAutomationWebhookGenerate")}
      </button>
      {configured && !secret ? (
        <p className="text-body-11 text-neutral-500">{t("advancedAutomationWebhookRotateHint")}</p>
      ) : null}
      {error ? (
        <p className="text-body-12 text-error-darkest" role="alert">
          {t("advancedAutomationWebhookSecretError")}
        </p>
      ) : null}
      <span className="pt-1 text-body-12 font-semibold text-neutral-700">{t("advancedAutomationWebhookBody")}</span>
      <pre className="overflow-x-auto rounded bg-neutral-10 px-2 py-1.5 text-body-11 text-neutral-900">
        {`{\n  "name": "Ana Souza",\n  "phone": "+5511999990000",\n  "email": "ana@example.com",\n  "company": "ACME",\n  "value": 1500,\n  "fields": { "<fieldId>": "..." }\n}`}
      </pre>
      <p className="text-body-11 text-neutral-500">{t("advancedAutomationWebhookMatchHint")}</p>
    </div>
  )
}

/** Editor of the start pill: how the automation begins, its filters and protections, and when it must stop. */
export const BotStartInspector = memo(function BotStartInspector({
  draft,
  dispatch,
  onClose,
  ctx,
  lookups,
  webhook,
}: Props) {
  const { t, language } = useAutomationsT()
  const trigger = draft.trigger
  const setTrigger = useCallback(
    (patch: Partial<AdvancedAutomationTrigger>) => {
      const next = { ...trigger, ...patch }
      for (const k of Object.keys(patch) as Array<keyof AdvancedAutomationTrigger>)
        if (patch[k] === undefined) delete (next as Record<string, unknown>)[k]
      dispatch({ type: "meta", patch: { trigger: next } })
    },
    [dispatch, trigger]
  )
  const channels = useMemo(() => draft.channels.map((c) => c.channel), [draft.channels])

  const kindItems = TRIGGER_GROUPS.flatMap((g) =>
    g.kinds.map((kind) => ({
      value: kind,
      displayName: t(automationsKey(`advancedAutomationTrigger_${kind}`)),
      description: t(automationsKey(`advancedAutomationTriggerGroup_${g.id}`)),
    }))
  )
  const stage = { projectId: trigger.projectId ?? "", boardId: trigger.boardId ?? "", columnId: trigger.columnId ?? "" }
  const setStage = (next: { projectId: string; boardId: string; columnId: string }) =>
    setTrigger({
      projectId: next.projectId || undefined,
      boardId: next.boardId || undefined,
      columnId: next.columnId || undefined,
    })
  const dateField = trigger.dateField ?? { fieldId: "", offsetDays: -1, time: "09:00" }
  const schedule = trigger.schedule ?? { frequency: "daily" as const, time: "09:00" }

  return (
    <aside
      aria-label={t("advancedAutomationInspectorTitle")}
      className="absolute inset-y-4 right-4 z-20 flex w-[340px] flex-col overflow-hidden rounded-lg border border-neutral-border bg-white shadow-xl"
    >
      <div className="flex items-center gap-2 border-b border-neutral-50 p-3">
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary-dark text-white"
          aria-hidden
        >
          <Play className="size-4 fill-current" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-body-12 text-neutral-400">{t("advancedAutomationInspectorStartKind")}</p>
          <p className="truncate text-body-14 font-semibold text-neutral-800">{t("advancedAutomationStart")}</p>
        </div>
        <IconButton
          type="button"
          size="large"
          variant="ghost"
          aria-label={t("advancedAutomationClose")}
          onClick={onClose}
          icon={<X />}
        />
      </div>
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        <FieldBlock label={t("advancedAutomationFieldStartsWhen")}>
          <BotSelect
            size="small"
            value={trigger.kind}
            onValueChange={(kind) =>
              dispatch({
                type: "meta",
                patch: { trigger: withTriggerKind(trigger, kind as AdvancedAutomationTrigger["kind"]) },
              })
            }
            items={kindItems}
          />
        </FieldBlock>
        <p className="text-body-12 text-neutral-500">
          {t(automationsKey(`advancedAutomationTriggerHint_${trigger.kind}`))}
        </p>
        {isCrmTrigger(trigger.kind) || isTimeTrigger(trigger.kind) ? (
          <p className="rounded-md bg-neutral-10 px-3 py-2 text-body-12 text-neutral-700">
            {t("advancedAutomationTriggerBackgroundHint")}
          </p>
        ) : null}
        {runsOnLeads(trigger.kind) ? (
          <p className="text-body-12 text-neutral-500">{t("advancedAutomationTriggerLeadRunHint")}</p>
        ) : null}

        {trigger.kind === "new_conversation" ? (
          <TextInput
            size="small"
            type="number"
            min={0}
            max={365}
            label={t("advancedAutomationFieldDedupe")}
            value={String(trigger.dedupeDays)}
            helperText={t("advancedAutomationDedupeHint")}
            onChange={(e) =>
              setTrigger({ dedupeDays: Math.max(0, Math.min(365, Math.round(Number(e.target.value) || 0))) })
            }
            hideErrorMessage
            removeOptionalText
          />
        ) : null}
        {trigger.kind === "keyword" ? (
          <TextArea
            id="bot-trigger-keywords"
            label={t("advancedAutomationFieldKeywords")}
            size="small"
            minRows={3}
            maxRows={8}
            autoResize
            defaultValue={(trigger.keywords ?? []).join("\n")}
            onBlur={(e) => setTrigger({ keywords: parseKeywords(e.target.value) })}
            helperText={t("advancedAutomationKeywordsHint", { max: TRIGGER_LIMITS.keywords })}
            removeOptionalText
            hideErrorMessage
          />
        ) : null}
        {trigger.kind === "any_message" ? (
          <SwitchRow
            checked={trigger.outsideBusinessHoursOnly === true}
            onChange={(v) => setTrigger({ outsideBusinessHoursOnly: v || undefined })}
            label={t("advancedAutomationOutsideHoursOnly")}
            hint={t("advancedAutomationOutsideHoursOnlyHint")}
          />
        ) : null}
        {trigger.kind === "contact_no_reply" || trigger.kind === "team_no_reply" ? (
          <DurationField
            minutes={trigger.minutes ?? 60}
            max={TRIGGER_LIMITS.silenceMinutesMax}
            t={t}
            label={t("advancedAutomationFieldSilence")}
            onChange={(minutes) => setTrigger({ minutes: Math.max(TRIGGER_LIMITS.silenceMinutesMin, minutes) })}
          />
        ) : null}
        {trigger.kind === "conversation_assigned" ? (
          <FieldBlock label={t("advancedAutomationFieldAssignedTo")} hint={t("advancedAutomationAssignedAnyoneHint")}>
            <MemberSelect
              value={trigger.userId ?? ""}
              onChange={(userId) => setTrigger({ userId: userId || undefined })}
              lookups={lookups}
              t={t}
            />
            {trigger.userId ? (
              <button
                type="button"
                className={cn(actionClass({ variant: "ghost", size: "sm" }), "self-start")}
                onClick={() => setTrigger({ userId: undefined })}
              >
                {t("advancedAutomationAnyone")}
              </button>
            ) : null}
          </FieldBlock>
        ) : null}
        {trigger.kind === "card_created" ||
        trigger.kind === "card_won" ||
        trigger.kind === "card_lost" ||
        trigger.kind === "date_field" ? (
          <FieldBlock label={t("advancedAutomationFieldTriggerBoard")}>
            <BoardPicker
              projectId={trigger.projectId ?? ""}
              boardId={trigger.boardId ?? ""}
              projects={ctx.crmProjects}
              t={t}
              onChange={(next) =>
                setTrigger({
                  projectId: next.projectId || undefined,
                  boardId: next.boardId || undefined,
                  columnId: undefined,
                })
              }
            />
          </FieldBlock>
        ) : null}
        {trigger.kind === "card_stage_changed" || trigger.kind === "scheduled" || trigger.kind === "webhook" ? (
          <FieldBlock
            label={t(
              trigger.kind === "webhook"
                ? "advancedAutomationFieldWebhookStage"
                : trigger.kind === "scheduled"
                ? "advancedAutomationFieldScheduleStage"
                : "advancedAutomationFieldTriggerStage"
            )}
          >
            <StagePicker value={stage} projects={ctx.crmProjects} lookups={lookups} t={t} onChange={setStage} />
          </FieldBlock>
        ) : null}
        {trigger.kind === "card_label_added" ? (
          <FieldBlock label={t("advancedAutomationFieldLabel")}>
            <BotLabelPicker
              labelText={trigger.labelText ?? ""}
              projectId={trigger.projectId}
              projects={ctx.crmProjects}
              lookups={lookups}
              t={t}
              onChange={(next) =>
                setTrigger({ labelText: next.labelText || undefined, projectId: next.projectId || undefined })
              }
            />
          </FieldBlock>
        ) : null}
        {trigger.kind === "scheduled" ? (
          <div className="flex flex-col gap-3">
            <FieldBlock label={t("advancedAutomationFieldFrequency")}>
              <BotSelect
                value={schedule.frequency}
                onValueChange={(frequency) =>
                  setTrigger({
                    schedule:
                      frequency === "weekly"
                        ? {
                            frequency: "weekly",
                            time: schedule.time,
                            weekdays: schedule.weekdays?.length ? schedule.weekdays : [1],
                          }
                        : { frequency: "daily", time: schedule.time },
                  })
                }
                items={[
                  { value: "daily", displayName: t("advancedAutomationFrequencyDaily") },
                  { value: "weekly", displayName: t("advancedAutomationFrequencyWeekly") },
                ]}
              />
            </FieldBlock>
            {schedule.frequency === "weekly" ? (
              <FieldBlock label={t("advancedAutomationFieldWeekdays")}>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map((d) => {
                    const days = schedule.weekdays ?? []
                    const on = days.includes(d)
                    return (
                      <label key={d} className="flex items-center gap-1 text-body-12 text-neutral-900">
                        <input
                          type="checkbox"
                          className="accent-primary-dark"
                          checked={on}
                          onChange={() =>
                            setTrigger({
                              schedule: {
                                ...schedule,
                                weekdays: (on ? days.filter((x) => x !== d) : [...days, d]).sort(),
                              },
                            })
                          }
                        />
                        {t(automationsKey(`advancedAutomationWeekday_${d}`))}
                      </label>
                    )
                  })}
                </div>
              </FieldBlock>
            ) : null}
            <TextInput
              size="small"
              type="time"
              label={t("advancedAutomationFieldTime")}
              value={schedule.time}
              onChange={(e) => setTrigger({ schedule: { ...schedule, time: e.target.value } })}
              helperText={t("advancedAutomationTimeZoneHint")}
              hideErrorMessage
              removeOptionalText
            />
          </div>
        ) : null}
        {trigger.kind === "date_field" && trigger.projectId && trigger.boardId ? (
          <div className="flex flex-col gap-3">
            <FieldBlock label={t("advancedAutomationFieldDateField")} hint={t("advancedAutomationDateFieldHint")}>
              <CardFieldPicker
                value={{ projectId: trigger.projectId, boardId: trigger.boardId, fieldId: dateField.fieldId }}
                onChange={(next) => setTrigger({ dateField: { ...dateField, fieldId: next.fieldId } })}
                projects={ctx.crmProjects}
                lookups={lookups}
                t={t}
                includeOwner={false}
                only={isDateField}
              />
            </FieldBlock>
            <div className="flex items-end gap-2">
              <TextInput
                size="small"
                type="number"
                min={0}
                max={365}
                label={t("advancedAutomationFieldOffsetDays")}
                value={String(Math.abs(dateField.offsetDays))}
                containerClassName="w-24"
                onChange={(e) => {
                  const days = Math.max(0, Math.min(365, Math.round(Number(e.target.value) || 0)))
                  setTrigger({ dateField: { ...dateField, offsetDays: dateField.offsetDays < 0 ? -days : days } })
                }}
                hideErrorMessage
                removeOptionalText
              />
              <BotSelect
                value={dateField.offsetDays < 0 ? "before" : "after"}
                onValueChange={(dir) => {
                  const days = Math.abs(dateField.offsetDays)
                  setTrigger({ dateField: { ...dateField, offsetDays: dir === "before" ? -days : days } })
                }}
                items={[
                  { value: "before", displayName: t("advancedAutomationDaysBefore") },
                  { value: "after", displayName: t("advancedAutomationDaysAfter") },
                ]}
                containerClassNames="flex-1"
              />
            </div>
            <TextInput
              size="small"
              type="time"
              label={t("advancedAutomationFieldTime")}
              value={dateField.time}
              onChange={(e) => setTrigger({ dateField: { ...dateField, time: e.target.value } })}
              helperText={t("advancedAutomationTimeZoneHint")}
              hideErrorMessage
              removeOptionalText
            />
          </div>
        ) : null}
        {trigger.kind === "webhook" ? (
          <WebhookSection automationId={draft.id} info={webhook} t={t} language={language} />
        ) : null}

        {trigger.kind !== "manual" ? (
          <>
            <TriggerFilters
              trigger={trigger}
              channels={channels}
              ctx={ctx}
              lookups={lookups}
              setTrigger={setTrigger}
              t={t}
            />
            <SwitchRow
              checked={trigger.oncePerLead === true}
              onChange={(v) => setTrigger({ oncePerLead: v || undefined })}
              label={t("advancedAutomationOncePerLead")}
              hint={t("advancedAutomationOncePerLeadHint")}
            />
          </>
        ) : null}
        <SwitchRow
          checked={draft.stopOnHumanReply}
          onChange={(stopOnHumanReply) => dispatch({ type: "meta", patch: { stopOnHumanReply } })}
          label={t("advancedAutomationStopOnHuman")}
          hint={t("advancedAutomationStopOnHumanHint")}
        />
      </div>
    </aside>
  )
})
