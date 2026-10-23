"use client"

import { useSession } from "next-auth/react"
import { useCallback, useEffect, useRef, useState } from "react"
import type { InboxUnreadChannel } from "@/lib/messages/inboxUnreadStorage"
import {
  registerMessagingInboxSocketConnected,
  unregisterMessagingInboxSocketConnected,
} from "@/lib/messages/messagingInboxWsStatus"
import { buildPublicWebSocketUrl } from "lib/websocket/publicWebSocketOrigin"

export type MessagingInboxChannel = InboxUnreadChannel

export const MESSAGING_CONVERSATION_UPDATED = "messaging-inbox:conversation-updated"
export const MESSAGING_CONVERSATION_READ = "messaging-inbox:conversation-read"
export const MESSAGING_NEW_INBOUND_MESSAGE = "messaging-inbox:new-inbound-message"
export const MESSAGING_CONVERSATION_LAST_MESSAGE_UPDATED = "messaging-inbox:conversation-last-message-updated"
export const MESSAGING_SESSION_STATUS = "messaging-inbox:session-status"
export const MESSAGING_PRESENCE = "messaging-inbox:presence"

/** A teammate viewing / typing in a conversation (server-stamped user, never client-claimed). */
export type MessagingPresenceState = "viewing" | "typing" | "left"

export type MessagingPresenceTarget = {
  channel: MessagingInboxChannel
  sessionId: string
  conversationId: string
}

export type MessagingPresencePayload = MessagingPresenceTarget & {
  workspaceId: string
  state: MessagingPresenceState
  user: { id: string; name: string; avatarUrl?: string; avatarBackground?: string }
  at: string
}

export type MessagingConversationUpdatedPayload = {
  workspaceId: string
  channel: MessagingInboxChannel
  sessionId: string
  conversationId: string
  assignedUserId?: string | null
  assignedUser?: {
    _id: string
    name: string
    email?: string
    avatarUrl?: string
    avatar?: string
    avatarBackground?: string
  } | null
}

export type MessagingConversationReadPayload = {
  workspaceId: string
  channel: MessagingInboxChannel
  sessionId: string
  conversationId: string
  lastReadAt: string
}

export type MessagingNewInboundMessagePayload = {
  workspaceId: string
  channel: MessagingInboxChannel
  sessionId: string
  conversationId: string
  messageId?: string
  lastInboundAt: string
  lastMessageAt?: string
  lastMessagePreview?: string | null
  lastMessageDirection?: "inbound" | "outbound"
  attendeeUsername?: string
  displayName?: string
  profilePictureUrl?: string
}

export type MessagingSessionStatusPayload = {
  workspaceId: string
  sessionId: string
  status: "disconnected" | "banned" | "connected" | "deleted" | "qr_pending" | string
  label?: string
  phoneNumber?: string | null
  lastDisconnectAt?: string | null
  occurredAt?: string
}

export type MessagingConversationLastMessageUpdatedPayload = {
  workspaceId: string
  channel: MessagingInboxChannel
  sessionId: string
  conversationId: string
  messageId: string
  lastMessageStatus?: "sent" | "delivered" | "read" | "failed"
  lastMessagePreview?: string | null
  lastMessageDirection?: "inbound" | "outbound"
  lastMessageAt?: string
}

function messagingInboxWsRoom(workspaceId: string): string {
  return `messaging-inbox:${workspaceId}`
}

type Options = {
  workspaceId: string | null | undefined
  onConversationUpdated?: (payload: MessagingConversationUpdatedPayload) => void
  onConversationRead?: (payload: MessagingConversationReadPayload) => void
  onNewInboundMessage?: (payload: MessagingNewInboundMessagePayload) => void
  onConversationLastMessageUpdated?: (payload: MessagingConversationLastMessageUpdatedPayload) => void
  onSessionStatus?: (payload: MessagingSessionStatusPayload) => void
  onPresence?: (payload: MessagingPresencePayload) => void
  enabled?: boolean
}

const INITIAL_RECONNECT_MS = 1000
const MAX_RECONNECT_MS = 30000

