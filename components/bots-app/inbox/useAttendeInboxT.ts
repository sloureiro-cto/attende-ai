"use client"

import { useCallback } from "react"
import { useUserLanguage } from "context/UserLanguageContext"
import { plural } from "lib/attende/format"
import { type AttendeInboxKey, translateAttendeInbox } from "lib/i18n/translations/attende/inbox"

export function useAttendeInboxT() {
  const { userLanguage } = useUserLanguage()
  const t = useCallback(
    (key: AttendeInboxKey, replacements?: Record<string, string | number>) => translateAttendeInbox(userLanguage, key, replacements),
    [userLanguage]
  )
  return { t, language: userLanguage }
}

export type AttendeInboxT = ReturnType<typeof useAttendeInboxT>["t"]

/** "1 conversa" / "3 conversas": picks the form with Intl plural rules and writes the number for the language. */
export function countLabel(t: AttendeInboxT, language: string, count: number, one: AttendeInboxKey, other: AttendeInboxKey): string {
  return plural(count, language, { one: t(one), other: t(other) })
}
