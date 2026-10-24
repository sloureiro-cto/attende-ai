"use client"

import type { Narrow } from "./types"
import { FieldBlock } from "../BotInspectorControls"
import { BotSelect } from "../BotSelect"

export function GotoBotFields({ node, lookups, patch, t }: Narrow<"goto_automation">) {
  const items = lookups.bots.data.map((b) => ({ value: b.id, displayName: b.name }))
  if (node.automationId && !items.some((i) => i.value === node.automationId))
    items.unshift({ value: node.automationId, displayName: node.automationId })
  return (
    <FieldBlock label={t("advancedAutomationFieldGotoBot")} hint={t("advancedAutomationGotoHint")}>
      <BotSelect
        size="small"
        value={node.automationId}
        onValueChange={(automationId) => patch({ automationId })}
        onOpenChange={(open) => open && lookups.loadBots()}
        placeholder={lookups.bots.status === "loading" ? t("advancedAutomationLoading") : t("advancedAutomationPickBot")}
        items={items}
        emptyContent={<p className="px-3 py-2 text-body-12 text-neutral-500">{t("advancedAutomationNoBots")}</p>}
      />
    </FieldBlock>
  )
}

// --- set_field ------------------------------------------------------------------------------
