/**
 * Managing the funnel's stages (the CRM board's columns). Pure helpers for the server actions and the stage manager.
 *
 * The funnel's stage `kind` is derived by the backend from the column's `columnStatus`
 * (`attende-funnel/lib/funnelBoard.ts` kindOf: `win`/`done` -> won, `lost` -> lost, anything else -> open). The column
 * update endpoint takes `columnStatus` (and also keeps the column's status document in sync); `status` there is the
 * status document's id, so it must never carry a type.
 */
import type { StageKind } from "./types"

/** The platform's column status types (`app/_types/StatusType`). */
export type ColumnStatus = "todo" | "inProgress" | "done" | "win" | "lost"

export const STAGE_KINDS: readonly StageKind[] = ["open", "won", "lost"]

export function kindOfColumnStatus(status: unknown): StageKind {
  if (status === "win" || status === "done") return "won"
  if (status === "lost") return "lost"
  return "open"
}

/** The status written for a kind: "open" is `inProgress` (both `todo` and `inProgress` read as open). */
export function columnStatusOf(kind: StageKind): ColumnStatus {
  return kind === "won" ? "win" : kind === "lost" ? "lost" : "inProgress"
}

export const isStageKind = (v: unknown): v is StageKind => v === "open" || v === "won" || v === "lost"

/** A stage as the manager edits it: the column with its raw board position. */
export type StageSetting = { id: string; name: string; kind: StageKind; boardIndex: string }

export const STAGE_NAME_MAX = 60

/** Collapses spaces; `null` when empty or too long. */
export function cleanStageName(name: unknown): string | null {
  const text = typeof name === "string" ? name.replace(/\s+/g, " ").trim() : ""
  return text && text.length <= STAGE_NAME_MAX ? text : null
}

const num = (v: string | undefined): number => (v === undefined || v.trim() === "" ? Number.NaN : Number(v))

/** Board order, the same rule as the backend (numeric `boardIndex`, text as a tie-break). */
export function sortStages<T extends { boardIndex: string }>(stages: T[]): T[] {
  return [...stages].sort((a, b) => {
    const na = num(a.boardIndex)
    const nb = num(b.boardIndex)
    if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb
    return a.boardIndex.localeCompare(b.boardIndex)
  })
}

/** Index for a stage added at the end (the CRM settings use steps of 1000). */
export function nextBoardIndex(stages: Array<{ boardIndex: string }>): string {
  let max = Number.NEGATIVE_INFINITY
  for (const s of stages) {
    const n = num(s.boardIndex)
    if (Number.isFinite(n) && n > max) max = n
  }
  return String(Number.isFinite(max) ? Math.floor(max) + 1000 : stages.length * 1000)
}

/**
 * New `boardIndex` values to move the stage at `from` one place up (`-1`) or down (`+1`). Usually one update (the
 * midpoint between its new neighbours, like the CRM's drag and drop). When the neighbours' indexes are not numbers or
 * leave no room, every stage is renumbered (0, 1000, 2000...) and each one whose index changes is returned.
 */
export function reorderUpdates(stages: StageSetting[], from: number, delta: -1 | 1): Array<{ id: string; boardIndex: string }> {
  const to = from + delta
  if (from < 0 || from >= stages.length || to < 0 || to >= stages.length) return []
  const next = [...stages]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved!)
  const before = next[to - 1]
  const after = next[to + 1]
  const b = before ? num(before.boardIndex) : Number.NaN
  const a = after ? num(after.boardIndex) : Number.NaN
  let value: number
  if (before && after) value = (b + a) / 2
  else if (before) value = b + 1000
  else value = a - 1000
  const roomy = Number.isFinite(value) && (!before || value > b) && (!after || value < a) && String(value).length <= 24
  if (roomy) return [{ id: moved!.id, boardIndex: String(value) }]
  return next.map((s, i) => ({ id: s.id, boardIndex: String(i * 1000) })).filter((u, i) => next[i]!.boardIndex !== u.boardIndex)
}

/** Moves an item of a list (the optimistic order after a reorder). */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list
  const next = [...list]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item!)
  return next
}
