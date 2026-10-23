"use client"

import { ArrowRight2, Calendar, Cpu, Messages2, People, Wifi } from "iconsax-react"
import Link from "next/link"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { type Activation, type ActivationStep, activationUnreadable, computeActivation, computeDailySummary, type DailySummary } from "lib/attende/activation"
import type { ActivationData } from "lib/attende/activationData"
import { plural } from "lib/attende/format"
import type { OnboardingTranslationKey } from "lib/i18n/translations/attende/onboarding"
import { useActivationCopy } from "./activationCopy"
import { ActivationError, ActivationProgress, PartialNotice, StateLabel, StepBadge } from "./ActivationParts"
import { BOTS_BRAND, BOTS_ROUTES } from "../brand"
import { actionClass } from "../ui/actionStyles"
import { PageLayout } from "../ui/PageLayout"
import { PremiumCard } from "../ui/PremiumCard"

type Props = { data: ActivationData }

/**
 * Home. Until an AI agent really answers on a channel it leads to that, one recommended step at a time; afterwards it
 * shows what needs the team today and keeps the checklist one click away. Everything comes from the API.
 */
export function HomeView({ data }: Props) {
  const activation = computeActivation(data)
  const { t, describe } = useActivationCopy(activation)

  if (activationUnreadable(data)) {
    return (
      <PageLayout title={t("homeTitle")} width="narrow">
        <ActivationError />
      </PageLayout>
    )
  }

  const daily = activation.activated ? computeDailySummary(data) : null
  return (
    <PageLayout title={t("homeTitle")} subtitle={t(daily ? "homeSubtitleDaily" : "homeSubtitleSetup")}>
      <div className="flex flex-col gap-6">
        {activation.partial && <PartialNotice message={t("actPartial")} />}
        {daily ? (
          <>
            <DailyCards daily={daily} />
            <CompactChecklist activation={activation} describe={describe} />
          </>
        ) : (
          <>
            {activation.next && <NextStepCard activation={activation} step={activation.next} describe={describe} />}
            <Checklist activation={activation} describe={describe} />
          </>
        )}
        <OptionalTasks teamMembers={data.teamMembers} />
      </div>
    </PageLayout>
  )
}

type Describe = ReturnType<typeof useActivationCopy>["describe"]

function NextStepCard({ activation, step, describe }: { activation: Activation; step: ActivationStep; describe: Describe }) {
  const { t } = useActivationCopy(activation)
  const copy = describe(step)
  const index = activation.steps.indexOf(step)
  return (
    <PremiumCard className="flex flex-col gap-5 p-5 sm:p-7">
      <ActivationProgress done={activation.done} total={activation.total} />
      <div className="flex flex-col gap-2">
        <span className="text-body-13 font-semibold text-primary-dark">
          {t("homeNextStep")} · {t("actStepOf", { current: index + 1, total: activation.total })}
        </span>
        <h2 className="text-[22px] font-semibold leading-tight tracking-tight text-neutral-900">{copy.title}</h2>
        <p className="max-w-2xl text-body-14 leading-relaxed text-neutral-700">{copy.text}</p>
        <p className="max-w-2xl text-body-14 font-medium text-neutral-900">{copy.reason}</p>
      </div>
      {copy.cta && (
        <Link href={step.href} className={actionClass({ size: "lg", className: "w-full sm:w-fit" })}>
          {copy.cta}
          <ArrowRight2 size={16} aria-hidden />
        </Link>
      )}
    </PremiumCard>
  )
}

function StepRow({ step, index, describe, isNext }: { step: ActivationStep; index: number; describe: Describe; isNext: boolean }) {
  const copy = describe(step)
  return (
    <li className="flex items-start gap-3 py-4 first:pt-0 last:pb-0">
      <StepBadge state={step.state} index={index} active={isNext} />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-body-14 font-semibold text-neutral-900">{copy.title}</h3>
          <StateLabel state={step.state}>{copy.state}</StateLabel>
        </div>
        <p className="text-body-13 text-neutral-700">{copy.reason}</p>
      </div>
      {copy.cta && (
        <Link
          href={step.href}
          aria-label={`${copy.cta}: ${copy.title}`}
          className={actionClass({ variant: step.state === "done" ? "ghost" : "secondary", size: "sm", className: "shrink-0" })}
        >
          {copy.cta}
        </Link>
      )}
    </li>
  )
}

