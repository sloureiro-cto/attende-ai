"use client"

import TextInput from "components/TextInput/TextInput"
import type { Narrow } from "./types"
import { CardFieldPicker, FieldBlock } from "../BotInspectorControls"

export function SetFieldFields({ node, ctx, lookups, patch, t }: Narrow<"set_field">) {
  return (
    <>
      <FieldBlock label={t("salesBotFieldField")}>
        <CardFieldPicker
          value={node.fieldId}
          onChange={(fieldId) => patch({ fieldId })}
          projects={ctx.crmProjects}
          lookups={lookups}
          t={t}
          placeholder={t("salesBotPickField")}
        />
      </FieldBlock>
      <TextInput
        size="small"
        label={t("salesBotFieldValue")}
        value={node.value}
        maxLength={1000}
        onChange={(e) => patch({ value: e.target.value })}
        helperText={t("salesBotValueHint")}
        hideErrorMessage
        removeOptionalText
      />
    </>
  )
}

// --- handoff --------------------------------------------------------------------------------
