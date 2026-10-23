"use client"

import { CloseCircle } from "iconsax-react"
import Link from "next/link"
import { useId } from "react"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "components/ui/sheet"
import { displayNameOf, type InboxItem, stateTranslationKey } from "lib/bots-app/inbox/model"
import type { AttendeInboxKey } from "lib/i18n/translations/attende/inbox"
import { channelLabelKey, ContactAvatar } from "./atoms"
import type { AttendeInboxT } from "./useAttendeInboxT"
import { BOTS_ROUTES } from "../brand"
import { actionClass } from "../ui/actionStyles"

type Props = {
  item: InboxItem
  /** columnId -> stage title; `null` when the funnel catalog could not be loaded (stage unknown ≠ not in the funnel). */
  stageTitles: Record<string, string> | null
  t: AttendeInboxT
  className?: string
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-body-13 text-neutral-500">{label}</dt>
      <dd className="min-w-0 break-words text-body-13 font-medium text-neutral-900">{children}</dd>
    </>
  )
}

/** Funnel link that keeps the way back: the inbox URL already names this conversation, so Back reopens it. */
export function funnelDealHref(cardId: string): string {
  return `${BOTS_ROUTES.funnel}?deal=${encodeURIComponent(cardId)}`
}

function ContactDetails({ item, stageTitles, t }: Omit<Props, "className">) {
  const hintId = useId()
  const name = displayNameOf(item)
  const stateKey = stateTranslationKey(item.state)
  const stage = item.crmColumnId ? (stageTitles ? (stageTitles[item.crmColumnId] ?? null) : null) : null
  const stageText = !item.crmColumnId ? t("panelStageNone") : (stage ?? t("panelStageUnknown"))
  const contactLine = item.phone ?? (item.username ? `@${item.username}` : null)
  return (
    <>
      <div className="flex items-center gap-3">
        <ContactAvatar name={name} seed={item.conversationId} url={item.avatarUrl} channel={item.channel} />
        <div className="min-w-0">
          <p className="truncate text-body-14 font-semibold text-neutral-900">{name ?? t("untitledContact")}</p>
          <p className={cn("truncate text-body-12", contactLine ? "text-neutral-500" : "italic text-neutral-500")}>{contactLine ?? t("panelNoContact")}</p>
        </div>
      </div>
      <dl className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-x-2 gap-y-3">
        <Field label={t("panelChannel")}>{t("panelChannelValue", { channel: t(channelLabelKey(item.channel)), line: item.sessionLabel })}</Field>
        <Field label={t("panelStage")}>{stageText}</Field>
        {item.crmTitle && <Field label={t("panelDeal")}>{item.crmTitle}</Field>}
        {stateKey && <Field label={t("panelStatus")}>{t(stateKey as AttendeInboxKey)}</Field>}
        <Field label={t("panelAssigned")}>{item.assignedUserName ?? <span className="text-neutral-500">{t("panelUnassigned")}</span>}</Field>
        <Field label={t("panelLabels")}>
          {item.labels.length === 0 ? (
            <span className="text-neutral-500">{t("panelNoLabels")}</span>
          ) : (
            <span className="flex flex-wrap gap-1.5">
              {item.labels.map((label) => (
                <span key={label.id} className="rounded-full bg-neutral-10 px-2 py-0.5 text-body-12 text-neutral-700">
                  {label.text}
                </span>
              ))}
            </span>
          )}
        </Field>
      </dl>
      {item.linkedCardId && (
        <div className="mt-auto flex flex-col gap-1.5">
          <Link href={funnelDealHref(item.linkedCardId)} className={actionClass({ variant: "secondary", size: "sm", block: true })} aria-describedby={hintId}>
            {t("panelOpenFunnel")}
          </Link>
          <p id={hintId} className="text-body-11 text-neutral-500">
            {t("panelOpenFunnelHint")}
          </p>
        </div>
      )}
    </>
  )
}

/** Who the customer is and where they are in the funnel. Read-only: deals are managed in the funnel. Wide screens. */
export function ContactPanel({ item, stageTitles, t, className }: Props) {
  return (
    <aside aria-label={t("panelTitle")} className={cn("flex flex-col gap-5 overflow-y-auto px-4 py-5", className)}>
      <ContactDetails item={item} stageTitles={stageTitles} t={t} />
    </aside>
  )
}

/** The same details as a sheet, for phones and tablets (below the three-column width). */
export function ContactSheet({ item, stageTitles, t, open, onOpenChange }: Omit<Props, "className"> & { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        hideCloseButton
        overlayClassName="z-[60]"
        className="z-[60] flex w-full flex-col gap-5 overflow-y-auto border-neutral-border bg-white p-0 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:max-w-sm dark:bg-white"
      >
        <div className="flex items-center gap-2 border-b border-neutral-border px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))]">
          <SheetTitle className="flex-1 text-body-16 font-semibold text-neutral-900">{t("panelTitle")}</SheetTitle>
          <SheetDescription className="sr-only">{displayNameOf(item) ?? t("untitledContact")}</SheetDescription>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label={t("panelClose")}
            className="flex size-9 items-center justify-center rounded-lg text-neutral-600 hover:bg-neutral-10 hover:text-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            <CloseCircle size={20} aria-hidden />
          </button>
        </div>
        <div className="flex flex-1 flex-col gap-5 px-4">
          <ContactDetails item={item} stageTitles={stageTitles} t={t} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