function Checklist({ activation, describe }: { activation: Activation; describe: Describe }) {
  const { t } = useActivationCopy(activation)
  return (
    <PremiumCard className="flex flex-col gap-4 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-body-16 font-semibold text-neutral-900">{t("homeChecklistTitle")}</h2>
        <Link href={BOTS_ROUTES.onboarding} className="text-body-13 font-semibold text-primary-dark underline-offset-2 hover:underline">
          {t("homeOpenSetup")}
        </Link>
      </div>
      <ol className="flex flex-col divide-y divide-neutral-50">
        {activation.steps.map((step, index) => (
          <StepRow key={step.id} step={step} index={index} describe={describe} isNext={activation.next === step} />
        ))}
      </ol>
    </PremiumCard>
  )
}

/** After activation: the progress and only what is still open. */
function CompactChecklist({ activation, describe }: { activation: Activation; describe: Describe }) {
  const { t } = useActivationCopy(activation)
  const open = activation.steps.map((step, index) => ({ step, index })).filter(({ step }) => step.state !== "done")
  return (
    <PremiumCard className="flex flex-col gap-4 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-body-16 font-semibold text-neutral-900">{t("homeChecklistTitle")}</h2>
        <Link href={BOTS_ROUTES.onboarding} className="text-body-13 font-semibold text-primary-dark underline-offset-2 hover:underline">
          {t("homeOpenSetup")}
        </Link>
      </div>
      <ActivationProgress done={activation.done} total={activation.total} className="max-w-xl" />
      {open.length === 0 ? (
        <p className="text-body-14 text-neutral-700">{t("homeChecklistAllDone")}</p>
      ) : (
        <div className="flex flex-col gap-3">
          <h3 className="text-body-13 font-semibold text-neutral-700">{t("homeChecklistRemaining")}</h3>
          <ol className="flex flex-col divide-y divide-neutral-50">
            {open.map(({ step, index }) => (
              <StepRow key={step.id} step={step} index={index} describe={describe} isNext={false} />
            ))}
          </ol>
        </div>
      )}
    </PremiumCard>
  )
}

const LIST_LIMIT = 3

function SummaryCard({ icon, title, value, children, href, cta }: { icon: ReactNode; title: string; value: string; children?: ReactNode; href: string; cta: string }) {
  return (
    <PremiumCard className="flex flex-col gap-3 p-5">
      <div className="flex items-center gap-2 text-body-13 font-semibold text-neutral-700">
        <span aria-hidden className="text-primary-dark">
          {icon}
        </span>
        <h2>{title}</h2>
      </div>
      <p className="text-[20px] font-semibold leading-tight text-neutral-900">{value}</p>
      {children}
      <Link href={href} className={actionClass({ variant: "secondary", size: "sm", className: "mt-auto w-fit" })}>
        {cta}
        <ArrowRight2 size={14} aria-hidden />
      </Link>
    </PremiumCard>
  )
}

const CHANNEL_KEY: Record<string, OnboardingTranslationKey> = { whatsapp: "channelWhatsapp", instagram: "channelInstagram", sms: "channelSms" }
const LINE_STATE_KEY: Partial<Record<string, OnboardingTranslationKey>> = {
  disconnected: "lineStateDisconnected",
  reconnecting: "lineStateReconnecting",
  qr_pending: "lineStateQrPending",
  error: "lineStateError",
  pending_setup: "lineStatePendingSetup",
}

