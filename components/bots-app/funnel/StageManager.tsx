"use client"

import { Add, ArrowDown2, ArrowUp2, CloseSquare, Trash } from "iconsax-react"
import { type FormEvent, useCallback, useEffect, useId, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { createFunnelStageAction, deleteFunnelStageAction, loadFunnelStageSettingsAction, updateFunnelStageAction } from "actions/attende/funnel"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "components/ui/sheet"
import { formatNumber } from "lib/attende/format"
import { stageLabel } from "lib/attende/funnel/stageNames"
import { cleanStageName, moveItem, nextBoardIndex, reorderUpdates, STAGE_KINDS, STAGE_NAME_MAX, type StageSetting } from "lib/attende/funnel/stages"
import type { FunnelStageWithCount, StageKind } from "lib/attende/funnel/types"
import type { AttendeFunnelKey } from "lib/i18n/translations/attende/funnel"
import { IconAction, Input, INPUT_CLASS } from "./fields"
import type { AttendeFunnelT, AttendeFunnelTn } from "./useAttendeFunnelT"
import { actionClass } from "../ui/actionStyles"

export type StageChange =
  | { type: "created"; stage: StageSetting }
  | { type: "updated"; id: string; name?: string; kind?: StageKind }
  | { type: "reordered"; ids: string[] }
  | { type: "deleted"; id: string; moveTo: string }

type Op = "create" | "update" | "delete"

const KIND_LABEL: Record<StageKind, AttendeFunnelKey> = { open: "stageKindOpen", won: "stageKindWon", lost: "stageKindLost" }

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Stages from the funnel (for the deal counts shown when removing one). */
  counts: FunnelStageWithCount[]
  t: AttendeFunnelT
  tn: AttendeFunnelTn
  language: string
  /** Called after each change the server accepted, so the page can refresh its stages and table. */
  onChanged: (change: StageChange) => void
}

type Status = { kind: "ok" | "error"; text: string } | null

function KindSelect({ id, value, disabled, label, t, onChange }: { id: string; value: StageKind; disabled?: boolean; label: string; t: AttendeFunnelT; onChange: (kind: StageKind) => void }) {
  return (
    <select id={id} aria-label={label} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value as StageKind)} className={cn(INPUT_CLASS, "h-9 w-auto shrink-0 pr-8")}>
      {STAGE_KINDS.map((k) => (
        <option key={k} value={k}>
          {t(KIND_LABEL[k])}
        </option>
      ))}
    </select>
  )
}

type RowProps = {
  stage: StageSetting
  index: number
  stages: StageSetting[]
  count: number | null
  busy: boolean
  forbidden: Record<Op, boolean>
  t: AttendeFunnelT
  tn: AttendeFunnelTn
  language: string
  onRename: (name: string) => void
  onKind: (kind: StageKind) => void
  onMove: (delta: -1 | 1) => void
  onDelete: (moveTo: string) => Promise<boolean>
}

