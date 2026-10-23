export const EXCLUSIVE_OVERLAY_TRIGGER_ATTR = "data-exclusive-overlay-trigger"
export const EXCLUSIVE_OVERLAY_CONTENT_ATTR = "data-exclusive-overlay-content"

export type ExclusiveOverlayEntry = {
  close: () => void
  getTriggers: () => Element[]
  getContents: () => Element[]
}

export type DismissOutsideResult = {
  closedSomething: boolean
  hitExclusiveTrigger: boolean
}

type StoredEntry = ExclusiveOverlayEntry & { open: boolean }

function isTargetInsideContent(content: Element, target: Element): boolean {
  if (content.contains(target)) return true
  const wrapper = content.closest("[data-radix-popper-content-wrapper]")
  return Boolean(wrapper?.contains(target))
}

function entryContainsTarget(entry: ExclusiveOverlayEntry, target: Element): boolean {
  if (entry.getTriggers().some((trigger) => trigger.contains(target))) return true
  return entry.getContents().some((content) => isTargetInsideContent(content, target))
}

function isAncestorEntry(ancestor: ExclusiveOverlayEntry, descendant: ExclusiveOverlayEntry): boolean {
  return descendant.getTriggers().some((trigger) => ancestor.getContents().some((content) => content.contains(trigger)))
}

/** Radix Select is not always registered; keep parent overlays open while choosing an option. */
const TRANSIENT_FLOATING_SELECTOR = "[data-radix-select-content], [data-radix-select-viewport]"

/** One open floating layer at a time, except nested overlays whose trigger sits inside another overlay. */
export function createExclusiveOverlayRegistry() {
  const entries = new Map<string, StoredEntry>()

  function closeSiblings(id: string) {
    const incoming = entries.get(id)
    const triggers = incoming?.getTriggers() ?? []
    for (const [otherId, other] of entries) {
      if (otherId === id || !other.open) continue
      const contents = other.getContents()
      if (triggers.some((trigger) => contents.some((content) => content.contains(trigger)))) continue
      other.open = false
      other.close()
    }
  }

  return {
    register(id: string, entry: ExclusiveOverlayEntry) {
      const previous = entries.get(id)
      entries.set(id, { ...entry, open: previous?.open ?? false })
      return () => {
        entries.delete(id)
      }
    },
    setOpen(id: string, open: boolean) {
      const entry = entries.get(id)
      if (entry) entry.open = open
    },
    activate(id: string) {
      const incoming = entries.get(id)
      if (incoming) incoming.open = true
      closeSiblings(id)
    },
    dismissOutside(target: Element): DismissOutsideResult {
      const hitExclusiveTrigger = Boolean(target.closest(`[${EXCLUSIVE_OVERLAY_TRIGGER_ATTR}]`))
      if (target.closest(TRANSIENT_FLOATING_SELECTOR)) {
        return { closedSomething: false, hitExclusiveTrigger }
      }

      const keep = new Set<string>()
      for (const [id, entry] of entries) {
        if (entry.open && entryContainsTarget(entry, target)) keep.add(id)
      }

      let grew = true
      while (grew) {
        grew = false
        for (const [id, entry] of entries) {
          if (keep.has(id) || !entry.open) continue
          for (const keptId of keep) {
            const kept = entries.get(keptId)
            if (kept && isAncestorEntry(entry, kept)) {
              keep.add(id)
              grew = true
              break
            }
          }
        }
      }

      let closedSomething = false
      for (const [id, entry] of entries) {
        if (!entry.open || keep.has(id)) continue
        entry.open = false
        entry.close()
        closedSomething = true
      }

      return { closedSomething, hitExclusiveTrigger }
    },
  }
}

export type ExclusiveOverlayRegistry = ReturnType<typeof createExclusiveOverlayRegistry>

function queryExclusiveOverlayElements(attr: string, id: string): Element[] {
  if (typeof document === "undefined") return []
  return Array.from(document.querySelectorAll(`[${attr}]`)).filter((el) => el.getAttribute(attr) === id)
}

export function queryExclusiveOverlayTriggers(id: string): Element[] {
  return queryExclusiveOverlayElements(EXCLUSIVE_OVERLAY_TRIGGER_ATTR, id)
}

export function queryExclusiveOverlayTrigger(id: string): Element | null {
  return queryExclusiveOverlayTriggers(id)[0] ?? null
}

export function queryExclusiveOverlayContents(id: string): Element[] {
  return queryExclusiveOverlayElements(EXCLUSIVE_OVERLAY_CONTENT_ATTR, id)
}
