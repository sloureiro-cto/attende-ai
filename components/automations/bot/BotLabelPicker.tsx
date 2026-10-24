"use client"

import { Check, Plus } from "lucide-react"
import { memo, useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { createLabelAction } from "actions/labels/createLabel"
import type { ILabel } from "app/_types/Label"
import type { IProject } from "app/_types/Project"
import type { AutomationsTFn } from "components/automations/ui/useAutomationsT"
import Button from "components/Button/Button"
import { ContrastText } from "components/ContrastText/ContrastText"
import { LabelEditorActions, LabelEditorHeader, LabelEditorPickers } from "components/Project/CardStructure/LabelsLayout"
import { SearchSelectPopover } from "components/settings/whatsapp-lite/SearchSelectPopover"
import { waTemplateSelectInputTriggerClassNames } from "components/settings/whatsapp-lite/template-rule-forms"
import TextInput from "components/TextInput/TextInput"
import { Skeleton } from "components/ui/skeleton"
import { isSameLabel, LABEL_TEXT_MAX, labelSelectionPatch, visibleLabels } from "lib/automations/botLabel"
import type { BotLookups } from "./useBotLookups"

type Props = {
  labelText: string
  projectId?: string
  projects: IProject[]
  lookups: BotLookups
  t: AutomationsTFn
  onChange: (patch: { labelText: string; labelColor?: string; projectId: string }) => void
}

function LabelChip({ label }: { label: Pick<ILabel, "text" | "color"> }) {
  return (
    <ContrastText
      bgColor={label.color}
      className="inline-flex max-w-full items-center rounded-md px-2.5 py-1 text-body-12"
      style={{ backgroundColor: label.color || undefined }}
    >
      <span className="truncate">{label.text}</span>
    </ContrastText>
  )
}

/**
 * Pick the label of a project, or create one with the project card's own label editor. The bot
 * only stores the name: at run time the label is found (or created) in the lead's project.
 */
export const BotLabelPicker = memo(function BotLabelPicker({ labelText, projectId, projects, lookups, t, onChange }: Props) {
  const pid = projectId && projects.some((p) => p._id === projectId) ? projectId : (projects.length === 1 ? projects[0]!._id : "")
  const { loadLabels, addLabel } = lookups
  const cache = lookups.labels[pid]
  const [query, setQuery] = useState("")
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState<Partial<ILabel>>({ text: "", color: "" })
  const [colorBlind, setColorBlind] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (pid) loadLabels(pid)
  }, [pid, loadLabels])

  const projectItems = useMemo(() => projects.map((p) => ({ value: p._id, label: p.title || p._id })), [projects])
  const labels = useMemo(() => visibleLabels(cache?.data ?? [], query, labelText), [cache?.data, query, labelText])
  const hasSelection = labelText.trim().length > 0
  const selectedInProject = (cache?.data ?? []).find((l) => isSameLabel(l.text, labelText))

  const closeEditor = () => {
    setCreating(false)
    setDraft({ text: "", color: "" })
    setColorBlind(false)
    setError(null)
  }

  const submit = async () => {
    const text = (draft.text ?? "").trim()
    if (!pid || !text || !draft.color || busy) return
    setBusy(true)
    setError(null)
    const res = await createLabelAction({
      project: pid,
      text: text.slice(0, LABEL_TEXT_MAX),
      color: draft.color,
      ...(colorBlind && draft.pattern ? { pattern: draft.pattern } : {}),
    })
    setBusy(false)
    if (!res.success || !res.data) {
      setError(res.success ? t("advancedAutomationLabelCreateError") : res.error || t("advancedAutomationLabelCreateError"))
      return
    }
    addLabel(pid, res.data)
    onChange(labelSelectionPatch(res.data, pid))
    closeEditor()
  }

  if (creating) {
    return (
      <div className="overflow-hidden rounded-md border border-neutral-50 bg-white">
        <LabelEditorHeader
          newLabel={draft}
          isColorBlindMode={colorBlind}
          onBack={closeEditor}
          onClose={closeEditor}
          onTextChange={(text) => setDraft((d) => ({ ...d, text: text.slice(0, LABEL_TEXT_MAX) }))}
        />
        <LabelEditorPickers
          newLabel={draft}
          isColorBlindMode={colorBlind}
          onSelectColor={(color) => setDraft((d) => ({ ...d, color }))}
          onSelectPattern={(pattern) => setDraft((d) => ({ ...d, pattern }))}
        />
        {error ? <p className="px-3 pb-2 text-body-12 text-error-dark">{error}</p> : null}
        <LabelEditorActions
          newLabel={draft}
          isCreating={busy}
          isEditing={false}
          isColorBlindMode={colorBlind}
          onToggleColorBlindMode={() => setColorBlind((v) => !v)}
          onSubmit={() => void submit()}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <SearchSelectPopover
        value={pid}
        onChange={(next) => {
          setQuery("")
          onChange({ labelText, projectId: next })
        }}
        items={projectItems}
        placeholder={t("advancedAutomationPickProject")}
        searchPlaceholder={t("advancedAutomationSearch")}
        emptyLabel={t("advancedAutomationNoProjects")}
        triggerClassNames={cn(waTemplateSelectInputTriggerClassNames, "h-8")}
      />

      {hasSelection ? (
        <div className="flex items-center gap-2" aria-label={t("advancedAutomationLabelSelected")}>
          <span className="text-body-12 text-neutral-500">{t("advancedAutomationLabelSelected")}</span>
          <LabelChip label={{ text: labelText, color: selectedInProject?.color ?? "" }} />
        </div>
      ) : null}

      {pid ? (
        <>
          <TextInput
            size="small"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("advancedAutomationSearch")}
            aria-label={t("advancedAutomationSearch")}
            hideErrorMessage
            removeOptionalText
          />
          <div className="flex max-h-44 flex-col gap-1 overflow-y-auto rounded-md border border-neutral-50 p-1.5" role="listbox" aria-label={t("advancedAutomationFieldLabel")}>
            {cache?.status === "loading" && labels.length === 0 ? (
              <>
                <Skeleton className="h-7 w-24" />
                <Skeleton className="h-7 w-32" />
              </>
            ) : cache?.status === "error" ? (
              <div className="flex items-center justify-between gap-2 p-1">
                <span className="text-body-12 text-error-dark">{t("advancedAutomationLabelsError")}</span>
                <Button size="small" variant="secondary" style="outline" onClick={() => loadLabels(pid)}>
                  {t("advancedAutomationRetry")}
                </Button>
              </div>
            ) : labels.length === 0 ? (
              <p className="px-1 py-1.5 text-body-12 text-neutral-500">{query ? t("advancedAutomationLabelsNoMatch") : t("advancedAutomationLabelsEmpty")}</p>
            ) : (
              labels.map((l) => {
                const active = isSameLabel(l.text, labelText)
                return (
                  <button
                    key={l._id ?? l.text}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => onChange(labelSelectionPatch(l, pid))}
                    className={cn(
                      "flex min-w-0 items-center justify-between gap-2 rounded-md px-1.5 py-1 text-left hover:bg-neutral-10",
                      active && "bg-primary-clean"
                    )}
                  >
                    <LabelChip label={l} />
                    {active ? <Check className="size-4 shrink-0 text-primary-dark" aria-hidden /> : null}
                  </button>
                )
              })
            )}
          </div>
          <Button
            size="small"
            variant="secondary"
            style="outline"
            startIcon={<Plus className="size-3.5" />}
            onClick={() => {
              setDraft({ text: query.trim().slice(0, LABEL_TEXT_MAX), color: "" })
              setCreating(true)
            }}
          >
            {t("advancedAutomationLabelCreate")}
          </Button>
        </>
      ) : null}

      <p className="text-body-11 text-neutral-500">{t("advancedAutomationLabelRuntimeNote")}</p>
    </div>
  )
})
