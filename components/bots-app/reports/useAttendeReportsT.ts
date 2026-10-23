"use client"

import { useCallback } from "react"
import { useUserLanguage } from "context/UserLanguageContext"
import { plural } from "lib/attende/format"
import { type AttendeReportsKey, type AttendeReportsPluralKey, translateAttendeReports } from "lib/i18n/translations/attende/reports"

type Replacements = Record<string, string | number>

export function useAttendeReportsT() {
  const { userLanguage } = useUserLanguage()
  const t = useCallback((key: AttendeReportsKey, replacements?: Replacements) => translateAttendeReports(userLanguage, key, replacements), [userLanguage])
  /** Plural pair `${stem}_one` / `${stem}_other`, chosen by the language's rules; `{count}` is written with Intl. */
  const tp = useCallback(
    (stem: AttendeReportsPluralKey, count: number, replacements?: Replacements) =>
      plural(count, userLanguage, {
        one: translateAttendeReports(userLanguage, `${stem}_one` as AttendeReportsKey, replacements),
        other: translateAttendeReports(userLanguage, `${stem}_other` as AttendeReportsKey, replacements),
      }),
    [userLanguage]
  )
  return { t, tp, language: userLanguage }
}

type Hook = ReturnType<typeof useAttendeReportsT>
export type AttendeReportsT = Hook["t"]
export type AttendeReportsTp = Hook["tp"]
/** What every report component needs to write text and numbers in the user's language. */
export type ReportsI18n = { t: AttendeReportsT; tp: AttendeReportsTp; language: string }
