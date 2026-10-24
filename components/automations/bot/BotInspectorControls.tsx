"use client"

import { type ReactNode, useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import type { IColumn } from "app/_types/Column"
import type { IProject } from "app/_types/Project"
import type { AutomationsTFn } from "components/automations/ui/useAutomationsT"
import { ProjectBoardColumnPicker } from "components/Project/Automations/ProjectBoardColumnPicker"
import { SearchSelectPopover } from "components/settings/whatsapp-lite/SearchSelectPopover"
import { waTemplateSelectInputTriggerClassNames } from "components/settings/whatsapp-lite/template-rule-forms"
import TextInput from "components/TextInput/TextInput"
import { Switch } from "components/ui/switch"
import { selectBoard, selectColumn, selectProject, type StageSelection, withSoleBoard } from "lib/automations/botStage"
import { boardsForColumnPicker } from "lib/projects/projectBoardRefs"
import { minutesParts, UNIT_MINUTES } from "./botNodeMeta"
import { BotSelect } from "./BotSelect"
import type { BotLookups } from "./useBotLookups"

export function FieldBlock({
  label,
  hint,
  children,
  className,
}: {
  label?: string
  hint?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label ? <span className="text-body-12 font-semibold text-neutral-700">{label}</span> : null}
      {children}
      {hint ? <p className="text-body-11 text-neutral-500">{hint}</p> : null}
    </div>
  )
}

export function SwitchRow({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  hint?: string
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-body-13 font-medium text-neutral-900">{label}</p>
        {hint ? <p className="text-body-11 text-neutral-500">{hint}</p> : null}
      </div>
      <Switch size="sm" checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  )
}

/** Number + unit (minutes / hours / days) editing a value stored in minutes. */
export function DurationField({
  minutes,
  onChange,
  max,
  t,
  label,
}: {
  minutes: number
  onChange: (minutes: number) => void
  max: number
  t: AutomationsTFn
  label?: string
}) {
  const parts = minutesParts(minutes)
  const [unit, setUnit] = useState(parts.unit)
  // The stored minutes win when they no longer divide by the chosen unit (e.g. loaded from the API).
  const shown = minutes % UNIT_MINUTES[unit] === 0 ? minutes / UNIT_MINUTES[unit] : minutes
  const effectiveUnit = minutes % UNIT_MINUTES[unit] === 0 ? unit : "minutes"
  const set = (value: number, u: keyof typeof UNIT_MINUTES) => {
    const next = Math.max(1, Math.min(max, Math.round(value * UNIT_MINUTES[u])))
    onChange(Number.isFinite(next) ? next : 1)
  }
  return (
    <div className="flex items-end gap-2">
      <TextInput
        type="number"
        min={1}
        size="small"
        label={label}
        value={String(shown)}
        onChange={(e) => set(Number(e.target.value) || 1, effectiveUnit)}
        containerClassName="w-24"
        hideErrorMessage
        removeOptionalText
      />
      <BotSelect
        size="small"
        value={effectiveUnit}
        onValueChange={(u) => {
          setUnit(u as keyof typeof UNIT_MINUTES)
          set(shown, u as keyof typeof UNIT_MINUTES)
        }}
        items={[
          { value: "minutes", displayName: t("advancedAutomationUnitMinutes") },
          { value: "hours", displayName: t("advancedAutomationUnitHours") },
          { value: "days", displayName: t("advancedAutomationUnitDays") },
        ]}
        containerClassNames="w-32"
      />
    </div>
  )
}

