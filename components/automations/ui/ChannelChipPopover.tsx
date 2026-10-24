"use client"

import { ArrowDown2 } from "iconsax-react"
import { cn } from "@/lib/utils"
import { channelLabelKey } from "components/automations/ui/ChannelFilter"
import { CHANNEL_DOT, ChannelPicker } from "components/automations/ui/ChannelPicker"
import type { AutomationsTFn } from "components/automations/ui/useAutomationsT"
import { Popover, PopoverContent, PopoverTrigger } from "components/ui/popover"
import type { EditorContextData } from "lib/automations/editorContext"
import { type ChannelSelection, selectedChannels } from "lib/automations/editorOps"
import type { AutomationChannel } from "lib/automations/types"

type Props = {
  value: ChannelSelection
  onChange: (next: ChannelSelection) => void
  sessions: EditorContextData["sessions"]
  t: AutomationsTFn
  /** Chip caption ("Channels") and the text shown when nothing is selected. */
  label: string
  noneLabel: string
  /** Optional heading inside the popover. */
  title?: string
  disabledChannels?: AutomationChannel[]
  /** Advanced automations always run on explicit accounts: there is no "all accounts" default. */
  requireAccount?: boolean
}

/**
 * Header "Channels" chip shared by the rule editor and the bot builder: the selected channels as colored
 * dots, opening the channel + account picker. Always enabled, whatever the document's root looks like.
 *
 * The trigger is a plain `PopoverTrigger` on purpose: wrapping the DS `Button` with `asChild` lets Radix' Slot
 * mangle the Button's `style="outline"` prop into an object and drops the chip's look.
 */
export function ChannelChipPopover({ value, onChange, sessions, t, label, noneLabel, title, disabledChannels, requireAccount }: Props) {
  const list = selectedChannels(value)
  return (
    <Popover>
      <PopoverTrigger
        type="button"
        aria-label={label}
        className={cn(
          "flex h-8 items-center gap-2 rounded border bg-white px-2.5 text-body-13 text-neutral-700 transition-colors hover:bg-neutral-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary data-[state=open]:bg-neutral-10",
          list.length === 0 ? "border-warning" : "border-neutral-50"
        )}
      >
        <span className="text-neutral-400">{label}</span>
        {list.length === 0 ? (
          <span className="font-semibold text-warning-darkest">{noneLabel}</span>
        ) : (
          list.map((c) => (
            <span key={c} className="flex items-center gap-1 font-semibold">
              <span className={cn("size-2 rounded-full", CHANNEL_DOT[c])} aria-hidden />
              {t(channelLabelKey(c))}
            </span>
          ))
        )}
        <ArrowDown2 size={12} aria-hidden />
      </PopoverTrigger>
      <PopoverContent align="start" className="z-[600] max-h-[70vh] w-[420px] max-w-[92vw] overflow-y-auto">
        {title ? <p className="mb-3 text-body-14 font-semibold text-neutral-900">{title}</p> : null}
        <ChannelPicker value={value} onChange={onChange} sessions={sessions} t={t} disabledChannels={disabledChannels} requireAccount={requireAccount} />
      </PopoverContent>
    </Popover>
  )
}
