"use client"

import TextInput from "components/TextInput/TextInput"
import type { Narrow } from "./types"
import { CardFieldPicker, FieldBlock } from "../BotInspectorControls"

export function SetFieldFields({ node, ctx, lookups, patch, t }: Narrow<"set_field">) {
  return (
    <>
      <FieldBlock label={t("advancedAutomationFieldField")}>
        <CardFieldPicker
          value={node.fieldId}
          onChange={(fieldId) => patch({ fieldId })}
          projects={ctx.crmProjects}
          lookups={lookups}
          t={t}
          placeholder={t("advancedAutomationPickField")}
        />
      </FieldBlock>
      <TextInput
        size="small"
        label={t("advancedAutomationFieldValue")}
        value={node.value}
        maxLength={1000}
        onChange={(e) => patch({ value: e.target.value })}
        helperText={t("advancedAutomationValueHint")}
        hideErrorMessage
        removeOptionalText
      />
    </>
  )
}

// --- handoff --------------------------------------------------------------------------------
