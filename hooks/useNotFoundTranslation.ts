import { useMemo } from "react"
import { useUserLanguage } from "context/UserLanguageContext"
import { type NotFoundTranslationKey, notFoundTranslations } from "lib/i18n/translations/notFound"

export function useNotFoundTranslation() {
  const { userLanguage } = useUserLanguage()
  const t = useMemo(() => {
    const translations = notFoundTranslations[userLanguage]?.notFound || notFoundTranslations.english.notFound

    return (key: NotFoundTranslationKey): string => {
      return translations[key] || key
    }
  }, [userLanguage])

  return { t, language: userLanguage }
}
