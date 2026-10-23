"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import type { AutomationChannel } from "lib/automations/types"
import { type BotsLine, LINE_CHANNELS } from "lib/bots-app/lines"
import { LINE_CHANNEL_KEY } from "./lineMeta"
import { BOTS_ROUTES } from "../brand"
import { useBotsAppT } from "../useBotsAppT"

/** Channel filter as real links (shareable, back-button friendly): /lines, /lines/whatsapp, ... */
export function ChannelTabs({ active, lines }: { active: AutomationChannel | null; lines: BotsLine[] }) {
  const { t } = useBotsAppT()
  const count = (channel: AutomationChannel) => lines.filter((l) => l.channel === channel).length
  const items: Array<{ id: AutomationChannel | null; href: string; label: string; n: number }> = [
    { id: null, href: BOTS_ROUTES.lines, label: t("linesFilterAll"), n: lines.length },
    ...LINE_CHANNELS.map((c) => ({ id: c, href: `${BOTS_ROUTES.lines}/${c}`, label: t(LINE_CHANNEL_KEY[c]), n: count(c) })),
  ]
  return (
    <nav aria-label={t("linesFilterAria")} className="flex w-fit max-w-full items-center gap-0.5 overflow-x-auto rounded-xl border border-neutral-50 bg-neutral-10 p-1">
      {items.map((item) => {
        const isActive = item.id === active
        return (
          <Link
            key={item.id ?? "all"}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-body-13 font-medium no-underline transition-colors",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary",
              isActive ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-600 hover:bg-white/60 hover:text-neutral-900"
            )}
          >
            {item.label}
            <span className="text-body-12 tabular-nums text-neutral-500">{item.n}</span>
          </Link>
        )
      })}
    </nav>
  )
}
