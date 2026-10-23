"use client"

import { ArrowLeft2, Clock, Danger, ProfileCircle, SidebarRight } from "iconsax-react"
import { cn } from "@/lib/utils"
import Button from "components/Button/Button"
import IconButton from "components/IconButton/IconButton"
import { Skeleton } from "components/ui/skeleton"
import { displayNameOf, type HandlingMode, type InboxItem, isWhatsAppWindowClosed, type ThreadMessage, whatsAppWindowRemainingMs } from "lib/bots-app/inbox/model"
import { channelLabelKey } from "./atoms"
import { Composer } from "./Composer"
import { HandlingBar } from "./HandlingBar"
import { MessageList } from "./MessageList"
import type { AttendeInboxT } from "./useAttendeInboxT"
import type { ThreadStatus } from "./useThread"
import { WindowClosedComposer } from "./WindowClosedComposer"
import { EmptyState } from "../ui/EmptyState"

export type PresenceEntry = { userId: string; name: string; state: "viewing" | "typing" }

type Props = {
  item: InboxItem
  transport: string | null
  messages: ThreadMessage[]
  status: ThreadStatus
  hasMore: boolean
  loadingOlder: boolean
  language: string
  t: AttendeInboxT
  announcement: string
  presence: PresenceEntry[]
  /** Take over / return request in flight. */
  handlingPending: Exclude<HandlingMode, "none"> | null
  handlingError: string | null
  panelOpen: boolean
  live: boolean
  onBack: () => void
  /** Wide screens: show / hide the side panel. */
  onTogglePanel: () => void
  /** Phones and tablets: open the contact details as a sheet. */
  onOpenDetails: () => void
  onReload: () => void
  onLoadOlder: () => void
  onSend: (text: string) => void
  onTyping: () => void
  onRetry: (clientId: string) => void | Promise<void>
  onDiscard: (clientId: string) => void
  /** Resolves to whether the backend confirmed the change. */
  onTakeOver: () => Promise<boolean>
  onReturnToAi: () => Promise<boolean>
  /** A template went out (24-hour window closed): refresh the thread. */
  onTemplateSent: () => void
}

function ThreadSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4" aria-hidden>
      {[60, 40, 72, 48, 56].map((w, i) => (
        <div key={i} className={cn("flex", i % 2 ? "justify-end" : "justify-start")}>
          <Skeleton className="h-12 rounded-2xl" style={{ width: `${w}%` }} />
        </div>
      ))}
    </div>
  )
}

