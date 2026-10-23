import { useMemo } from "react"
import { useUserLanguage } from "context/UserLanguageContext"
import { type VerifyOtpTranslationKey, verifyOtpTranslations } from "lib/i18n/translations/verifyOtp"

export function useVerifyOtpTranslation() {
  const { userLanguage } = useUserLanguage()
  const t = useMemo(() => {
    const translations = verifyOtpTranslations[userLanguage]?.verifyOtp || verifyOtpTranslations.english.verifyOtp

    return (key: VerifyOtpTranslationKey, replacements?: Record<string, string | number>): string => {
      let result: string = translations[key] || key
      if (replacements) {
        Object.entries(replacements).forEach(([placeholder, value]) => {
          result = result.replace(`{${placeholder}}`, String(value))
        })
      }
      return result
    }
  }, [userLanguage])

  return { t, language: userLanguage }
}
