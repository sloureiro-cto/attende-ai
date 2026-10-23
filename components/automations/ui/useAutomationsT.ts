"use client"

import { useCallback, useMemo } from "react"
import { useWorkspaceSettingsTranslation } from "hooks/useWorkspaceSettingsTranslation"
import { type AutomationsTranslationKey, automationsTranslations } from "lib/i18n/translations/automations"
import type { WorkspaceSettingsTranslationKey } from "lib/i18n/translations/workspaceSettings"

/** Keys of this feature, plus the app-wide settings keys it reuses (channel names, shared field labels). */
type AutomationsKey = AutomationsTranslationKey | WorkspaceSettingsTranslationKey
export type AutomationsTFn = (key: AutomationsKey, replacements?: Record<string, string | number>) => string

/** For keys built from a runtime value (`automationsEditorIssue_${code}`): the one place a key is asserted. */
export const automationsKey = (key: string): AutomationsKey => key as AutomationsKey

/**
 * The single translator of the automations feature.
 * - `t`: this feature's own typed dictionary (`lib/i18n/translations/automations.ts`).
 * - `strict`: the app-wide settings translator, needed by the shared legacy field components
 *   (`TemplateWhenFields` / `TemplateActionFields`) that read keys from `workspaceSettings.ts`.
 */
export function useAutomationsT() {
  const { t: strict, language } = useWorkspaceSettingsTranslation()

  const dictionary = useMemo(
    (): Record<string, string> => (automationsTranslations as Record<string, Record<string, string>>)[language] ?? automationsTranslations.english,
    [language]
  )

  const t = useCallback<AutomationsTFn>(
    (key, replacements) => {
      const english: Record<string, string> = automationsTranslations.english
      const own: string | undefined = dictionary[key] ?? english[key]
      // Not ours: the shared settings dictionary resolves it (and handles its own placeholders).
      if (own === undefined) return strict(key as WorkspaceSettingsTranslationKey, replacements)
      let text: string = own
      if (replacements) {
        for (const [placeholder, value] of Object.entries(replacements)) text = text.split(`{${placeholder}}`).join(String(value))
      }
      return text
    },
    [dictionary, strict]
  )

  return { t, strict, language }
}
