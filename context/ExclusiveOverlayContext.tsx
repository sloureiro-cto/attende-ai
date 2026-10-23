"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react"
import {
  createExclusiveOverlayRegistry,
  EXCLUSIVE_OVERLAY_CONTENT_ATTR,
  EXCLUSIVE_OVERLAY_TRIGGER_ATTR,
  queryExclusiveOverlayContents,
  queryExclusiveOverlayTriggers,
  type ExclusiveOverlayRegistry,
} from "lib/overlays/exclusiveOverlayRegistry"

const ExclusiveOverlayRegistryContext = createContext<ExclusiveOverlayRegistry | null>(null)
export const ExclusiveOverlayIdContext = createContext<string | null>(null)

export function ExclusiveOverlayProvider({ children }: { children: ReactNode }) {
  const registry = useMemo(() => createExclusiveOverlayRegistry(), [])

  useEffect(() => {
    let eatClick = false

    const eventTarget = (event: Event): Element | null => {
      const target = event.target
      if (target instanceof Element) return target
      if (target instanceof Node) return target.parentElement
      return null
    }

    const onPointerDown = (event: PointerEvent) => {
      eatClick = false
      const target = eventTarget(event)
      if (!target) return
      const { closedSomething, hitExclusiveTrigger } = registry.dismissOutside(target)
      // Eat the click so it does not activate controls under the layer. Do not eat
      // when the pointer is on another overlay trigger — that click should open it.
      if (closedSomething && !hitExclusiveTrigger) {
        eatClick = true
        event.stopPropagation()
      }
    }

    const onClick = (event: MouseEvent) => {
      if (!eatClick) return
      eatClick = false
      event.stopPropagation()
      event.preventDefault()
    }

    const onPointerUp = () => {
      window.setTimeout(() => {
        eatClick = false
      }, 0)
    }

    document.addEventListener("pointerdown", onPointerDown, true)
    document.addEventListener("click", onClick, true)
    document.addEventListener("pointerup", onPointerUp, true)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true)
      document.removeEventListener("click", onClick, true)
      document.removeEventListener("pointerup", onPointerUp, true)
    }
  }, [registry])

  return (
    <ExclusiveOverlayRegistryContext.Provider value={registry}>{children}</ExclusiveOverlayRegistryContext.Provider>
  )
}

export function useExclusiveOverlayId(): string | null {
  return useContext(ExclusiveOverlayIdContext)
}

export function exclusiveOverlayTriggerProps(id: string | null): Record<string, string> | undefined {
  if (!id) return undefined
  return { [EXCLUSIVE_OVERLAY_TRIGGER_ATTR]: id }
}

export function exclusiveOverlayContentProps(id: string | null): Record<string, string> | undefined {
  if (!id) return undefined
  return { [EXCLUSIVE_OVERLAY_CONTENT_ATTR]: id }
}

/** `PopoverAnchor virtualRef` does not render a DOM node — bind the real element so nested dismiss still works. */
export function useExclusiveOverlayVirtualAnchor(
  virtualRef: RefObject<{ getBoundingClientRect(): DOMRect } | null> | undefined
) {
  const id = useExclusiveOverlayId()
  useLayoutEffect(() => {
    if (!id || !virtualRef) return
    const node = virtualRef.current
    if (!(node instanceof Element)) return
    node.setAttribute(EXCLUSIVE_OVERLAY_TRIGGER_ATTR, id)
    return () => {
      if (node.getAttribute(EXCLUSIVE_OVERLAY_TRIGGER_ATTR) === id) {
        node.removeAttribute(EXCLUSIVE_OVERLAY_TRIGGER_ATTR)
      }
    }
  }, [id, virtualRef])
}

type OpenChange = (open: boolean) => void

/**
 * Forces sibling Radix popovers/menus to close when this overlay opens.
 * Nested overlays (trigger inside another overlay's content) stay open.
 */
export function useExclusiveOverlayBinding(
  overlayId: string,
  openProp: boolean | undefined,
  defaultOpen: boolean | undefined,
  onOpenChange: OpenChange | undefined
): { open?: boolean; onOpenChange?: OpenChange } {
  const registry = useContext(ExclusiveOverlayRegistryContext)
  const [uncontrolledOpen, setUncontrolledOpen] = useState(Boolean(defaultOpen))
  const isControlled = openProp !== undefined
  const open = isControlled ? Boolean(openProp) : uncontrolledOpen

  const onOpenChangeRef = useRef(onOpenChange)
  onOpenChangeRef.current = onOpenChange

  const close = useCallback(() => {
    if (!isControlled) setUncontrolledOpen(false)
    onOpenChangeRef.current?.(false)
  }, [isControlled])

  useEffect(() => {
    if (!registry) return
    return registry.register(overlayId, {
      close,
      getTriggers: () => queryExclusiveOverlayTriggers(overlayId),
      getContents: () => queryExclusiveOverlayContents(overlayId),
    })
  }, [registry, overlayId, close])

  useEffect(() => {
    if (!registry) return
    if (open) registry.activate(overlayId)
    else registry.setOpen(overlayId, false)
  }, [registry, overlayId, open])

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (next) registry?.activate(overlayId)
      if (!isControlled) setUncontrolledOpen(next)
      onOpenChangeRef.current?.(next)
    },
    [registry, overlayId, isControlled]
  )

  if (!registry) return {}

  return { open, onOpenChange: handleOpenChange }
}

export function ExclusiveOverlayRoot({
  open,
  defaultOpen,
  onOpenChange,
  children,
}: {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: OpenChange
  children: (binding: { open?: boolean; onOpenChange?: OpenChange }) => ReactNode
}) {
  const id = useId()
  const binding = useExclusiveOverlayBinding(id, open, defaultOpen, onOpenChange)
  return <ExclusiveOverlayIdContext.Provider value={id}>{children(binding)}</ExclusiveOverlayIdContext.Provider>
}
