"use client"

import { Plus, Trash2 } from "lucide-react"
import { useAutomationsT } from "components/automations/ui/useAutomationsT"
import Button from "components/Button/Button"
import IconButton from "components/IconButton/IconButton"
import { TemplateWhenFields } from "components/settings/whatsapp-lite/template-rule-forms"
import TextInput from "components/TextInput/TextInput"
import { newBotId } from "lib/automations/botGraph"
import { buildWhen, createDefaultAdditionalCondition, parseWhen } from "lib/whatsapp-lite/whatsappTemplateRuleBuilder"
import type { Narrow } from "./types"
import { FieldBlock } from "../BotInspectorControls"
import type { BotLookups } from "../useBotLookups"

export function ConditionFields({ node, channels, ctx, lookups, patch, t }: Narrow<"condition">) {
  const { strict } = useAutomationsT()
  const rows = node.rows
  const channel = channels[0] ?? "whatsapp"
  return (
    <FieldBlock label={t("salesBotFieldRules")} hint={t("salesBotRulesHint")}>
      <div className="flex flex-col gap-3">
        {rows.map((row, i) => (
          <div key={row.id} className="flex flex-col gap-2 rounded-md border border-neutral-50 p-3">
            <div className="flex items-center gap-2">
              <TextInput
                size="small"
                aria-label={t("salesBotRuleName", { n: i + 1 })}
                value={row.name}
                maxLength={40}
                placeholder={t("salesBotRuleName", { n: i + 1 })}
                containerClassName="min-w-0 flex-1"
                hideErrorMessage
                onChange={(e) =>
                  patch({ rows: rows.map((r) => (r.id === row.id ? { ...r, name: e.target.value } : r)) })
                }
              />
              <IconButton
                type="button"
                size="large"
                variant="ghost"
                aria-label={t("salesBotRemoveRule")}
                onClick={() => patch({ rows: rows.filter((r) => r.id !== row.id) })}
                className="hover:text-error-darkest"
                icon={<Trash2 />}
              />
            </div>
            <TemplateWhenFields
              when={parseWhen(row.condition) ?? createDefaultAdditionalCondition()}
              onWhenChange={(next) =>
                patch({ rows: rows.map((r) => (r.id === row.id ? { ...r, condition: buildWhen(next) } : r)) })
              }
              t={strict}
              llmWhenEnabled={false}
              conditionIndex={i}
              conditionsCount={rows.length}
              crmProjects={ctx.crmProjects}
              channel={channel}
              columnsByProjectId={columnsByProject(lookups)}
              onRequestColumns={(projectId, boardId) => lookups.loadProjectColumns(projectId, boardId, ctx.crmProjects)}
            />
          </div>
        ))}
        <Button
          size="small"
          variant="secondary"
          style="outline"
          startIcon={<Plus className="size-3.5" />}
          onClick={() =>
            patch({
              rows: [
                ...rows,
                { id: newBotId("r"), name: "", condition: buildWhen(createDefaultAdditionalCondition()) },
              ],
            })
          }
        >
          {t("salesBotAddRule")}
        </Button>
      </div>
    </FieldBlock>
  )
}

function columnsByProject(lookups: BotLookups) {
  const out: Record<string, import("app/_types/Column").IColumn[]> = {}
  for (const [projectId, v] of Object.entries(lookups.projectColumns)) out[projectId] = v.data
  return out
}

// --- split ----------------------------------------------------------------------------------
