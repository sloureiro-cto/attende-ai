"use client"

import { ArrowLeft2, LogoutCurve, TickCircle, User } from "iconsax-react"
import Link from "next/link"
import { signOut, useSession } from "next-auth/react"
import { Dropdown, DropdownTrigger } from "components/ui/dropdown-menu"
import { useUserLanguage } from "context/UserLanguageContext"
import { useProfilePhotoUrl } from "lib/attende/profilePhoto"
import { APP_LANGUAGES, translateLocale } from "lib/i18n/translations/attende/locale"
import { UserAvatar } from "./account/UserAvatar"
import { BOTS_BRAND, BOTS_ROUTES } from "./brand"
import { MenuContent, MenuItem } from "./ui/Menu"
import { useBotsAppT } from "./useBotsAppT"

export function initialsOf(name?: string | null, email?: string | null): string {
  const source = (name?.trim() || email?.trim() || "?").replace(/@.*/, "")
  const parts = source.split(/[\s._-]+/).filter(Boolean)
  const letters = parts.length > 1 ? `${parts[0]![0]}${parts[1]![0]}` : source.slice(0, 2)
  return letters.toUpperCase()
}

/** Avatar button with profile, "Back to JSYNQ" and sign out. Sign out only ends the bots-app session. */
export function AccountMenu({ variant = "avatar" }: { variant?: "avatar" | "row" }) {
  const { userLanguage: language, setUserLanguage } = useUserLanguage()
  const { t } = useBotsAppT()
  const { data } = useSession()
  const user = data?.user
  const photo = useProfilePhotoUrl(user?.id || user?.email, user?.image)
  const initials = initialsOf(user?.name, user?.email)

  return (
    <Dropdown>
      <DropdownTrigger asChild>
        {variant === "row" ? (
          <button
            type="button"
            aria-label={t("accountMenu")}
            className="flex w-full min-w-0 items-center gap-2.5 rounded-md p-1.5 text-left transition-colors hover:bg-neutral-10"
          >
            <UserAvatar src={photo} initials={initials} className="size-8 text-body-12" />
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-body-13 font-semibold text-neutral-900">{user?.name}</span>
              <span className="truncate text-body-12 text-neutral-400">{user?.email}</span>
            </span>
          </button>
        ) : (
          <button
            type="button"
            aria-label={t("accountMenu")}
            className="shrink-0 rounded-full ring-2 ring-white transition-transform hover:scale-105 motion-reduce:transform-none"
          >
            <UserAvatar src={photo} initials={initials} className="size-9 text-body-12" />
          </button>
        )}
      </DropdownTrigger>
      <MenuContent align={variant === "row" ? "start" : "end"} side={variant === "row" ? "top" : undefined}>
        <div className="flex flex-col gap-0.5 px-2.5 pb-2 pt-1.5">
          <span className="truncate text-body-13 font-semibold text-neutral-900">{user?.name}</span>
          <span className="truncate text-body-12 text-neutral-400">{user?.email}</span>
        </div>
        <MenuItem asChild>
          <Link href={BOTS_ROUTES.me}>
            <User size={16} aria-hidden />
            {t("accountProfile")}
          </Link>
        </MenuItem>
        <MenuItem asChild>
          <a href={BOTS_BRAND.jsynqUrl} rel="noopener noreferrer">
            <ArrowLeft2 size={16} aria-hidden />
            {t("accountBackToJsynq")}
          </a>
        </MenuItem>
        <p className="mt-1 border-t border-neutral-50 px-2.5 pb-1 pt-2 text-body-11 font-semibold text-neutral-400">{translateLocale(language, "languageLabel")}</p>
        {APP_LANGUAGES.map((option) => (
          <MenuItem key={option.id} onSelect={() => setUserLanguage(option.id)} aria-checked={language === option.id} role="menuitemradio">
            <span lang={option.htmlLang} className="flex-1">
              {option.name}
            </span>
            {language === option.id && <TickCircle size={16} variant="Bold" className="shrink-0 text-primary" aria-hidden />}
          </MenuItem>
        ))}
        <div className="my-1 border-t border-neutral-50" role="separator" />
        <MenuItem danger onSelect={() => void signOut({ callbackUrl: BOTS_ROUTES.login })}>
          <LogoutCurve size={16} aria-hidden />
          {t("accountSignOut")}
        </MenuItem>
      </MenuContent>
    </Dropdown>
  )
}
