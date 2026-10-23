"use client"

import { useCallback } from "react"
import { useUserLanguage } from "context/UserLanguageContext"
import { navEntries, NavTranslationKey } from "lib/i18n/translations/attende/nav"
import { pricingEntries, PricingTranslationKey } from "lib/i18n/translations/attende/pricing"
import { ShellEntry, translateShellEntry } from "lib/i18n/translations/attende/shellTranslator"
import { teamEntries, TeamTranslationKey } from "lib/i18n/translations/attende/team"
import { BOTS_BRAND } from "../brand"

export type AttendeTranslationKey = NavTranslationKey | TeamTranslationKey | PricingTranslationKey

const ENTRIES: Record<string, ShellEntry> = { ...navEntries, ...teamEntries, ...pricingEntries }

/** Shell-level strings (nav, team, pricing). `{brand}` is always available. */
export function useAttendeT() {
  const { userLanguage } = useUserLanguage()
  const t = useCallback(
    (key: AttendeTranslationKey, replacements?: Record<string, string | number>) =>
      translateShellEntry(ENTRIES, userLanguage, key, { brand: BOTS_BRAND.name, ...replacements }),
    [userLanguage]
  )
  return { t, language: userLanguage }
}
