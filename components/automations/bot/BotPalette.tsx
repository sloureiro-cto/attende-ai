"use client"

import { SearchNormal1 } from "iconsax-react"
import { memo, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { useAutomationsT } from "components/automations/ui/useAutomationsT"
import TextInput from "components/TextInput/TextInput"
import type { AdvancedAutomationNodeKind } from "lib/automations/types"
import { PALETTE_GROUPS, UNAVAILABLE_KINDS } from "./botNodeMeta"

export const PALETTE_DRAG_TYPE = "application/x-salesbot-kind"
/** Optional JSON of the preset fields (kept in a second type so plain `kind` drags stay valid). */
export const PALETTE_PRESET_DRAG_TYPE = "application/x-salesbot-preset"

type Props = {
  onAdd: (kind: AdvancedAutomationNodeKind, preset?: Record<string, unknown>) => void
  disabled?: boolean
}

/** Floating step list: click adds at the center of the canvas, drag drops where released. */
export const BotPalette = memo(function BotPalette({ onAdd, disabled }: Props) {
  const { t } = useAutomationsT()
  const [query, setQuery] = useState("")

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    return PALETTE_GROUPS.map((g) => ({
      ...g,
      items: g.items.filter((i) => !q || t(i.labelKey).toLowerCase().includes(q)),
    })).filter((g) => g.items.length > 0)
  }, [query, t])

  return (
    <aside
      aria-label={t("advancedAutomationPaletteTitle")}
      className="absolute inset-y-4 left-4 z-10 flex w-[232px] flex-col overflow-hidden rounded-lg border border-neutral-border bg-white shadow-lg"
    >
      <div className="flex flex-col gap-2.5 border-b border-neutral-50 px-3.5 pb-2.5 pt-3.5">
        <h2 className="text-body-14 font-semibold text-neutral-800">{t("advancedAutomationPaletteTitle")}</h2>
        <TextInput
          type="search"
          size="small"
          startIcon={<SearchNormal1 size={14} aria-hidden />}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label={t("advancedAutomationPaletteSearch")}
          placeholder={t("advancedAutomationPaletteSearch")}
          hideErrorMessage
          removeOptionalText
        />
      </div>
      <div className="flex flex-1 flex-col gap-px overflow-y-auto px-2 pb-3 pt-1">
        {groups.length === 0 ? (
          <p className="px-1.5 py-6 text-center text-body-12 text-neutral-400">{t("advancedAutomationPaletteEmpty")}</p>
        ) : null}
        {groups.map((g) => (
          <div key={g.titleKey} className="flex flex-col gap-px">
            <div className="px-1.5 pb-1 pt-3 text-body-12 font-semibold text-neutral-400">{t(g.titleKey)}</div>
            {g.items.map((item) =>
              UNAVAILABLE_KINDS.has(item.kind) ? (
                // The runtime cannot run this step yet: listed (so people know it exists) but not addable.
                <div
                  key={item.id}
                  aria-disabled
                  className="flex min-h-8 w-full cursor-not-allowed items-center gap-2.5 rounded px-1.5 py-1 text-left text-body-13 text-neutral-600"
                >
                  <span className={cn("size-[22px] shrink-0 rounded border opacity-50", g.swatch)} aria-hidden />
                  <span className="flex min-w-0 flex-col">
                    <span>{t(item.labelKey)}</span>
                    <span className="text-body-11 text-neutral-500">{t("advancedAutomationStepUnavailable")}</span>
                  </span>
                </div>
              ) : (
                <button
                  key={item.id}
                  type="button"
                  disabled={disabled}
                  draggable={!disabled}
                  onDragStart={(e) => {
                    e.dataTransfer.setData(PALETTE_DRAG_TYPE, item.kind)
                    if (item.preset) e.dataTransfer.setData(PALETTE_PRESET_DRAG_TYPE, JSON.stringify(item.preset))
                    e.dataTransfer.effectAllowed = "move"
                  }}
                  onClick={() => onAdd(item.kind, item.preset)}
                  className="flex h-8 w-full cursor-grab items-center gap-2.5 rounded px-1.5 text-left text-body-13 text-neutral-600 transition-colors hover:bg-neutral-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary active:cursor-grabbing disabled:opacity-50"
                >
                  <span className={cn("size-[22px] shrink-0 rounded border", g.swatch)} aria-hidden />
                  {t(item.labelKey)}
                </button>
              )
            )}
          </div>
        ))}
      </div>
    </aside>
  )
})
