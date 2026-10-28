"use client"

import { ArrowLeft, Warning2 } from "iconsax-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signIn, useSession } from "next-auth/react"
import { useReducer, useState } from "react"
import { createSignupAction, resendSignupAction, verifySignupAction } from "actions/attende/signup"
import IconButton from "components/IconButton/IconButton"
import VerifyOtpForm from "components/VerifyOtpForm/VerifyOtpForm"
import {
  existingAccountSignInUrl,
  isExistingAccount,
  sendsBackToAccountStep,
  signupErrorKey,
} from "lib/attende/signup/errors"
import { normalizePlanSlug, SignupPlansResponse } from "lib/attende/signup/plans"
import type { StartTrialData } from "lib/attende/signup/types"
import type { SignupAccountValues } from "lib/attende/signup/validate"
import { SignupAccountStep } from "./SignupAccountStep"
import { SignupCardStep } from "./SignupCardStep"
import { initialSignupState, signupReducer } from "./signupState"
import { SignupSteps } from "./SignupSteps"
import { useAcquisitionT } from "../acquisition/useAcquisitionT"

const LOCALE = { english: "en", portuguese: "pt", spanish: "es" } as const
const ONBOARDING = "/setup"

type Props = {
  catalog: SignupPlansResponse
  initialPlan?: string | null
  /** Signed in and verified but the trial never started (e.g. a refresh on the card step): go straight to the card. */
  resumeAtCard?: boolean
}

/**
 * Account -> e-mail code -> card -> trial. The password goes to JSYNQ once (account creation) and is never kept: after
 * the code, the session comes from the one-minute sign-in proof the verify action returns.
 */
export function SignupFlow({ catalog, initialPlan, resumeAtCard = false }: Props) {
  const { t, language } = useAcquisitionT()
  const router = useRouter()
  const { update } = useSession()
  const [state, dispatch] = useReducer(signupReducer, normalizePlanSlug(initialPlan), (slug) => (resumeAtCard ? { ...initialSignupState(slug), step: "card" as const } : initialSignupState(slug)))
  const [error, setError] = useState<string | null>(null)
  const [emailInUse, setEmailInUse] = useState(false)
  /** The e-mail already has an account this signup did not create: sign in with it, then start the trial. */
  const [existingAccount, setExistingAccount] = useState(false)
  const [busy, setBusy] = useState(false)
  const [planSlug, setPlanSlug] = useState(state.planSlug)

  const plan = catalog.plans.find((p) => p.slug === planSlug)
  const planName = plan?.name ?? planSlug.replace("attende_", "")

  const fail = (reference: string | undefined, status: number) => {
    setError(t(signupErrorKey(reference, status)))
    // An e-mail that already has an account (ours or JSYNQ's) gets the "sign in" link on the account step.
    setEmailInUse(reference === "SIGNUP_EMAIL_IN_USE" || isExistingAccount(reference))
    setExistingAccount(isExistingAccount(reference))
    if (sendsBackToAccountStep(reference)) dispatch({ type: "back_to_account" })
  }

  const createAccount = async (values: SignupAccountValues) => {
    setBusy(true)
    setError(null)
    setEmailInUse(false)
    try {
      const result = await createSignupAction({
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
        businessName: values.businessName.trim(),
        locale: LOCALE[language],
        planSlug,
      })
      if (!result.success) return fail(result.reference, result.status)
      dispatch({ type: "account_created", name: values.name.trim(), email: values.email.trim().toLowerCase(), businessName: values.businessName.trim(), planSlug })
    } catch {
      setError(t("errSIGNUP_GENERIC"))
    } finally {
      setBusy(false)
    }
  }

  /** `verify` confirms the account in JSYNQ and answers a short sign-in proof; this signs in with it. */
  const verifyCode = async (otp: string) => {
    setBusy(true)
    setError(null)
    setExistingAccount(false)
    try {
      const verified = await verifySignupAction({ email: state.email, otp })
      if (!verified.success) return fail(verified.reference, verified.status)

      const signed = await signIn("credentials", { signupProof: verified.data.signupProof, redirect: false })
      if (!signed?.ok) {
        setError(t("otpSignInFailed"))
        return
      }
      dispatch({ type: "email_verified" })
    } catch {
      setError(t("errSIGNUP_GENERIC"))
    } finally {
      setBusy(false)
    }
  }

  const resendCode = async () => {
    const result = await resendSignupAction({ email: state.email })
    return result.success ? {} : { error: t(signupErrorKey(result.reference, result.status)) }
  }

  const trialStarted = async (data: StartTrialData) => {
    await update({ workspaceId: data.workspaceId })
    router.push(ONBOARDING)
    router.refresh()
  }

  return (
    <div className="bots-rise flex w-full max-w-[440px] flex-col gap-6">
      <SignupSteps current={state.step} />

      {state.step === "account" && (
        <>
          <header className="flex flex-col gap-2">
            <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-neutral-900">{t("signupTitle")}</h1>
            <p className="text-body-14 text-neutral-500">{t("signupSubtitle")}</p>
          </header>
          <SignupAccountStep
            plans={catalog.plans}
            planSlug={planSlug}
            onPlanChange={setPlanSlug}
            initial={{ name: state.name, email: state.email, businessName: state.businessName }}
            error={error}
            emailInUse={emailInUse}
            isLoading={busy}
            onSubmit={createAccount}
          />
        </>
      )}

      {state.step === "otp" && (
        <>
          <IconButton type="button" variant="ghost" size="medium" icon={<ArrowLeft size={16} />} onClick={() => dispatch({ type: "back_to_account" })} aria-label={t("otpChangeEmail")} className="-ml-2 self-start" />
          {error && (
            <div role="alert" className="flex items-start gap-2.5 rounded-[10px] border border-error-lighter bg-error-clean px-3.5 py-3 text-body-13 text-error-darkest">
              <Warning2 size={16} className="mt-0.5 shrink-0" aria-hidden />
              <span className="flex flex-col gap-2">
                {error}
                {existingAccount && (
                  <Link href={existingAccountSignInUrl(planSlug)} className="self-start font-semibold underline">
                    {t("signupSignInToContinue")}
                  </Link>
                )}
              </span>
            </div>
          )}
          {!existingAccount && (
            <VerifyOtpForm
              variant="verifyEmail"
              title={t("otpTitle")}
              handleVerifyCode={verifyCode}
              email={state.email}
              isPending={busy}
              onResend={resendCode}
            />
          )}
        </>
      )}

      {state.step === "card" && (
        <>
          <header className="flex flex-col gap-2">
            <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-neutral-900">{t("cardTitle")}</h1>
            <p className="text-body-14 text-neutral-500">{t("cardSubtitle")}</p>
          </header>
          <SignupCardStep planSlug={planSlug} planName={planName} plan={plan} trial={catalog.trial} onStarted={trialStarted} />
        </>
      )}
    </div>
  )
}

