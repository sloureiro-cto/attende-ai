"use client"

import type { Narrow } from "./types"
import { FieldBlock } from "../BotInspectorControls"
import { BotSelect } from "../BotSelect"

export function GotoBotFields({ node, lookups, patch, t }: Narrow<"goto_bot">) {
  const items = lookups.bots.data.map((b) => ({ value: b.id, displayName: b.name }))
  if (node.botId && !items.some((i) => i.value === node.botId))
    items.unshift({ value: node.botId, displayName: node.botId })
  return (
    <FieldBlock label={t("salesBotFieldGotoBot")} hint={t("salesBotGotoHint")}>
      <BotSelect
        size="small"
        value={node.botId}
        onValueChange={(botId) => patch({ botId })}
        onOpenChange={(open) => open && lookups.loadBots()}
        placeholder={lookups.bots.status === "loading" ? t("salesBotLoading") : t("salesBotPickBot")}
        items={items}
        emptyContent={<p className="px-3 py-2 text-body-12 text-neutral-500">{t("salesBotNoBots")}</p>}
      />
    </FieldBlock>
  )
}

// --- set_field ------------------------------------------------------------------------------
