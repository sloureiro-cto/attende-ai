"use client"

import { ArrowLeft, Warning2 } from "iconsax-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { signIn, useSession } from "next-auth/react"
import { FormEvent, useState } from "react"
import { loginWithPassword } from "actions/auth/loginWithPassword"
import { resendLoginOtp } from "actions/auth/resendLoginOtp"
import { verifyLoginOtp } from "actions/auth/verifyLoginOtp"
import Button from "components/Button/Button"
import IconButton from "components/IconButton/IconButton"
import EmailIcon from "components/SVGS/EmailIcon"
import GoogleIcon from "components/SVGS/GoogleIcon"
import PasswordIcon from "components/SVGS/PasswordIcon"
import TextInput from "components/TextInput/TextInput"
import VerifyOtpForm from "components/VerifyOtpForm/VerifyOtpForm"
import { useAuthErrorMessage } from "hooks/useAuthErrorMessage"
import { useVerifyOtpTranslation } from "hooks/useVerifyOtpTranslation"
import { AUTH_ERROR_CODES } from "lib/auth/publicAuthErrors"
import { isLoginChallenge } from "types/auth/login"
import { loginSchema } from "validations/login"
import { BOTS_ROUTES } from "./brand"
import { safeBotsCallback } from "./safeBotsCallback"
import { useBotsAppT } from "./useBotsAppT"

type Step = "credentials" | "otp"

type Props = {
  /** Server-detected: the Google provider has credentials in this deployment. */
  googleEnabled: boolean
}

/**
 * Sign-in with the JSYNQ account. Reuses the main app's credential/OTP server actions and NextAuth
 * `signIn("credentials")`: same users, same checks, same 2FA — only the chrome is different.
 */
