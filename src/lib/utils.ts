import { type ClassValue, clsx } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      // Every custom size from tailwind.config.js `fontSize`. A size missing here is read as a text
      // colour and silently dropped when merged with one (e.g. `text-body-13 text-neutral-500`).
      "font-size": [
        { "text-body": ["8", "10", "11", "12", "13", "14", "16", "18"] },
        { "text-heading": ["24", "32", "40", "48", "56", "64"] },
        { "text-display": ["72", "80"] },
        "text-heading-72",
        "text-heading-80",
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function areSetEquals<T>(leftSet: Set<T>, rightSet: Set<T>): boolean {
  return leftSet.size === rightSet.size && [...leftSet].every((x) => rightSet.has(x))
}

/** Para `Dialog`/`Sheet`: ignorar interacções no menu portaled do Radix Select (`SelectInput`). */
export function isRadixSelectViewportTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest("[data-radix-select-viewport]"))
}

/** Para `Dialog`/`Sheet`: ignorar interacções no conteúdo portaled do Radix Popover (`SearchPopover`). */
export function isRadixPopoverContentTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    Boolean(target.closest("[data-radix-popover-content]") || target.closest("[data-radix-popper-content-wrapper]"))
  )
}

/** Invite modal member search menu (`Invite.SearchInput`) portaled to `document.body`. */
export function isInviteSearchMenuTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest("[data-invite-search-menu]"))
}

/** Select, Popover, Menubar, or nested Dialog content — keep the parent modal open. */
export function isRadixPortaledOverlayTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  if (isRadixSelectViewportTarget(target) || isRadixPopoverContentTarget(target)) return true
  if (isInviteSearchMenuTarget(target)) return true
  return Boolean(
    target.closest("[data-radix-menubar-content]") ||
      target.closest("[data-radix-dropdown-menu-content]") ||
      target.closest("[data-radix-dialog-content]")
  )
}

/**
 * Limpa `pointer-events: none` no `body` quando o scroll-lock do Radix fica preso
 * (ex.: Escape fecha Select + Dialog ao mesmo tempo).
 */
export function releaseStuckBodyPointerEvents(): void {
  if (typeof document === "undefined") return
  const openDialogs = document.querySelectorAll('[data-radix-dialog-content][data-state="open"]')
  if (openDialogs.length > 0) return
  document.body.style.pointerEvents = ""
  document.body.style.overflow = ""
  document.body.removeAttribute("data-scroll-locked")
}

export function hasStackedRadixDialogs(): boolean {
  if (typeof document === "undefined") return false
  return document.querySelectorAll('[data-radix-dialog-content][data-state="open"]').length > 1
}

/** Handlers para `DialogContent` com `SelectInput` / `SearchPopover` portaled. */
export function getDialogNestedOverlayDismissProps() {
  return {
    onPointerDownOutside: (event: Event) => {
      if (
        (isRadixPortaledOverlayTarget(event.target) && !isDialogOverlayTarget(event.target)) ||
        hasStackedRadixDialogs()
      ) {
        event.preventDefault()
      }
    },
    onInteractOutside: (event: Event) => {
      if (
        (isRadixPortaledOverlayTarget(event.target) && !isDialogOverlayTarget(event.target)) ||
        hasStackedRadixDialogs()
      ) {
        event.preventDefault()
      }
    },
    onFocusOutside: (event: Event) => {
      if (
        isRadixPopoverContentTarget(event.target) ||
        isInviteSearchMenuTarget(event.target) ||
        hasStackedRadixDialogs()
      ) {
        event.preventDefault()
      }
    },
  }
}

function isDialogOverlayTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest("[data-radix-dialog-overlay]"))
}
