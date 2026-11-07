"use client"

import { TextArea } from "components/TextArea/TextArea"
import type { Narrow } from "./types"
import { CardFieldPicker } from "./CardFieldPicker"
import { FieldBlock } from "../BotInspectorControls"

export function AiAgentFields({ node, ctx, lookups, patch, t }: Narrow<"ai_agent">) {
  return (
    <>
      <TextArea
        id={`bot-ai-${node.id}`}
        label={t("advancedAutomationFieldAiInstruction")}
        size="small"
        minRows={3}
        maxRows={8}
        autoResize
        maxLength={1000}
        value={node.instruction}
        onChange={(e) => patch({ instruction: e.target.value })}
        helperText={t("advancedAutomationAiHint")}
        removeOptionalText
        hideErrorMessage
      />
      <FieldBlock label={t("advancedAutomationFieldSaveAnswer")}>
        <CardFieldPicker
          value={{ fieldId: node.saveAnswerTo }}
          onChange={(next) => patch({ saveAnswerTo: next.fieldId })}
          projects={ctx.crmProjects}
          lookups={lookups}
          t={t}
          includeOwner={false}
        />
      </FieldBlock>
    </>
  )
}

// --- goto_automation -------------------------------------------------------------------------------
