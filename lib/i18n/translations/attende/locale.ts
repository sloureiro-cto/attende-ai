/** Strings of the language picker (account menu). Language names are endonyms: each written in its own language. */
type Entry = { en: string; pt: string; es: string }

const entries = {
  languageLabel: { en: "Language", pt: "Idioma", es: "Idioma" },
  languageSaved: { en: "Language updated", pt: "Idioma atualizado", es: "Idioma actualizado" },
} satisfies Record<string, Entry>

export type LocaleKey = keyof typeof entries

const FIELD = { english: "en", portuguese: "pt", spanish: "es" } as const

export function translateLocale(language: string, key: LocaleKey): string {
  const entry: Entry = entries[key]
  return entry[FIELD[language as keyof typeof FIELD] ?? "en"] ?? entry.en
}

/** The languages the app ships, as their speakers write them. */
export const APP_LANGUAGES = [
  { id: "portuguese", name: "Português (Brasil)", htmlLang: "pt-BR" },
  { id: "english", name: "English", htmlLang: "en" },
  { id: "spanish", name: "Español", htmlLang: "es" },
] as const
