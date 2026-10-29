"use client"

import { Danger } from "iconsax-react"
import Link from "next/link"
import { useState } from "react"
import { cn } from "@/lib/utils"
import {
  type BillingActionResult,
  type BillingLoad,
  cancelSubscriptionAction,
  changePlanAction,
  getAttendeBillingAction,
  openBillingPortalAction,
  type PortalKind,
  resumeSubscriptionAction,
} from "actions/attende/billing"
import { showToast } from "app/utils/showToast"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "components/ui/alert-dialog"
import { type AttendeSubscription, blockedBy, isCanceled, limitRows, nextCharge, pendingCancellation, STATUS_KEY, tierName, trialClock, type UsageMeterRow } from "lib/attende/billing/model"
import { formatDate, formatMoney, formatNumber } from "lib/attende/format"
import { ATTENDE_PLAN_SLUGS } from "lib/attende/signup/plans"
import { serviceErrorKey } from "lib/attende/result"
import { BillingInvoices } from "./BillingInvoices"
import { SubscriptionGate } from "./SubscriptionGate"
import { TrialMeter } from "./TrialMeter"
import { useAcquisitionT } from "../acquisition/useAcquisitionT"
import { BOTS_BRAND, BOTS_ROUTES } from "../brand"
import { actionClass } from "../ui/actionStyles"
import { EmptyState } from "../ui/EmptyState"
import { PremiumCard } from "../ui/PremiumCard"

const STATUS_TONE = {
  trialing: "bg-info-clean text-info-darkest",
  active: "bg-primary-clean text-primary-dark",
  past_due: "bg-warning-clean text-warning-darkest",
  canceled: "bg-neutral-10 text-neutral-700",
  none: "bg-neutral-10 text-neutral-700",
} as const

const USAGE_KEY = { aiReplies: "billLimitReplies", lines: "billLimitLines", agents: "billLimitAgents", docs: "billLimitDocs" } as const

type T = ReturnType<typeof useAcquisitionT>["t"]

function priceText(price: AttendeSubscription["price"], language: string, t: T): string | null {
  if (!price) return null
  const money = formatMoney(price.amount, price.currency, language)
  if (!money) return null
  if (price.interval === "year") return t("billPriceYearly", { price: money })
  return price.intervalCount > 1 ? t("billPriceEveryMonths", { price: money, count: price.intervalCount }) : t("billPriceMonthly", { price: money })
}

/**
 * Answers, from the real state: which plan, how much and in which currency, how often, when the trial ends, what happens
 * after it, and whether a charge is scheduled. A trial is never presented as an active subscription, and management
 * actions only show for an Attende subscription (never another product's on the same workspace).
 */