function reconnectDelayMs(attempt: number): number {
  return Math.min(INITIAL_RECONNECT_MS * 2 ** attempt, MAX_RECONNECT_MS)
}

function closeWebSocketQuietly(ws: WebSocket): void {
  ws.onopen = null
  ws.onmessage = null
  ws.onerror = null
  ws.onclose = null
  if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
    ws.close()
  }
}

export function useMessagingInboxSocket({
  workspaceId,
  onConversationUpdated,
  onConversationRead,
  onNewInboundMessage,
  onConversationLastMessageUpdated,
  onSessionStatus,
  onPresence,
  enabled = true,
}: Options) {
  const { data: session } = useSession()
  const [isConnected, setIsConnected] = useState(false)
  const socketRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectAttempts = useRef(0)
  const connectingRef = useRef(false)
  const lifecycleRef = useRef(0)
  const enabledRef = useRef(enabled)
  const socketRegisteredRef = useRef(false)
  /** When the socket drops during a thread switch, still deliver the last `left` after reconnect. */
  const pendingPresenceRef = useRef<{ target: MessagingPresenceTarget; state: MessagingPresenceState } | null>(null)
  const connectRef = useRef<() => void>(() => {})
  const onUpdateRef = useRef(onConversationUpdated)
  const onReadRef = useRef(onConversationRead)
  const onInboundRef = useRef(onNewInboundMessage)
  const onLastMessageRef = useRef(onConversationLastMessageUpdated)
  const onSessionStatusRef = useRef(onSessionStatus)
  const onPresenceRef = useRef(onPresence)

  useEffect(() => {
    onUpdateRef.current = onConversationUpdated
  }, [onConversationUpdated])

  useEffect(() => {
    onReadRef.current = onConversationRead
  }, [onConversationRead])

  useEffect(() => {
    onInboundRef.current = onNewInboundMessage
  }, [onNewInboundMessage])

  useEffect(() => {
    onLastMessageRef.current = onConversationLastMessageUpdated
  }, [onConversationLastMessageUpdated])

  useEffect(() => {
    onSessionStatusRef.current = onSessionStatus
  }, [onSessionStatus])

  useEffect(() => {
    onPresenceRef.current = onPresence
  }, [onPresence])

  enabledRef.current = enabled

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (socketRegisteredRef.current) {
      unregisterMessagingInboxSocketConnected()
      socketRegisteredRef.current = false
    }
    const ws = socketRef.current
    if (ws) {
      closeWebSocketQuietly(ws)
      socketRef.current = null
    }
    connectingRef.current = false
    setIsConnected(false)
  }, [])

  const connect = useCallback(async () => {
    const id = workspaceId?.trim()
    if (!enabledRef.current || !id) return
    if (connectingRef.current) return
    if (socketRef.current?.readyState === WebSocket.OPEN) return

    const generation = lifecycleRef.current
    connectingRef.current = true

    let token: string | undefined = session?.apiToken
    try {
      const res = await fetch("/api/auth/clientsession", { credentials: "include" })
      if (res.ok) {
        const data = (await res.json()) as { apiToken?: string }
        token = data?.apiToken ?? token
      }
    } catch {
      /* keep session token */
    }

    if (generation !== lifecycleRef.current || !enabledRef.current) {
      connectingRef.current = false
      return
    }

    const room = messagingInboxWsRoom(id)
    const url = buildPublicWebSocketUrl({
      room,
      token,
    })
    if (!url) {
      connectingRef.current = false
      return
    }

    if (socketRef.current) {
      closeWebSocketQuietly(socketRef.current)
      socketRef.current = null
    }

    const ws = new WebSocket(url)
    socketRef.current = ws

    ws.onopen = () => {
      if (generation !== lifecycleRef.current) {
        closeWebSocketQuietly(ws)
        return
      }
      connectingRef.current = false
      reconnectAttempts.current = 0
      setIsConnected(true)
      if (!socketRegisteredRef.current) {
        registerMessagingInboxSocketConnected()
        socketRegisteredRef.current = true
      }
      ws.send(
        JSON.stringify({
          type: "handshake",
          payload: { token: token ?? null, room },
        })
      )
      ws.send(JSON.stringify({ type: "subscribe", payload: { room } }))
      const pending = pendingPresenceRef.current
      if (pending) {
        pendingPresenceRef.current = null
        ws.send(
          JSON.stringify({
            type: MESSAGING_PRESENCE,
            payload: { ...pending.target, state: pending.state },
          })
        )
      }
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(String(event.data)) as {
          type?: string
          payload?: unknown
        }
        if (data.type === MESSAGING_CONVERSATION_UPDATED && data.payload) {
          onUpdateRef.current?.(data.payload as MessagingConversationUpdatedPayload)
        } else if (data.type === MESSAGING_CONVERSATION_READ && data.payload) {
          onReadRef.current?.(data.payload as MessagingConversationReadPayload)
        } else if (data.type === MESSAGING_NEW_INBOUND_MESSAGE && data.payload) {
          onInboundRef.current?.(data.payload as MessagingNewInboundMessagePayload)
        } else if (data.type === MESSAGING_CONVERSATION_LAST_MESSAGE_UPDATED && data.payload) {
          onLastMessageRef.current?.(data.payload as MessagingConversationLastMessageUpdatedPayload)
        } else if (data.type === MESSAGING_SESSION_STATUS && data.payload) {
          onSessionStatusRef.current?.(data.payload as MessagingSessionStatusPayload)
        } else if (data.type === MESSAGING_PRESENCE && data.payload) {
          onPresenceRef.current?.(data.payload as MessagingPresencePayload)
        }
      } catch {
        /* ignore */
      }
    }

    ws.onclose = () => {
      if (socketRegisteredRef.current) {
        unregisterMessagingInboxSocketConnected()
        socketRegisteredRef.current = false
      }
      if (generation !== lifecycleRef.current) return
      connectingRef.current = false
      setIsConnected(false)
      if (socketRef.current === ws) socketRef.current = null
      if (!enabledRef.current || !id) return
      if (reconnectTimeoutRef.current) return
      const delay = reconnectDelayMs(reconnectAttempts.current)
      reconnectAttempts.current += 1
      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectTimeoutRef.current = null
        connectRef.current()
      }, delay)
    }

    ws.onerror = () => {
      if (generation !== lifecycleRef.current) return
      connectingRef.current = false
      setIsConnected(false)
    }
  }, [session?.apiToken, workspaceId])

  connectRef.current = connect

  useEffect(() => {
    lifecycleRef.current += 1

    if (enabled && workspaceId) {
      void connect()
    } else {
      disconnect()
    }

    return () => {
      lifecycleRef.current += 1
      disconnect()
    }
  }, [enabled, workspaceId, connect, disconnect])

  useEffect(() => {
    if (!enabled || !workspaceId) return

    // A backgrounded tab (screen lock, OS sleep, long minimize) can leave the socket
    // "zombied" - the OS silently drops the connection but the browser never fires
    // `close`, so `readyState` still reports OPEN and no reconnect ever triggers. On
    // regaining visibility/connectivity, don't trust that state: force a fresh
    // connection immediately instead of waiting for a close event that may never come.
    const forceReconnect = () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
      const ws = socketRef.current
      if (ws) {
        closeWebSocketQuietly(ws)
        socketRef.current = null
      }
      connectingRef.current = false
      reconnectAttempts.current = 0
      void connectRef.current()
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") forceReconnect()
    }

    document.addEventListener("visibilitychange", onVisibilityChange)
    window.addEventListener("online", forceReconnect)
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange)
      window.removeEventListener("online", forceReconnect)
    }
  }, [enabled, workspaceId])

  /** Tells teammates this user is viewing / typing in a conversation (dropped while offline). */
  const sendPresence = useCallback((target: MessagingPresenceTarget, state: MessagingPresenceState) => {
    const ws = socketRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      if (state === "left") {
        pendingPresenceRef.current = { target, state }
      }
      return
    }
    pendingPresenceRef.current = null
    ws.send(JSON.stringify({ type: MESSAGING_PRESENCE, payload: { ...target, state } }))
  }, [])

  return { isConnected, sendPresence }
}
