/** Tiny typed translator shared by the shell dictionaries (nav, team, pricing). en/pt/es, `{name}` replacements. */
export type ShellEntry = { en: string; pt: string; es: string }
export type ShellLanguage = "english" | "portuguese" | "spanish"

const LANGUAGE_FIELD = { english: "en", portuguese: "pt", spanish: "es" } as const

export function translateShellEntry(
  entries: Record<string, ShellEntry>,
  language: ShellLanguage,
  key: string,
  replacements?: Record<string, string | number>
): string {
  const entry = entries[key]
  if (!entry) return key
  let text = entry[LANGUAGE_FIELD[language]] ?? entry.en
  if (replacements) {
    for (const [name, value] of Object.entries(replacements)) {
      text = text.split(`{${name}}`).join(String(value))
    }
  }
  return text
}
