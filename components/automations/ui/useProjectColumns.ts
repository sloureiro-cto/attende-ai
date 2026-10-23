"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import type { IColumn } from "app/_types/Column"
import type { IProject } from "app/_types/Project"
import type { ColumnsStatus } from "lib/automations/editorColumns"
import { fetchAutomationBoardColumns } from "lib/projects/fetchProjectColumns"
import { mergeProjectColumnCache } from "lib/projects/projectBoardRefs"

type ProjectEntry = { columns: IColumn[]; inflight: number; failed: boolean; loaded: boolean }
const EMPTY: ProjectEntry = { columns: [], inflight: 0, failed: false, loaded: false }

/**
 * Columns of CRM boards, loaded on demand and cached per project (the columns of every board loaded so far are
 * merged). Shared by the rule editor and the bot builder, which both pick a project -> board -> column.
 *
 * Status is per project but loads are per (project, board): a project reads "loading" while ANY of its boards is
 * in flight, so a second board finishing first can never mark the project ready too early. A failed load is
 * forgotten, so the next request for the same board retries it.
 */
export function useProjectColumns(defaultProjects: IProject[] = []) {
  const [byProject, setByProject] = useState<Record<string, ProjectEntry>>({})
  const requested = useRef(new Set<string>())

  const patch = useCallback((pid: string, fn: (entry: ProjectEntry) => ProjectEntry) => {
    setByProject((prev) => ({ ...prev, [pid]: fn(prev[pid] ?? EMPTY) }))
  }, [])

  const load = useCallback(
    async (projectId: string, boardId?: string, projects: IProject[] = defaultProjects) => {
      const pid = projectId.trim()
      if (!pid) return
      const key = `${pid}:${boardId?.trim() ?? ""}`
      if (requested.current.has(key)) return
      requested.current.add(key)
      patch(pid, (e) => ({ ...e, inflight: e.inflight + 1, failed: false }))
      try {
        const loaded = await fetchAutomationBoardColumns(pid, projects, boardId?.trim() || undefined)
        // `null`: the project has several boards and none is chosen yet. The board picker handles it.
        patch(pid, (e) => ({
          ...e,
          columns: loaded ? mergeProjectColumnCache(e.columns, loaded.columns, loaded.boardId) : e.columns,
          inflight: e.inflight - 1,
          loaded: true,
        }))
      } catch {
        requested.current.delete(key)
        patch(pid, (e) => ({ ...e, inflight: e.inflight - 1, failed: true }))
      }
    },
    [defaultProjects, patch]
  )

  // Stable identities: consumers memoize on these and must only re-run when a project's data or status really changes.
  return { ...useMemo(() => {
    const columns: Record<string, IColumn[]> = {}
    const status: Record<string, ColumnsStatus> = {}
    for (const [pid, entry] of Object.entries(byProject)) {
      columns[pid] = entry.columns
      status[pid] = entry.inflight > 0 ? "loading" : entry.failed ? "error" : "ready"
    }
    return { columns, status }
  }, [byProject]), load }
}
