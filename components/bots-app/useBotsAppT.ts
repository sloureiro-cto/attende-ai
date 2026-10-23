"use client"

import { useCallback } from "react"
import { useUserLanguage } from "context/UserLanguageContext"
import { BotsAppTranslationKey, translateBotsApp } from "lib/i18n/translations/botsApp"
import { BOTS_BRAND } from "./brand"

/** `{brand}` is always available as a replacement so copy never hard-codes the product name. */
export function useBotsAppT() {
  const { userLanguage } = useUserLanguage()
  const t = useCallback(
    (key: BotsAppTranslationKey, replacements?: Record<string, string | number>) =>
      translateBotsApp(userLanguage, key, { brand: BOTS_BRAND.name, ...replacements }),
    [userLanguage]
  )
  return { t, language: userLanguage }
}
