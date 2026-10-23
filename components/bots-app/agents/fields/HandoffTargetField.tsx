"use client"

import { AlertTriangle, Loader2 } from "lucide-react"
import { useCallback, useEffect, useId, useState } from "react"
import { cn } from "@/lib/utils"
import { listHandoffMembersAction } from "actions/attende/agents"
import type { HandoffTarget } from "lib/attende/agents/sections"
import { chipClass, controlClass, fieldId } from "./classes"
import { actionClass } from "../../ui/actionStyles"
import type { AttendeAgentsT } from "../useAttendeAgentsT"

export type HandoffMember = { id: string; name: string; email: string }
type MembersState = { status: "loading" } | { status: "error" } | { status: "ready"; members: HandoffMember[] }

/** The workspace members a handoff can go to, loaded once per page and shared by every picker and summary. */
let cache: Promise<HandoffMember[] | null> | null = null
const load = () => (cache ??= listHandoffMembersAction().then((r) => (r.success ? r.data : null)))

export function useHandoffMembers() {
  const [state, setState] = useState<MembersState>({ status: "loading" })
  const fetchMembers = useCallback((force = false) => {
    if (force) cache = null
    setState({ status: "loading" })
    let alive = true
    void load().then((members) => {
      if (!alive) return
      if (members) setState({ status: "ready", members })
      else {
        cache = null
        setState({ status: "error" })
      }
    })
    return () => {
      alive = false
    }
  }, [])
  useEffect(() => fetchMembers(), [fetchMembers])
  return { state, retry: () => fetchMembers(true) }
}

/** Test hook: forget the members loaded by a previous render. */
export const resetHandoffMembersCache = () => {
  cache = null
}

type Props = {
  path: string
  value: HandoffTarget
  onChange: (next: HandoffTarget) => void
  t: AttendeAgentsT
  error?: string | null
}

/**
 * Who receives a conversation the agent hands over: the whole team (it waits in "Waiting for team") or one member
 * (the backend assigns it to them if they are still on the team and nobody owns it yet). A saved member who left the
 * team is said plainly, and the user can pick again.
 */
export function HandoffTargetField({ path, value, onChange, t, error }: Props) {
  const { state, retry } = useHandoffMembers()
  const selectId = useId()
  const id = fieldId(path)
  const isUser = value.kind === "user"
  const members = state.status === "ready" ? state.members : []
  const removed = isUser && state.status === "ready" && !!value.userId && !members.some((m) => m.id === value.userId)

  return (
    <fieldset id={id} tabIndex={-1} className="flex min-w-0 flex-col gap-3 focus:outline-none">
      <legend className="mb-1.5 text-body-14 font-semibold text-neutral-900">{t("handoffTargetLabel")}</legend>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("handoffTargetLabel")}>
        {(["team", "user"] as const).map((kind) => (
          <button
            key={kind}
            type="button"
            role="radio"
            aria-checked={value.kind === kind}
            onClick={() => onChange(kind === "team" ? { kind: "team" } : { kind: "user", userId: value.kind === "user" ? value.userId : "" })}
            className={cn(chipClass, "min-h-11 px-4 text-body-14", value.kind === kind ? "border-primary bg-primary-clean font-semibold text-primary-darkest" : "border-neutral-border bg-white text-neutral-700 hover:border-primary-lighter")}
          >
            {kind === "team" ? t("handoffTargetTeam") : t("handoffTargetUser")}
          </button>
        ))}
      </div>
      <p className="text-body-13 text-neutral-600">{isUser ? t("handoffTargetUserHint") : t("handoffTargetTeamHint")}</p>

      {isUser && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={selectId} className="text-body-13 font-medium text-neutral-700">
            {t("handoffTargetPerson")}
          </label>
          {state.status === "loading" ? (
            <p role="status" className="flex items-center gap-2 text-body-13 text-neutral-600">
              <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
              {t("handoffMembersLoading")}
            </p>
          ) : state.status === "error" ? (
            <div role="alert" className="flex flex-wrap items-center gap-2 text-body-13 text-neutral-900">
              <span>{t("handoffMembersError")}</span>
              <button type="button" onClick={retry} className={actionClass({ variant: "secondary", size: "sm" })}>
                {t("retry")}
              </button>
            </div>
          ) : members.length === 0 ? (
            <p className="text-body-13 text-neutral-600">{t("handoffMembersEmpty")}</p>
          ) : (
            <select
              id={selectId}
              value={removed ? "" : value.userId}
              aria-invalid={!!error || undefined}
              onChange={(e) => onChange({ kind: "user", userId: e.target.value })}
              className={cn(controlClass, "max-w-md")}
            >
              <option value="">{t("handoffTargetPlaceholder")}</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {t("handoffTargetMember", { name: m.name || m.email, email: m.email })}
                </option>
              ))}
            </select>
          )}
          {removed && (
            <p role="status" className="flex items-start gap-1.5 text-body-13 font-medium text-warning-darkest">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              {t("handoffTargetRemoved")}
            </p>
          )}
          {error && (
            <p id={`${id}-error`} role="alert" className="text-body-13 font-medium text-error-dark">
              {error}
            </p>
          )}
        </div>
      )}
    </fieldset>
  )
}

/** Who receives a handover, in words: the whole team, the member's name, or that the member left the team. */
export function HandoffTargetText({ target, t }: { target: HandoffTarget; t: AttendeAgentsT }) {
  const { state } = useHandoffMembers()
  if (target.kind === "team") return <>{t("sumTargetTeam")}</>
  if (state.status !== "ready") return <>{t("sumTargetUnknown")}</>
  const member = state.members.find((m) => m.id === target.userId)
  if (!member) return <span className="text-warning-darkest">{t("handoffTargetRemoved")}</span>
  return <>{t("sumTargetUser", { name: member.name || member.email })}</>
}
