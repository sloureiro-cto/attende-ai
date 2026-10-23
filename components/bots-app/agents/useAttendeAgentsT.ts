"use client"

import { useCallback } from "react"
import { useUserLanguage } from "context/UserLanguageContext"
import { toAgentLanguage } from "lib/attende/agents/localize"
import { type AttendeAgentsKey, translateAttendeAgents } from "lib/i18n/translations/attende/agents"

export function useAttendeAgentsT() {
  const { userLanguage } = useUserLanguage()
  const t = useCallback(
    (key: AttendeAgentsKey, replacements?: Record<string, string | number>) => translateAttendeAgents(userLanguage, key, replacements),
    [userLanguage]
  )
  /** `language`: the two-letter key of the API texts; `appLanguage`: the app's language name, for lib/attende/format.ts. */
  return { t, language: toAgentLanguage(userLanguage), appLanguage: userLanguage }
}

export type AttendeAgentsT = ReturnType<typeof useAttendeAgentsT>["t"]
