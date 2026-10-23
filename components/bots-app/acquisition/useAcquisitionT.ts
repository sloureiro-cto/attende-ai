"use client"

import { useCallback } from "react"
import { useUserLanguage } from "context/UserLanguageContext"
import { billingEntries, BillingTranslationKey } from "lib/i18n/translations/attende/billing"
import { onboardingEntries, OnboardingTranslationKey } from "lib/i18n/translations/attende/onboarding"
import { ShellEntry, translateShellEntry } from "lib/i18n/translations/attende/shellTranslator"
import { signupEntries, SignupTranslationKey } from "lib/i18n/translations/attende/signup"
import { BOTS_BRAND } from "../brand"

export type AcquisitionTranslationKey = SignupTranslationKey | OnboardingTranslationKey | BillingTranslationKey

const ENTRIES: Record<string, ShellEntry> = { ...signupEntries, ...onboardingEntries, ...billingEntries }

/** Strings of the public signup, the onboarding wizard and billing. `{brand}` is always available. */
export function useAcquisitionT() {
  const { userLanguage } = useUserLanguage()
  const t = useCallback(
    (key: AcquisitionTranslationKey, replacements?: Record<string, string | number>) =>
      translateShellEntry(ENTRIES, userLanguage, key, { brand: BOTS_BRAND.name, ...replacements }),
    [userLanguage]
  )
  return { t, language: userLanguage }
}