/** Project -> custom field picker. Stores only the field id (the card's project decides at run time). */
export function CardFieldPicker({
  value,
  onChange,
  projects,
  lookups,
  t,
  placeholder,
}: {
  value: string
  onChange: (fieldId: string) => void
  projects: IProject[]
  lookups: BotLookups
  t: AutomationsTFn
  placeholder: string
}) {
  const [projectId, setProjectId] = useState(projects[0]?._id ?? "")
  const { loadFields } = lookups
  useEffect(() => {
    if (projectId) loadFields(projectId)
  }, [projectId, loadFields])

  const loaded = lookups.fields[`${projectId}:`]
  const items = useMemo(() => {
    const list = (loaded?.data ?? []).map((f) => ({ value: f.fieldId, displayName: f.fieldName }))
    return value && !list.some((i) => i.value === value) ? [{ value, displayName: value }, ...list] : list
  }, [loaded?.data, value])

  return (
    <div className="flex flex-col gap-2">
      {projects.length > 1 ? (
        <BotSelect
          size="small"
          value={projectId}
          onValueChange={setProjectId}
          placeholder={t("advancedAutomationPickProject")}
          items={projects.map((p) => ({ value: p._id, displayName: p.title ?? p._id }))}
        />
      ) : null}
      <BotSelect
        size="small"
        value={value}
        onValueChange={onChange}
        placeholder={loaded?.status === "loading" ? t("advancedAutomationLoading") : placeholder}
        items={items}
        emptyContent={<p className="px-3 py-2 text-body-12 text-neutral-500">{t("advancedAutomationNoFields")}</p>}
      />
    </div>
  )
}

/**
 * Project -> board -> column picker. Same data and components as the rule editor's "move card" action:
 * boards come from the project's tabs plus whatever the loaded columns reveal, columns are fetched per
 * board, and every choice (project, board, column) is stored on the step so it reopens as it was left.
 */
export function StagePicker({
  value,
  projects,
  lookups,
  onChange,
  t,
}: {
  value: StageSelection
  projects: IProject[]
  lookups: BotLookups
  onChange: (next: StageSelection) => void
  t: AutomationsTFn
}) {
  const { projectId, boardId, columnId } = value
  const project = projects.find((p) => p._id === projectId)
  const cache = lookups.projectColumns[projectId]
  const columns: IColumn[] = useMemo(() => cache?.data ?? [], [cache?.data])
  const boards = useMemo(() => boardsForColumnPicker(project, columns), [project, columns])
  const { loadProjectColumns } = lookups

  useEffect(() => {
    if (projectId) loadProjectColumns(projectId, boardId || undefined, projects)
  }, [projectId, boardId, projects, loadProjectColumns])

  // A project with a single board needs no board choice: seed it so its columns can load.
  const soleBoardId = boards.length === 1 ? boards[0]!.boardId : ""
  useEffect(() => {
    const next = withSoleBoard({ projectId, boardId, columnId }, soleBoardId ? [soleBoardId] : [])
    if (next.boardId !== boardId) onChange(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed once per project/board
  }, [projectId, boardId, soleBoardId])

  const projectItems = useMemo(() => projects.map((p) => ({ value: p._id, label: p.title || p._id })), [projects])

  return (
    <div className="flex flex-col gap-2">
      <SearchSelectPopover
        value={projectId}
        onChange={(next) => onChange(selectProject(next))}
        items={projectItems}
        placeholder={t("advancedAutomationPickProject")}
        searchPlaceholder={t("advancedAutomationSearch")}
        emptyLabel={t("advancedAutomationNoProjects")}
        triggerClassNames={cn(waTemplateSelectInputTriggerClassNames, "h-8")}
      />
      {!projectId ? null : boards.length > 0 ? (
        <ProjectBoardColumnPicker
          boards={boards}
          columns={columns}
          value={columnId}
          boardValue={boardId}
          onChange={(id) => onChange(selectColumn(value, id, columns))}
          onBoardChange={(id) => onChange(selectBoard(value, id, columns))}
          noneLabel={t("advancedAutomationPickStage")}
          boardPlaceholder={t("advancedAutomationPickBoard")}
          columnPlaceholder={t("advancedAutomationPickStage")}
          searchBoardPlaceholder={t("advancedAutomationSearch")}
          searchColumnPlaceholder={t("advancedAutomationSearch")}
          triggerClassNames={cn(waTemplateSelectInputTriggerClassNames, "h-8")}
        />
      ) : cache?.status === "loading" ? (
        <p className="text-body-12 text-neutral-500">{t("advancedAutomationStagesLoading")}</p>
      ) : (
        <p className="text-body-12 text-neutral-500">{t("advancedAutomationStagesEmpty")}</p>
      )}
      {cache?.status === "error" ? <p className="text-body-12 text-error-dark">{t("advancedAutomationStagesError")}</p> : null}
    </div>
  )
}
