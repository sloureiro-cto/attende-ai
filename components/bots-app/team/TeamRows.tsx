"use client"

import { More } from "iconsax-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import IconButton from "components/IconButton/IconButton"
import { Dropdown, DropdownTrigger } from "components/ui/dropdown-menu"
import { choiceOfRoleName, type MemberAccess, TeamInvite, TeamMember } from "lib/attende/team"
import { useAttendeT } from "../nav/useAttendeT"
import { MenuContent, MenuItem } from "../ui/Menu"

export const initialsOfName = (name: string, email: string): string => {
  const source = name.trim() || email.split("@")[0] || "?"
  const parts = source.split(/[\s._-]+/).filter(Boolean)
  const letters = parts.length > 1 ? `${parts[0]![0]}${parts[1]![0]}` : source.slice(0, 2)
  return letters.toUpperCase()
}

function Avatar({ name, email, image }: { name: string; email: string; image?: string | null }) {
  // A photo that fails to load (expired link) falls back to the initials instead of a broken image.
  const [failed, setFailed] = useState(false)
  return image && !failed ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={image} alt="" onError={() => setFailed(true)} className="size-9 shrink-0 rounded-full object-cover" />
  ) : (
    <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-clean text-body-12 font-semibold text-primary-dark">
      {initialsOfName(name, email)}
    </span>
  )
}

/** A member's role as Attende-ai reads it (resolved against the workspace's role types, never by a lookalike name). */
function AccessLabel({ access }: { access: MemberAccess }) {
  const { t } = useAttendeT()
  switch (access.kind) {
    case "owner":
      return <>{t("teamRoleOwner")}</>
    case "admin":
      return <>{t("teamRoleAdmin")}</>
    case "agent":
      return <>{t("teamRoleAgent")}</>
    case "viewer":
      return <>{t("teamRoleViewer")}</>
    case "custom":
      return <>{t("teamRoleCustom", { name: access.name })}</>
    default:
      return <>{t("teamRoleNone")}</>
  }
}

/** Invites carry only the role name, from roles this screen picked (or an older custom one): same reading. */
function InviteRoleLabel({ roleName }: { roleName: string }) {
  const { t } = useAttendeT()
  const choice = choiceOfRoleName(roleName)
  return <>{choice === "admin" ? t("teamRoleAdmin") : choice === "agent" ? t("teamRoleAgent") : roleName || t("teamRoleNone")}</>
}

function Chip({ tone, children }: { tone: "ok" | "info" | "warn"; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full px-2.5 text-body-12 font-medium",
        tone === "ok" && "bg-primary-clean text-primary-dark",
        tone === "info" && "bg-info-clean text-info-darkest",
        tone === "warn" && "bg-warning-clean text-warning-darkest"
      )}
    >
      {children}
    </span>
  )
}

export function MemberRow({
  member,
  access,
  isYou,
  canManage,
  busy,
  onRemove,
}: {
  member: TeamMember
  access: MemberAccess
  isYou: boolean
  canManage: boolean
  busy: boolean
  onRemove: () => void
}) {
  const { t } = useAttendeT()
  const label = member.name || member.email
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <Avatar name={member.name} email={member.email} image={member.image} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-body-14 font-semibold text-neutral-900">
          {label}
          {isYou && <span className="ml-2 text-body-12 font-medium text-neutral-400">{t("teamYou")}</span>}
        </span>
        {member.name && <span className="truncate text-body-12 text-neutral-500">{member.email}</span>}
        {/* The role sits under the e-mail until there is room for its own column (custom role names can be long). */}
        <span className="truncate text-body-12 text-neutral-700 xl:hidden">
          <AccessLabel access={access} />
        </span>
      </div>
      <span className="hidden max-w-48 truncate text-right text-body-13 text-neutral-500 xl:block">
        <AccessLabel access={access} />
      </span>
      <span className="hidden shrink-0 sm:block">
        <Chip tone="ok">{t("teamStatusActive")}</Chip>
      </span>
      {/* The owner can't be removed, nor yourself, nor anyone when you don't manage the team. */}
      {isYou || access.kind === "owner" || !canManage ? (
        <span className="w-9" aria-hidden />
      ) : (
        <Dropdown>
          <DropdownTrigger asChild>
            <IconButton type="button" size="medium" variant="ghost" disabled={busy} aria-label={t("teamMoreAria", { name: label })} icon={<More size={16} />} />
          </DropdownTrigger>
          <MenuContent align="end">
            <MenuItem danger onSelect={onRemove}>
              {t("teamRemove")}
            </MenuItem>
          </MenuContent>
        </Dropdown>
      )}
    </li>
  )
}

export function InviteRow({ invite, busy, onResend, onRevoke }: { invite: TeamInvite; busy: boolean; onResend: () => void; onRevoke: () => void }) {
  const { t } = useAttendeT()
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <Avatar name="" email={invite.email} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-body-14 font-semibold text-neutral-900">{invite.email}</span>
        <span className="truncate text-body-12 text-neutral-700 xl:hidden">
          <InviteRoleLabel roleName={invite.roleName} />
        </span>
      </div>
      <span className="hidden max-w-48 truncate text-right text-body-13 text-neutral-500 xl:block">
        <InviteRoleLabel roleName={invite.roleName} />
      </span>
      {/* The status always shows: it is what tells an invite apart from a member. */}
      <span className="shrink-0">
        <Chip tone={invite.status === "failed" ? "warn" : "info"}>{invite.status === "failed" ? t("teamStatusFailed") : t("teamStatusInvited")}</Chip>
      </span>
      <Dropdown>
        <DropdownTrigger asChild>
          <IconButton type="button" size="medium" variant="ghost" disabled={busy} aria-label={t("teamMoreAria", { name: invite.email })} icon={<More size={16} />} />
        </DropdownTrigger>
        <MenuContent align="end">
          <MenuItem onSelect={onResend}>{t("teamResend")}</MenuItem>
          <MenuItem danger onSelect={onRevoke}>
            {t("teamRevoke")}
          </MenuItem>
        </MenuContent>
      </Dropdown>
    </li>
  )
}
