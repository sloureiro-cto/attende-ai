"use client"

import { Trash2 } from "lucide-react"
import { useCallback, useState } from "react"
import { cn } from "@/lib/utils"
import { actionClass } from "components/bots-app/ui/actionStyles"
import { TextArea } from "components/TextArea/TextArea"
import TextInput from "components/TextInput/TextInput"
import { SALES_BOT_LIMITS } from "lib/automations/botGraph"
import { stageOfNode } from "lib/automations/botStage"
import type { KindProps, Narrow } from "./types"
import {
  CardFieldPicker,
  FieldValueInput,
  type FieldOption,
  MemberSelect,
  STANDARD_FIELDS,
  VariableChips,
} from "./CardFieldPicker"
import { fallbackField } from "./SetFieldFields"
import { DurationField, FieldBlock, StagePicker, SwitchRow } from "../BotInspectorControls"
import { BotLabelPicker } from "../BotLabelPicker"
import { BotSelect } from "../BotSelect"

const Hint = ({ children }: { children: string }) => <p className="text-body-12 text-neutral-500">{children}</p>

// --- create_card ---------------------------------------------------------------------------------

type FieldRow = { fieldId: string; value: string }

function CreateCardFieldRow({
  row,
  index,
  node,
  props,
  onChange,
  onRemove,
}: {
  row: FieldRow
  index: number
  node: Extract<KindProps["node"], { kind: "create_card" }>
  props: Omit<KindProps, "node">
  onChange: (row: FieldRow) => void
  onRemove: () => void
}) {
  const { ctx, lookups, t } = props
  const [field, setField] = useState<FieldOption | undefined>()
  const onField = useCallback((f: FieldOption | undefined) => setField(f), [])
  return (
    <div className="flex flex-col gap-2 rounded-md border border-neutral-border p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-body-12 font-semibold text-neutral-700">
          {t("advancedAutomationCreateCardFieldN", { n: index + 1 })}
        </span>
        <button
          type="button"
          aria-label={t("advancedAutomationRemoveFieldRow")}
          className={actionClass({ variant: "ghost", size: "sm", className: "h-7 px-2" })}
          onClick={onRemove}
        >
          <Trash2 className="size-3.5" aria-hidden />
        </button>
      </div>
      <CardFieldPicker
        value={{ projectId: node.projectId, boardId: node.boardId, fieldId: row.fieldId }}
        onChange={(next) => onChange({ fieldId: next.fieldId, value: next.fieldId !== row.fieldId ? "" : row.value })}
        onField={onField}
        projects={ctx.crmProjects}
        lookups={lookups}
        t={t}
        includeOwner={false}
      />
      {row.fieldId ? (
        <FieldValueInput
          field={field ?? fallbackField(row.fieldId)}
          value={row.value}
          onChange={(value) => onChange({ ...row, value })}
          lookups={lookups}
          t={t}
          label={t("advancedAutomationFieldValue")}
        />
      ) : null}
    </div>
  )
}

export function CreateCardFields({ node, ...props }: Narrow<"create_card">) {
  const { ctx, lookups, patch, t } = props
  const fields = node.fields ?? []
  const setFields = (next: FieldRow[]) => patch({ fields: next.length ? next : undefined })
  return (
    <>
      <FieldBlock label={t("advancedAutomationFieldCreateCardStage")}>
        <StagePicker
          value={stageOfNode(node)}
          projects={ctx.crmProjects}
          lookups={lookups}
          t={t}
          onChange={(next) => patch(next)}
        />
      </FieldBlock>
      <div className="flex flex-col gap-1.5">
        <TextInput
          size="small"
          label={t("advancedAutomationFieldCardTitle")}
          value={node.title}
          maxLength={200}
          onChange={(e) => patch({ title: e.target.value })}
          helperText={t("advancedAutomationValueHint")}
          hideErrorMessage
          removeOptionalText
        />
        <VariableChips onPick={(v) => patch({ title: `${node.title}${v}` })} t={t} />
      </div>
      <FieldBlock label={t("advancedAutomationFieldOwner")} hint={t("advancedAutomationOwnerOptionalHint")}>
        <MemberSelect
          value={node.ownerUserId ?? ""}
          onChange={(ownerUserId) => patch({ ownerUserId: ownerUserId || undefined })}
          lookups={lookups}
          t={t}
        />
      </FieldBlock>
      <FieldBlock label={t("advancedAutomationFieldCardFields")}>
        <div className="flex flex-col gap-2">
          {fields.map((row, i) => (
            <CreateCardFieldRow
              // Rows have no id of their own; the position is the identity while editing.
              // eslint-disable-next-line react/no-array-index-key
              key={i}
              row={row}
              index={i}
              node={node}
              props={props}
              onChange={(next) => setFields(fields.map((r, j) => (j === i ? next : r)))}
              onRemove={() => setFields(fields.filter((_, j) => j !== i))}
            />
          ))}
          <button
            type="button"
            className={actionClass({ variant: "secondary", size: "sm" })}
            onClick={() => setFields([...fields, { fieldId: "", value: "" }])}
            disabled={fields.length >= 20}
          >
            {t("advancedAutomationAddFieldRow")}
          </button>
        </div>
      </FieldBlock>
      <SwitchRow
        checked={node.linkConversation !== false}
        onChange={(linkConversation) => patch({ linkConversation })}
        label={t("advancedAutomationLinkConversation")}
        hint={t("advancedAutomationLinkConversationHint")}
      />
    </>
  )
}

