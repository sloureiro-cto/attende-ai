"use client"

import { Flash, Profile, Send2 } from "iconsax-react"
import { memo } from "react"
import { cn } from "@/lib/utils"
import { formatDateTime, formatRelative } from "lib/attende/format"
import { displayNameOf, type InboxItem } from "lib/bots-app/inbox/model"
import { ContactAvatar } from "./atoms"
import type { AttendeInboxT } from "./useAttendeInboxT"

type Props = {
  item: InboxItem
  selected: boolean
  language: string
  t: AttendeInboxT
  onSelect: (item: InboxItem) => void
}

/** One conversation in the list: who, when, the last line, and who handles it (AI active / human handling). */
export const ConversationRow = memo(function ConversationRow({ item, selected, language, t, onSelect }: Props) {
  const name = displayNameOf(item) ?? t("untitledContact")
  const preview = item.preview?.trim() ? item.preview : null
  // The list does not say who sent the last outbound message (team or AI), only that it went out.
  const sentByUs = Boolean(preview) && item.lastDirection === "outbound"
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(item)}
        aria-current={selected ? "true" : undefined}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-[10px] px-2 py-2.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary",
          selected ? "bg-primary-clean" : "hover:bg-neutral-10"
        )}
      >
        <ContactAvatar name={displayNameOf(item)} seed={item.conversationId} url={item.avatarUrl} channel={item.channel} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex items-baseline gap-2">
            <span className={cn("min-w-0 flex-1 truncate text-[13.5px]", item.unread ? "font-bold text-neutral-900" : "font-semibold text-neutral-800")}>{name}</span>
            {item.lastAt && (
              <time
                dateTime={item.lastAt}
                title={formatDateTime(item.lastAt, language)}
                className={cn("shrink-0 text-body-11", item.unread ? "font-bold text-primary-dark" : "text-neutral-500")}
              >
                {formatRelative(item.lastAt, language)}
              </time>
            )}
          </span>
          <span className="flex items-center gap-1.5">
            <span className={cn("flex min-w-0 flex-1 items-center gap-1 text-[12.5px]", item.unread ? "text-neutral-800" : "text-neutral-500")}>
              {sentByUs && (
                <>
                  <Send2 size={11} className="shrink-0" aria-hidden />
                  <span className="sr-only">{t("lastMessageSent")}</span>
                </>
              )}
              <span className="truncate">{preview ?? t("noMessagesYet")}</span>
            </span>
            {item.handling === "ai" && !item.isGroup && (
              <span className="inline-flex shrink-0 items-center gap-0.5 rounded bg-primary-clean px-1.5 py-px text-[10px] font-bold tracking-wide text-primary-dark" title={t("handlingAiChip")}>
                <Flash size={9} variant="Bold" aria-hidden />
                <span aria-hidden>{t("rowAi")}</span>
                <span className="sr-only">{t("handlingAiChip")}</span>
              </span>
            )}
            {item.handling === "human" && !item.isGroup && (
              <span className="inline-flex shrink-0 items-center gap-0.5 rounded bg-info-clean px-1.5 py-px text-[10px] font-bold tracking-wide text-info-darkest" title={t("handlingHumanChip")}>
                <Profile size={9} variant="Bold" aria-hidden />
                <span aria-hidden>{t("rowHuman")}</span>
                <span className="sr-only">{t("handlingHumanChip")}</span>
              </span>
            )}
            {item.unread && <span className="size-2.5 shrink-0 rounded-full bg-primary" role="img" aria-label={t("filterUnread")} title={t("filterUnread")} />}
          </span>
        </span>
      </button>
    </li>
  )
})
