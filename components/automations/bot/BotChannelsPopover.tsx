"use client"

import { memo } from "react"
import { ChannelChipPopover } from "components/automations/ui/ChannelChipPopover"
import { useAutomationsT } from "components/automations/ui/useAutomationsT"
import type { EditorContextData } from "lib/automations/editorContext"
import { bindingsFromSelection, selectionFromBindings } from "lib/automations/editorOps"
import type { AutomationChannelBinding } from "lib/automations/types"

type Props = {
  channels: AutomationChannelBinding[]
  sessions: EditorContextData["sessions"]
  onChange: (next: AutomationChannelBinding[]) => void
}

/** Bot builder header chip: bindings in, bindings out; accounts are mandatory for a bot. */
export const BotChannelsPopover = memo(function BotChannelsPopover({ channels, sessions, onChange }: Props) {
  const { t } = useAutomationsT()
  return (
    <ChannelChipPopover
      value={selectionFromBindings(channels)}
      onChange={(next) => onChange(bindingsFromSelection(next))}
      sessions={sessions}
      t={t}
      label={t("salesBotChannels")}
      noneLabel={t("salesBotChannelsNone")}
      requireAccount
    />
  )
})
