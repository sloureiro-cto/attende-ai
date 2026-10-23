"use client"

import { MessageText1 } from "iconsax-react"
import { useSession } from "next-auth/react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { showToast } from "app/utils/showToast"
import {
  type MessagingConversationLastMessageUpdatedPayload,
  type MessagingConversationReadPayload,
  type MessagingConversationUpdatedPayload,
  type MessagingNewInboundMessagePayload,
  type MessagingPresencePayload,
  useMessagingInboxSocket,
} from "hooks/useMessagingInboxSocket"
import {
  type InboxOverviewData,
  type InboxPage,
  loadInboxItemAction,
  loadInboxOverviewAction,
  setHandlingAction,
} from "lib/bots-app/inbox/actions"
import {
  applyLastMessage,
  applyNewInbound,
  DEFAULT_INBOX_FILTERS,
  displayNameOf,
  type HandlingError,
  type HandlingMode,
  type InboxFilters,
  type InboxItem,
  inboxUrl,
  markRead,
  stateTranslationKey,
  withHandling,
} from "lib/bots-app/inbox/model"
import type { AttendeInboxKey } from "lib/i18n/translations/attende/inbox"
import { ContactPanel, ContactSheet } from "./ContactPanel"
import { ConversationList } from "./ConversationList"
import { InboxFilters as FiltersBar, type QueueCounts } from "./InboxFilters"
import { type PresenceEntry, ThreadView } from "./ThreadView"
import { type AttendeInboxT, useAttendeInboxT } from "./useAttendeInboxT"
import { useInboxList } from "./useInboxList"
import { useThread } from "./useThread"
import { useVisualViewport } from "./useVisualViewport"
import { EmptyState } from "../ui/EmptyState"

type Props = {
  initialPage: InboxPage | null
  initialFailed?: boolean
  overview: InboxOverviewData | null
  /** sessionId -> "baileys" | "cloud_api" (WhatsApp only), used for the 24h-window notice. */
  transports: Record<string, string | null>
  /** Conversation opened by the URL (deep link), even if it is not in the first page. */
  initialSelected: InboxItem | null
  initialFilters?: InboxFilters
}

const TYPING_TTL_MS = 5000
const TYPING_THROTTLE_MS = 3000
/** Live events arrive in bursts: the queue counts are re-read from the server once things settle. */
const COUNTS_REFRESH_MS = 1500
const DEEP_LINK = /^\/inbox\/([a-f0-9]{24})\/?$/i

type HandlingStatus = { key: string; pending: Exclude<HandlingMode, "none"> | null; error: string | null }

function handlingErrorText(code: string, item: InboxItem, mode: Exclude<HandlingMode, "none">, t: AttendeInboxT): string {
  const error = code as HandlingError
  if (error === "forbidden") return t("handlingForbidden")
  if (error === "not_allowed") {
    const phaseKey = stateTranslationKey(item.state)
    if (phaseKey) return t("handlingNotAllowed", { phase: t(phaseKey as AttendeInboxKey) })
  }
  return mode === "human" ? t("takeOverError") : t("returnError")
}

