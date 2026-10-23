"use client"

import { Danger, Flash, Profile, Slash } from "iconsax-react"
import Link from "next/link"
import { useId } from "react"
import { cn } from "@/lib/utils"
import type { HandlingMode } from "lib/bots-app/inbox/model"
import type { AttendeInboxT } from "./useAttendeInboxT"
import { BOTS_ROUTES } from "../brand"
import { actionClass } from "../ui/actionStyles"

type Props = {
  /** The state the backend confirmed (never an optimistic guess). */
  handling: HandlingMode
  agentName: string | null
  /** Conversation phase, to explain why there is no AI (e.g. `blocked`). */
  state: string | null
  /** The transition being requested right now, if any. */
  pending: Exclude<HandlingMode, "none"> | null
  /** Why the last request failed (already translated), shown until the next attempt. */
  error: string | null
  t: AttendeInboxT
  onTakeOver: () => void
  onReturnToAi: () => void
}

const CHIP: Record<HandlingMode, { tone: string; Icon: typeof Flash }> = {
  ai: { tone: "bg-primary-clean text-primary-dark", Icon: Flash },
  human: { tone: "bg-info-clean text-info-darkest", Icon: Profile },
  none: { tone: "bg-neutral-10 text-neutral-700", Icon: Slash },
}

/**
 * Who answers this conversation, as confirmed by the API, with the one action that changes it:
 * "Take over" while the AI is active, "Return to AI" during human handling. With no agent there is nothing to toggle
 * here: the link goes to AI agents, where an agent is turned on for the channel (that is global, this is per conversation).
 */
export function HandlingBar({ handling, agentName, state, pending, error, t, onTakeOver, onReturnToAi }: Props) {
  const scopeId = useId()
  const { tone, Icon } = CHIP[handling]
  const chip = handling === "ai" ? t("handlingAiChip") : handling === "human" ? t("handlingHumanChip") : t("handlingNoneChip")
  const description =
    handling === "ai"
      ? agentName
        ? t("handlingAiDesc", { name: agentName })
        : t("handlingAiDescUnnamed")
      : handling === "human"
        ? t("handlingHumanDesc")
        : state === "blocked"
          ? t("handlingBlockedDesc")
          : t("handlingNoneDesc")

  return (
    <div role="region" aria-label={t("handlingRegion")} className="border-b border-neutral-border bg-white px-3 py-2 sm:px-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className={cn("inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-body-12 font-semibold", tone)} data-testid="handling-state">
          <Icon size={13} variant="Bold" aria-hidden />
          {chip}
        </span>
        <p className="min-w-0 flex-1 basis-48 text-body-12 text-neutral-700">
          {description}{" "}
          <Link
            href={BOTS_ROUTES.agents}
            className="whitespace-nowrap font-semibold text-primary-dark underline-offset-2 hover:underline"
            aria-describedby={scopeId}
            title={t("handlingScopeHint")}
          >
            {t("handlingScopeLink")}
          </Link>
          <span id={scopeId} className="sr-only">
            {t("handlingScopeHint")}
          </span>
        </p>
        {handling === "ai" && (
          <button
            type="button"
            className={actionClass({ variant: "secondary", size: "sm" })}
            onClick={onTakeOver}
            disabled={pending !== null}
            aria-busy={pending === "human"}
            title={t("takeOverHint")}
          >
            {pending === "human" ? t("takingOver") : t("takeOver")}
          </button>
        )}
        {handling === "human" && (
          <button
            type="button"
            className={actionClass({ variant: "secondary", size: "sm" })}
            onClick={onReturnToAi}
            disabled={pending !== null}
            aria-busy={pending === "ai"}
            title={t("returnHint")}
          >
            {pending === "ai" ? t("returningToAi") : t("returnToAi")}
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-1.5 flex items-center gap-1.5 text-body-12 text-error-dark">
          <Danger size={13} aria-hidden />
          {error}
        </p>
      )}
    </div>
  )
}
