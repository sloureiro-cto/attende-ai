"use client"

import { useCallback } from "react"
import { useUserLanguage } from "context/UserLanguageContext"
import { localeOf } from "lib/attende/format"
import { type StatsKey, translateStats } from "./statsStrings"

export function useStatsT() {
  const { userLanguage } = useUserLanguage()
  const t = useCallback(
    (key: StatsKey, replacements?: Record<string, string | number>) => translateStats(userLanguage, key, replacements),
    [userLanguage]
  )
  return { t, language: userLanguage as string, locale: localeOf(userLanguage) }
}
