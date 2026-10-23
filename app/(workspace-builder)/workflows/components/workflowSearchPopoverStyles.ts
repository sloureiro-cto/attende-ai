/**
 * Shared SearchPopover / picker visuals aligned with platform patterns
 * (EpicLayout, RoutineFormModal agent picker, soft border, rounded panel).
 */
export const WF_SEARCH_POPOVER_CLASSNAMES = {
  content:
    "max-h-[min(420px,var(--radix-popper-available-height))] min-h-0 rounded-2xl border border-neutral-50 bg-white p-0 shadow-md outline-none",
  container:
    "min-w-[260px] max-w-[min(380px,calc(100vw-2rem))] max-h-[min(400px,var(--radix-popper-available-height))] overflow-y-auto overflow-x-hidden",
  trigger: "w-full min-w-0",
  inputContainer: "border-b border-neutral-50 bg-white",
  itemsContainer: "bg-white",
} as const

/** Trigger button — same shell as RoutineFormModal ROUTINE_AGENT_SEARCH_TRIGGER_CN (neutral-border + hover). */
export const WF_SEARCH_TRIGGER_CLASS =
  "flex h-10 w-full min-w-0 items-center justify-between gap-2 rounded-md border border-neutral-border bg-white px-3 text-left text-xs font-medium text-neutral-800 outline-none transition-colors hover:bg-neutral-10"

export const WF_SEARCH_TRIGGER_DISABLED_CLASS =
  "flex h-10 w-full min-w-0 cursor-not-allowed items-center rounded-md border border-neutral-border bg-neutral-50/90 px-3 text-xs text-neutral-500"

/** Radix Popover panels (filters, variable picker) — match soft cards on the app. */
export const WF_SOFT_POPOVER_PANEL_CLASS = "rounded-2xl border border-neutral-50 bg-white shadow-md outline-none"