// --- other lead / deal steps -----------------------------------------------------------------------

export function DuplicateCardFields({ node, ctx, lookups, patch, t }: Narrow<"duplicate_card">) {
  return (
    <>
      <FieldBlock label={t("advancedAutomationFieldDuplicateStage")} hint={t("advancedAutomationDuplicateHint")}>
        <StagePicker
          value={stageOfNode(node)}
          projects={ctx.crmProjects}
          lookups={lookups}
          t={t}
          onChange={(next) => patch(next)}
        />
      </FieldBlock>
      {node.columnId ? (
        <button
          type="button"
          className={actionClass({ variant: "ghost", size: "sm" })}
          onClick={() => patch({ projectId: undefined, boardId: undefined, columnId: undefined })}
        >
          {t("advancedAutomationUseSameStage")}
        </button>
      ) : null}
    </>
  )
}

export function DeleteCardFields({ node, patch, t }: Narrow<"delete_card">) {
  return (
    <>
      <div
        className="flex flex-col gap-1.5 rounded-md border border-error-light bg-error-clean px-3 py-2.5"
        role="note"
      >
        <p className="text-body-13 font-semibold text-error-darkest">{t("advancedAutomationDeleteWarningTitle")}</p>
        <p className="text-body-12 text-error-darkest">{t("advancedAutomationDeleteWarning")}</p>
        <p className="text-body-12 text-error-darkest">{t("advancedAutomationDeleteScope")}</p>
        <p className="text-body-12 text-error-darkest">{t("advancedAutomationDeletePreview")}</p>
      </div>
      <SwitchRow
        checked={node.confirmed === true}
        onChange={(confirmed) => patch({ confirmed })}
        label={t("advancedAutomationDeleteConfirm")}
        hint={t("advancedAutomationDeleteConfirmHint")}
      />
    </>
  )
}

export function MoveBoardFields({ node, ctx, lookups, patch, t }: Narrow<"move_board">) {
  return (
    <FieldBlock label={t("advancedAutomationFieldMoveBoard")} hint={t("advancedAutomationMoveBoardHint")}>
      <StagePicker
        value={stageOfNode(node)}
        projects={ctx.crmProjects}
        lookups={lookups}
        t={t}
        onChange={(next) => patch(next)}
      />
    </FieldBlock>
  )
}

const VALUE_FIELD = STANDARD_FIELDS.find((f) => f.fieldId === "estimateRevenue")

export function SetValueFields({ node, lookups, patch, t }: Narrow<"set_value">) {
  return (
    <FieldValueInput
      field={VALUE_FIELD}
      value={node.value}
      onChange={(value) => patch({ value })}
      lookups={lookups}
      t={t}
      label={t("advancedAutomationFieldDealValue")}
    />
  )
}

export function SetOwnerFields({ node, lookups, patch, t }: Narrow<"set_owner">) {
  return (
    <FieldBlock label={t("advancedAutomationFieldOwner")} hint={t("advancedAutomationSetOwnerHint")}>
      <MemberSelect value={node.userId} onChange={(userId) => patch({ userId })} lookups={lookups} t={t} />
    </FieldBlock>
  )
}

export function RemoveLabelFields({ node, ctx, lookups, patch, t }: Narrow<"remove_label">) {
  return (
    <FieldBlock label={t("advancedAutomationFieldLabel")} hint={t("advancedAutomationRemoveLabelHint")}>
      <BotLabelPicker
        labelText={node.labelText}
        projectId={node.projectId}
        projects={ctx.crmProjects}
        lookups={lookups}
        t={t}
        onChange={(next) => patch({ labelText: next.labelText, projectId: next.projectId || undefined })}
      />
    </FieldBlock>
  )
}

// --- record --------------------------------------------------------------------------------------

