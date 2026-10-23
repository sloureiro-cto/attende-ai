"use client"

import { User } from "iconsax-react"
import { Instagram, MessageCircle, MessageSquare } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import type { InboxChannel } from "lib/bots-app/inbox/model"
import type { AttendeInboxKey } from "lib/i18n/translations/attende/inbox"

const CHANNEL_META: Record<InboxChannel, { Icon: typeof MessageCircle; tone: string; labelKey: AttendeInboxKey }> = {
  whatsapp: { Icon: MessageCircle, tone: "bg-primary-clean text-primary-dark", labelKey: "channelWhatsapp" },
  instagram: { Icon: Instagram, tone: "bg-info-clean text-info-darkest", labelKey: "channelInstagram" },
  sms: { Icon: MessageSquare, tone: "bg-neutral-10 text-neutral-600", labelKey: "channelSms" },
}

export const channelLabelKey = (channel: InboxChannel): AttendeInboxKey => CHANNEL_META[channel].labelKey

/** Small channel mark. Decorative: the channel is named in text wherever it matters. */
export function ChannelMark({ channel, className }: { channel: InboxChannel; className?: string }) {
  const { Icon, tone } = CHANNEL_META[channel]
  return (
    <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-md", tone, className)} aria-hidden>
      <Icon className="size-3" />
    </span>
  )
}

const AVATAR_TONES = [
  "bg-primary-clean text-primary-dark",
  "bg-info-clean text-info-darkest",
  "bg-warning-clean text-warning-darkest",
  "bg-error-clean text-error-darkest",
  "bg-secondary-clean text-neutral-700",
]

/** Initials from the words that start with a letter; `null` for a phone number or nothing (a person icon is shown). */
export function initialsOf(name: string | null): string | null {
  const parts = (name ?? "")
    .replace(/^@/, "")
    .trim()
    .split(/[\s._-]+/)
    .filter((p) => /^\p{L}/u.test(p))
  if (parts.length === 0) return null
  const first = Array.from(parts[0]!)[0] ?? ""
  const second = parts.length > 1 ? (Array.from(parts[parts.length - 1]!)[0] ?? "") : ""
  return `${first}${second}`.toUpperCase()
}

function toneIndex(seed: string): number {
  let h = 0
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return h % AVATAR_TONES.length
}

type AvatarProps = {
  name: string | null
  seed: string
  url?: string | null
  size?: "md" | "lg"
  /** Shows the channel as a small badge on the avatar's corner. */
  channel?: InboxChannel
}

/** Contact picture when it loads, otherwise stable initials on a tinted tile (expired WhatsApp photo URLs fall back too). */
export function ContactAvatar({ name, seed, url, size = "md", channel }: AvatarProps) {
  // Remembers which URL failed, so a new picture for the same contact is tried again.
  const [brokenUrl, setBrokenUrl] = useState<string | null>(null)
  const broken = Boolean(url) && brokenUrl === url
  const dimension = size === "lg" ? "size-14 text-body-16" : "size-[38px] text-body-12"
  const face =
    url && !broken ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        className={cn("rounded-full object-cover", dimension)}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setBrokenUrl(url)}
      />
    ) : (
      <span className={cn("flex items-center justify-center rounded-full font-semibold", dimension, AVATAR_TONES[toneIndex(seed)])}>
        {initialsOf(name) ?? <User size={size === "lg" ? 24 : 18} variant="Bold" aria-hidden />}
      </span>
    )
  return (
    <span className="relative shrink-0" aria-hidden>
      {face}
      {channel && <ChannelMark channel={channel} className="absolute -bottom-0.5 -right-0.5 size-[18px] rounded-full ring-2 ring-white" />}
    </span>
  )
}
