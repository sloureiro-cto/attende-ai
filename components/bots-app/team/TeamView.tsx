"use client"

import { Danger, People } from "iconsax-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { showToast } from "app/utils/showToast"
import Button from "components/Button/Button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "components/ui/alert-dialog"
import { canManageTeam, isAlreadyOnTeam, isLastManager, isValidEmail, pickRoleId, resolveMemberAccess, roleIdForName, RoleLite, seatUsage, TeamInvite, TeamMember } from "lib/attende/team"
import { InviteForm, InviteFormValue } from "./InviteForm"
import { defaultTeamActions, TeamActions } from "./teamActions"
import { InviteRow, MemberRow } from "./TeamRows"
import { BOTS_ROUTES } from "../brand"
import { BookDemoButton } from "../nav/BookDemoButton"
import { UsageMeter } from "../nav/UsageMeter"
import { useAttendeT } from "../nav/useAttendeT"
import { EmptyState } from "../ui/EmptyState"
import { PremiumCard } from "../ui/PremiumCard"

export type TeamViewData = {
  members: TeamMember[]
  invites: TeamInvite[]
  roles: RoleLite[]
  seatLimit: number | null
  failed: boolean
  rolesFailed: boolean
}

type Props = {
  data: TeamViewData
  workspaceId: string
  currentUserId?: string | null
  actions?: TeamActions
}

