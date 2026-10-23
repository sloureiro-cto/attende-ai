"use client"

import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js"
import { loadStripe, type Stripe, type StripeElementLocale } from "@stripe/stripe-js"
import { Warning2 } from "iconsax-react"
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createSignupSetupIntentAction, startAttendeTrialAction } from "actions/attende/signup"
import Button from "components/Button/Button"
import { signupErrorKey } from "lib/attende/signup/errors"
import type { AttendePlanSlug, SignupPlan, SignupTrial } from "lib/attende/signup/plans"
import type { StartTrialData } from "lib/attende/signup/types"
import { TrialSummary } from "./TrialSummary"
import { useAcquisitionT } from "../acquisition/useAcquisitionT"

/** Stripe.js loads once per publishable key. Read lazily so the key can differ per environment (and per test). */
let cachedStripe: { key: string; promise: Promise<Stripe | null> } | null = null
function getStripePromise(): Promise<Stripe | null> | null {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  if (!key) return null
  if (cachedStripe?.key !== key) cachedStripe = { key, promise: loadStripe(key) }
  return cachedStripe.promise
}
const ELEMENTS_LOCALE = { english: "en", portuguese: "pt", spanish: "es" } as const satisfies Record<string, StripeElementLocale>

/** After these the card itself is the problem: a new SetupIntent and card form are needed, not a plain retry. */
const CARD_ERRORS = new Set(["SIGNUP_PAYMENT_FAILED", "SIGNUP_PAYMENT_METHOD_INVALID"])

type Props = {
  planSlug: AttendePlanSlug
  planName: string
  plan: SignupPlan | undefined
  trial: SignupTrial
  onStarted: (data: StartTrialData) => void | Promise<void>
}

type FormProps = Props & { onCardProblem: () => void }

function CardForm({ planSlug, planName, plan, trial, onStarted, onCardProblem }: FormProps) {
  const { t } = useAcquisitionT()
  const stripe = useStripe()
  const elements = useElements()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // A SetupIntent confirms once. If the trial call fails for a reason unrelated to the card, retry with the same payment method.
  const confirmedMethod = useRef<string | null>(null)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!stripe || !elements || busy) return
    setBusy(true)
    setError(null)
    try {
      if (!confirmedMethod.current) {
        const submitted = await elements.submit()
        if (submitted.error) {
          setError(submitted.error.message ?? t("errSIGNUP_GENERIC"))
          return
        }
        const confirmed = await stripe.confirmSetup({ elements, redirect: "if_required", confirmParams: { return_url: `${window.location.origin}/signup` } })
        if (confirmed.error) {
          setError(confirmed.error.message ?? t("errSIGNUP_PAYMENT_METHOD_INVALID"))
          return
        }
        const method = confirmed.setupIntent?.payment_method
        confirmedMethod.current = typeof method === "string" ? method : (method?.id ?? null)
      }
      if (!confirmedMethod.current) {
        setError(t("errSIGNUP_PAYMENT_METHOD_INVALID"))
        return
      }

      const started = await startAttendeTrialAction({ paymentMethodId: confirmedMethod.current, planSlug })
      if (!started.success) {
        setError(t(signupErrorKey(started.reference, started.status)))
        if (started.reference && CARD_ERRORS.has(started.reference)) {
          confirmedMethod.current = null
          onCardProblem()
        }
        return
      }
      await onStarted(started.data)
    } catch {
      setError(t("errSIGNUP_GENERIC"))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <TrialSummary plan={plan} planName={planName} trial={trial} />
      {error && (
        <div role="alert" className="flex flex-col gap-1 rounded-[10px] border border-error-lighter bg-error-clean px-3.5 py-3 text-body-13 text-error-darkest">
          <span className="flex items-start gap-2.5">
            <Warning2 size={16} className="mt-0.5 shrink-0" aria-hidden />
            {error}
          </span>
          <span className="pl-[26px] text-body-12 text-error-dark">{t("cardRetryHint")}</span>
        </div>
      )}
      <div className="rounded-[10px] border border-neutral-50 p-4">
        <PaymentElement options={{ layout: "tabs" }} />
      </div>
      <Button type="submit" size="large" loading={busy} disabled={!stripe || !elements} className="h-11 w-full">
        {busy ? t("cardFinishing") : t("cardSubmit")}
      </Button>
      <p className="text-center text-body-12 text-neutral-500">{t("cardSecure")}</p>
    </form>
  )
}

/** Loads a SetupIntent, shows the Stripe card form and starts the trial. Survives a declined card without losing the signup. */
export function SignupCardStep(props: Props) {
  const { t, language } = useAcquisitionT()
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const stripePromise = useMemo(getStripePromise, [])

  useEffect(() => {
    if (!stripePromise) return
    let cancelled = false
    setClientSecret(null)
    setLoadError(null)
    void createSignupSetupIntentAction().then((result) => {
      if (cancelled) return
      if (result.success) setClientSecret(result.data.clientSecret)
      else setLoadError(t(signupErrorKey(result.reference, result.status)))
    })
    return () => {
      cancelled = true
    }
  }, [attempt, t, stripePromise])

  const newCardForm = useCallback(() => setAttempt((n) => n + 1), [])

  if (!stripePromise) {
    return (
      <p role="alert" className="rounded-[10px] border border-warning-lighter bg-warning-clean px-3.5 py-3 text-body-13 text-warning-darkest">
        {t("cardStripeMissing")}
      </p>
    )
  }
  if (loadError) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 rounded-[10px] border border-error-lighter bg-error-clean px-3.5 py-3 text-body-13 text-error-darkest">
        <span>{`${t("cardLoadFailed")} ${loadError}`}</span>
        <Button type="button" variant="secondary" style="outline" size="medium" onClick={newCardForm}>
          {t("cardRetry")}
        </Button>
      </div>
    )
  }
  if (!clientSecret) return <p className="text-body-13 text-neutral-500">{t("cardPreparing")}</p>

  return (
    <Elements key={clientSecret} stripe={stripePromise} options={{ clientSecret, locale: ELEMENTS_LOCALE[language], appearance: { theme: "stripe" } }}>
      <CardForm {...props} onCardProblem={newCardForm} />
    </Elements>
  )
}
