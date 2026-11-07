"use client"

import { useCallback, useState } from "react"
import type { Narrow } from "./types"
import { CardFieldPicker, FieldValueInput, type FieldOption, type FieldValueType, STANDARD_FIELDS } from "./CardFieldPicker"
import { FieldBlock } from "../BotInspectorControls"

/** What is known of a field before its board's definitions load: the standard list, or the type saved on the step. */
export function fallbackField(fieldId: string, fieldType?: string): FieldOption | undefined {
  const standard = STANDARD_FIELDS.find((f) => f.fieldId === fieldId)
  if (standard) return standard
  return fieldId && fieldType ? { fieldId, type: fieldType as FieldValueType, standard: false } : undefined
}

export function SetFieldFields({ node, ctx, lookups, patch, t }: Narrow<"set_field">) {
  const [field, setField] = useState<FieldOption | undefined>()
  const onField = useCallback((f: FieldOption | undefined) => setField(f), [])
  const shown = field ?? fallbackField(node.fieldId, node.fieldType)
  return (
    <>
      <FieldBlock label={t("advancedAutomationFieldField")}>
        <CardFieldPicker
          value={{ projectId: node.projectId, boardId: node.boardId, fieldId: node.fieldId }}
          onChange={(next) =>
            patch({
              projectId: next.projectId || undefined,
              boardId: next.boardId || undefined,
              fieldId: next.fieldId,
              fieldType: next.fieldType,
              // A value typed for another kind of field (a date for a select) would not fit.
              ...(next.fieldId !== node.fieldId ? { value: "" } : {}),
            })
          }
          onField={onField}
          projects={ctx.crmProjects}
          lookups={lookups}
          t={t}
        />
      </FieldBlock>
      {node.fieldId ? (
        <FieldValueInput field={shown} value={node.value} onChange={(value) => patch({ value })} lookups={lookups} t={t} label={t("advancedAutomationFieldValue")} />
      ) : null}
    </>
  )
}
