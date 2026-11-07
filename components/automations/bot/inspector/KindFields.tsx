"use client"

import TextInput from "components/TextInput/TextInput"
import { SALES_BOT_LIMITS } from "lib/automations/botGraph"
import { stageOfNode } from "lib/automations/botStage"
import { AiAgentFields } from "./AiAgentFields"
import { ConditionFields } from "./ConditionFields"
import { GotoBotFields } from "./GotoBotFields"
import { HandoffFields } from "./HandoffFields"
import {
  AddChecklistItemFields,
  AddCommentFields,
  AssignConversationFields,
  CheckChecklistItemFields,
  CreateCardFields,
  DeleteCardFields,
  DuplicateCardFields,
  MarkReadFields,
  MoveBoardFields,
  RemoveLabelFields,
  SaveReplyFields,
  SetOwnerFields,
  SetValueFields,
  WaitReplyFields,
} from "./LeadFields"
import { SendMessageFields } from "./SendMessageFields"
import { SetFieldFields } from "./SetFieldFields"
import { SplitFields } from "./SplitFields"
import { TemplateFields } from "./TemplateFields"
import type { KindProps } from "./types"
import { DurationField, FieldBlock, StagePicker } from "../BotInspectorControls"
import { BotLabelPicker } from "../BotLabelPicker"

/** The field group of the selected step kind. */
export function KindFields(props: KindProps) {
  const { node } = props
  switch (node.kind) {
    case "send_message":
      return <SendMessageFields {...props} node={node} />
    case "send_meta_template":
      return <TemplateFields {...props} node={node} />
    case "condition":
      return <ConditionFields {...props} node={node} />
    case "split":
      return <SplitFields {...props} node={node} />
    case "wait":
      return (
        <DurationField
          minutes={node.minutes}
          max={SALES_BOT_LIMITS.waitMinutesMax}
          t={props.t}
          label={props.t("advancedAutomationFieldWait")}
          onChange={(minutes) => props.patch({ minutes })}
        />
      )
    case "ai_agent":
      return <AiAgentFields {...props} node={node} />
    case "goto_automation":
      return <GotoBotFields {...props} node={node} />
    case "set_field":
      return <SetFieldFields {...props} node={node} />
    case "move_stage":
      return (
        <FieldBlock label={props.t("advancedAutomationFieldStage")}>
          <StagePicker
            value={stageOfNode(node)}
            projects={props.ctx.crmProjects}
            lookups={props.lookups}
            t={props.t}
            onChange={(next) => props.patch(next)}
          />
        </FieldBlock>
      )
    case "add_label":
      return (
        <FieldBlock label={props.t("advancedAutomationFieldLabel")}>
          <BotLabelPicker
            labelText={node.labelText}
            projectId={node.projectId}
            projects={props.ctx.crmProjects}
            lookups={props.lookups}
            t={props.t}
            onChange={(next) => props.patch(next)}
          />
        </FieldBlock>
      )
    case "create_task":
      return (
        <div className="flex flex-col gap-3">
          <TextInput
            size="small"
            label={props.t("advancedAutomationFieldTaskTitle")}
            value={node.title}
            maxLength={140}
            onChange={(e) => props.patch({ title: e.target.value })}
            hideErrorMessage
            removeOptionalText
          />
          <p className="rounded-md bg-warning-clean px-3 py-2 text-body-12 text-warning-darkest">
            {props.t("advancedAutomationTaskUnsupported")}
          </p>
        </div>
      )
    case "webhook":
      return (
        <FieldBlock hint={props.t("advancedAutomationWebhookHint")}>
          <TextInput
            size="small"
            label={props.t("advancedAutomationFieldUrl")}
            value={node.url}
            placeholder="https://"
            maxLength={2000}
            onChange={(e) => props.patch({ url: e.target.value })}
            hideErrorMessage
            removeOptionalText
          />
        </FieldBlock>
      )
    case "handoff":
      return <HandoffFields {...props} node={node} />
    case "stop":
      return <p className="text-body-12 text-neutral-500">{props.t("advancedAutomationStopHint")}</p>
    case "create_card":
      return <CreateCardFields {...props} node={node} />
    case "duplicate_card":
      return <DuplicateCardFields {...props} node={node} />
    case "delete_card":
      return <DeleteCardFields {...props} node={node} />
    case "move_board":
      return <MoveBoardFields {...props} node={node} />
    case "set_value":
      return <SetValueFields {...props} node={node} />
    case "set_owner":
      return <SetOwnerFields {...props} node={node} />
    case "remove_label":
      return <RemoveLabelFields {...props} node={node} />
    case "add_comment":
      return <AddCommentFields {...props} node={node} />
    case "add_checklist_item":
      return <AddChecklistItemFields {...props} node={node} />
    case "check_checklist_item":
      return <CheckChecklistItemFields {...props} node={node} />
    case "mark_read":
      return <MarkReadFields {...props} node={node} />
    case "assign_conversation":
      return <AssignConversationFields {...props} node={node} />
    case "save_reply":
      return <SaveReplyFields {...props} node={node} />
    case "wait_reply":
      return <WaitReplyFields {...props} node={node} />
  }
}
