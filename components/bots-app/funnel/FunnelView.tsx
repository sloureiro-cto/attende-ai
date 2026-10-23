"use client"

import { DocumentDownload } from "iconsax-react"
import { type MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import {
  type FunnelFilterOptions,
  loadFunnelContactsAction,
  loadFunnelFilterOptionsAction,
  loadFunnelPageAction,
  loadFunnelStagesAction,
  moveFunnelDealAction,
} from "actions/attende/funnel"
import { formatNumber } from "lib/attende/format"
import { type ContactDraft, patchRowsContact } from "lib/attende/funnel/deal"
import {
  activeFilterCount,
  DEFAULT_COLUMNS,
  DEFAULT_FILTERS,
  effectiveSearch,
  EXPORT_ROW_CAP,
  filtersToApiQuery,
  type FunnelColumn,
  type FunnelFilters,
  type FunnelTab,
  type FunnelUrlState,
  moveRowToStage,
  type PageSize,
  parseColumnPrefs,
  parseFunnelParams,
  restoreRow,
  stateToSearchParams,
} from "lib/attende/funnel/model"
import type { CursorPage } from "lib/attende/funnel/paging"
import { type ListSnapshot, saveSnapshot, snapshotKey, takeSnapshot } from "lib/attende/funnel/restore"
import { stageLabel } from "lib/attende/funnel/stageNames"
import type { ContactRow, ContactsPage, FunnelPage, FunnelRow, StagesData } from "lib/attende/funnel/types"
import type { AttendeActionError, AttendeActionResult } from "lib/attende/result"
import { isSubscriptionBlock } from "lib/attende/result"
import { ContactsTable } from "./ContactsTable"
import { DealDrawer, type MoveFeedback } from "./DealDrawer"
import { DealsTable } from "./DealsTable"
import { FunnelBlocked, FunnelEmpty, FunnelError, FunnelNoBoard, FunnelTableSkeleton } from "./FunnelStates"
import { FunnelToolbar, StageChips } from "./FunnelToolbar"
import { type StageChange, StageManager } from "./StageManager"
import { type AttendeFunnelT, type AttendeFunnelTn, useAttendeFunnelT } from "./useAttendeFunnelT"
import { type ListState, useCursorList } from "./useCursorList"
import { actionClass } from "../ui/actionStyles"
import { PageLayout } from "../ui/PageLayout"

export const SEARCH_DEBOUNCE_MS = 350
// v2: the defaults changed (labels hidden); older saved choices start from the new defaults once.
const COLUMNS_STORAGE_KEY = "attende.funnel.columns.v2"

type DealsQuery = { filters: FunnelFilters; pageSize: PageSize; maskPhone: boolean }
type ContactsQuery = { q: string; pageSize: PageSize; maskPhone: boolean }

export type FunnelInitial = {
  state: FunnelUrlState
  stages: StagesData | null
  stagesError: AttendeActionError | null
  /** First page of the tab in the URL; the other tab loads when it is opened. */
  deals: { page: FunnelPage | null; error: AttendeActionError | null } | null
  contacts: { page: ContactsPage | null; error: AttendeActionError | null } | null
}

const dealsKey = (q: DealsQuery) => JSON.stringify(filtersToApiQuery(q.filters, { limit: q.pageSize, maskPhone: q.maskPhone }))
const contactsKey = (q: ContactsQuery) => JSON.stringify([effectiveSearch(q.q), q.pageSize, q.maskPhone])

const fetchDeals = (q: DealsQuery, cursor: string | null) => loadFunnelPageAction(q.filters, { cursor, limit: q.pageSize, maskPhone: q.maskPhone })
const fetchContacts = (q: ContactsQuery, cursor: string | null): Promise<AttendeActionResult<CursorPage<ContactRow>>> =>
  loadFunnelContactsAction(effectiveSearch(q.q), { cursor, limit: q.pageSize, maskPhone: q.maskPhone })

function readColumns(): FunnelColumn[] {
  try {
    const raw = window.localStorage.getItem(COLUMNS_STORAGE_KEY)
    return raw ? parseColumnPrefs(JSON.parse(raw)) : [...DEFAULT_COLUMNS]
  } catch {
    return [...DEFAULT_COLUMNS]
  }
}

/** The funnel: a paginated, filterable table of deals (and a contacts directory), with a details drawer. */
export function FunnelView({ initial }: { initial: FunnelInitial }) {
  const { t, tn, language } = useAttendeFunnelT()
  const [ui, setUi] = useState<FunnelUrlState>(initial.state)
  const [searchText, setSearchText] = useState(initial.state.filters.q)
  const [stages, setStages] = useState(initial.stages)
  const [options, setOptions] = useState<FunnelFilterOptions | null>(null)
  const [columns, setColumns] = useState<FunnelColumn[]>([...DEFAULT_COLUMNS])
  const [moving, setMoving] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<MoveFeedback>(null)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [managingStages, setManagingStages] = useState(false)

  const dealsQuery = useMemo<DealsQuery>(() => ({ filters: ui.filters, pageSize: ui.pageSize, maskPhone: ui.maskPhone }), [ui.filters, ui.pageSize, ui.maskPhone])
  const contactsQuery = useMemo<ContactsQuery>(() => ({ q: ui.filters.q, pageSize: ui.pageSize, maskPhone: ui.maskPhone }), [ui.filters.q, ui.pageSize, ui.maskPhone])

  const deals = useCursorList<FunnelRow, DealsQuery>({ initial: initial.deals, initialQuery: dealsQuery, fetchPage: fetchDeals, key: (r) => r.cardId })
  const contacts = useCursorList<ContactRow, ContactsQuery>({ initial: initial.contacts, initialQuery: contactsQuery, fetchPage: fetchContacts, key: (c) => c.id })

  // --- URL, back / forward, position --------------------------------------------------------------
  //
  // Everything the user chose (tab, search, filters, sort, page size, open deal) is in the URL, so the way back from
  // a conversation or a contact lands on the same list. `null` history state lets Next.js keep its router in sync.

  /** False until the mount effect has reconciled the URL (the first `ui` may be older than the URL, see below). */
  const urlReady = useRef(false)
  /** The next URL change adds a history entry instead of replacing the current one (Back returns to it). */
  const pushNext = useRef(false)

  useEffect(() => {
    if (!urlReady.current) return
    const push = pushNext.current
    pushNext.current = false
    const qs = stateToSearchParams(ui).toString()
    if (qs === window.location.search.replace(/^\?/, "")) return
    const url = qs ? `?${qs}` : window.location.pathname
    if (push) window.history.pushState(null, "", url)
    else window.history.replaceState(null, "", url)
  }, [ui])

  const uiRef = useRef(ui)
  uiRef.current = ui
  const loadedCounts = useRef({ deals: 0, contacts: 0 })
  loadedCounts.current = { deals: deals.state.items.length, contacts: contacts.state.items.length }
  const scrollTop = useRef(0)
  const tookSnapshot = useRef(false)
  /** A position to put back: pages are re-fetched up to `count`, then the table scrolls to `scrollTop`. */
  const [restore, setRestore] = useState<ListSnapshot | null>(null)
  const [restoreTop, setRestoreTop] = useState<number | null>(null)

  useEffect(() => {
    // Back / forward can hand back a server render made for another URL of this page (the router cache is keyed by
    // the URL the page was first rendered for): the URL is the truth.
    const fromUrl = parseFunnelParams(new URLSearchParams(window.location.search))
    const urlQs = stateToSearchParams(fromUrl).toString()
    const adopt = urlQs !== stateToSearchParams(initial.state).toString()
    const start = adopt ? fromUrl : initial.state
    if (adopt) {
      setUi(fromUrl)
      setSearchText(fromUrl.filters.q)
    } else if (urlQs !== window.location.search.replace(/^\?/, "")) {
      // Malformed or default-valued params: keep the URL short and clean.
      window.history.replaceState(null, "", urlQs ? `?${urlQs}` : window.location.pathname)
    }
    urlReady.current = true
    if (!tookSnapshot.current) {
      tookSnapshot.current = true
      const snap = takeSnapshot(snapshotKey(start), Date.now())
      if (snap && snap.tab === start.tab) setRestore(snap)
    }

    const save = () => {
      const current = uiRef.current
      saveSnapshot({ key: snapshotKey(current), tab: current.tab, count: loadedCounts.current[current.tab], scrollTop: scrollTop.current, savedAt: Date.now() })
    }
    // Back / forward between entries of this page (e.g. from a contact's deal back to the contacts list).
    const onPop = () => {
      const next = parseFunnelParams(new URLSearchParams(window.location.search))
      setUi(next)
      setSearchText(next.filters.q)
    }
    window.addEventListener("popstate", onPop)
    window.addEventListener("pagehide", save)
    return () => {
      window.removeEventListener("popstate", onPop)
      window.removeEventListener("pagehide", save)
      save()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- once per mount: the first render's props are what the URL is compared with

  // A tab starts at the top of its own table.
  useEffect(() => {
    scrollTop.current = 0
  }, [ui.tab])
  const onScrollTop = useCallback((top: number) => {
    scrollTop.current = top
  }, [])
  const onRestored = useCallback(() => setRestoreTop(null), [])

  // --- columns, filter options -------------------------------------------------------------------

  useEffect(() => setColumns(readColumns()), [])
  const changeColumns = (next: FunnelColumn[]) => {
    const clean = parseColumnPrefs(next)
    setColumns(clean)
    try {
      window.localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(clean))
    } catch {
      // Private mode / blocked storage: the choice lasts for this visit only.
    }
  }

  const board = stages?.board ?? initial.deals?.page?.board ?? null
  useEffect(() => {
    if (!board) return
    let alive = true
    void loadFunnelFilterOptionsAction(board.projectId, board.id).then((o) => alive && setOptions(o))
    return () => {
      alive = false
    }
  }, [board?.id, board?.projectId]) // eslint-disable-line react-hooks/exhaustive-deps -- the board object identity changes, its ids do not

  // --- loading -----------------------------------------------------------------------------------

  // Which query each list last loaded. A list (re)loads when its tab is shown and its query changed.
  const dealsLoaded = useRef<string | null>(initial.deals ? dealsKey(dealsQuery) : null)
  const contactsLoaded = useRef<string | null>(initial.contacts ? contactsKey(contactsQuery) : null)
  const { reload: reloadDeals } = deals
  const { reload: reloadContacts } = contacts

  useEffect(() => {
    if (ui.tab !== "deals") return
    const key = dealsKey(dealsQuery)
    if (dealsLoaded.current === key) return
    dealsLoaded.current = key
    void reloadDeals(dealsQuery)
  }, [ui.tab, dealsQuery, reloadDeals])

  useEffect(() => {
    if (ui.tab !== "contacts") return
    const key = contactsKey(contactsQuery)
    if (contactsLoaded.current === key) return
    contactsLoaded.current = key
    void reloadContacts(contactsQuery)
  }, [ui.tab, contactsQuery, reloadContacts])

  // Search is debounced: one request when the user stops typing, not one per key.
  useEffect(() => {
    if (searchText === ui.filters.q) return
    const timer = setTimeout(() => setUi((s) => ({ ...s, filters: { ...s.filters, q: searchText } })), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [searchText, ui.filters.q])

  // Putting a saved position back: load pages until as many rows as before are there (or the list ends), then scroll.
  const activeList = ui.tab === "deals" ? deals : contacts
  const { loadMore: activeLoadMore } = activeList
  useEffect(() => {
    if (!restore) return
    if (restore.tab !== ui.tab) {
      setRestore(null)
      return
    }
    const list = activeList.state
    if (list.status === "idle" || list.status === "loading" || list.loadingMore) return
    if (list.status === "ready" && list.items.length < restore.count && list.hasMore && !list.moreError) {
      void activeLoadMore()
      return
    }
    if (list.status === "ready") setRestoreTop(restore.scrollTop)
    setRestore(null)
  }, [restore, ui.tab, activeList.state, activeLoadMore])

  // --- actions -----------------------------------------------------------------------------------

  const setFilters = (patch: Partial<FunnelFilters>) =>
    setUi((s) => {
      const filters = { ...s.filters, ...patch }
      // A reversed range would match nothing: read it the way the user meant it.
      if (filters.createdFrom && filters.createdTo && filters.createdFrom > filters.createdTo) [filters.createdFrom, filters.createdTo] = [filters.createdTo, filters.createdFrom]
      return { ...s, filters }
    })

  const clearFilters = () => {
    setSearchText("")
    setUi((s) => ({ ...s, filters: { ...DEFAULT_FILTERS, sort: s.filters.sort } }))
  }

  const setTab = (tab: FunnelTab) => setUi((s) => ({ ...s, tab }))
  const openDeal = useCallback((row: FunnelRow) => setUi((s) => ({ ...s, deal: row.cardId })), [])
  const closeDeal = () => setUi((s) => ({ ...s, deal: null }))

  /** From the contacts tab: show that contact's deals and open the latest one. */
  const openContactDeal = useCallback(
    (c: ContactRow) => {
      const q = c.email || (ui.maskPhone ? null : c.phone) || c.name || ""
      setSearchText(q)
      // A new history entry: Back returns to the contacts list with its own search.
      pushNext.current = true
      setUi((s) => ({ ...s, tab: "deals", deal: c.latestCardId, filters: { ...DEFAULT_FILTERS, sort: s.filters.sort, q } }))
    },
    [ui.maskPhone]
  )

  // Per-card counter: only the latest move of a card may roll it back or report.
  const moveSeq = useRef(new Map<string, number>())
  const moveDeal = async (cardId: string, stageId: string) => {
    const target = stages?.stages.find((s) => s.id === stageId)
    const before = deals.state.items.find((r) => r.cardId === cardId)
    if (!target || !before || before.stage?.id === stageId) return
    const stage = { id: target.id, name: target.name, color: target.color, order: target.order, kind: target.kind }
    const n = (moveSeq.current.get(cardId) ?? 0) + 1
    moveSeq.current.set(cardId, n)
    deals.patch((items) => moveRowToStage(items, cardId, stage).rows)
    setMoving(cardId)
    setFeedback(null)
    const res = await moveFunnelDealAction(cardId, stageId)
    if (moveSeq.current.get(cardId) !== n) return
    setMoving((m) => (m === cardId ? null : m))
    if (!res.success) {
      deals.patch((items) => restoreRow(items, before))
      setFeedback({ cardId, kind: "error", text: res.status === 403 ? t("drawerMoveForbidden") : t("drawerMoveFailed") })
      return
    }
    const confirmed = res.data?.stage ?? stage
    deals.patch((items) => moveRowToStage(items, cardId, confirmed).rows)
    // Counts are cached server-side for a few seconds; nudge the chips so they agree with what the user just did.
    setStages((s) =>
      s
        ? {
            ...s,
            stages: s.stages.map((x) =>
              x.id === before.stage?.id ? { ...x, count: Math.max(0, x.count - 1) } : x.id === confirmed.id ? { ...x, count: x.count + 1 } : x
            ),
          }
        : s
    )
    setFeedback({ cardId, kind: "ok", text: t("drawerMoved", { stage: stageLabel(confirmed, t) }) })
  }

  const { patch: patchDeals } = deals
  const { patch: patchContacts } = contacts
  const patchRow = useCallback(
    (cardId: string, patch: Partial<FunnelRow>) => patchDeals((items) => items.map((r) => (r.cardId === cardId ? { ...r, ...patch } : r))),
    [patchDeals]
  )
  const contactSaved = useCallback(
    (contactId: string, draft: ContactDraft) => {
      // A masked table keeps showing the masked phone; the new name and e-mail show everywhere.
      patchDeals((items) => patchRowsContact(items, contactId, draft, ui.maskPhone))
      patchContacts((items) =>
        items.map((c) => (c.id === contactId ? { ...c, name: draft.name, email: draft.email || null, phone: ui.maskPhone ? c.phone : draft.phone || null } : c))
      )
    },
    [patchDeals, patchContacts, ui.maskPhone]
  )

  // --- stage management --------------------------------------------------------------------------

  // Only the latest refresh may write the stages (several changes can be saved in a row).
  const stagesSeq = useRef(0)
  /**
   * After a stage change: show it on the chips at once, then read the stages back and reload the table (row stage
   * names and kinds come from the server). Counts are cached a few seconds server-side, so a removal keeps the moved
   * deals on the target chip until the server's count catches up.
   */
  const stagesChanged = (change: StageChange) => {
    const before = stages?.stages ?? []
    const gone = change.type === "deleted" ? before.find((x) => x.id === change.id) : undefined
    const moved = change.type === "deleted" ? { to: change.moveTo, count: gone?.count ?? 0 } : null
    setStages((s) => {
      if (!s) return s
      let list = s.stages
      if (change.type === "created") {
        const { id, name, kind } = change.stage
        list = [...list, { id, name, kind, color: null, order: list.length, count: 0 }]
      } else if (change.type === "updated") {
        list = list.map((x) => (x.id === change.id ? { ...x, ...(change.name !== undefined && { name: change.name }), ...(change.kind && { kind: change.kind }) } : x))
      } else if (change.type === "reordered") {
        const pos = new Map(change.ids.map((id, i) => [id, i]))
        list = [...list].sort((a, b) => (pos.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (pos.get(b.id) ?? Number.MAX_SAFE_INTEGER)).map((x, i) => ({ ...x, order: i }))
      } else if (moved) {
        list = list.filter((x) => x.id !== change.id).map((x) => (x.id === moved.to ? { ...x, count: x.count + moved.count } : x))
      }
      return { ...s, stages: list }
    })
    const n = ++stagesSeq.current
    void loadFunnelStagesAction().then((res) => {
      if (n !== stagesSeq.current || !res.success) return
      const expected = before.find((x) => x.id === moved?.to)?.count ?? 0
      setStages({ ...res.data, stages: res.data.stages.map((x) => (moved && x.id === moved.to ? { ...x, count: Math.max(x.count, expected + moved.count) } : x)) })
    })
    // A filter on a removed stage goes away (that reloads the table); otherwise reload it here.
    if (change.type === "deleted" && ui.filters.stages.includes(change.id)) {
      setUi((s) => ({ ...s, filters: { ...s.filters, stages: s.filters.stages.filter((x) => x !== change.id) } }))
    } else if (ui.tab === "deals") {
      void deals.reload()
    } else {
      dealsLoaded.current = null
    }
  }

  // --- render ------------------------------------------------------------------------------------

  const errors = [initial.stagesError, deals.state.error, contacts.state.error]
  const blocked = errors.some((e) => !!e && isSubscriptionBlock(e))
  const noBoard = errors.some((e) => e?.status === 404)

  if (blocked || noBoard) {
    return (
      <PageLayout title={t("pageTitle")} subtitle={t("pageSubtitle")}>
        {blocked ? <FunnelBlocked t={t} /> : <FunnelNoBoard t={t} />}
      </PageLayout>
    )
  }

  const exportHref = `/funnel/export?${stateToSearchParams({ ...ui, tab: "deals", deal: null }).toString()}`

  /**
   * Downloads the CSV through `fetch` so a refusal (subscription, network, server) shows a message here instead of
   * saving an error body as a file. Without `fetch` the link downloads directly.
   */
  const exportCsv = async (event: MouseEvent<HTMLAnchorElement>) => {
    if (typeof fetch !== "function" || typeof URL.createObjectURL !== "function") return
    event.preventDefault()
    if (exporting) return
    setExporting(true)
    setExportError(null)
    try {
      const res = await fetch(exportHref, { credentials: "same-origin" })
      if (!res.ok) {
        let reference: string | undefined
        try {
          reference = ((await res.json()) as { reference?: string }).reference
        } catch {
          reference = undefined
        }
        setExportError(isSubscriptionBlock({ status: res.status, reference }) ? t("exportBlocked") : t("exportFailed"))
        return
      }
      const blob = await res.blob()
      const name = /filename="?([^";]+)"?/i.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? "funnel.csv"
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = name
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      setExportError(t("exportFailed"))
    } finally {
      setExporting(false)
    }
  }
  const filtered = ui.tab === "deals" ? activeFilterCount(ui.filters) > 0 : effectiveSearch(ui.filters.q) !== ""
  const openRow = ui.deal ? (deals.state.items.find((r) => r.cardId === ui.deal) ?? null) : null

  return (
    <PageLayout
      title={t("pageTitle")}
      subtitle={t("pageSubtitle")}
      actions={
        ui.tab === "deals" && (
          <a
            href={exportHref}
            download
            title={t("exportHint", { max: formatNumber(EXPORT_ROW_CAP, language) })}
            aria-disabled={exporting || undefined}
            onClick={(e) => void exportCsv(e)}
            className={actionClass({ variant: "secondary", size: "sm", className: cn("h-9", exporting && "pointer-events-none opacity-60") })}
          >
            <DocumentDownload size={16} aria-hidden />
            {exporting ? t("exporting") : t("exportCsv")}
          </a>
        )
      }
      toolbar={
        <FunnelToolbar
          state={ui}
          searchText={searchText}
          options={options}
          columns={columns}
          t={t}
          tn={tn}
          language={language}
          onTab={setTab}
          onSearch={setSearchText}
          onFilters={setFilters}
          onClearFilters={clearFilters}
          onPageSize={(pageSize) => setUi((s) => ({ ...s, pageSize }))}
          onMaskPhone={(maskPhone) => setUi((s) => ({ ...s, maskPhone }))}
          onColumns={changeColumns}
          onManageStages={board ? () => setManagingStages(true) : undefined}
        />
      }
    >
      {exportError && ui.tab === "deals" && (
        <p role="alert" className="mb-4 rounded-lg border border-error-light bg-error-clean px-3 py-2 text-body-13 text-error-darkest">
          {exportError}
        </p>
      )}
      {ui.tab === "deals" && (
        <div className="mb-4">
          <StageChips
            stages={stages?.stages ?? []}
            total={stages?.total ?? null}
            selected={ui.filters.stages}
            t={t}
            tn={tn}
            language={language}
            onChange={(ids) => setFilters({ stages: ids })}
          />
        </div>
      )}

      <div id="funnel-panel" role="tabpanel" aria-labelledby={`funnel-tab-${ui.tab}`}>
        {ui.tab === "deals" ? (
          <ListBody
            list={deals.state}
            filtered={filtered}
            t={t}
            tn={tn}
            onRetry={() => void deals.reload()}
            onClear={clearFilters}
            onLoadMore={deals.loadMore}
          >
            <DealsTable
              rows={deals.state.items}
              columns={columns}
              selectedId={ui.deal}
              hasMore={deals.state.hasMore}
              loadingMore={deals.state.loadingMore}
              busy={deals.state.status === "loading"}
              t={t}
              language={language}
              onOpen={openDeal}
              onLoadMore={deals.loadMore}
              restoreScrollTop={restoreTop}
              onScrollTop={onScrollTop}
              onRestored={onRestored}
            />
          </ListBody>
        ) : (
          <ListBody
            list={contacts.state}
            filtered={filtered}
            contacts
            t={t}
            tn={tn}
            onRetry={() => void contacts.reload()}
            onClear={clearFilters}
            onLoadMore={contacts.loadMore}
          >
            <ContactsTable
              rows={contacts.state.items}
              hasMore={contacts.state.hasMore}
              loadingMore={contacts.state.loadingMore}
              busy={contacts.state.status === "loading"}
              t={t}
              tn={tn}
              onOpenDeal={openContactDeal}
              onLoadMore={contacts.loadMore}
              restoreScrollTop={restoreTop}
              onScrollTop={onScrollTop}
              onRestored={onRestored}
            />
          </ListBody>
        )}
      </div>

      <DealDrawer
        dealId={ui.tab === "deals" ? ui.deal : null}
        row={openRow}
        stages={stages?.stages ?? []}
        board={board}
        owners={options?.owners ?? []}
        labels={options?.labels ?? []}
        moving={!!openRow && moving === openRow.cardId}
        feedback={feedback}
        canLoadMore={deals.state.hasMore}
        loadingMore={deals.state.loadingMore || deals.state.status === "loading" || deals.state.status === "idle"}
        t={t}
        language={language}
        onClose={closeDeal}
        onMove={(cardId, stageId) => void moveDeal(cardId, stageId)}
        onLoadMore={() => void deals.loadMore()}
        onPatchRow={patchRow}
        onContactSaved={contactSaved}
      />
      {board && (
        <StageManager
          open={managingStages}
          onOpenChange={setManagingStages}
          counts={stages?.stages ?? []}
          t={t}
          tn={tn}
          language={language}
          onChanged={stagesChanged}
        />
      )}
    </PageLayout>
  )
}

type ListBodyProps<T> = {
  list: ListState<T>
  filtered: boolean
  contacts?: boolean
  t: AttendeFunnelT
  tn: AttendeFunnelTn
  onRetry: () => void
  onClear: () => void
  onLoadMore: () => void
  children: React.ReactNode
}

/** Loading / error / empty states around a table, plus the footer with the count and the "Load more" fallback. */
function ListBody<T>({ list, filtered, contacts = false, t, tn, onRetry, onClear, onLoadMore, children }: ListBodyProps<T>) {
  if (list.items.length === 0) {
    if (list.status === "idle" || list.status === "loading") return <FunnelTableSkeleton />
    if (list.status === "error") return <FunnelError t={t} onRetry={onRetry} />
    // A partial page can be empty while more may match further down: offer to keep looking instead of "nothing".
    if (list.hasMore) {
      return (
        <div className="flex flex-col items-center gap-3 rounded-[14px] border border-dashed border-neutral-100 px-6 py-10 text-center">
          <p className="text-body-14 text-neutral-700">{t("searchingMore")}</p>
          <button type="button" className={actionClass({ variant: "secondary" })} disabled={list.loadingMore} onClick={onLoadMore}>
            {list.loadingMore ? t("loadingMore") : t("loadMore")}
          </button>
        </div>
      )
    }
    return <FunnelEmpty t={t} filtered={filtered} contacts={contacts} onClear={onClear} />
  }
  return (
    <div className="flex flex-col gap-3">
      {children}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        {/* Counts what is loaded (the filtered total is not known): "50 deals loaded", then where the list stands. */}
        <p className="flex flex-wrap gap-x-2 text-body-12 text-neutral-700" aria-live="polite">
          <span>{contacts ? tn("contactsLoadedOne", "contactsLoadedOther", list.items.length) : tn("dealsLoadedOne", "dealsLoadedOther", list.items.length)}</span>
          {list.hasMore && list.partial && <span>{t("searchingMore")}</span>}
          {!list.hasMore && <span>{t("endOfList")}</span>}
        </p>
        {list.moreError && (
          <p role="alert" className="text-body-12 text-error-dark">
            {t("loadMoreError")}
          </p>
        )}
        {list.hasMore && (
          <button type="button" className={actionClass({ variant: "secondary", size: "sm" })} disabled={list.loadingMore || list.status === "loading"} onClick={onLoadMore}>
            {list.loadingMore ? t("loadingMore") : t("loadMore")}
          </button>
        )}
      </div>
    </div>
  )
}
