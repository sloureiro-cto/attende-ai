"use client"

import { Profile } from "iconsax-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { type FunnelColumn, initials } from "lib/attende/funnel/model"
import { stageLabel } from "lib/attende/funnel/stageNames"
import type { ConversationHandling, FunnelChannel, FunnelStage, StageKind } from "lib/attende/funnel/types"
import type { AttendeFunnelKey } from "lib/i18n/translations/attende/funnel"
import type { AttendeFunnelT } from "./useAttendeFunnelT"

export const CHANNEL_KEY: Record<FunnelChannel, AttendeFunnelKey> = { whatsapp: "channelWhatsapp", instagram: "channelInstagram", sms: "channelSms" }
export const HANDLING_KEY: Record<ConversationHandling, AttendeFunnelKey> = {
  ai_agent: "handlingAiAgent",
  qualifying: "handlingQualifying",
  human: "handlingHumanLabel",
  closed: "handlingClosed",
}
export const KIND_KEY: Record<StageKind, AttendeFunnelKey> = { open: "kindOpen", won: "kindWon", lost: "kindLost" }

export const COLUMN_KEY: Record<FunnelColumn, AttendeFunnelKey> = {
  contact: "colContact",
  stage: "colStage",
  deal: "colDeal",
  owner: "colOwner",
  labels: "colLabels",
  source: "colSource",
  lastMessage: "colLastMessage",
  updated: "colUpdated",
}

const KIND_CLASS: Record<StageKind, string> = {
  open: "border-neutral-50 bg-white text-neutral-800",
  won: "border-success-light bg-success-clean text-success-darkest",
  lost: "border-error-light bg-error-clean text-error-darkest",
}

/** Only `#rgb` / `#rrggbb` colours from the backend are used in styles (they are user-controlled data). */
export const safeColor = (color: string | null | undefined): string | undefined => (color && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color) ? color : undefined)

/** Only web and same-origin image URLs are rendered; anything else falls back to the initials. */
const safeImage = (url: string | null | undefined): string | null => (url && /^(https?:\/\/|\/(?!\/))/i.test(url.trim()) ? url.trim() : null)

/**
 * Round avatar: the photo when there is one and it loads, otherwise the initials of the name, otherwise a person icon
 * (a contact known only by a phone number has no initials). Decorative: the name is always next to it.
 */
export function Avatar({ name, url, size = 32 }: { name: string | null | undefined; url?: string | null; size?: number }) {
  const src = safeImage(url)
  // Remember which URL failed, so a new URL (another row, an updated photo) gets its own try.
  const [failed, setFailed] = useState<string | null>(null)
  const text = initials(name)
  return (
    <span
      aria-hidden
      data-testid="avatar"
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-clean text-body-11 font-semibold text-primary-dark"
      style={{ width: size, height: size }}
    >
      {src && failed !== src ? (
        // eslint-disable-next-line @next/next/no-img-element -- avatars come from arbitrary hosts
        <img src={src} alt="" referrerPolicy="no-referrer" className="size-full object-cover" onError={() => setFailed(src)} />
      ) : (
        text || <Profile size={Math.round(size * 0.55)} variant="Bold" />
      )}
    </span>
  )
}

/** A stage: the seeded defaults are translated, a stage the user named is shown as written. */
export function StageBadge({ stage, t, className }: { stage: FunnelStage | null; t: AttendeFunnelT; className?: string }) {
  if (!stage) return <span className={cn("text-body-13 text-neutral-500", className)}>{t("noStage")}</span>
  return (
    <span className={cn("inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-body-12 font-medium", KIND_CLASS[stage.kind] ?? KIND_CLASS.open, className)}>
      <span aria-hidden className="size-2 shrink-0 rounded-full bg-neutral-300" style={{ backgroundColor: safeColor(stage.color) }} />
      <span className="truncate">{stageLabel(stage, t)}</span>
    </span>
  )
}

export function LabelPill({ text, color }: { text: string; color: string | null }) {
  return (
    <span className="inline-flex max-w-[140px] items-center gap-1 rounded-md bg-neutral-10 px-1.5 py-0.5 text-body-11 font-medium text-neutral-700">
      <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-neutral-300" style={{ backgroundColor: safeColor(color) }} />
      <span className="truncate">{text}</span>
    </span>
  )
}