/** The open conversation: header, who is answering, the messages and the composer. */
export function ThreadView(props: Props) {
  const { item, transport, messages, status, t, presence, panelOpen } = props
  const name = displayNameOf(item) ?? t("untitledContact")
  const windowClosed = isWhatsAppWindowClosed({ channel: item.channel, transport, lastInboundAt: item.lastInboundAt })
  const windowLeft = windowClosed ? null : whatsAppWindowRemainingMs({ channel: item.channel, transport, lastInboundAt: item.lastInboundAt })
  const aiActive = item.handling === "ai"
  /**
   * Writing while the AI is active takes the conversation over first (and waits for the backend), so the agent and the
   * person never answer together. If taking over fails nothing is sent and the text goes back into the field.
   */
  const send = async (text: string): Promise<boolean> => {
    if (aiActive && !item.isGroup) {
      const ok = await props.onTakeOver()
      if (!ok) return false
    }
    props.onSend(text)
    return true
  }
  const typing = presence.filter((p) => p.state === "typing")
  const viewing = presence.filter((p) => p.state === "viewing")

  return (
    <section className="flex h-full min-h-0 flex-col bg-[rgb(var(--bots-surface))]" aria-label={name}>
      <header className="flex min-h-[60px] flex-wrap items-center gap-2 border-b border-neutral-border bg-white px-2 pb-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] sm:gap-x-3 sm:px-5">
        <IconButton
          className="lg:hidden"
          variant="ghost"
          size="medium"
          aria-label={t("backToList")}
          title={t("backToList")}
          icon={<ArrowLeft2 size={18} />}
          onClick={props.onBack}
        />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[15px] font-semibold leading-tight text-neutral-900">{name}</h2>
          <p className="flex items-center gap-1.5 truncate text-body-12 text-neutral-500">
            <span className="truncate">{t("panelChannelValue", { channel: t(channelLabelKey(item.channel)), line: item.sessionLabel })}</span>
            {typing.length > 0 ? (
              <span className="shrink-0 font-medium text-primary-dark">
                <span aria-hidden>· </span>
                {t("presenceTyping", { name: typing[0]!.name })}
              </span>
            ) : viewing.length > 0 ? (
              <span className="shrink-0">
                <span aria-hidden>· </span>
                {t("presenceViewing", { name: viewing[0]!.name })}
              </span>
            ) : null}
          </p>
        </div>
        {windowClosed ? (
          <span className="inline-flex h-[26px] shrink-0 items-center gap-1.5 rounded-full bg-warning-clean px-2.5 text-body-12 font-semibold text-warning-darkest" title={t("windowHelp")}>
            <Clock size={13} aria-hidden />
            {t("windowClosedShort")}
          </span>
        ) : (
          windowLeft != null &&
          windowLeft > 0 && (
            <span
              className={cn(
                "inline-flex h-[26px] shrink-0 items-center gap-1.5 rounded-full px-2.5 text-body-12 font-semibold",
                windowLeft < 2 * 60 * 60 * 1000 ? "bg-warning-clean text-warning-darkest" : "bg-neutral-10 text-neutral-700"
              )}
              title={t("windowHelp")}
              aria-label={
                windowLeft < 60 * 60 * 1000
                  ? t("windowOpenMinutes", { minutes: Math.max(1, Math.ceil(windowLeft / 60000)) })
                  : t("windowOpenHours", { hours: Math.floor(windowLeft / 3600000) })
              }
            >
              <Clock size={13} aria-hidden />
              {windowLeft < 60 * 60 * 1000
                ? t("windowLeftMinutesShort", { minutes: Math.max(1, Math.ceil(windowLeft / 60000)) })
                : t("windowLeftShort", { hours: Math.floor(windowLeft / 3600000) })}
            </span>
          )
        )}
        <IconButton
          className="xl:hidden"
          variant="ghost"
          size="medium"
          aria-label={t("panelOpen")}
          title={t("panelOpen")}
          aria-haspopup="dialog"
          icon={<ProfileCircle size={18} />}
          onClick={props.onOpenDetails}
        />
        <IconButton
          className="hidden xl:inline-flex"
          variant="ghost"
          size="medium"
          aria-label={panelOpen ? t("panelToggleHide") : t("panelToggleShow")}
          title={panelOpen ? t("panelToggleHide") : t("panelToggleShow")}
          aria-pressed={panelOpen}
          icon={<SidebarRight size={18} />}
          onClick={props.onTogglePanel}
        />
      </header>
      {!item.isGroup && (
        <HandlingBar
          handling={item.handling}
          agentName={item.agentName}
          state={item.state}
          pending={props.handlingPending}
          error={props.handlingError}
          t={t}
          onTakeOver={() => void props.onTakeOver()}
          onReturnToAi={() => void props.onReturnToAi()}
        />
      )}

      {status === "loading" && messages.length === 0 ? (
        <ThreadSkeleton />
      ) : status === "error" && messages.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-6">
          <EmptyState
            icon={<Danger size={22} />}
            title={t("threadError")}
            action={
              <Button variant="secondary" style="outline" size="medium" onClick={props.onReload}>
                {t("retry")}
              </Button>
            }
          />
        </div>
      ) : messages.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-6 text-body-14 text-neutral-600">{t("threadEmpty")}</div>
      ) : (
        <MessageList
          messages={messages}
          hasMore={props.hasMore}
          loadingOlder={props.loadingOlder}
          language={props.language}
          t={t}
          announcement={props.announcement}
          onLoadOlder={props.onLoadOlder}
          onRetry={props.onRetry}
          onDiscard={props.onDiscard}
        />
      )}

      {windowClosed && !item.isGroup ? (
        <WindowClosedComposer sessionId={item.sessionId} conversationId={item.conversationId} t={t} onSent={props.onTemplateSent} />
      ) : (
        <Composer t={t} onSend={send} onTyping={props.onTyping} aiActive={aiActive} disabledReason={item.isGroup ? t("groupReadOnly") : undefined} />
      )}
    </section>
  )
}
