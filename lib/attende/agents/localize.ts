import type { AgentLanguage, LocalizedText } from "./types"

/** The app stores the user language as a word (`UserLanguageContext`); the contract uses two-letter keys. */
export type UserLanguageName = "english" | "portuguese" | "spanish"

const BY_NAME: Record<UserLanguageName, AgentLanguage> = { english: "en", portuguese: "pt", spanish: "es" }

export const toAgentLanguage = (name: string | undefined | null): AgentLanguage => BY_NAME[(name ?? "") as UserLanguageName] ?? "en"

/** Picks the text for a language, falling back to English then to any non-empty value. */
export function pickLocal(text: LocalizedText | string | undefined | null, language: AgentLanguage): string {
  if (!text) return ""
  if (typeof text === "string") return text
  return text[language] || text.en || text.pt || text.es || ""
}

/** The language the agent writes to customers in (`form.language`). Independent from the screen's language. */
export const agentLanguageOf = (form: { language?: unknown }): AgentLanguage => (form.language === "en" || form.language === "es" || form.language === "pt" ? form.language : "pt")
