"use client"

import { createContext, type ReactNode, useContext } from "react"

import { cn } from "@/lib/utils"

export type OverlayStackMode = "default" | "aboveFullscreenModal"

const OverlayStackContext = createContext<OverlayStackMode>("default")

/** Full-screen CRM WhatsApp modal content layer (`CardWhatsAppChatModal`). */
export const FULLSCREEN_MODAL_CONTENT_Z = "z-[100]"

/** Nested portaled overlays (popovers, selects) above the full-screen modal. */
export const ABOVE_FULLSCREEN_MODAL_Z = "z-[200]"

/** Nested dialog overlay above the full-screen modal (below nested dialog content). */
export const ABOVE_FULLSCREEN_MODAL_OVERLAY_Z = "z-[190]"

export function OverlayStackProvider({ mode, children }: { mode: OverlayStackMode; children: ReactNode }) {
  return <OverlayStackContext.Provider value={mode}>{children}</OverlayStackContext.Provider>
}

export function useOverlayStackMode(): OverlayStackMode {
  return useContext(OverlayStackContext)
}

export function overlayStackZClass(
  mode: OverlayStackMode,
  defaultClass: string,
  elevatedClass: string = ABOVE_FULLSCREEN_MODAL_Z
): string {
  return mode === "aboveFullscreenModal" ? elevatedClass : defaultClass
}

export function cnOverlayStack(mode: OverlayStackMode, defaultClass: string, elevatedClass?: string): string {
  return cn(overlayStackZClass(mode, defaultClass, elevatedClass))
}

/**
 * Baseline dialog/modal layer for the "default" mode — still above the regular card
 * details modal (`DialogContainer`, `z-[60]`), since these are routinely rendered nested
 * inside it (e.g. the product modal from a card's product line items). Below the
 * `menuContentClassName` baseline (`z-[100]`) so menus stay above dialogs either way.
 */
export const ABOVE_CARD_MODAL_OVERLAY_Z = "z-[65]"
export const ABOVE_CARD_MODAL_CONTENT_Z = "z-[70]"

/** Dialog / menu layers when rendered inside `CardWhatsAppChatModal` (or similar full-screen shells). */
export function useStackedOverlayLayers() {
  const mode = useOverlayStackMode()
  const elevated = mode === "aboveFullscreenModal"
  return {
    elevated,
    dialogOverlayClassName: overlayStackZClass(mode, ABOVE_CARD_MODAL_OVERLAY_Z, ABOVE_FULLSCREEN_MODAL_OVERLAY_Z),
    dialogContentClassName: overlayStackZClass(mode, ABOVE_CARD_MODAL_CONTENT_Z, ABOVE_FULLSCREEN_MODAL_Z),
    menuContentClassName: overlayStackZClass(mode, "z-[100]"),
    modalOverlayClassName: cn(
      overlayStackZClass(mode, ABOVE_CARD_MODAL_OVERLAY_Z, ABOVE_FULLSCREEN_MODAL_OVERLAY_Z),
      elevated && "bg-black/40"
    ),
    modalContentClassName: overlayStackZClass(mode, ABOVE_CARD_MODAL_CONTENT_Z, ABOVE_FULLSCREEN_MODAL_Z),
  }
}
