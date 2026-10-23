"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { loadReportAction, type ReportData } from "actions/attende/reports"
import { filtersToSearchParams, type ParsedReportFilters } from "lib/attende/reports/model"
import type { ReportFilters } from "lib/attende/reports/types"
import type { AttendeActionError } from "lib/attende/result"

export type ReportState = {
  filters: ReportFilters
  preset: ParsedReportFilters["preset"]
  data: ReportData | null
  error: AttendeActionError | null
  /** A request is in flight. The previous data stays on screen meanwhile (dimmed), so changing a filter never blanks the page. */
  loading: boolean
}

/**
 * Report data for the current filters. The URL is the source of truth (shareable, back button works); changing a
 * filter updates the URL with `replaceState` and fetches through the server action. Answers of superseded
 * requests are ignored, so a slow older response can never overwrite a newer one.
 */
export function useReportData(initial: { filters: ReportFilters; preset: ParsedReportFilters["preset"]; data: ReportData | null; error: AttendeActionError | null }) {
  const [state, setState] = useState<ReportState>({ ...initial, loading: false })
  const seq = useRef(0)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const load = useCallback(async (filters: ReportFilters, preset: ParsedReportFilters["preset"]) => {
    const mine = ++seq.current
    setState((s) => ({ ...s, filters, preset, loading: true }))
    const query = filtersToSearchParams(filters, preset).toString()
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname)
    const res = await loadReportAction(filters)
    if (!mounted.current || mine !== seq.current) return
    setState((s) => (res.success ? { ...s, data: res.data, error: null, loading: false } : { ...s, error: res, loading: false }))
  }, [])

  const reload = useCallback(() => load(state.filters, state.preset), [load, state.filters, state.preset])
  return { state, load, reload }
}
