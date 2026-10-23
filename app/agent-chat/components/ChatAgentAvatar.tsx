"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"
import { agentBadgeIconSrc, resolveAgentBadgeColor, resolveAgentBadgeIcon } from "lib/agents/agentBadgeIcons"
import { JsynqAiChatLogo } from "./JsynqAiChatLogo"
import { isAgentIconImageUrl, resolveAgentIconForDisplay } from "../lib/chatAgentIcon"

const AVATAR_SIZES = {
  xs: { slot: "size-5", px: 20, logo: 15, emojiText: "text-xs", ring: "ring-1 ring-white" },
  /** Sidebar agent list only — 24×24 */
  sidebar: { slot: "size-6", px: 24, logo: 24, emojiText: "text-sm", ring: "ring-1 ring-white" },
  sm: { slot: "size-7", px: 28, logo: 20, emojiText: "text-sm", ring: "ring-1 ring-white" },
  /** Inbox thread bubbles — Figma 32×32 */
  thread: { slot: "size-8", px: 32, logo: 24, emojiText: "text-sm", ring: "ring-2 ring-white" },
  md: { slot: "size-9", px: 36, logo: 36, emojiText: "text-base", ring: "ring-2 ring-white" },
  /** Settings agent binding cards (Figma 40×40). */
  lg: { slot: "size-10", px: 40, logo: 40, emojiText: "text-base", ring: "ring-[2.5px] ring-white" },
} as const

export type ChatAgentAvatarSize = keyof typeof AVATAR_SIZES

type ChatAgentAvatarProps = {
  /** From message metadata or live execution: URL, data URL, or emoji/short text */
  icon?: string | null
  name?: string
  /** Preset size — `md` matches user message avatars in chat (36px). */
  size?: ChatAgentAvatarSize
  className?: string
  imageClassName?: string
  /** Drop the white ring (e.g. when the avatar sits inside a bordered chip). */
  hideRing?: boolean
  badgeIcon?: string
  badgeColor?: string
  /** Agent identity badge overlay (replaces legacy online dot). */
  showBadge?: boolean
}

/**
 * Renders agent avatar: circular photo/emoji when configured, else product logo.
 */
export function ChatAgentAvatar({
  icon,
  name,
  size = "md",
  className,
  imageClassName,
  hideRing = false,
  badgeIcon,
  badgeColor,
  showBadge = false,
}: ChatAgentAvatarProps) {
  const raw = resolveAgentIconForDisplay(icon) ?? ""
  const preset = AVATAR_SIZES[size]
  const slotClass = cn(preset.slot, "shrink-0", className)
  const ringClass = hideRing ? undefined : preset.ring
  const resolvedBadgeIcon = resolveAgentBadgeIcon(badgeIcon)
  const resolvedBadgeColor = resolveAgentBadgeColor(badgeColor)

  const avatarNode = (() => {
    if (raw && isAgentIconImageUrl(raw)) {
      return (
        <Image
          src={raw}
          alt={name ?? ""}
          className={cn(preset.slot, "shrink-0 rounded-full object-cover", ringClass, imageClassName)}
          width={preset.px}
          height={preset.px}
          unoptimized={raw.startsWith("data:") || raw.startsWith("blob:")}
        />
      )
    }
    if (raw) {
      return (
        <span
          className={cn(
            "bg-muted flex min-h-0 min-w-0 items-center justify-center overflow-hidden rounded-full text-center leading-none",
            !hideRing && "border border-[var(--jsynq-chat-border)]",
            preset.slot,
            ringClass,
            preset.emojiText
          )}
          title={name}
          aria-hidden
        >
          {raw}
        </span>
      )
    }
    return <JsynqAiChatLogo size={preset.logo} className={preset.slot} />
  })()

  return (
    <div className={cn("relative flex items-center justify-center", slotClass)}>
      {avatarNode}
      {showBadge ? (
        <span
          className={cn(
            "pointer-events-none absolute flex items-center justify-center rounded-full bg-white shadow-[0_1px_2px_rgba(23,33,58,0.06)]",
            size === "sidebar" ? "bottom-0 right-0 size-2.5 p-px" : "-bottom-0.5 -right-0.5 size-[14px] p-[2px]"
          )}
          aria-hidden
        >
          <span
            className={cn(
              "flex items-center justify-center rounded-full",
              size === "sidebar" ? "size-2" : "size-[10px]"
            )}
            style={{ backgroundColor: resolvedBadgeColor }}
          >
            <img
              alt=""
              src={agentBadgeIconSrc(resolvedBadgeIcon)}
              width={size === "sidebar" ? 6 : 7}
              height={size === "sidebar" ? 6 : 7}
              className={cn("object-contain brightness-0 invert", size === "sidebar" ? "size-1.5" : "size-[7px]")}
            />
          </span>
        </span>
      ) : null}
    </div>
  )
}
