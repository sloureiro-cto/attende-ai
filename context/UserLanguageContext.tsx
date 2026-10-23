"use client"

import { createContext, ReactNode, useContext, useEffect, useState } from "react"
import { getMeAction } from "actions/me/getMe"
import { updateUserAction } from "actions/users/updateUser"
import { Language } from "lib/i18n/translations/profile"

const LANGUAGE_MAP: Record<string, Language> = {
  en: "english",
  "en-US": "english",
  "en-GB": "english",
  pt: "portuguese",
  "pt-BR": "portuguese",
  "pt-PT": "portuguese",
  es: "spanish",
  "es-ES": "spanish",
  "es-MX": "spanish",
  "es-AR": "spanish",
}

interface UserLanguageContextType {
  userLanguage: Language
  isLoading: boolean
  setUserLanguage: (language: Language) => void
}

const UserLanguageContext = createContext<UserLanguageContextType | undefined>(undefined)

interface UserLanguageProviderProps {
  children: ReactNode
}

export function UserLanguageProvider({ children }: UserLanguageProviderProps) {
  const [userLanguage, setUserLanguageState] = useState<Language>("english")
  const [isLoading, setIsLoading] = useState(true)

  /** Language from geo: Brazil → portuguese, otherwise → english. */
  const getGeoLanguage = (): Language => {
    if (typeof window === "undefined") return "english"
    const country = (window as unknown as { __INITIAL_GEO_COUNTRY__?: string }).__INITIAL_GEO_COUNTRY__
    return country === "BR" ? "portuguese" : "english"
  }

  const detectBrowserLanguage = (): Language => {
    if (typeof window === "undefined") return "english"

    // Priority 1: Geo (location-based) – Brazil → pt-BR, otherwise English
    const geoLang = getGeoLanguage()
    if (geoLang) return geoLang

    // Fallback: browser language
    const browserLanguages = navigator.languages || [navigator.language || "en"]
    const hasPtBr = browserLanguages.some(
      (lang) => lang.toLowerCase() === "pt-br" || lang.toLowerCase().startsWith("pt-br")
    )
    if (hasPtBr) return "portuguese"
    const primaryLang = browserLanguages[0] || "en"
    if (LANGUAGE_MAP[primaryLang]) return LANGUAGE_MAP[primaryLang] ?? "english"
    const langCode = primaryLang.split("-")[0]
    if (langCode && LANGUAGE_MAP[langCode]) return LANGUAGE_MAP[langCode] ?? "english"
    return "english"
  }

  const saveUserLanguage = async (language: Language) => {
    try {
      await updateUserAction({ language })
    } catch (error) {
      console.error("Failed to save user language:", error)
    }
  }

  const saveLocalLanguage = (language: Language) => {
    window?.localStorage.setItem("language", language === "english" ? "en" : language === "portuguese" ? "pt" : "es")
  }

  const setUserLanguage = async (language: Language) => {
    setUserLanguageState(language)
    saveLocalLanguage(language)
    await saveUserLanguage(language)
  }

  const getLocalLanguage = (): Language | null => {
    if (typeof window === "undefined") return null
    const localLanguage = window?.localStorage.getItem("language")
    return localLanguage ? LANGUAGE_MAP[localLanguage] ?? null : null
  }

  const initializeUserLanguage = async () => {
    try {
      // Default for non-logged-in: language by location (Brazil → pt-BR, otherwise English)
      const geoLanguage = getGeoLanguage()
      setUserLanguageState(geoLanguage)

      // Override with saved preference in localStorage if any
      const localLanguage = getLocalLanguage()
      if (localLanguage) {
        setUserLanguageState(localLanguage)
      }

      setIsLoading(true)
      // Server actions share one strictly-serialized Next.js dispatch queue —
      // a client-side navigation that starts while this one is still queued
      // (e.g. clicking a Library document right after this provider mounts)
      // discards it without ever resolving or rejecting. Without a timeout,
      // `isLoading` would then stay `true` for the rest of the SPA session,
      // and any page gating its render on it (the spreadsheet editor) would
      // never mount until a hard refresh.
      const { data, success } = await Promise.race([
        getMeAction(),
        new Promise<Awaited<ReturnType<typeof getMeAction>>>((resolve) =>
          setTimeout(() => resolve({ success: false, error: "timed out" }), 5000)
        ),
      ])

      // If user is logged in and has a language preference, use it
      if (success && data?.user?.language) {
        setUserLanguageState(data.user.language as Language)
        if (localLanguage !== data.user.language) {
          saveLocalLanguage(data.user.language as Language)
        }
      } else if (!localLanguage) {
        // User not logged in and no local preference: keep geo-based language and persist it
        saveLocalLanguage(geoLanguage)
      }
    } catch (error) {
      console.error("Failed to initialize user language:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    setTimeout(() => {
      initializeUserLanguage()
    }, 100) // add delay to prevent race condition
  }, [])

  return (
    <UserLanguageContext.Provider value={{ userLanguage, isLoading, setUserLanguage }}>
      {children}
    </UserLanguageContext.Provider>
  )
}

export function useUserLanguage() {
  const context = useContext(UserLanguageContext)
  if (context === undefined) {
    throw new Error("useUserLanguage must be used within a UserLanguageProvider")
  }
  return context
}
