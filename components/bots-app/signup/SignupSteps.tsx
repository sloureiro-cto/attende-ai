"use client"

import { TickCircle } from "iconsax-react"
import { cn } from "@/lib/utils"
import { SIGNUP_STEPS, SignupStep, stepIndex } from "./signupState"
import { useAcquisitionT } from "../acquisition/useAcquisitionT"

const LABEL = { account: "signupStepAccount", otp: "signupStepVerify", card: "signupStepCard" } as const

/** Three-dot progress: done steps get a check, the current one is highlighted. */
export function SignupSteps({ current }: { current: SignupStep }) {
  const { t } = useAcquisitionT()
  const currentIndex = stepIndex(current)
  return (
    <ol className="flex items-center gap-2" aria-label={t("signupStepsAria")}>
      {SIGNUP_STEPS.map((step, index) => {
        const done = index < currentIndex
        const active = index === currentIndex
        return (
          <li key={step} className="flex items-center gap-2" aria-current={active ? "step" : undefined}>
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-full text-body-12 font-semibold transition-colors",
                done && "bg-primary text-white",
                active && "bg-neutral-900 text-white",
                !done && !active && "bg-neutral-10 text-neutral-500"
              )}
            >
              {done ? <TickCircle size={14} variant="Bold" aria-hidden /> : index + 1}
            </span>
            <span className={cn("text-body-13", active ? "font-semibold text-neutral-900" : "text-neutral-500")}>{t(LABEL[step])}</span>
            {index < SIGNUP_STEPS.length - 1 && <span className="mx-1 h-px w-5 bg-neutral-50" aria-hidden />}
          </li>
        )
      })}
    </ol>
  )
}
