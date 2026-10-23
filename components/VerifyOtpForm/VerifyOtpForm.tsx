"use client"

import { REGEXP_ONLY_DIGITS } from "input-otp"
import { useEffect, useState } from "react"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { resendVerificationCode } from "actions/resendVerificationCode"
import { showToast } from "app/utils/showToast"
import Button from "components/Button/Button"
import { useAuthErrorMessage } from "hooks/useAuthErrorMessage"
import { useVerifyOtpTranslation } from "hooks/useVerifyOtpTranslation"
import type { VerifyOtpVariant } from "lib/i18n/translations/verifyOtp"

interface PropsType {
  /** When set, overrides the title from `variant` (use for one-off copy). Prefer `variant` for built-in flows. */
  title?: string
  variant?: VerifyOtpVariant
  handleVerifyCode: (code: string) => void
  email: string
  isPending: boolean
  onResend?: () => Promise<{ error?: string } | void>
  expiresHint?: string
}

const OTP_RESEND_TIMEOUT = 90 // seconds

function getHeading(
  title: string | undefined,
  variant: VerifyOtpVariant,
  t: (key: "verificationCodeTitle" | "login2faTitle" | "verifyEmailContinueTitle") => string
) {
  if (title) return title
  if (variant === "verifyEmail") return t("verifyEmailContinueTitle")
  if (variant === "login2fa") return t("login2faTitle")
  return t("verificationCodeTitle")
}

export default function VerifyOtpForm({
  title,
  variant = "signup",
  handleVerifyCode,
  email,
  isPending,
  onResend,
  expiresHint,
}: PropsType) {
  const { t } = useVerifyOtpTranslation()
  const { resolveAuthErrorMessage } = useAuthErrorMessage()
  const [verificationCode, setVerificationCode] = useState("")
  const [timeLeft, setTimeLeft] = useState(OTP_RESEND_TIMEOUT)
  const [isResending, setIsResending] = useState(false)

  const heading = getHeading(title, variant, t)

  const handleResendVerificationCode = async () => {
    setIsResending(true)

    if (onResend) {
      const result = await onResend()
      if (result?.error) {
        showToast("error", result.error)
        setIsResending(false)
        return
      }
    } else {
      const data = await resendVerificationCode(email)

      if (!data.success) {
        showToast("error", resolveAuthErrorMessage(data.error, data.status, "otp"))
        setIsResending(false)
        return
      }
    }

    setIsResending(false)
    setTimeLeft(OTP_RESEND_TIMEOUT)
  }

  useEffect(() => {
    if (timeLeft <= 0) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft])

  return (
    <div className="flex w-full flex-col items-center gap-8">
      <h2 className="mx-auto text-center text-2xl font-semibold text-neutral-900">{heading}</h2>
      <form
        className="mx-auto flex w-full flex-col items-center gap-6 text-lg"
        onSubmit={(e) => {
          e.preventDefault()
          handleVerifyCode(verificationCode)
        }}
      >
        <div className="flex w-full flex-col items-center text-xs font-normal text-neutral-200">
          <p>{t("codeSentToEmail")}</p>
          <p className="font-bold">{email}</p>
          {expiresHint ? <p className="mt-2 text-neutral-400">{expiresHint}</p> : null}
          <p className="mt-4">{t("enterInFieldsBelow")}</p>
        </div>

        <div className="w-fit">
          <InputOTP
            value={verificationCode}
            onChange={(value) => setVerificationCode(value)}
            containerClassName="w-fit mx-auto"
            maxLength={6}
            pattern={REGEXP_ONLY_DIGITS}
          >
            <InputOTPGroup className="gap-2 first:rounded-l last:rounded-r">
              <InputOTPSlot
                index={0}
                placeholder="0"
                className="h-12 !rounded border border-neutral-50 bg-transparent text-lg"
              />
              <InputOTPSlot
                index={1}
                placeholder="0"
                className="h-12 rounded border border-neutral-50 bg-transparent text-lg"
              />
              <InputOTPSlot
                index={2}
                placeholder="0"
                className="h-12 rounded border border-neutral-50 bg-transparent text-lg"
              />
              <InputOTPSlot
                index={3}
                placeholder="0"
                className="h-12 rounded border border-neutral-50 bg-transparent text-lg"
              />
              <InputOTPSlot
                index={4}
                placeholder="0"
                className="h-12 rounded border border-neutral-50 bg-transparent text-lg"
              />
              <InputOTPSlot
                index={5}
                placeholder="0"
                className="h-12 !rounded border border-neutral-50 bg-transparent text-lg"
              />
            </InputOTPGroup>
          </InputOTP>
          <Button type="submit" disabled={verificationCode.length < 6} loading={isPending} className="mt-6 w-full">
            {t("verify")}
          </Button>
        </div>
      </form>
      {timeLeft > 0 ? (
        <p className="mx-auto text-xs font-normal text-neutral-200">{t("waitToResend", { seconds: timeLeft })}</p>
      ) : (
        <Button
          variant="primary"
          style="outline"
          className="cursor-pointer border-none text-body-14 font-normal text-primary underline underline-offset-2"
          onClick={handleResendVerificationCode}
          disabled={isPending}
          loading={isResending}
        >
          {t("resendCode")}
        </Button>
      )}
    </div>
  )
}
