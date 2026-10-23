import { useMemo } from "react"
import { useUserLanguage } from "context/UserLanguageContext"
import { ProjectsTranslationKey, projectsTranslations } from "lib/i18n/translations/projects"

export type TranslationFunction = (
  key: ProjectsTranslationKey,
  replacements?: Record<string, string | number>
) => string

export function useProjectsTranslation() {
  const { userLanguage } = useUserLanguage()

  const t = useMemo(() => {
    const translations = projectsTranslations[userLanguage]?.projects || projectsTranslations.english.projects

    return (key: ProjectsTranslationKey, replacements?: Record<string, string | number>): string => {
      const source = translations as Record<ProjectsTranslationKey, string>
      let text: string = source[key] ?? key

      // Replace placeholders like {limit}, {plan}, etc.
      if (replacements) {
        Object.entries(replacements).forEach(([placeholder, value]) => {
          text = text.replace(new RegExp(`\\{${placeholder}\\}`, "g"), String(value))
        })
      }

      return text
    }
  }, [userLanguage])

  return { t, language: userLanguage }
}