/** Unified live inbox: list on the left, thread in the middle, contact on the right. One screen on mobile at a time. */
export function InboxView({ initialPage, initialFailed = false, overview, transports, initialSelected, initialFilters = DEFAULT_INBOX_FILTERS }: Props) {
  const { t, language } = useAttendeInboxT()
  const { data: session } = useSession()
  const workspaceId = session?.user?.workspaceId ?? null
  const myUserId = session?.user?.id ?? null

  const list = useInboxList({ initial: initialPage, initialFailed, initialFilters })
  const [selectedKey, setSelectedKey] = useState<string | null>(initialSelected?.key ?? null)
  /** The open conversation when it is not (or no longer) in the loaded list, e.g. a deep link beyond the first page. */
  const [snapshot, setSnapshot] = useState<InboxItem | null>(initialSelected)
  const [panelOpen, setPanelOpen] = useState(true)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [handling, setHandling] = useState<HandlingStatus | null>(null)
  const handlingPending = useRef(false)
  const [announcement, setAnnouncement] = useState("")
  const [presence, setPresence] = useState<Map<string, PresenceEntry & { expires: number }>>(new Map())
  const [counts, setCounts] = useState<QueueCounts | null>(overview ? { unread: overview.unread, needsReply: overview.needsReply } : null)
  const [stageTitles, setStageTitles] = useState<Record<string, string> | null>(overview?.stageTitles ?? null)
  const lastTypingSent = useRef(0)
  const threadPane = useRef<HTMLDivElement | null>(null)

  const selected = useMemo<InboxItem | null>(() => {
    if (!selectedKey) return null
    return list.items.find((i) => i.key === selectedKey) ?? (snapshot?.key === selectedKey ? snapshot : null)
  }, [list.items, selectedKey, snapshot])

  useVisualViewport(threadPane, Boolean(selected))

  const target = selected ? { channel: selected.channel, sessionId: selected.sessionId, conversationId: selected.conversationId } : null

  /** Same change on the list row and on the snapshot, so the open conversation follows wherever it comes from. */
  const patchItem = useCallback(
    (conversationId: string, fn: (item: InboxItem) => InboxItem) => {
      list.patch((items) => items.map((i) => (i.conversationId === conversationId ? fn(i) : i)))
      setSnapshot((current) => (current && current.conversationId === conversationId ? fn(current) : current))
    },
    [list]
  )

  // ---- queue counts (always the server's numbers, re-read after live changes) ------------------
  const countsTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const refreshCounts = useCallback(() => {
    if (countsTimer.current) clearTimeout(countsTimer.current)
    countsTimer.current = setTimeout(async () => {
      countsTimer.current = null
      const res = await loadInboxOverviewAction()
      if (!res.success) return
      setCounts({ unread: res.data.unread, needsReply: res.data.needsReply })
      setStageTitles(res.data.stageTitles)
    }, COUNTS_REFRESH_MS)
  }, [])
  useEffect(
    () => () => {
      if (countsTimer.current) clearTimeout(countsTimer.current)
    },
    []
  )

  // useThread keeps the latest callback in a ref, so this needs no memoisation.
  const onMarkedRead = (conversationId: string) => {
    patchItem(conversationId, (i) => (i.unread ? { ...i, unread: false } : i))
    refreshCounts()
  }
  const thread = useThread(target, undefined, onMarkedRead)

  const select = useCallback((item: InboxItem) => {
    setSnapshot(item)
    setSelectedKey(item.key)
    setPresence(new Map())
    setDetailsOpen(false)
  }, [])

  const back = useCallback(() => {
    setSelectedKey(null)
    setDetailsOpen(false)
  }, [])

  // Coming back (browser Back from the funnel, a restored tab) with a conversation in the URL that the server render did
  // not open: open it again, so leaving the inbox never loses the conversation.
  useEffect(() => {
    if (initialSelected || typeof window === "undefined") return
    const match = DEEP_LINK.exec(window.location.pathname)
    if (!match) return
    const conversationId = match[1]!
    const known = list.items.find((i) => i.conversationId === conversationId)
    if (known) {
      select(known)
      return
    }
    let cancelled = false
    void loadInboxItemAction(conversationId).then((res) => {
      if (!cancelled && res.success && res.data) select(res.data)
    })
    return () => {
      cancelled = true
    }
    // Only on mount: later URL changes are made by this screen itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // The URL follows the open conversation and the queue / channel filters (shareable, survives reloads and Back).
  // Replaced, not pushed: switching conversations does not fill the history. Skipped on mount (the server URL is right).
  const urlReady = useRef(false)
  const selectedUrlKey = selected ? `${selected.conversationId}|${selected.channel}|${selected.sessionId}` : ""
  useEffect(() => {
    if (!urlReady.current) {
      urlReady.current = true
      return
    }
    if (typeof window === "undefined") return
    const next = inboxUrl(list.filters, selected)
    if (`${window.location.pathname}${window.location.search}` !== next) window.history.replaceState(window.history.state, "", next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUrlKey, list.filters.filter, list.filters.channel])

  // ---- live events ---------------------------------------------------------------------------
  const selectedRef = useRef(selected)
  selectedRef.current = selected
  const threadRef = useRef(thread)
  threadRef.current = thread
  const listRef = useRef(list)
  listRef.current = list

  const handleInbound = useCallback(
    (p: MessagingNewInboundMessagePayload) => {
      const open = selectedRef.current
      const isOpen = open?.conversationId === p.conversationId
      const known = listRef.current.items.some((i) => i.conversationId === p.conversationId)
      if (known) {
        listRef.current.patch((items) => applyNewInbound(items, { ...p, displayName: p.displayName }, open?.key ?? null))
      } else {
        // A conversation we have not loaded (new, or beyond the page): refresh the first page quietly.
        void listRef.current.reload(true)
      }
      if (isOpen) {
        void threadRef.current.refresh()
        setAnnouncement((prev) => `${t("newMessagesLive", { name: displayNameOf(open!) ?? t("untitledContact") })}${prev.endsWith(" ") ? "" : " "}`)
      }
      refreshCounts()
    },
    [refreshCounts, t]
  )

  const handleLastMessage = useCallback(
    (p: MessagingConversationLastMessageUpdatedPayload) => {
      listRef.current.patch((items) => applyLastMessage(items, p))
      // Delivery status of the open conversation changes the message rows, not just the preview.
      if (selectedRef.current?.conversationId === p.conversationId) void threadRef.current.refresh()
      if (p.lastMessageDirection === "outbound") refreshCounts()
    },
    [refreshCounts]
  )

  const handleRead = useCallback(
    (p: MessagingConversationReadPayload) => {
      listRef.current.patch((items) => markRead(items, p.conversationId))
      refreshCounts()
    },
    [refreshCounts]
  )

  const handleUpdated = useCallback(
    (p: MessagingConversationUpdatedPayload) => {
      patchItem(p.conversationId, (i) => ({ ...i, assignedUserName: p.assignedUser?.name ?? null }))
    },
    [patchItem]
  )

  const handlePresence = useCallback(
    (p: MessagingPresencePayload) => {
      if (p.user.id === myUserId) return
      if (selectedRef.current?.conversationId !== p.conversationId) return
      setPresence((current) => {
        const next = new Map(current)
        if (p.state === "left") next.delete(p.user.id)
        else next.set(p.user.id, { userId: p.user.id, name: p.user.name, state: p.state, expires: Date.now() + (p.state === "typing" ? TYPING_TTL_MS : 60_000) })
        return next
      })
    },
    [myUserId]
  )

  const { isConnected, sendPresence } = useMessagingInboxSocket({
    workspaceId,
    onNewInboundMessage: handleInbound,
    onConversationLastMessageUpdated: handleLastMessage,
    onConversationRead: handleRead,
    onConversationUpdated: handleUpdated,
    onPresence: handlePresence,
  })

  // Typing indicators fade on their own if the "left" event never arrives.
  useEffect(() => {
    if (presence.size === 0) return
    const timer = setInterval(() => {
      setPresence((current) => {
        const now = Date.now()
        const next = new Map([...current].filter(([, v]) => v.expires > now))
        return next.size === current.size ? current : next
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [presence.size])

  // Tell teammates which conversation we are viewing.
  useEffect(() => {
    if (!target) return
    sendPresence(target, "viewing")
    return () => sendPresence(target, "left")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.channel, target?.sessionId, target?.conversationId, sendPresence])

  const onTyping = useCallback(() => {
    const now = Date.now()
    if (!target || now - lastTypingSent.current < TYPING_THROTTLE_MS) return
    lastTypingSent.current = now
    sendPresence(target, "typing")
  }, [sendPresence, target])

  // ---- take over / return to AI ----------------------------------------------------------------
  /**
   * Not optimistic: the bar keeps the confirmed state and shows the request as pending. On success the row is re-read
   * from the server (the agent that covers it is only known there); on failure nothing changes and the error is shown.
   */
  const changeHandling = useCallback(
    async (mode: Exclude<HandlingMode, "none">): Promise<boolean> => {
      const open = selectedRef.current
      if (!open || handlingPending.current) return false
      if (open.handling === mode) return true
      handlingPending.current = true
      setHandling({ key: open.key, pending: mode, error: null })
      try {
        const res = await setHandlingAction(open.channel, open.conversationId, mode)
        if (!res.success) {
          const message = handlingErrorText(res.error, open, mode, t)
          setHandling({ key: open.key, pending: null, error: message })
          showToast("error", message)
          return false
        }
        const fresh = await loadInboxItemAction(open.conversationId)
        const next = fresh.success && fresh.data ? fresh.data : withHandling(open, mode)
        patchItem(open.conversationId, (i) => ({ ...next, key: i.key }))
        setHandling(null)
        const done = mode === "human" ? t("takeOverDone") : next.handling === "ai" ? t("returnDone") : t("returnDoneNoAgent")
        showToast(mode === "ai" && next.handling !== "ai" ? "warning" : "success", done)
        setAnnouncement(done)
        return true
      } finally {
        handlingPending.current = false
      }
    },
    [patchItem, t]
  )

  const transport = selected ? (transports[selected.sessionId] ?? null) : null
  const presenceList = useMemo(() => [...presence.values()], [presence])

  return (
    <div className="flex flex-col">
      <div
        className={cn(
          "grid h-[calc(100dvh-7rem-env(safe-area-inset-bottom))] min-h-[420px] grid-cols-1 overflow-hidden lg:h-dvh lg:grid-cols-[18.5rem_minmax(0,1fr)] xl:grid-cols-[21.25rem_minmax(0,1fr)_16.25rem]",
          // No side panel on wide screens: the conversation takes its column.
          selected && !panelOpen && "xl:grid-cols-[21.25rem_minmax(0,1fr)]"
        )}
      >
        <div className={cn("flex min-h-0 flex-col bg-white lg:border-r lg:border-neutral-border", selected ? "hidden lg:flex" : "flex")}>
          <div className="px-3.5 pb-2.5 pt-3.5">
            <FiltersBar filters={list.filters} counts={counts} live={isConnected} language={language} t={t} onChange={list.updateFilters} />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-2">
            <ConversationList
              items={list.items}
              status={list.status}
              filters={list.filters}
              hasMore={list.hasMore}
              loadingMore={list.loadingMore}
              selectedKey={selectedKey}
              language={language}
              t={t}
              onSelect={select}
              onLoadMore={list.loadMore}
              onRetry={() => void list.reload()}
              onClearFilters={list.clearFilters}
            />
          </div>
        </div>

        {selected ? (
          <>
            {/* Phones and tablets: the open conversation takes the whole screen, above the app bars, like a chat app.
                It is sized to the visual viewport so the composer stays above the on-screen keyboard. */}
            <div
              ref={threadPane}
              className="min-h-0 min-w-0 max-lg:fixed max-lg:inset-x-0 max-lg:top-[var(--inbox-vvt,0px)] max-lg:z-50 max-lg:h-[var(--inbox-vvh,100dvh)] max-lg:bg-white"
            >
              <ThreadView
                key={selected.key}
                item={selected}
                transport={transport}
                messages={thread.messages}
                status={thread.status}
                hasMore={thread.hasMore}
                loadingOlder={thread.loadingOlder}
                language={language}
                t={t}
                announcement={announcement}
                presence={presenceList}
                handlingPending={handling?.key === selected.key ? handling.pending : null}
                handlingError={handling?.key === selected.key ? handling.error : null}
                panelOpen={panelOpen}
                live={isConnected}
                onBack={back}
                onTogglePanel={() => setPanelOpen((v) => !v)}
                onOpenDetails={() => setDetailsOpen(true)}
                onReload={() => void thread.reload()}
                onLoadOlder={() => void thread.loadOlder()}
                onSend={thread.send}
                onTyping={onTyping}
                onRetry={thread.retry}
                onDiscard={thread.discard}
                onTakeOver={() => changeHandling("human")}
                onReturnToAi={() => changeHandling("ai")}
                onTemplateSent={() => void thread.refresh()}
              />
            </div>
            {panelOpen && <ContactPanel item={selected} stageTitles={stageTitles} t={t} className="hidden border-l border-neutral-border bg-white xl:flex" />}
            <ContactSheet item={selected} stageTitles={stageTitles} t={t} open={detailsOpen} onOpenChange={setDetailsOpen} />
          </>
        ) : (
          <div className="hidden items-center justify-center p-8 lg:flex xl:col-span-2">
            <EmptyState icon={<MessageText1 size={22} />} title={t("selectConversationTitle")} description={t("selectConversationHint")} className="w-full max-w-md" />
          </div>
        )}
      </div>
    </div>
  )
}
