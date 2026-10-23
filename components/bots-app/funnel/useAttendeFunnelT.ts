"use client"

import { useCallback } from "react"
import { useUserLanguage } from "context/UserLanguageContext"
import { localeOf, plural } from "lib/attende/format"
import { type AttendeFunnelKey, translateAttendeFunnel } from "lib/i18n/translations/attende/funnel"

export function useAttendeFunnelT() {
  const { userLanguage } = useUserLanguage()
  const t = useCallback(
    (key: AttendeFunnelKey, replacements?: Record<string, string | number>) => translateAttendeFunnel(userLanguage, key, replacements),
    [userLanguage]
  )
  /** A counted phrase: picks the one / other key by the language's plural rules; `{count}` is written with Intl. */
  const tn = useCallback(
    (one: AttendeFunnelKey, other: AttendeFunnelKey, count: number, replacements?: Record<string, string | number>) => {
      // `{count}` stays in the template so `plural` writes it with the language's digits.
      const keep = { ...replacements, count: "{count}" }
      return plural(count, userLanguage, { one: translateAttendeFunnel(userLanguage, one, keep), other: translateAttendeFunnel(userLanguage, other, keep) })
    },
    [userLanguage]
  )
  return { t, tn, language: userLanguage as string, locale: localeOf(userLanguage) }
}

export type AttendeFunnelT = ReturnType<typeof useAttendeFunnelT>["t"]
export type AttendeFunnelTn = ReturnType<typeof useAttendeFunnelT>["tn"]
