"use client"

import { Sms } from "iconsax-react"
import { FormEvent, useState } from "react"
import { cn } from "@/lib/utils"
import Button from "components/Button/Button"
import TextInput from "components/TextInput/TextInput"
import { TEAM_ROLE_CHOICES, TeamRoleChoice } from "lib/attende/team"
import { useAttendeT } from "../nav/useAttendeT"

export type InviteFormValue = { email: string; choice: TeamRoleChoice }

type Props = {
  onSubmit: (value: InviteFormValue) => Promise<{ ok: true } | { ok: false; error: string }>
  /** No free seats / no roles: the form stays visible but cannot send. */
  disabled?: boolean
}

/** Email + one of two plain-language roles. Validation runs before anything is sent. */
export function InviteForm({ onSubmit, disabled = false }: Props) {
  const { t } = useAttendeT()
  const [email, setEmail] = useState("")
  const [choice, setChoice] = useState<TeamRoleChoice>("agent")
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (sending || disabled) return
    setSending(true)
    setError(null)
    const result = await onSubmit({ email: email.trim(), choice })
    setSending(false)
    if (result.ok) setEmail("")
    else setError(result.error)
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <TextInput
        label={t("teamInviteEmail")}
        aria-label={t("teamInviteEmail")}
        startIcon={<Sms size={18} />}
        type="email"
        name="email"
        autoComplete="off"
        placeholder={t("teamInviteEmailPlaceholder")}
        value={email}
        onChange={(e) => {
          setEmail(e.target.value)
          if (error) setError(null)
        }}
        error={error}
        disabled={disabled || sending}
        size="medium"
        removeOptionalText
      />

      <fieldset className="flex flex-col gap-2" disabled={disabled || sending}>
        <legend className="mb-1 text-body-13 font-medium text-neutral-900">{t("teamInviteRole")}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {TEAM_ROLE_CHOICES.map((id) => {
            const selected = choice === id
            return (
              <label
                key={id}
                className={cn(
                  "flex cursor-pointer flex-col gap-0.5 rounded-xl border p-3 transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-primary",
                  selected ? "border-primary bg-primary-clean" : "border-neutral-50 bg-white hover:bg-neutral-10",
                  (disabled || sending) && "cursor-not-allowed opacity-60"
                )}
              >
                <input type="radio" name="role" value={id} checked={selected} onChange={() => setChoice(id)} className="sr-only" />
                <span className="text-body-14 font-semibold text-neutral-900">{t(id === "admin" ? "teamRoleAdmin" : "teamRoleAgent")}</span>
                <span className="text-body-12 text-neutral-500">{t(id === "admin" ? "teamRoleAdminHint" : "teamRoleAgentHint")}</span>
              </label>
            )
          })}
        </div>
      </fieldset>

      <div>
        <Button type="submit" size="medium" loading={sending} disabled={disabled || sending || email.trim() === ""}>
          {sending ? t("teamInviteSending") : t("teamInviteSend")}
        </Button>
      </div>
    </form>
  )
}
