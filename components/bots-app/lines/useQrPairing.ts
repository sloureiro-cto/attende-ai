"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { getWhatsAppSessionAction, getWhatsAppSessionQrAction } from "actions/whatsapp-lite"
import type { WhatsAppSession } from "actions/whatsapp-lite/types"

const QR_POLL_MS = 2800
const FAILS_BEFORE_ERROR = 3

/**
 * Polls a QR pairing until the session connects (same cadence and failure rule as the JSYNQ modal):
 * keeps the last good code on screen, and only reports a failure after a few misses in a row.
 */
export function useQrPairing(sessionId: string | null, enabled: boolean, onConnected: (session: WhatsAppSession) => void) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const failStreak = useRef(0)
  const lastQr = useRef<string | null>(null)
  const onConnectedRef = useRef(onConnected)
  onConnectedRef.current = onConnected

  const pollOnce = useCallback(async (id: string) => {
    const miss = () => {
      failStreak.current += 1
      if (failStreak.current >= FAILS_BEFORE_ERROR) setFailed(true)
    }
    const state = await getWhatsAppSessionAction(id)
    if (state.success && state.data.status === "connected") {
      failStreak.current = 0
      setFailed(false)
      onConnectedRef.current(state.data)
      return
    }
    const qr = await getWhatsAppSessionQrAction(id)
    if (!qr.success) {
      if (!lastQr.current) miss()
      return
    }
    const payload = qr.data
    if ((payload.status === "disconnected" || payload.status === "banned") && !payload.qrReady) {
      miss()
      return
    }
    if (payload.qrCode) {
      failStreak.current = 0
      if (lastQr.current !== payload.qrCode) {
        lastQr.current = payload.qrCode
        setQrDataUrl(payload.qrCode)
      }
      setFailed(false)
    }
  }, [])

  useEffect(() => {
    failStreak.current = 0
    setFailed(false)
    if (!enabled || !sessionId) {
      lastQr.current = null
      setQrDataUrl(null)
      return
    }
    let cancelled = false
    const tick = () => {
      if (!cancelled) void pollOnce(sessionId)
    }
    tick()
    const interval = window.setInterval(tick, QR_POLL_MS)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [enabled, sessionId, pollOnce])

  const refresh = useCallback(async () => {
    if (!sessionId) return
    failStreak.current = 0
    setFailed(false)
    await pollOnce(sessionId)
  }, [pollOnce, sessionId])

  return { qrDataUrl, failed, refresh }
}
