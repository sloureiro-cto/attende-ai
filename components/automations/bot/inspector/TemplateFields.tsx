"use client"

import type { Narrow } from "./types"
import { FieldBlock } from "../BotInspectorControls"
import { BotSelect } from "../BotSelect"

export function TemplateFields({ node, lookups, patch, t, channels }: Narrow<"send_meta_template">) {
  const { loadTemplates } = lookups
  const state = lookups.templates
  const items = state.data.map((x) => ({ value: x._id, displayName: `${x.name} · ${x.language}` }))
  if (node.templateId && !items.some((i) => i.value === node.templateId))
    items.unshift({ value: node.templateId, displayName: node.templateId })
  return (
    <FieldBlock label={t("salesBotFieldTemplate")} hint={t("salesBotTemplateHint")}>
      <BotSelect
        size="small"
        value={node.templateId}
        onValueChange={(templateId) => patch({ templateId })}
        onOpenChange={(open) => open && loadTemplates()}
        placeholder={state.status === "loading" ? t("salesBotLoading") : t("salesBotPickTemplate")}
        items={items}
        emptyContent={<p className="px-3 py-2 text-body-12 text-neutral-500">{t("salesBotNoTemplates")}</p>}
      />
      {channels.length > 0 && !channels.includes("whatsapp") ? (
        <p className="text-body-12 text-warning-darkest">{t("salesBotTemplateWhatsAppOnly")}</p>
      ) : null}
    </FieldBlock>
  )
}

// --- condition ------------------------------------------------------------------------------