function DailyCards({ daily }: { daily: DailySummary }) {
  const { t, language } = useActivationCopy({ focusAgent: null })
  const count = (n: number, one: OnboardingTranslationKey, other: OnboardingTranslationKey) => plural(n, language, { one: t(one), other: t(other) })

  const waiting =
    daily.waitingForTeam === null
      ? t("dailyUnavailable")
      : daily.waitingForTeam === 0
        ? t("dailyWaitingNone")
        : count(daily.waitingForTeam, "dailyConversationsOne", "dailyConversationsOther")

  const attention = daily.channelsNeedingAttention
  const channelsValue = attention.length > 0 ? count(attention.length, "dailyChannelsAttentionOne", "dailyChannelsAttentionOther") : daily.channelsPartial ? t("dailyChannelsPartial") : t("dailyChannelsOk")

  const agentsValue = daily.activeAgents === null ? t("dailyUnavailable") : count(daily.activeAgents.length, "dailyAgentsActiveOne", "dailyAgentsActiveOther")
  const agentRows = [
    ...(daily.agentsNeedingAttention ?? []).map((agent) => ({ agent, ok: false })),
    ...(daily.activeAgents ?? []).map((agent) => ({ agent, ok: true })),
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <SummaryCard icon={<Messages2 size={18} />} title={t("dailyWaitingTitle")} value={waiting} href={`${BOTS_ROUTES.inbox}?filter=needs_reply`} cta={t("dailyOpenConversations")}>
        {daily.unread !== null && daily.unread > 0 && <p className="text-body-13 text-neutral-700">{count(daily.unread, "dailyUnreadOne", "dailyUnreadOther")}</p>}
      </SummaryCard>

      <SummaryCard icon={<Wifi size={18} />} title={t("dailyChannelsTitle")} value={channelsValue} href={BOTS_ROUTES.lines} cta={t("actCtaOpenChannels")}>
        {attention.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {attention.slice(0, LIST_LIMIT).map((line) => (
              <li key={`${line.channel}:${line.id}`} className="flex flex-wrap items-center gap-x-2 text-body-13">
                <span className="min-w-0 truncate font-medium text-neutral-900">{line.label || line.identifier}</span>
                <span className="text-neutral-700">
                  {t(CHANNEL_KEY[line.channel] ?? "channelWhatsapp")} · {t(LINE_STATE_KEY[line.status] ?? "lineStateDisconnected")}
                </span>
              </li>
            ))}
            {attention.length > LIST_LIMIT && <li className="text-body-13 text-neutral-700">{t("dailyMore", { count: attention.length - LIST_LIMIT })}</li>}
          </ul>
        )}
        {attention.length > 0 && daily.channelsPartial && <p className="text-body-12 text-neutral-700">{t("dailyChannelsPartial")}</p>}
      </SummaryCard>

      <SummaryCard icon={<Cpu size={18} />} title={t("dailyAgentsTitle")} value={agentsValue} href={BOTS_ROUTES.agents} cta={t("actCtaOpenAgents")}>
        {agentRows.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {agentRows.slice(0, LIST_LIMIT).map(({ agent, ok }) => (
              <li key={agent.id} className="flex flex-wrap items-center gap-x-2 text-body-13">
                <span className="min-w-0 truncate font-medium text-neutral-900">{agent.name}</span>
                <span className={cn(ok ? "text-primary-dark" : "text-warning-darkest")}>{t(ok ? "dailyAgentAnswering" : "dailyAgentNotAnswering")}</span>
              </li>
            ))}
            {agentRows.length > LIST_LIMIT && <li className="text-body-13 text-neutral-700">{t("dailyMore", { count: agentRows.length - LIST_LIMIT })}</li>}
          </ul>
        )}
      </SummaryCard>
    </div>
  )
}

/** Not part of activation and not counted in the progress. */
function OptionalTasks({ teamMembers }: { teamMembers: number | null }) {
  const { t, language } = useActivationCopy({ focusAgent: null })
  const teamStatus =
    teamMembers === null ? t("optTeamUnknown") : plural(teamMembers, language, { one: t("optTeamPeopleOne"), other: t("optTeamPeopleOther") })
  return (
    <section aria-labelledby="home-optional" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 id="home-optional" className="text-body-16 font-semibold text-neutral-900">
          {t("homeOptionalTitle")}
        </h2>
        <p className="text-body-13 text-neutral-700">{t("homeOptionalHint")}</p>
      </div>
      <ul className="grid gap-3 md:grid-cols-2">
        <li>
          <PremiumCard className="flex h-full flex-col gap-2 p-5">
            <div className="flex items-center gap-2">
              <People size={18} aria-hidden className="text-primary-dark" />
              <h3 className="text-body-14 font-semibold text-neutral-900">{t("optTeamTitle")}</h3>
            </div>
            <p className="text-body-13 text-neutral-700">{t("optTeamText")}</p>
            <p className="text-body-13 font-medium text-neutral-900">{teamStatus}</p>
            <Link href={BOTS_ROUTES.team} className={actionClass({ variant: "secondary", size: "sm", className: "mt-auto w-fit" })}>
              {t("optTeamCta")}
            </Link>
          </PremiumCard>
        </li>
        <li>
          <PremiumCard className="flex h-full flex-col gap-2 p-5">
            <div className="flex items-center gap-2">
              <Calendar size={18} aria-hidden className="text-primary-dark" />
              <h3 className="text-body-14 font-semibold text-neutral-900">{t("optDemoTitle")}</h3>
            </div>
            <p className="text-body-13 text-neutral-700">{t("optDemoText")}</p>
            <a
              href={BOTS_BRAND.bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={actionClass({ variant: "secondary", size: "sm", className: "mt-auto w-fit" })}
            >
              {t("optDemoCta")}
              <span className="sr-only"> {t("actNewTab")}</span>
            </a>
          </PremiumCard>
        </li>
      </ul>
    </section>
  )
}
