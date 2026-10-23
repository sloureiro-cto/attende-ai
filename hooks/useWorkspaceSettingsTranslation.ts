import { useMemo } from "react"
import { useUserLanguage } from "context/UserLanguageContext"
import { WorkspaceSettingsTranslationKey, workspaceSettingsTranslations } from "lib/i18n/translations/workspaceSettings"

export const useWorkspaceSettingsTranslation = () => {
  const { userLanguage } = useUserLanguage()

  const t = useMemo(() => {
    const translations = workspaceSettingsTranslations[userLanguage] || workspaceSettingsTranslations.english

    return (key: WorkspaceSettingsTranslationKey, replacements?: Record<string, string | number>) => {
      const translationValue = translations[key] || key

      // If it's a function, call it with the replacements
      if (typeof translationValue === "function") {
        // Extract values from replacements in order
        const values = replacements ? Object.values(replacements) : []
        return (translationValue as (...args: (string | number)[]) => string)(...values)
      }

      // Otherwise, treat it as a string with placeholder replacement
      let result: string = translationValue
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
