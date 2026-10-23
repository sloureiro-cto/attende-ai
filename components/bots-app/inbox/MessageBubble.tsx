"use client"

import { Danger, DocumentText1, Flash } from "iconsax-react"
import { memo } from "react"
import { cn } from "@/lib/utils"
import { formatTime } from "lib/attende/format"
import type { ThreadMessage } from "lib/bots-app/inbox/model"
import type { AttendeInboxKey } from "lib/i18n/translations/attende/inbox"
import type { AttendeInboxT } from "./useAttendeInboxT"

type Props = {
  message: ThreadMessage
  /** Same author a moment ago: hide the author line and tighten the spacing. */
  grouped: boolean
  language: string
  t: AttendeInboxT
  onRetry: (clientId: string) => void | Promise<void>
  onDiscard: (clientId: string) => void
}

const STATUS_KEY: Record<ThreadMessage["status"], AttendeInboxKey> = {
  sending: "statusSending",
  sent: "statusSent",
  delivered: "statusDelivered",
  read: "statusRead",
  failed: "statusFailed",
}

/** Status words are always written out (never ticks alone); a local send that failed is "not sent", not "not delivered". */
function statusLabel(message: ThreadMessage, t: AttendeInboxT): string {
  if (message.clientId && message.status === "failed") return t("statusNotSent")
  return t(STATUS_KEY[message.status])
}

/** Who wrote it, when the API says so. `unknown` (an outbound row without a sender) gets no label rather than a guess. */
function authorLabel(message: ThreadMessage, t: AttendeInboxT): string | null {
  if (message.author === "contact") return t("authorContact")
  if (message.author === "ai") return message.authorName ? t("authorAiNamed", { name: message.authorName }) : t("authorAi")
  if (message.author === "automation") return t("authorAutomation")
  if (message.author === "human") return message.authorName ?? t("authorHuman")
  return null
}

function Media({ message, t }: { message: ThreadMessage; t: AttendeInboxT }) {
  if (!message.mediaType) return null
  if (message.mediaType === "image" && message.mediaUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={message.mediaUrl} alt={t("attachment")} className="mb-1 max-h-64 rounded-lg object-cover" loading="lazy" />
  }
  return (
    <a
      href={message.mediaUrl ?? undefined}
      target="_blank"
      rel="noopener noreferrer"
      className="mb-1 flex items-center gap-2 rounded-lg bg-black/5 px-2.5 py-2 text-body-13 text-inherit no-underline"
    >
      <DocumentText1 size={16} aria-hidden />
      <span className="truncate">{message.fileName ?? t("attachment")}</span>
    </a>
  )
}

/**
 * One message. Customer on the left (surface), AI replies green with a lightning mark, team replies blue; the author is
 * also written (visibly on the first of a group, always for screen readers), so color is never the only cue.
 */
export const MessageBubble = memo(function MessageBubble({ message, grouped, language, t, onRetry, onDiscard }: Props) {
  const outbound = message.direction === "outbound"
  const failed = message.status === "failed"
  const localFailed = failed && Boolean(message.clientId)
  const author = authorLabel(message, t)
  const machine = message.author === "ai" || message.author === "automation"
  return (
    <div className={cn("flex flex-col", outbound ? "items-end" : "items-start", grouped ? "mt-0.5" : "mt-3")}>
      <div
        className={cn(
          "max-w-[min(85%,34rem)] rounded-[14px] px-[13px] py-[9px] text-body-14 leading-[1.45] sm:max-w-[min(62%,34rem)]",
          !outbound && "rounded-bl-[4px] border border-neutral-50 bg-white text-neutral-900",
          outbound && message.author === "human" && "rounded-br-[4px] bg-info-dark text-white",
          outbound && machine && "rounded-br-[4px] bg-primary-dark text-white",
          outbound && message.author === "unknown" && "rounded-br-[4px] border border-neutral-100 bg-neutral-10 text-neutral-900",
          failed && "ring-2 ring-error-dark",
          message.status === "sending" && "opacity-70"
        )}
      >
        {author && <span className="sr-only">{t("srAuthor", { author })} </span>}
        {message.deleted ? (
          <span className={cn("italic", outbound && message.author !== "unknown" ? "text-white/80" : "text-neutral-500")}>{t("deletedMessage")}</span>
        ) : (
          <>
            <Media message={message} t={t} />
            {message.text && <p className="whitespace-pre-wrap break-words">{message.text}</p>}
          </>
        )}
        <span
          className={cn(
            "mt-1 flex flex-wrap items-center justify-end gap-x-1 text-body-11",
            outbound && message.author !== "unknown" ? "text-white/80" : "text-neutral-500"
          )}
        >
          {!grouped && author && message.author !== "contact" && (
            <>
              {machine && <Flash size={10} variant="Bold" aria-hidden />}
              <span className="font-semibold" aria-hidden>
                {author}
              </span>
              <span aria-hidden>·</span>
            </>
          )}
          <time dateTime={message.at}>{formatTime(message.at, language)}</time>
          {outbound && (
            <>
              <span aria-hidden>·</span>
              <span className={cn("inline-flex items-center gap-0.5", failed && "font-semibold")} title={failed && !localFailed ? t("statusFailedHelp") : undefined}>
                {failed && <Danger size={11} aria-hidden />}
                {statusLabel(message, t)}
              </span>
            </>
          )}
        </span>
      </div>
      {failed && !localFailed && <p className="mt-1 text-body-12 text-error-dark">{t("statusFailedHelp")}</p>}
      {localFailed && (
        <div className="mt-1 flex items-center gap-3 text-body-12" role="alert">
          <span className="flex items-center gap-1 text-error-dark">
            <Danger size={13} aria-hidden />
            {t("sendFailed")}
          </span>
          <button type="button" className="font-semibold text-primary-dark hover:underline" onClick={() => void onRetry(message.clientId!)}>
            {t("retrySend")}
          </button>
          <button type="button" className="text-neutral-600 hover:underline" onClick={() => onDiscard(message.clientId!)}>
            {t("discardFailed")}
          </button>
        </div>
      )}
    </div>
  )
})
