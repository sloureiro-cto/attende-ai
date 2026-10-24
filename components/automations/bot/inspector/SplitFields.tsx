"use client"

import { Plus, Trash2 } from "lucide-react"
import Button from "components/Button/Button"
import IconButton from "components/IconButton/IconButton"
import TextInput from "components/TextInput/TextInput"
import { newBotId } from "lib/automations/botGraph"
import type { Narrow } from "./types"
import { FieldBlock } from "../BotInspectorControls"

export function SplitFields({ node, patch, t }: Narrow<"split">) {
  const total = node.paths.reduce((n, p) => n + p.percent, 0)
  const remainder = Math.max(0, 100 - total)
  return (
    <FieldBlock label={t("advancedAutomationFieldPaths")} hint={t("advancedAutomationSplitHint", { percent: remainder })}>
      <div className="flex flex-col gap-2">
        {node.paths.map((p, i) => (
          <div key={p.id} className="flex items-center gap-2">
            <TextInput
              size="small"
              aria-label={t("advancedAutomationPathName", { n: i + 1 })}
              value={p.name}
              maxLength={30}
              containerClassName="min-w-0 flex-1"
              hideErrorMessage
              onChange={(e) =>
                patch({ paths: node.paths.map((x) => (x.id === p.id ? { ...x, name: e.target.value } : x)) })
              }
            />
            <TextInput
              size="small"
              type="number"
              min={0}
              max={100}
              aria-label={t("advancedAutomationPathPercent", { n: i + 1 })}
              value={String(p.percent)}
              containerClassName="w-20"
              hideErrorMessage
              onChange={(e) =>
                patch({
                  paths: node.paths.map((x) =>
                    x.id === p.id
                      ? { ...x, percent: Math.max(0, Math.min(100, Math.round(Number(e.target.value) || 0))) }
                      : x
                  ),
                })
              }
            />
            <IconButton
              type="button"
              size="large"
              variant="ghost"
              aria-label={t("advancedAutomationRemovePath")}
              disabled={node.paths.length <= 1}
              onClick={() => patch({ paths: node.paths.filter((x) => x.id !== p.id) })}
              className="hover:text-error-darkest"
              icon={<Trash2 />}
            />
          </div>
        ))}
        {total > 100 ? <p className="text-body-12 text-error-darkest">{t("advancedAutomationSplitOver")}</p> : null}
        <Button
          size="small"
          variant="secondary"
          style="outline"
          startIcon={<Plus className="size-3.5" />}
          disabled={node.paths.length >= 10}
          onClick={() =>
            patch({
              paths: [
                ...node.paths,
                { id: newBotId("p"), name: String.fromCharCode(65 + node.paths.length), percent: remainder },
              ],
            })
          }
        >
          {t("advancedAutomationAddPath")}
        </Button>
      </div>
    </FieldBlock>
  )
}

// --- ai_agent -------------------------------------------------------------------------------