export function AddCommentFields({ node, patch, t }: Narrow<"add_comment">) {
  return (
    <div className="flex flex-col gap-1.5">
      <TextArea
        id={`bot-comment-${node.id}`}
        label={t("advancedAutomationFieldComment")}
        size="small"
        minRows={3}
        maxRows={8}
        autoResize
        maxLength={SALES_BOT_LIMITS.textChars}
        value={node.text}
        onChange={(e) => patch({ text: e.target.value })}
        helperText={t("advancedAutomationCommentHint")}
        removeOptionalText
        hideErrorMessage
      />
      <VariableChips onPick={(v) => patch({ text: `${node.text}${v}` })} t={t} />
    </div>
  )
}

export function AddChecklistItemFields({ node, patch, t }: Narrow<"add_checklist_item">) {
  return (
    <TextInput
      size="small"
      label={t("advancedAutomationFieldChecklistItem")}
      value={node.title}
      maxLength={200}
      onChange={(e) => patch({ title: e.target.value })}
      helperText={t("advancedAutomationChecklistHint")}
      hideErrorMessage
      removeOptionalText
    />
  )
}

export function CheckChecklistItemFields({ node, patch, t }: Narrow<"check_checklist_item">) {
  return (
    <>
      <TextInput
        size="small"
        label={t("advancedAutomationFieldChecklistItem")}
        value={node.title}
        maxLength={200}
        onChange={(e) => patch({ title: e.target.value })}
        helperText={t("advancedAutomationCheckItemHint")}
        hideErrorMessage
        removeOptionalText
      />
      <FieldBlock label={t("advancedAutomationFieldCheckState")}>
        <BotSelect
          value={node.checked ? "checked" : "unchecked"}
          onValueChange={(v) => patch({ checked: v === "checked" })}
          items={[
            { value: "checked", displayName: t("advancedAutomationChecked") },
            { value: "unchecked", displayName: t("advancedAutomationUnchecked") },
          ]}
        />
      </FieldBlock>
    </>
  )
}

// --- conversation ----------------------------------------------------------------------------------

export function MarkReadFields({ t }: Narrow<"mark_read">) {
  return <Hint>{t("advancedAutomationMarkReadHint")}</Hint>
}

export function AssignConversationFields({ node, lookups, patch, t }: Narrow<"assign_conversation">) {
  return (
    <FieldBlock label={t("advancedAutomationFieldAssignTo")} hint={t("advancedAutomationAssignConversationHint")}>
      <MemberSelect value={node.userId} onChange={(userId) => patch({ userId })} lookups={lookups} t={t} />
    </FieldBlock>
  )
}

export function SaveReplyFields({ node, ctx, lookups, patch, t }: Narrow<"save_reply">) {
  return (
    <FieldBlock label={t("advancedAutomationFieldField")} hint={t("advancedAutomationSaveReplyHint")}>
      <CardFieldPicker
        value={{ projectId: node.projectId, boardId: node.boardId, fieldId: node.fieldId }}
        onChange={(next) =>
          patch({ fieldId: next.fieldId, projectId: next.projectId || undefined, boardId: next.boardId || undefined })
        }
        projects={ctx.crmProjects}
        lookups={lookups}
        t={t}
        includeOwner={false}
      />
    </FieldBlock>
  )
}

// --- flow ------------------------------------------------------------------------------------------

export function WaitReplyFields({ node, ctx, lookups, patch, t }: Narrow<"wait_reply">) {
  return (
    <>
      <DurationField
        minutes={node.minutes}
        max={SALES_BOT_LIMITS.noReplyMinutesMax}
        t={t}
        label={t("advancedAutomationFieldWaitReply")}
        onChange={(minutes) => patch({ minutes })}
      />
      <Hint>{t("advancedAutomationWaitReplyHint")}</Hint>
      <SwitchRow
        checked={node.businessHoursOnly === true}
        onChange={(businessHoursOnly) => patch({ businessHoursOnly: businessHoursOnly || undefined })}
        label={t("advancedAutomationBusinessHoursOnly")}
        hint={t("advancedAutomationBusinessHoursOnlyHint")}
      />
      <FieldBlock label={t("advancedAutomationFieldSaveAnswer")} hint={t("advancedAutomationSaveAnswerOptional")}>
        <CardFieldPicker
          value={{ fieldId: node.saveAnswerTo ?? "" }}
          onChange={(next) => patch({ saveAnswerTo: next.fieldId || undefined })}
          projects={ctx.crmProjects}
          lookups={lookups}
          t={t}
          includeOwner={false}
        />
        {node.saveAnswerTo ? (
          <button
            type="button"
            className={cn(actionClass({ variant: "ghost", size: "sm" }), "self-start")}
            onClick={() => patch({ saveAnswerTo: undefined })}
          >
            {t("advancedAutomationDontSaveAnswer")}
          </button>
        ) : null}
      </FieldBlock>
    </>
  )
}