function StageRow({ stage, index, stages, count, busy, forbidden, t, tn, language, onRename, onKind, onMove, onDelete }: RowProps) {
  const [name, setName] = useState(stage.name)
  const [invalid, setInvalid] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [moveTo, setMoveTo] = useState("")
  const uid = useId()
  const label = stageLabel(stage, t) || t("unnamed")

  useEffect(() => setName(stage.name), [stage.name])

  const commit = () => {
    const clean = cleanStageName(name)
    if (!clean) {
      setInvalid(true)
      return
    }
    setInvalid(false)
    if (clean !== stage.name) onRename(clean)
    else setName(stage.name)
  }

  const last = stages.length <= 1
  const others = stages.filter((s) => s.id !== stage.id)
  const nameId = `${uid}-name`

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-neutral-50 bg-white p-3" data-testid="stage-row">
      <div className="flex flex-wrap items-center gap-2">
        <span className="w-6 shrink-0 text-center text-body-12 tabular-nums text-neutral-500" aria-hidden>
          {formatNumber(index + 1, language)}
        </span>
        <label htmlFor={nameId} className="sr-only">
          {t("stageNameOf", { name: label })}
        </label>
        <Input
          id={nameId}
          data-escape-local
          value={name}
          maxLength={STAGE_NAME_MAX}
          disabled={busy || forbidden.update}
          aria-invalid={invalid}
          aria-describedby={invalid ? `${nameId}-error` : undefined}
          onChange={(e) => {
            setName(e.target.value)
            setInvalid(false)
          }}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              commit()
            } else if (e.key === "Escape") {
              e.preventDefault()
              setName(stage.name)
              setInvalid(false)
            }
          }}
          className="min-w-0 flex-1 basis-40"
        />
        <KindSelect id={`${uid}-kind`} label={t("stageKindOf", { name: label })} value={stage.kind} disabled={busy || forbidden.update} t={t} onChange={onKind} />
        <span className="flex shrink-0 items-center">
          <IconAction label={t("stageMoveUp", { name: label })} disabled={busy || forbidden.update || index === 0} onClick={() => onMove(-1)}>
            <ArrowUp2 size={15} aria-hidden />
          </IconAction>
          <IconAction label={t("stageMoveDown", { name: label })} disabled={busy || forbidden.update || index === stages.length - 1} onClick={() => onMove(1)}>
            <ArrowDown2 size={15} aria-hidden />
          </IconAction>
          {!removing && (
            <IconAction label={last ? t("stageRemoveLast") : t("stageRemove", { name: label })} disabled={busy || forbidden.delete || last} danger onClick={() => setRemoving(true)}>
              <Trash size={15} aria-hidden />
            </IconAction>
          )}
        </span>
      </div>
      {invalid && (
        <p id={`${nameId}-error`} className="text-body-12 text-error-dark">
          {t("stageNameInvalid", { max: formatNumber(STAGE_NAME_MAX, language) })}
        </p>
      )}
      {removing && (
        <form
          className="flex flex-col gap-2 rounded-lg bg-error-clean px-3 py-2.5"
          aria-label={t("stageRemove", { name: label })}
          onSubmit={(e: FormEvent) => {
            e.preventDefault()
            if (!moveTo) return
            void onDelete(moveTo).then((ok) => ok && setRemoving(false))
          }}
        >
          <p className="text-body-12 font-medium text-error-darkest">
            {count == null ? t("stageRemoveDealsUnknown", { name: label }) : tn("stageRemoveDealsOne", "stageRemoveDealsOther", count, { name: label })}
          </p>
          <label htmlFor={`${uid}-move`} className="text-body-12 text-neutral-900">
            {t("stageRemoveMoveTo")}
          </label>
          <select id={`${uid}-move`} required value={moveTo} disabled={busy} onChange={(e) => setMoveTo(e.target.value)} className={cn(INPUT_CLASS, "h-9")}>
            <option value="">{t("stageRemoveChoose")}</option>
            {others.map((s) => (
              <option key={s.id} value={s.id}>
                {stageLabel(s, t) || t("unnamed")}
              </option>
            ))}
          </select>
          <span className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => setRemoving(false)} className="h-8 rounded-md px-3 text-body-12 font-semibold text-neutral-700 hover:bg-white">
              {t("cancel")}
            </button>
            <button type="submit" disabled={!moveTo || busy || forbidden.delete} className="h-8 rounded-md bg-error-dark px-3 text-body-12 font-semibold text-white hover:bg-error-darkest disabled:cursor-not-allowed disabled:opacity-50">
              {t("stageRemoveYes")}
            </button>
          </span>
        </form>
      )}
    </li>
  )
}

/**
 * "Manage stages": add, rename, change the kind (in progress / won / lost), reorder and remove the funnel's stages.
 * Each change is saved at once and shown right away; a refusal puts the list back and says why. A 403 turns that kind
 * of change off (the role lacks the column permission).
 */
