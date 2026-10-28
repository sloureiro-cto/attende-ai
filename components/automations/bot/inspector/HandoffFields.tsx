"use client"

import Link from "next/link"
import { useEffect } from "react"
import { actionClass } from "components/bots-app/ui/actionStyles"
import { TextArea } from "components/TextArea/TextArea"
import { SALES_BOT_LIMITS } from "lib/automations/botGraph"
import type { Narrow } from "./types"
import { BotHandoffTarget } from "../BotHandoffTarget"
import { FieldBlock } from "../BotInspectorControls"
import { BotSelect } from "../BotSelect"

const TARGETS = ["person", "ai"] as const

export function HandoffFields({ node, lookups, patch, t }: Narrow<"handoff">) {
  const toAi = node.to === "ai"
  return (
    <>
      <FieldBlock label={t("advancedAutomationFieldHandoffTo")}>
        <BotSelect
          value={toAi ? "ai" : "person"}
          onValueChange={(next) =>
            next === "ai"
              ? patch({
                  to: "ai",
                  assignMode: undefined,
                  userIds: undefined,
                  specificUserId: undefined,
                  workspaceRoleId: undefined,
                })
              : patch({ to: undefined, agentId: undefined, assignMode: "all_crm_members" })
          }
          items={TARGETS.map((v) => ({
            value: v,
            displayName: t(v === "ai" ? "advancedAutomationHandoffToAi" : "advancedAutomationHandoffToPerson"),
          }))}
        />
      </FieldBlock>
      <TextArea
        id={`bot-handoff-${node.id}`}
        label={t("advancedAutomationFieldHandoffMessage")}
        size="small"
        minRows={2}
        maxRows={6}
        autoResize
        maxLength={SALES_BOT_LIMITS.textChars}
        value={node.message ?? ""}
        onChange={(e) => patch({ message: e.target.value || undefined })}
        helperText={t(toAi ? "advancedAutomationHandoffAiMessageHint" : "advancedAutomationHandoffMessageHint")}
        hideErrorMessage
      />
      {toAi ? (
        <HandoffAgentPicker agentId={node.agentId} lookups={lookups} patch={patch} t={t} />
      ) : (
        <FieldBlock label={t("advancedAutomationFieldAssign")}>
          <BotHandoffTarget
            value={{
              assignMode: node.assignMode,
              userIds: node.userIds,
              specificUserId: node.specificUserId,
              workspaceRoleId: node.workspaceRoleId,
            }}
            lookups={lookups}
            onChange={patch}
            t={t}
          />
        </FieldBlock>
      )}
    </>
  )
}

/** The workspace's Attende AI agents (loaded when this mode opens), with loading, error and empty states. */
function HandoffAgentPicker({
  agentId,
  lookups,
  patch,
  t,
}: Pick<Narrow<"handoff">, "lookups" | "patch" | "t"> & { agentId?: string }) {
  const { loadAgents, agents } = lookups
  useEffect(() => {
    loadAgents()
  }, [loadAgents])

  const items = agents.data.map((a) => ({
    value: a.agentId,
    displayName: a.live ? a.name : t("advancedAutomationHandoffAgentPaused", { name: a.name }),
  }))
  const missing = !!agentId && agents.status === "ready" && !agents.data.some((a) => a.agentId === agentId)

  return (
    <FieldBlock label={t("advancedAutomationFieldHandoffAgent")} hint={t("advancedAutomationHandoffAiHint")}>
      {agents.status === "ready" && agents.data.length === 0 ? (
        <div className="flex flex-col items-start gap-2 rounded-lg border border-neutral-border bg-neutral-10 p-3">
          <p className="text-body-12 text-neutral-700">{t("advancedAutomationHandoffAgentsEmpty")}</p>
          <Link href="/ai-agents/new" className={actionClass({ variant: "secondary", size: "sm" })}>
            {t("advancedAutomationHandoffCreateAgent")}
          </Link>
        </div>
      ) : (
        <BotSelect
          value={missing ? "" : agentId ?? ""}
          onValueChange={(next) => patch({ agentId: next })}
          placeholder={agents.status === "ready" ? t("advancedAutomationPickAgent") : t("advancedAutomationLoading")}
          items={items}
          disabled={agents.status !== "ready"}
        />
      )}
      {agents.status === "error" ? (
        <div className="flex items-center justify-between gap-2" role="alert">
          <span className="text-body-12 text-error-dark">{t("advancedAutomationHandoffAgentsError")}</span>
          <button
            type="button"
            className={actionClass({ variant: "secondary", size: "sm" })}
            onClick={() => loadAgents()}
          >
            {t("advancedAutomationRetry")}
          </button>
        </div>
      ) : null}
      {missing ? (
        <p className="text-body-12 text-warning-darkest">{t("advancedAutomationHandoffAgentMissing")}</p>
      ) : null}
    </FieldBlock>
  )
}
