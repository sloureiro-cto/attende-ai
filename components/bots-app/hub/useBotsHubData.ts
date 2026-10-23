"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { listSalesBotsAction } from "actions/messaging-automations/salesBots"
import type { ChannelFilterValue } from "components/automations/ui/ChannelFilter"
import { HUB_PAGE_SIZE } from "lib/automations/hubConstants"
import type { SalesBotListItem, SalesBotListResponse } from "lib/automations/types"

/** One server round trip per pause in typing, not per keystroke (same cadence as the JSYNQ hub). */
const SEARCH_DEBOUNCE_MS = 300

export type BotsHubInitial = { data: SalesBotListResponse | null; failed: boolean }

/**
 * State of the bots-only hub: one list, its filters and the request protocol (only the latest
 * request may write state; a failure keeps the last good list). The first render uses server data.
 * It exposes the same row-action surface as the JSYNQ hub (`HubActionsTarget`) so `useHubActions` is shared.
 */
export function useBotsHubData(initial: BotsHubInitial) {
  const [data, setData] = useState<SalesBotListResponse | null>(initial.data)
  const [failed, setFailed] = useState(initial.failed)
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState("")
  const [channel, setChannel] = useState<ChannelFilterValue>("all")
  const [page, setPage] = useState(1)
  const requestSeq = useRef(0)
  const firstRun = useRef(true)

  const reload = useCallback(async (next: { q: string; channel: ChannelFilterValue; page: number }) => {
    const seq = ++requestSeq.current
    setLoading(true)
    const res = await listSalesBotsAction({
      q: next.q,
      channel: next.channel === "all" ? undefined : next.channel,
      page: next.page,
      limit: HUB_PAGE_SIZE,
    })
    if (seq !== requestSeq.current) return
    if (res.success) {
      setData(res.data)
      setFailed(false)
    } else {
      setFailed(true)
    }
    setLoading(false)
  }, [])

  const reloadCurrent = useCallback(() => reload({ q: query, channel, page }), [reload, query, channel, page])

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false
      return
    }
    const timer = setTimeout(() => void reload({ q: query, channel, page }), query ? SEARCH_DEBOUNCE_MS : 0)
    return () => clearTimeout(timer)
  }, [query, channel, page, reload])

  const patchBot = useCallback((id: string, patch: Partial<SalesBotListItem>) => {
    setData((d) => (d ? { ...d, items: d.items.map((b) => (b.id === id ? { ...b, ...patch } : b)) } : d))
  }, [])

  // The shared row actions also know about rules; there are none here.
  const noop = useCallback(() => undefined, [])

  const items = data?.items ?? []
  return {
    items,
    data,
    total: data?.total ?? 0,
    loading,
    failed: failed && !loading,
    filtering: query.trim() !== "" || channel !== "all",
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
    reloadCurrent,
    patchBot,
    patchRule: noop,
    addActiveRules: noop,
    setPageAfterDelete: (lastOnPage: boolean) => (lastOnPage ? setPage((p) => p - 1) : void reloadCurrent()),
  }
}
