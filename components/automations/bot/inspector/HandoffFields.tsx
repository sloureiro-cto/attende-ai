"use client"

import { TextArea } from "components/TextArea/TextArea"
import { SALES_BOT_LIMITS } from "lib/automations/botGraph"
import type { Narrow } from "./types"
import { BotHandoffTarget } from "../BotHandoffTarget"
import { FieldBlock } from "../BotInspectorControls"

export function HandoffFields({ node, lookups, patch, t }: Narrow<"handoff">) {
  return (
    <>
      <TextArea
        id={`bot-handoff-${node.id}`}
        label={t("salesBotFieldHandoffMessage")}
        size="small"
        minRows={2}
        maxRows={6}
        autoResize
        maxLength={SALES_BOT_LIMITS.textChars}
        value={node.message ?? ""}
        onChange={(e) => patch({ message: e.target.value || undefined })}
        helperText={t("salesBotHandoffMessageHint")}
        hideErrorMessage
      />
      <FieldBlock label={t("salesBotFieldAssign")}>
        <BotHandoffTarget
          value={{ assignMode: node.assignMode, userIds: node.userIds, specificUserId: node.specificUserId, workspaceRoleId: node.workspaceRoleId }}
          lookups={lookups}
          onChange={patch}
          t={t}
        />
      </FieldBlock>
    </>
  )
}
