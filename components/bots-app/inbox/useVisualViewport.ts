"use client"

import { type RefObject, useEffect } from "react"

/**
 * Keeps `--inbox-vvh` / `--inbox-vvt` on the element equal to the visual viewport's height and top. With the on-screen
 * keyboard open, iOS shrinks only the visual viewport: a `fixed inset-0` screen would leave its composer under the
 * keyboard. Sizing to these variables keeps the header, the history and the composer all on screen.
 */
export function useVisualViewport(ref: RefObject<HTMLElement>, enabled: boolean) {
  useEffect(() => {
    const el = ref.current
    const vv = typeof window !== "undefined" ? window.visualViewport : null
    if (!el || !vv || !enabled) return
    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        el.style.setProperty("--inbox-vvh", `${Math.round(vv.height)}px`)
        el.style.setProperty("--inbox-vvt", `${Math.round(vv.offsetTop)}px`)
      })
    }
    update()
    vv.addEventListener("resize", update)
    vv.addEventListener("scroll", update)
    return () => {
      cancelAnimationFrame(frame)
      vv.removeEventListener("resize", update)
      vv.removeEventListener("scroll", update)
      el.style.removeProperty("--inbox-vvh")
      el.style.removeProperty("--inbox-vvt")
    }
  }, [ref, enabled])
}
