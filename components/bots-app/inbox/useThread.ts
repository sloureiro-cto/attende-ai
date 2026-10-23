"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { loadThreadAction, markReadAction, sendMessageAction } from "lib/bots-app/inbox/actions"
import {
  discardOptimistic,
  failOptimistic,
  type InboxChannel,
  mergeThread,
  optimisticMessage,
  resolveOptimistic,
  retryOptimistic,
  type ThreadMessage,
} from "lib/bots-app/inbox/model"

export type ThreadStatus = "loading" | "ready" | "error"

type Target = { channel: InboxChannel; sessionId: string; conversationId: string }

type Api = {
  loadThread: typeof loadThreadAction
  sendMessage: typeof sendMessageAction
  markRead: typeof markReadAction
}

const DEFAULT_API: Api = { loadThread: loadThreadAction, sendMessage: sendMessageAction, markRead: markReadAction }

let clientSeq = 0
const newClientId = () => `local-${Date.now()}-${(clientSeq += 1)}`

/**
 * The open conversation: newest page first, older pages on demand, a silent `refresh` for live events,
 * and optimistic sending (a failed message stays in place with retry / discard).
 */
export function useThread(target: Target | null, api: Api = DEFAULT_API, onMarkedRead?: (conversationId: string) => void) {
  const [messages, setMessages] = useState<ThreadMessage[]>([])
  const [status, setStatus] = useState<ThreadStatus>("loading")
  const [hasMore, setHasMore] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const targetKey = target ? `${target.channel}:${target.sessionId}:${target.conversationId}` : ""
  const targetRef = useRef(target)
  targetRef.current = target
  // Kept in a ref so an unstable callback from the parent never re-triggers the thread load.
  const onMarkedReadRef = useRef(onMarkedRead)
  onMarkedReadRef.current = onMarkedRead
  const seq = useRef(0)
  const offsetRef = useRef(0)
  const messagesRef = useRef(messages)
  messagesRef.current = messages
  /** Local ids with a send request in flight: a second click never sends the same message twice. */
  const inFlight = useRef(new Set<string>())

  const load = useCallback(async () => {
    const t = targetRef.current
    if (!t) return
    const mine = ++seq.current
    setStatus("loading")
    const res = await api.loadThread(t.channel, t.sessionId, t.conversationId, 0)
    if (mine !== seq.current) return
    if (!res.success) {
      setStatus("error")
      return
    }
    offsetRef.current = res.data.messages.length
    setMessages(res.data.messages)
    setHasMore(res.data.hasMore)
    setStatus("ready")
    void api.markRead(t.channel, t.sessionId, t.conversationId).then((r) => {
      if (r.success && mine === seq.current) onMarkedReadRef.current?.(t.conversationId)
    })
  }, [api])

  // Switching conversation resets the thread; a stale response of the previous one is dropped by `seq`.
  useEffect(() => {
    setMessages([])
    setHasMore(false)
    offsetRef.current = 0
    if (!targetKey) {
      seq.current += 1
      return
    }
    void load()
  }, [targetKey, load])

  /** Silent reload of the newest page, merged into what is already shown (no spinner, no scroll jump). */
  const refresh = useCallback(async () => {
    const t = targetRef.current
    if (!t) return
    const mine = seq.current
    const res = await api.loadThread(t.channel, t.sessionId, t.conversationId, 0)
    if (mine !== seq.current || !res.success) return
    setMessages((current) => mergeThread(current, res.data.messages))
  }, [api])

  const loadOlder = useCallback(async () => {
    const t = targetRef.current
    if (!t || loadingOlder || !hasMore) return
    const mine = seq.current
    setLoadingOlder(true)
    const res = await api.loadThread(t.channel, t.sessionId, t.conversationId, offsetRef.current)
    setLoadingOlder(false)
    if (mine !== seq.current || !res.success) return
    offsetRef.current += res.data.messages.length
    setHasMore(res.data.hasMore)
    setMessages((current) => mergeThread(current, res.data.messages))
  }, [api, hasMore, loadingOlder])

  /** Sends one local message; the caller has already put `clientId` in `inFlight`. */
  const deliver = useCallback(
    async (clientId: string, text: string) => {
      const t = targetRef.current
      if (!t) return
      const mine = seq.current
      const res = await api.sendMessage(t.channel, t.sessionId, t.conversationId, text)
      if (mine !== seq.current) return
      setMessages((current) => (res.success ? resolveOptimistic(current, clientId, res.data) : failOptimistic(current, clientId, res.error)))
    },
    [api]
  )

  const send = useCallback(
    (text: string) => {
      const body = text.trim()
      if (!body || !targetRef.current) return
      const clientId = newClientId()
      setMessages((current) => [...current, optimisticMessage(body, clientId)])
      inFlight.current.add(clientId)
      void deliver(clientId, body).finally(() => inFlight.current.delete(clientId))
    },
    [deliver]
  )

  /**
   * Retry keeps the same local id and is ignored while a send is in flight. The send API takes no idempotency key, so
   * before sending again the newest page is re-read: if the first attempt did reach the server (the request failed
   * after it was stored), the server row replaces the local one and nothing is sent twice.
   */
  const retry = useCallback(
    async (clientId: string) => {
      const t = targetRef.current
      const failed = messagesRef.current.find((m) => m.clientId === clientId)
      if (!t || !failed || failed.status !== "failed" || inFlight.current.has(clientId)) return
      inFlight.current.add(clientId)
      setMessages((current) => retryOptimistic(current, clientId))
      try {
        const mine = seq.current
        const latest = await api.loadThread(t.channel, t.sessionId, t.conversationId, 0)
        if (mine !== seq.current) return
        if (latest.success) {
          const reached = !mergeThread(retryOptimistic(messagesRef.current, clientId), latest.data.messages).some((m) => m.clientId === clientId)
          setMessages((current) => mergeThread(current, latest.data.messages))
          if (reached) return
        }
        await deliver(clientId, failed.text)
      } finally {
        inFlight.current.delete(clientId)
      }
    },
    [api, deliver]
  )

  const discard = useCallback((clientId: string) => setMessages((current) => discardOptimistic(current, clientId)), [])

  return { messages, status, hasMore, loadingOlder, reload: load, refresh, loadOlder, send, retry, discard }
}