export function BotsLoginForm({ googleEnabled }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { update } = useSession()
  const { t } = useBotsAppT()
  const { t: tOtp } = useVerifyOtpTranslation()
  const { resolveAuthErrorMessage } = useAuthErrorMessage()

  const callbackUrl = safeBotsCallback(searchParams.get("callbackUrl"), BOTS_ROUTES.bots)

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [step, setStep] = useState<Step>("credentials")
  const [challengeId, setChallengeId] = useState<string | null>(null)
  const [expiresIn, setExpiresIn] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(searchParams.get("error") ? t("loginGenericError") : null)

  const backToCredentials = () => {
    setStep("credentials")
    setChallengeId(null)
    setExpiresIn(null)
  }

  const finish = async () => {
    await update()
    router.push(callbackUrl)
    router.refresh()
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    const parsed = loginSchema.safeParse({ email, password })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? t("loginInvalid"))
      return
    }

    setIsLoading(true)
    try {
      const result = await loginWithPassword({ email, password })
      if (!result.success) {
        setError(resolveAuthErrorMessage(result.error, result.status, "credentials"))
        return
      }
      if (isLoginChallenge(result.data)) {
        setChallengeId(result.data.loginChallengeId)
        setExpiresIn(result.data.expiresIn)
        setStep("otp")
        return
      }
      const signed = await signIn("credentials", { email, password, redirect: false, callbackUrl })
      if (signed?.ok) await finish()
      else setError(t("loginInvalid"))
    } catch {
      setError(t("loginGenericError"))
    } finally {
      setIsLoading(false)
    }
  }

  const onVerifyOtp = async (code: string) => {
    if (!challengeId) {
      setError(resolveAuthErrorMessage(AUTH_ERROR_CODES.VERIFICATION_FAILED, undefined, "otp"))
      backToCredentials()
      return
    }
    setIsLoading(true)
    try {
      const verified = await verifyLoginOtp({ loginChallengeId: challengeId, otp: code })
      if (!verified.success) {
        if (verified.expiredChallenge) backToCredentials()
        setError(resolveAuthErrorMessage(verified.error, verified.status, "otp"))
        return
      }
      const signed = await signIn("credentials", { loginProof: verified.data.loginProof, redirect: false, callbackUrl })
      if (signed?.ok) {
        setChallengeId(null)
        setExpiresIn(null)
        await finish()
      } else {
        setError(resolveAuthErrorMessage(AUTH_ERROR_CODES.VERIFICATION_FAILED, undefined, "otp"))
        backToCredentials()
      }
    } catch {
      setError(t("loginGenericError"))
    } finally {
      setIsLoading(false)
    }
  }

  const onResendOtp = async () => {
    if (!challengeId) {
      return { error: resolveAuthErrorMessage(AUTH_ERROR_CODES.VERIFICATION_FAILED, undefined, "otp") }
    }
    const result = await resendLoginOtp({ loginChallengeId: challengeId })
    if (!result.success) {
      if (result.expiredChallenge) backToCredentials()
      return { error: resolveAuthErrorMessage(result.error, result.status, "otp") }
    }
    return {}
  }

  const onGoogle = () => {
    setError(null)
    void signIn("google", { callbackUrl })
  }

  const expiresHint = expiresIn != null ? tOtp("codeExpiresIn", { minutes: Math.ceil(expiresIn / 60) }) : undefined

  return (
    <div className="bots-rise flex w-full max-w-[400px] flex-col gap-6">
      {step === "otp" && (
        <IconButton
          type="button"
          variant="ghost"
          size="medium"
          icon={<ArrowLeft size={16} />}
          onClick={backToCredentials}
          aria-label={t("loginBack")}
          className="-ml-2 self-start"
        />
      )}

      {step === "credentials" ? (
        <>
          <header className="flex flex-col gap-2">
            <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-neutral-900">
              {t("loginTitle")}
            </h1>
            <p className="text-body-14 text-neutral-500">{t("loginSubtitle")}</p>
          </header>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-[10px] border border-error-lighter bg-error-clean px-3.5 py-3 text-body-13 text-error-darkest"
            >
              <Warning2 size={16} className="mt-0.5 shrink-0" aria-hidden />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
            <TextInput
              label={t("loginEmail")}
              startIcon={<EmailIcon />}
              type="email"
              name="email"
              aria-label={t("loginEmail")}
              value={email}
              autoComplete="email"
              onChange={(e) => setEmail(e.target.value)}
              required
              hideRequiredMark
            />
            <TextInput
              label={t("loginPassword")}
              startIcon={<PasswordIcon />}
              type="password"
              name="password"
              aria-label={t("loginPassword")}
              value={password}
              autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)}
              required
              hideRequiredMark
            />
            <div className="flex justify-end">
              <Link href="/recover-password" className="text-body-13 font-semibold text-primary-dark hover:underline">
                {t("loginForgot")}
              </Link>
            </div>
            <Button type="submit" size="large" loading={isLoading} className="h-11 w-full">
              {t("loginSubmit")}
            </Button>
          </form>

          {googleEnabled && (
            <>
              <div className="flex items-center gap-3" role="separator">
                <span className="h-px flex-1 bg-neutral-50" />
                <span className="text-body-12 text-neutral-300">{t("loginOr")}</span>
                <span className="h-px flex-1 bg-neutral-50" />
              </div>
              <Button
                type="button"
                variant="secondary"
                style="outline"
                size="large"
                disabled={isLoading}
                onClick={onGoogle}
                className="h-11 w-full gap-3"
              >
                <GoogleIcon />
                {t("loginGoogle")}
              </Button>
            </>
          )}

          <p className="text-center text-body-13 text-neutral-400">
            {t("loginNoAccount")}{" "}
            <Link href={BOTS_ROUTES.signup} className="font-semibold text-primary-dark hover:underline">
              {t("loginCreateAccount")}
            </Link>
          </p>
        </>
      ) : (
        <>
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-[10px] border border-error-lighter bg-error-clean px-3.5 py-3 text-body-13 text-error-darkest"
            >
              <Warning2 size={16} className="mt-0.5 shrink-0" aria-hidden />
              <span>{error}</span>
            </div>
          )}
          <VerifyOtpForm
            variant="login2fa"
            handleVerifyCode={onVerifyOtp}
            email={email}
            isPending={isLoading}
            onResend={onResendOtp}
            expiresHint={expiresHint}
          />
        </>
      )}
    </div>
  )
}
