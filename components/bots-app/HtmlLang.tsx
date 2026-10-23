"use client"

import { useEffect } from "react"
import { useUserLanguage } from "context/UserLanguageContext"
import { APP_LANGUAGES } from "lib/i18n/translations/attende/locale"

/** Keeps <html lang> in step with the chosen language, so screen readers and hyphenation follow it. */
export function HtmlLang() {
  const { userLanguage } = useUserLanguage()
  useEffect(() => {
    const match = APP_LANGUAGES.find((option) => option.id === userLanguage)
    document.documentElement.lang = match?.htmlLang ?? "en"
  }, [userLanguage])
  return null
}
