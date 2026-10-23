"use client"

import { useEffect, useState } from "react"
import { getLinesPillStatusAction } from "lib/bots-app/linesActions"
import { type LinesStatus, LinesStatusPill, type LinesStatusVariant } from "./LinesStatusPill"

const REFRESH_MS = 60_000

/**
 * One poller shared by every mounted pill (the shell shows one in the side menu and one in the phone header), so
 * the status is fetched once per minute however many pills are on screen.
 */
let current: LinesStatus | null = { state: "loading" }
const listeners = new Set<(status: LinesStatus | null) => void>()
let timer: ReturnType<typeof setInterval> | null = null

const publish = (next: LinesStatus | null) => {
  current = next
  listeners.forEach((listener) => listener(next))
}

/**
 * Lets /lines push the status it just loaded, so the side-menu alert and the page never show different health
 * between two polls (both come from the same loader and `pillStatusOf`).
 */
export function publishLinesStatus(next: LinesStatus) {
  publish(next)
}

const load = async () => {
  try {
    publish(await getLinesPillStatusAction())
  } catch {
    publish(null)
  }
}

const onVisible = () => {
  if (document.visibilityState === "visible") void load()
}

function subscribe(listener: (status: LinesStatus | null) => void): () => void {
  listeners.add(listener)
  if (listeners.size === 1) {
    void load()
    timer = setInterval(() => void load(), REFRESH_MS)
    document.addEventListener("visibilitychange", onVisible)
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) {
      if (timer) clearInterval(timer)
      timer = null
      document.removeEventListener("visibilitychange", onVisible)
    }
  }
}

/**
 * Channels health with live data. It loads after the page is interactive (never blocks the shell), refreshes every
 * minute and when the tab becomes visible again. If the health cannot be determined (not entitled, backend down)
 * it renders nothing instead of a misleading "all online".
 */
export function LinesStatusPillLive({ variant = "sidebar", className }: { variant?: LinesStatusVariant; className?: string }) {
  const [status, setStatus] = useState<LinesStatus | null>(current)
  useEffect(() => subscribe(setStatus), [])
  return status ? <LinesStatusPill status={status} variant={variant} className={className} /> : null
}