/** Members, pending invites, the invite form and the seat meter. Server data comes in as props; changes go through `actions`. */
export function TeamView({ data, workspaceId, currentUserId, actions = defaultTeamActions }: Props) {
  const { t } = useAttendeT()
  const router = useRouter()
  const [members, setMembers] = useState(data.members)
  const [invites, setInvites] = useState(data.invites)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [removeTarget, setRemoveTarget] = useState<TeamMember | null>(null)

  // `router.refresh()` re-renders the page with fresh props: adopt them.
  useEffect(() => {
    setMembers(data.members)
    setInvites(data.invites)
  }, [data.members, data.invites])

  const usage = useMemo(
    () => seatUsage({ members: members.length, pendingInvites: invites.filter((i) => i.status === "pending").length, limit: data.seatLimit }),
    [members, invites, data.seatLimit]
  )
  const inviteBlocked = usage.full || data.rolesFailed

  if (data.failed) {
    return (
      <EmptyState
        icon={<Danger size={22} />}
        title={t("teamLoadError")}
        action={
          <Button variant="secondary" style="outline" size="medium" onClick={() => router.refresh()}>
            {t("teamRetry")}
          </Button>
        }
      />
    )
  }

  /** The API's messages are English and technical: the user always gets the translated one. */
  const fail = (_error?: string) => showToast("error", t("teamActionError"))

  const handleInvite = async ({ email, choice }: InviteFormValue): Promise<{ ok: true } | { ok: false; error: string }> => {
    if (!isValidEmail(email)) return { ok: false, error: t("teamInviteInvalid") }
    if (isAlreadyOnTeam(email, members, invites)) return { ok: false, error: t("teamInviteDuplicate") }
    const roleId = pickRoleId(data.roles, choice)
    if (!roleId) return { ok: false, error: t("teamNoRoleAvailable") }
    const result = await actions.invite({ workspaceId, email, roleId })
    if (!result.ok) return { ok: false, error: t("teamActionError") }
    const roleName = data.roles.find((r) => r._id === roleId)?.name ?? ""
    setInvites((current) => [{ id: `local-${email}`, email, roleName, status: "pending", createdAt: new Date().toISOString() }, ...current])
    showToast("success", t("teamInviteSent", { email }))
    router.refresh()
    return { ok: true }
  }

  const revoke = async (invite: TeamInvite) => {
    setBusyId(invite.id)
    const result = await actions.revokeInvite({ inviteId: invite.id, status: invite.status })
    setBusyId(null)
    if (!result.ok) return fail(result.error)
    setInvites((current) => current.filter((i) => i.id !== invite.id))
    showToast("success", t("teamRevoked"))
    router.refresh()
  }

  // There is no "resend" endpoint: revoke the old invite and send a fresh one with the same role.
  const resend = async (invite: TeamInvite) => {
    const roleId = roleIdForName(data.roles, invite.roleName)
    if (!roleId) return fail(t("teamNoRoleAvailable"))
    setBusyId(invite.id)
    const revoked = await actions.revokeInvite({ inviteId: invite.id, status: invite.status })
    if (!revoked.ok) {
      setBusyId(null)
      return fail(revoked.error)
    }
    const sent = await actions.invite({ workspaceId, email: invite.email, roleId })
    setBusyId(null)
    if (!sent.ok) {
      setInvites((current) => current.filter((i) => i.id !== invite.id))
      fail(sent.error)
      router.refresh()
      return
    }
    showToast("success", t("teamResent", { email: invite.email }))
    router.refresh()
  }

  const confirmRemove = async () => {
    const target = removeTarget
    if (!target) return
    setRemoveTarget(null)
    setBusyId(target.id)
    const result = await actions.removeMember({ workspaceId, memberId: target.id })
    setBusyId(null)
    if (!result.ok) return fail(result.error)
    setMembers((current) => current.filter((m) => m.id !== target.id))
    showToast("success", t("teamRemoved", { name: target.name || target.email }))
    router.refresh()
  }

  const alone = members.length <= 1 && invites.length === 0
  const me = members.find((m) => !!currentUserId && m.id === currentUserId)
  // Unknown (e.g. members failed to resolve you) stays read-only: never offer actions the backend may refuse.
  const canManage = canManageTeam(me ? resolveMemberAccess(me.roleName, data.roles) : null)
  const overLimit = usage.limit !== null && usage.used > usage.limit

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex flex-col gap-6">
        <section aria-labelledby="team-members">
          <h2 id="team-members" className="mb-2 text-body-14 font-semibold text-neutral-900">
            {t("teamMembers")} <span className="font-normal text-neutral-400">{members.length}</span>
          </h2>
          <PremiumCard>
            <ul className="divide-y divide-neutral-50">
              {members.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  access={resolveMemberAccess(member.roleName, data.roles)}
                  isYou={!!currentUserId && member.id === currentUserId}
                  canManage={canManage && !isLastManager(member, members, data.roles)}
                  busy={busyId === member.id}
                  onRemove={() => setRemoveTarget(member)}
                />
              ))}
            </ul>
          </PremiumCard>
        </section>

        {invites.length > 0 && (
          <section aria-labelledby="team-pending">
            <h2 id="team-pending" className="mb-2 text-body-14 font-semibold text-neutral-900">
              {t("teamPending")} <span className="font-normal text-neutral-400">{invites.length}</span>
            </h2>
            <PremiumCard>
              <ul className="divide-y divide-neutral-50">
                {invites.map((invite) => (
                  <InviteRow key={invite.id} invite={invite} busy={busyId === invite.id} onResend={() => resend(invite)} onRevoke={() => revoke(invite)} />
                ))}
              </ul>
            </PremiumCard>
          </section>
        )}

        {alone && <EmptyState icon={<People size={22} />} title={t("teamEmptyTitle")} description={t("teamEmptyText")} action={<BookDemoButton />} />}
      </div>

      <aside className="flex flex-col gap-4">
        <PremiumCard className="flex flex-col gap-5 p-5">
          <h2 className="text-body-16 font-semibold text-neutral-900">{t("teamInviteTitle")}</h2>
          <UsageMeter label={t("teamMembers")} used={usage.used} limit={usage.limit} />
          <p className="text-body-12 text-neutral-700">{t("teamSeatsExplain")}</p>
          {overLimit && (
            <div role="status" className="flex flex-col gap-2 rounded-xl bg-warning-clean p-3 text-body-13 text-warning-darkest">
              <span>{t("teamSeatsOver", { used: usage.used, limit: usage.limit ?? 0 })}</span>
              <Link href={BOTS_ROUTES.billing} className="font-semibold underline underline-offset-2">
                {t("teamSeatsUpgrade")}
              </Link>
            </div>
          )}
          {usage.full && !overLimit && (
            <div role="alert" className="flex flex-col gap-2 rounded-xl bg-warning-clean p-3 text-body-13 text-warning-darkest">
              <span>{t("teamSeatsFull")}</span>
              <Link href={BOTS_ROUTES.billing} className="font-semibold underline underline-offset-2">
                {t("teamSeatsUpgrade")}
              </Link>
            </div>
          )}
          {data.rolesFailed && (
            <p role="alert" className="text-body-13 text-error-dark">
              {t("teamNoRoleAvailable")}
            </p>
          )}
          {/* With roles unreadable we can't tell who manages: keep the (disabled) form so the error explains why. */}
          {canManage || data.rolesFailed ? <InviteForm onSubmit={handleInvite} disabled={inviteBlocked} /> : <p className="text-body-13 text-neutral-700">{t("teamReadOnly")}</p>}
        </PremiumCard>
      </aside>

      <AlertDialog open={removeTarget !== null} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("teamRemoveTitle", { name: removeTarget?.name || removeTarget?.email || "" })}</AlertDialogTitle>
            <AlertDialogDescription>{t("teamRemoveBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("teamCancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemove}>{t("teamRemoveConfirm")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
