"use client"

import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"
import SelectInput from "components/SelectInput/SelectInput"
import {
  waTemplateSelectInputSmallTriggerClassNames,
  waTemplateSelectInputViewportClassNames,
} from "components/settings/whatsapp-lite/template-rule-forms"

/**
 * `SelectInput` ships without a border or surface, so every screen passes its own. This is the
 * project's standard small select (same trigger/viewport the rule editor and project settings use):
 * bordered, white, 32px high, menu as wide as the trigger and above the floating inspector panels.
 */
export function BotSelect({ triggerClassNames, viewportClassNames, ...props }: ComponentProps<typeof SelectInput>) {
  return (
    <SelectInput
      size="small"
      inheritTriggerWidth
      portalClassNames="z-[500]"
      {...props}
      triggerClassNames={cn(waTemplateSelectInputSmallTriggerClassNames, triggerClassNames)}
      viewportClassNames={cn(waTemplateSelectInputViewportClassNames, viewportClassNames)}
    />
  )
}
