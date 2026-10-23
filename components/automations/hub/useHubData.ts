"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { type HubData, type HubTab, loadAutomationsHubAction } from "actions/messaging-automations/hub"
import type { ChannelFilterValue } from "components/automations/ui/ChannelFilter"
import type {
  AutomationListItem,
  AutomationListResponse,
  SalesBotListItem,
  SalesBotListResponse,
} from "lib/automations/types"

/** Debounce for the search box: one server round trip per pause, not per keystroke. */
const SEARCH_DEBOUNCE_MS = 300

type Filters = { q: string; channel: ChannelFilterValue; page: number }
const filterKey = (f: Filters) => `${f.q.trim()}|${f.channel}|${f.page}`

type HubState = {
  rules: AutomationListResponse | null
  bots: SalesBotListResponse | null
  /** Tab badges; `null` = that count could not be loaded (never shown as 0). */
  counts: HubData["counts"]
  /** The filter each tab's list was loaded with; `null` = never loaded (only a 1-item count peek exists). */
  loadedWith: Record<HubTab, string | null>
  /** Last failure of each tab's own list. */
  failed: Record<HubTab, boolean>
}

const DEFAULT_KEY = filterKey({ q: "", channel: "all", page: 1 })

function initialState(initial: HubData): HubState {
  return {
    rules: initial.rules,
    // The server also returns a 1-item peek of the other tab, only to learn its total: it is not a list.
    bots: initial.bots ? { ...initial.bots, items: [] } : null,
    counts: initial.counts,
    loadedWith: { rules: initial.rules && !initial.error ? DEFAULT_KEY : null, bots: null },
    failed: { rules: !!initial.error, bots: false },
  }
}

/**
 * State of the hub: one list per tab (cached per filter), the totals of both, and the request protocol.
 * A tab that was never loaded shows a skeleton instead of the other response's 1-item peek; a failing tab
 * reports its own error and an unknown count instead of 0; only the latest request may write state.
 */
export function useHubData(initial: HubData) {
  const [state, setState] = useState<HubState>(() => initialState(initial))
  const [tab, setTab] = useState<HubTab>("rules")
  const [query, setQuery] = useState("")
  const [channel, setChannel] = useState<ChannelFilterValue>("all")
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const requestSeq = useRef(0)
  const firstRun = useRef(true)

  const reload = useCallback(async (next: { tab: HubTab } & Filters) => {
    const seq = ++requestSeq.current
    setLoading(true)
    const res = await loadAutomationsHubAction({
      tab: next.tab,
      q: next.q,
      channel: next.channel === "all" ? undefined : next.channel,
      page: next.page,
    })
    if (seq !== requestSeq.current) return
    const own = next.tab
    const failed = !!res.error
    setState((prev) => ({
      // Only the requested tab's list is replaced; the other tab's response is a 1-item peek used for its totals.
      rules: own === "rules" ? (failed ? prev.rules : res.rules) : mergeTotals(prev.rules, res.rules),
      bots: own === "bots" ? (failed ? prev.bots : res.bots) : mergeTotals(prev.bots, res.bots),
      counts: {
        rules: res.counts.rules ?? prev.counts.rules,
        bots: res.counts.bots ?? prev.counts.bots,
      },
      loadedWith: { ...prev.loadedWith, [own]: failed ? prev.loadedWith[own] : filterKey(next) },
      failed: { ...prev.failed, [own]: failed },
    }))
    setLoading(false)
  }, [])

  const filters: Filters = { q: query, channel, page }
  const reloadCurrent = useCallback(() => reload({ tab, q: query, channel, page }), [reload, tab, query, channel, page])

  // Refetch on tab / filter / page changes. Typing waits for a pause; the first render uses server data.
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false
      return
    }
    const timer = setTimeout(() => void reload({ tab, q: query, channel, page }), query ? SEARCH_DEBOUNCE_MS : 0)
    return () => clearTimeout(timer)
  }, [tab, query, channel, page, reload])

  const rules = state.rules?.items ?? []
  const bots = state.bots?.items ?? []
  const items = tab === "rules" ? rules : bots
  const total = (tab === "rules" ? state.rules?.total : state.bots?.total) ?? 0

  // --- local patches (optimistic updates) --------------------------------------------------------
  const patchRule = useCallback((id: string, patch: Partial<AutomationListItem>) => {
    setState((s) => (s.rules ? { ...s, rules: { ...s.rules, items: s.rules.items.map((r) => (r.id === id ? { ...r, ...patch } : r)) } } : s))
  }, [])
  const patchBot = useCallback((id: string, patch: Partial<SalesBotListItem>) => {
    setState((s) => (s.bots ? { ...s, bots: { ...s.bots, items: s.bots.items.map((b) => (b.id === id ? { ...b, ...patch } : b)) } } : s))
  }, [])
  const addActiveRules = useCallback((delta: number) => {
    setState((s) => (s.rules ? { ...s, rules: { ...s.rules, totals: { ...s.rules.totals, active: s.rules.totals.active + delta } } } : s))
  }, [])

  return {
    tab,
    query,
    channel,
    page,
    setQuery: (value: string) => {
      setQuery(value)
      setPage(1)
    },
    setChannel: (value: ChannelFilterValue) => {
      setChannel(value)
      setPage(1)
    },
    setPage,
    changeTab: (next: HubTab) => {
      setTab(next)
      setPage(1)
    },
    loading,
    /** First visit of this tab: nothing real to show yet. */
    initialLoading: state.loadedWith[tab] === null && !state.failed[tab],
    failed: state.failed[tab] && !loading,
    filtering: query.trim() !== "" || channel !== "all",
    filters,
    reload,
    reloadCurrent,
    rules,
    bots,
    items,
    total,
    totals: { rules: state.rules?.totals ?? null, bots: state.bots?.totals ?? null },
    counts: state.counts,
    patchRule,
    patchBot,
    addActiveRules,
    setPageAfterDelete: (lastOnPage: boolean) => (lastOnPage ? setPage((p) => p - 1) : void reloadCurrent()),
  }
}

/** Keep a tab's list, but refresh its totals from a response that only carried a 1-item peek of it. */
function mergeTotals<T extends { totals: unknown }>(prev: T | null, peek: T | null): T | null {
  if (!peek) return prev
  return prev ? { ...prev, totals: peek.totals } : { ...peek, items: [] as never }
}