export function BillingView({ initial }: { initial: BillingLoad }) {
  const { t, language } = useAcquisitionT()
  const [load, setLoad] = useState(initial)
  const [busy, setBusy] = useState<PortalKind | "reload" | "cancel" | "resume" | "change" | null>(null)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [choosePlan, setChoosePlan] = useState(false)

  /** Cancel / resume / change plan: the backend changes the subscription in Stripe, then the page re-reads it. */
  const act = async (kind: "cancel" | "resume" | "change", run: () => Promise<BillingActionResult>, done: string) => {
    if (busy) return
    setBusy(kind)
    try {
      const result = await run()
      if (result.success) {
        showToast("success", done)
        setLoad(await getAttendeBillingAction())
      } else {
        const service = serviceErrorKey(result.error)
        showToast(
          "error",
          t(service ?? (result.error === "BILLING_OWNER_ONLY" ? "billOwnerOnly" : result.error === "BILLING_SUBSCRIPTION_ENDED" ? "billEndedTitle" : "billActionFailed"))
        )
      }
    } catch {
      showToast("error", t("billActionFailed"))
    } finally {
      setBusy(null)
    }
  }

  const openPortal = async (kind: PortalKind) => {
    if (busy) return
    setBusy(kind)
    try {
      const result = await openBillingPortalAction(kind)
      if (result.success) window.location.assign(result.url)
      else {
        const service = serviceErrorKey(result.error)
        showToast(
          "error",
          t(service ?? (result.error === "BILLING_NO_SUBSCRIPTION" ? "billNoSubscriptionPortal" : "billPortalFailed"))
        )
      }
    } catch {
      showToast("error", t("billPortalFailed"))
    } finally {
      setBusy(null)
    }
  }

  const reload = async () => {
    setBusy("reload")
    setLoad(await getAttendeBillingAction())
    setBusy(null)
  }

  if (!load.success) {
    const service = serviceErrorKey(load.error)
    return (
      <EmptyState
        icon={<Danger size={22} />}
        title={t("billLoadError")}
        description={service ? t(service) : undefined}
        action={
          <button type="button" className={actionClass({ variant: "secondary" })} disabled={busy === "reload"} onClick={() => void reload()}>
            {t("billRetry")}
          </button>
        }
      />
    )
  }

  const { billing, workspaceId, usage } = load.data
  const subscription = load.data.subscription
  // Attende comes with the company's paid JSYNQ plan: billing lives in JSYNQ, nothing to buy or cancel here.
  const jsynqPlan = billing.source === "jsynq_plan" || subscription?.source === "jsynq_plan"
  const attendeSub = subscription && subscription.source === "attende" ? subscription : null
  const ended = attendeSub?.ended === true
  const clock = trialClock(billing.status, billing.trialEndsAt)
  const blocked = blockedBy(billing.status, clock)
  const included = limitRows(billing.limits)
  const name = tierName(billing.tier)
  const price = priceText(subscription?.price ?? null, language, t)
  const charge = nextCharge(subscription)
  const cancels = pendingCancellation(subscription)
  const canceled = isCanceled(subscription)
  const chargeText = charge ? t("billNextCharge", { date: formatDate(charge.date, language), price: priceText(charge.price, language, t) ?? t("billPriceUnknown") }) : null
  const trialEnd = billing.trialEndsAt ? formatDate(billing.trialEndsAt, language) : null
  const usageByKey = new Map<UsageMeterRow["key"], UsageMeterRow>((usage?.rows ?? []).map((row) => [row.key, row]))

  return (
    <div className="flex flex-col gap-6">
      {blocked && <SubscriptionGate code={blocked} />}

      <PremiumCard className="flex flex-col gap-4 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-body-12 font-semibold uppercase tracking-wide text-neutral-700">{t("billCurrentPlan")}</span>
            <span className="text-[22px] font-semibold tracking-tight text-neutral-900">{name ?? t("billNoPlan")}</span>
            {jsynqPlan ? (
              <span className="text-body-14 font-semibold text-primary-dark">{t("billIncludedJsynq")}</span>
            ) : (
              billing.status !== "none" && <span className="text-body-14 text-neutral-700">{price ?? (attendeSub ? t("billPriceUnknown") : null)}</span>
            )}
          </div>
          <span className={cn("rounded-full px-3 py-1 text-body-13 font-semibold", STATUS_TONE[billing.status])}>{t(STATUS_KEY[billing.status])}</span>
        </div>

        {billing.status === "trialing" && clock && (
          <div className="flex flex-col gap-1.5 rounded-xl bg-neutral-10 px-4 py-3 text-body-14 text-neutral-800">
            <p className="font-semibold">
              {clock.kind === "days" && t("billTrialEndsIn", { days: clock.days })}
              {clock.kind === "today" && t("billTrialEndsToday")}
              {clock.kind === "ended" && t("gateTrialExpiredTitle")}
              {trialEnd && clock.kind !== "ended" && <span className="font-normal text-neutral-700"> · {t("billTrialEndsOn", { date: trialEnd })}</span>}
            </p>
            <p className="text-body-13 text-neutral-700">
              {cancels
                ? t("billCancelsOnHint")
                : subscription && subscription.status === "trialing" && !subscription.canceledAt && price && trialEnd
                ? t("billAfterTrialCharge", { price, date: trialEnd })
                : t("billAfterTrialNoSubscription")}
            </p>
          </div>
        )}
        {billing.status === "trialing" && billing.trialOutboundCap > 0 && <TrialMeter used={billing.trialOutboundUsed} cap={billing.trialOutboundCap} />}

        {cancels ? (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-warning-lighter bg-warning-clean px-4 py-3">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="text-body-14 font-semibold text-warning-darkest">{t("billCancelsOn", { date: formatDate(cancels.date, language) })}</p>
              {billing.status !== "trialing" && <p className="text-body-13 text-neutral-800">{t("billCancelsOnHint")}</p>}
            </div>
            <button
              type="button"
              className={actionClass({ variant: "secondary", size: "sm" })}
              disabled={busy !== null}
              aria-busy={busy === "resume"}
              onClick={() => void act("resume", resumeSubscriptionAction, t("billResumeDone"))}
            >
              {t("billResume")}
            </button>
          </div>
        ) : (
          billing.status === "active" && <p className="text-body-14 text-neutral-800">{chargeText ?? t("billNoChargeScheduled")}</p>
        )}
        {canceled && subscription?.canceledAt && <p className="text-body-13 text-neutral-700">{t("billCanceledOn", { date: formatDate(subscription.canceledAt, language) })}</p>}
        {billing.status === "past_due" && <p className="text-body-13 text-warning-darkest">{t("billPastDueHint")}</p>}
        {billing.status === "canceled" && <p className="text-body-13 text-neutral-700">{t("billCanceledHint")}</p>}

        {jsynqPlan && (
          <div data-testid="bill-jsynq-included" className="flex flex-col gap-3 rounded-xl bg-neutral-10 px-4 py-3">
            <p className="text-body-14 text-neutral-800">{t("billIncludedJsynqBody")}</p>
            <a href={BOTS_BRAND.jsynqUrl} target="_blank" rel="noopener noreferrer" className={actionClass({ variant: "secondary", size: "sm" })}>
              {t("billManageInJsynq")}
            </a>
          </div>
        )}

        {ended && !jsynqPlan && (
          <div data-testid="bill-ended" className="flex flex-col gap-2 rounded-xl border border-neutral-50 px-4 py-3">
            <p className="text-body-14 font-semibold text-neutral-900">{t("billEndedTitle")}</p>
            <p className="text-body-13 text-neutral-700">{t("billEndedBody")}</p>
            <div className="flex flex-wrap gap-2">
              <a href={`mailto:${BOTS_BRAND.contactEmail}`} className={actionClass()}>
                {t("billContactSupport")}
              </a>
            </div>
          </div>
        )}

        {!jsynqPlan && !ended && (billing.status === "none" || billing.status === "canceled" || (billing.status === "trialing" && !subscription)) && (
          <div className="flex flex-col gap-3">
            {billing.status === "none" && <p className="text-body-14 text-neutral-700">{t("billNoPlanHint")}</p>}
            <div className="flex flex-wrap gap-2">
              {/* No endpoint subscribes an existing workspace yet: the team does it with the customer. */}
              <a href={BOTS_BRAND.bookingUrl} target="_blank" rel="noopener noreferrer" className={actionClass()}>
                {t("billSubscribe")}
              </a>
              <Link href={BOTS_ROUTES.pricing} className={actionClass({ variant: "secondary" })}>
                {t("billSeePlans")}
              </Link>
            </div>
          </div>
        )}
      </PremiumCard>

      <PremiumCard className="flex flex-col gap-5 p-6">
        <div className="grid gap-6 md:grid-cols-2">
          <section aria-labelledby="bill-included" className="flex flex-col gap-3">
            <h2 id="bill-included" className="text-body-16 font-semibold text-neutral-900">
              {t("billIncludedTitle")}
            </h2>
            {included.length > 0 ? (
              <dl className="flex flex-col divide-y divide-neutral-50">
                {included.map((row) => (
                  <div key={row.key} className="flex items-center justify-between gap-3 py-2 text-body-14">
                    <dt className="text-neutral-700">{t(row.key)}</dt>
                    <dd className="font-semibold text-neutral-900">{row.unlimited ? t("billUnlimited") : formatNumber(row.value, language)}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-body-13 text-neutral-700">{t("billIncludedUnknown")}</p>
            )}
          </section>

          <section aria-labelledby="bill-used" className="flex flex-col gap-3">
            <h2 id="bill-used" className="text-body-16 font-semibold text-neutral-900">
              {usage?.month ? t("billUsedMonth", { month: formatDate(`${usage.month}-01T12:00:00Z`, language, { month: "long", year: "numeric" }) }) : t("billUsedTitle")}
            </h2>
            {usage && usage.rows.length > 0 ? (
              <dl className="flex flex-col divide-y divide-neutral-50">
                {(["aiReplies", "lines", "agents", "docs"] as const).map((key) => {
                  const row = usageByKey.get(key)
                  if (!row) return null
                  const used = row.used
                  const ratio = used !== null && row.limit && row.limit > 0 ? Math.min(1, used / row.limit) : null
                  return (
                    <div key={key} className="flex flex-col gap-1.5 py-2 text-body-14">
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-neutral-700">{t(USAGE_KEY[key])}</dt>
                        <dd className="font-semibold text-neutral-900">
                          {used === null
                            ? t("billUsageValueUnavailable")
                            : row.limit !== null
                            ? t("billUsageOf", {
                                used: formatNumber(used, language),
                                limit: formatNumber(row.limit, language),
                              })
                            : t("billUsageCount", { used: formatNumber(used, language) })}
                        </dd>
                      </div>
                      {ratio !== null && (
                        <div className="h-1.5 overflow-hidden rounded-full bg-neutral-10" aria-hidden>
                          <div className={cn("h-full rounded-full", ratio >= 1 ? "bg-warning" : "bg-primary")} style={{ width: `${Math.round(ratio * 100)}%` }} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </dl>
            ) : (
              <p role="status" className="text-body-13 text-neutral-700">
                {t("billUsageUnavailable")}
              </p>
            )}
          </section>
        </div>
        {/* Only the rules the backend really applies (see docs/attende/entitlements-and-usage.md). */}
        {billing.status !== "none" && (
          <ul className="flex list-disc flex-col gap-1 pl-5 text-body-12 text-neutral-700">
            <li>{t("billLimitRuleReplies")}</li>
            <li>{t("billLimitRuleCreate")}</li>
            {billing.status === "trialing" && billing.trialOutboundCap > 0 && <li>{t("billLimitRuleTrial", { cap: formatNumber(billing.trialOutboundCap, language) })}</li>}
          </ul>
        )}
      </PremiumCard>

      {attendeSub && !ended && (
        <PremiumCard className="flex flex-col gap-4 p-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-body-16 font-semibold text-neutral-900">{t("billManageTitle")}</h2>
            <p className="text-body-13 text-neutral-700">{t("billManageBody")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={actionClass()} disabled={busy !== null} aria-busy={busy === "change"} onClick={() => setChoosePlan(true)}>
              {t("billChangePlan")}
            </button>
            <button type="button" className={actionClass({ variant: "secondary" })} disabled={busy !== null} aria-busy={busy === "payment_method"} onClick={() => void openPortal("payment_method")}>
              {t("billUpdateCard")}
            </button>
            {!attendeSub.cancelAtPeriodEnd ? (
              <button type="button" className={actionClass({ variant: "ghost" })} disabled={busy !== null} aria-busy={busy === "cancel"} onClick={() => setConfirmCancel(true)}>
                {t("billCancel")}
              </button>
            ) : (
              <button
                type="button"
                className={actionClass({ variant: "ghost" })}
                disabled={busy !== null}
                aria-busy={busy === "resume"}
                onClick={() => void act("resume", resumeSubscriptionAction, t("billResumeDone"))}
              >
                {t("billResume")}
              </button>
            )}
          </div>
        </PremiumCard>
      )}

      {!jsynqPlan && (
        <PremiumCard className="flex flex-col gap-4 p-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-body-16 font-semibold text-neutral-900">{t("billInvoices")}</h2>
            <p className="text-body-12 text-neutral-700">{t("billInvoicesHint")}</p>
          </div>
          <BillingInvoices workspaceId={workspaceId} />
        </PremiumCard>
      )}

      <AlertDialog open={choosePlan} onOpenChange={setChoosePlan}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("billChangePlanTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("billChangePlanBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-2">
            {ATTENDE_PLAN_SLUGS.map((slug) => {
              const current = slug === (attendeSub?.planSlug ?? billing.tier)
              const label = tierName(slug) ?? slug
              return (
                <button
                  key={slug}
                  type="button"
                  data-plan={slug}
                  className={actionClass({ variant: current ? "ghost" : "secondary" })}
                  disabled={current || busy !== null}
                  onClick={() => {
                    setChoosePlan(false)
                    void act("change", () => changePlanAction(slug), t("billChangePlanDone", { plan: label }))
                  }}
                >
                  {current ? `${label} · ${t("billChangePlanCurrent")}` : t("billChangePlanTo", { plan: label })}
                </button>
              )
            })}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("billCancelKeep")}</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("billCancelTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("billCancelBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("billCancelKeep")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmCancel(false)
                void act("cancel", cancelSubscriptionAction, t("billCancelDone"))
              }}
            >
              {t("billCancelConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