export function StageManager({ open, onOpenChange, counts, t, tn, language, onChanged }: Props) {
  const [stages, setStages] = useState<StageSetting[] | null>(null)
  const [loadError, setLoadError] = useState<"forbidden" | "failed" | null>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<Status>(null)
  const [forbidden, setForbidden] = useState<Record<Op, boolean>>({ create: false, update: false, delete: false })
  const [newName, setNewName] = useState("")
  const [newKind, setNewKind] = useState<StageKind>("open")
  const [newInvalid, setNewInvalid] = useState(false)
  const loadSeq = useRef(0)
  const uid = useId()

  const load = useCallback(async () => {
    const n = ++loadSeq.current
    setStages(null)
    setLoadError(null)
    const res = await loadFunnelStageSettingsAction()
    if (n !== loadSeq.current) return
    if (res.success) setStages(res.data.stages)
    else setLoadError(res.status === 403 ? "forbidden" : "failed")
  }, [])

  useEffect(() => {
    if (!open) return
    setStatus(null)
    void load()
  }, [open, load])

  /** Runs one change: optimistic `apply`, the request, and the roll back + message on a refusal. */
  const run = async (op: Op, apply: (list: StageSetting[]) => StageSetting[], request: () => Promise<{ success: boolean; status?: number }>, done: string): Promise<boolean> => {
    if (!stages) return false
    const before = stages
    setBusy(true)
    setStatus(null)
    setStages(apply(stages))
    const res = await request()
    setBusy(false)
    if (!res.success) {
      setStages(before)
      if (res.status === 403) {
        setForbidden((f) => ({ ...f, [op]: true }))
        setStatus({ kind: "error", text: t(op === "create" ? "stageForbiddenCreate" : op === "update" ? "stageForbiddenUpdate" : "stageForbiddenDelete") })
      } else {
        setStatus({ kind: "error", text: t(op === "delete" ? "stageDeleteFailed" : "stageSaveFailed") })
      }
      return false
    }
    setStatus({ kind: "ok", text: done })
    return true
  }

  const rename = async (stage: StageSetting, name: string) => {
    const ok = await run("update", (list) => list.map((s) => (s.id === stage.id ? { ...s, name } : s)), () => updateFunnelStageAction(stage.id, { name }), t("stageSaved"))
    if (ok) onChanged({ type: "updated", id: stage.id, name })
  }

  const changeKind = async (stage: StageSetting, kind: StageKind) => {
    if (kind === stage.kind) return
    const ok = await run("update", (list) => list.map((s) => (s.id === stage.id ? { ...s, kind } : s)), () => updateFunnelStageAction(stage.id, { kind }), t("stageSaved"))
    if (ok) onChanged({ type: "updated", id: stage.id, kind })
  }

  const move = async (index: number, delta: -1 | 1) => {
    if (!stages) return
    const updates = reorderUpdates(stages, index, delta)
    if (updates.length === 0) return
    const byId = new Map(updates.map((u) => [u.id, u.boardIndex]))
    const reordered = moveItem(stages, index, index + delta).map((s) => (byId.has(s.id) ? { ...s, boardIndex: byId.get(s.id)! } : s))
    const ok = await run(
      "update",
      () => reordered,
      async () => {
        for (const u of updates) {
          const res = await updateFunnelStageAction(u.id, { boardIndex: u.boardIndex })
          if (!res.success) return res
        }
        return { success: true }
      },
      t("stageMoved")
    )
    if (ok) onChanged({ type: "reordered", ids: reordered.map((s) => s.id) })
    // A renumbering that stopped half way leaves the server order unknown: read it back.
    else if (updates.length > 1) void load()
  }

  const remove = async (stage: StageSetting, moveTo: string): Promise<boolean> => {
    if (!stages || stages.length <= 1) return false
    const ok = await run("delete", (list) => list.filter((s) => s.id !== stage.id), () => deleteFunnelStageAction(stage.id, moveTo), t("stageRemoved"))
    if (ok) onChanged({ type: "deleted", id: stage.id, moveTo })
    return ok
  }

  const add = async (e: FormEvent) => {
    e.preventDefault()
    if (!stages) return
    const name = cleanStageName(newName)
    if (!name) {
      setNewInvalid(true)
      return
    }
    setBusy(true)
    setStatus(null)
    const res = await createFunnelStageAction({ name, kind: newKind, boardIndex: nextBoardIndex(stages) })
    setBusy(false)
    if (!res.success) {
      if (res.status === 403) {
        setForbidden((f) => ({ ...f, create: true }))
        setStatus({ kind: "error", text: t("stageForbiddenCreate") })
      } else setStatus({ kind: "error", text: t("stageSaveFailed") })
      return
    }
    setStages((list) => [...(list ?? []), res.data])
    setNewName("")
    setNewKind("open")
    setStatus({ kind: "ok", text: t("stageAdded", { name }) })
    onChanged({ type: "created", stage: res.data })
  }

  const countOf = (id: string): number | null => counts.find((c) => c.id === id)?.count ?? null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        hideCloseButton
        className="flex w-full flex-col gap-0 overflow-y-auto border-neutral-50 bg-white p-0 text-neutral-900 dark:bg-white sm:max-w-screen-xs"
        onEscapeKeyDown={(e) => {
          if ((e.target as HTMLElement | null)?.closest?.("[data-escape-local]")) e.preventDefault()
        }}
      >
        <SheetHeader className="sticky top-0 z-10 gap-0 border-b border-neutral-50 bg-white px-5 py-4 text-left sm:px-6">
          <div className="flex items-start gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <SheetTitle className="text-body-16 font-semibold text-neutral-900">{t("stagesManageTitle")}</SheetTitle>
              <SheetDescription className="text-body-13 text-neutral-500">{t("stagesManageHint")}</SheetDescription>
            </div>
            <IconAction label={t("stagesManageClose")} onClick={() => onOpenChange(false)}>
              <CloseSquare size={18} aria-hidden />
            </IconAction>
          </div>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-4 p-5 sm:px-6">
          {status && (
            <p role={status.kind === "error" ? "alert" : "status"} className={cn("text-body-13", status.kind === "error" ? "text-error-dark" : "text-neutral-700")}>
              {status.text}
            </p>
          )}
          {loadError === "forbidden" ? (
            <p role="alert" className="text-body-14 text-neutral-700">
              {t("stagesForbidden")}
            </p>
          ) : loadError ? (
            <div className="flex flex-col items-start gap-3">
              <p className="text-body-14 text-neutral-700">{t("stagesLoadFailed")}</p>
              <button type="button" className={actionClass({ variant: "secondary", size: "sm" })} onClick={() => void load()}>
                {t("retry")}
              </button>
            </div>
          ) : stages === null ? (
            <p className="text-body-13 text-neutral-500" aria-live="polite">
              {t("loading")}
            </p>
          ) : (
            <>
              {stages.length === 0 ? (
                <p className="text-body-13 text-neutral-500">{t("stagesNone")}</p>
              ) : (
                <ol className="flex flex-col gap-2" aria-label={t("stagesManageTitle")}>
                  {stages.map((s, i) => (
                    <StageRow
                      key={s.id}
                      stage={s}
                      index={i}
                      stages={stages}
                      count={countOf(s.id)}
                      busy={busy}
                      forbidden={forbidden}
                      t={t}
                      tn={tn}
                      language={language}
                      onRename={(name) => void rename(s, name)}
                      onKind={(kind) => void changeKind(s, kind)}
                      onMove={(delta) => void move(i, delta)}
                      onDelete={(moveTo) => remove(s, moveTo)}
                    />
                  ))}
                </ol>
              )}
              {stages.length === 1 && <p className="text-body-12 text-neutral-500">{t("stageRemoveLast")}</p>}

              <form onSubmit={add} className="flex flex-col gap-2 border-t border-neutral-50 pt-4" noValidate>
                <h3 className="text-body-13 font-semibold text-neutral-900">{t("stageAddTitle")}</h3>
                <div className="flex flex-wrap items-center gap-2">
                  <label htmlFor={`${uid}-new`} className="sr-only">
                    {t("stageNewName")}
                  </label>
                  <Input
                    id={`${uid}-new`}
                    data-escape-local
                    placeholder={t("stageNewName")}
                    value={newName}
                    maxLength={STAGE_NAME_MAX}
                    disabled={busy || forbidden.create}
                    aria-invalid={newInvalid}
                    aria-describedby={newInvalid ? `${uid}-new-error` : undefined}
                    onChange={(e) => {
                      setNewName(e.target.value)
                      setNewInvalid(false)
                    }}
                    className="min-w-0 flex-1 basis-40"
                  />
                  <KindSelect id={`${uid}-new-kind`} label={t("stageNewKind")} value={newKind} disabled={busy || forbidden.create} t={t} onChange={setNewKind} />
                  <button type="submit" className={actionClass({ size: "sm", className: "h-9" })} disabled={busy || forbidden.create}>
                    <Add size={15} aria-hidden />
                    {t("stageAdd")}
                  </button>
                </div>
                {newInvalid && (
                  <p id={`${uid}-new-error`} className="text-body-12 text-error-dark">
                    {t("stageNameInvalid", { max: formatNumber(STAGE_NAME_MAX, language) })}
                  </p>
                )}
                <p className="text-body-12 text-neutral-500">{t("stageKindHint")}</p>
              </form>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
