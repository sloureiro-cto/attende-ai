"use client"

import { cn } from "@/lib/utils"
import { useAutomationsT } from "components/automations/ui/useAutomationsT"
import Button from "components/Button/Button"
import type { AutomationChannel } from "lib/automations/types"

export type ChannelFilterValue = AutomationChannel | "all"

const CHANNEL_LABEL_KEYS = {
  whatsapp: "whatsappLiteNav",
  instagram: "instagramLiteNav",
  sms: "smsLiteNav",
} as const

export function channelLabelKey(channel: AutomationChannel) {
  return CHANNEL_LABEL_KEYS[channel]
}

/**
 * Segmented control: a recessed track with the selected segment raised (white + shadow), as in the
 * design. The shared `BtnViewMode` paints its active state with the same grey as this track, which
 * made the selection invisible, so this is built directly on the DS `Button`.
 */
function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T
  options: Array<{ id: T; label: string }>
  onChange: (next: T) => void
  ariaLabel: string
}) {
  return (
    <div role="group" aria-label={ariaLabel} className="flex items-center gap-0.5 rounded-md border border-neutral-50 bg-neutral-10 p-[3px]">
      {options.map((o) => {
        const active = value === o.id
        return (
          <Button
            key={o.id}
            type="button"
            variant="ghost"
            size="small"
            aria-pressed={active}
            onClick={() => onChange(o.id)}
            className={cn(
              "h-7 min-h-7 rounded px-3 py-0 text-body-13",
              active
                ? "bg-white font-semibold text-neutral-900 shadow-sm hover:bg-white active:bg-white"
                : "bg-transparent font-medium text-neutral-500 hover:bg-transparent hover:text-neutral-800 active:bg-transparent"
            )}
          >
            {o.label}
          </Button>
        )
      })}
    </div>
  )
}

/** "All / WhatsApp / Instagram / SMS" (or without "All" when exactly one channel must be picked). */
export function ChannelFilter({
  value,
  onChange,
  hideAll = false,
}: {
  value: ChannelFilterValue
  onChange: (next: ChannelFilterValue) => void
  /** Hide the "All" option (when exactly one channel must be picked). */
  hideAll?: boolean
}) {
  const { t } = useAutomationsT()
  const options: Array<{ id: ChannelFilterValue; label: string }> = [
    { id: "all", label: t("automationsHubChannelAll") },
    { id: "whatsapp", label: t("whatsappLiteNav") },
    { id: "instagram", label: t("instagramLiteNav") },
    { id: "sms", label: t("smsLiteNav") },
  ]
  return (
    <SegmentedControl
      value={value}
      options={options.filter((o) => !(hideAll && o.id === "all"))}
      onChange={onChange}
      ariaLabel={t("automationsHubChannelFilterAria")}
    />
  )
}
