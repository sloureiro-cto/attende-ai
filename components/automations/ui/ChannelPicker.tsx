"use client"

import { Warning2 } from "iconsax-react"
import { cn } from "@/lib/utils"
import { channelLabelKey } from "components/automations/ui/ChannelFilter"
import type { AutomationsTFn } from "components/automations/ui/useAutomationsT"
import Button from "components/Button/Button"
import { Checkbox } from "components/Checkbox/Checkbox"
import type { EditorContextData } from "lib/automations/editorContext"
import type { ChannelSelection } from "lib/automations/editorOps"
import { AUTOMATION_CHANNELS, type AutomationChannel } from "lib/automations/types"

/** Channel dot colors from the design (WhatsApp green, Instagram blue, SMS neutral). */
export const CHANNEL_DOT: Record<AutomationChannel, string> = {
  whatsapp: "bg-primary",
  instagram: "bg-info",
  sms: "bg-neutral-400",
}

/** Channel chip tones from the design (WhatsApp green, Instagram blue, SMS neutral). */
export const CHANNEL_CHIP: Record<AutomationChannel, string> = {
  whatsapp: "bg-primary-clean text-primary-dark",
  instagram: "bg-info-clean text-info-darkest",
  sms: "bg-neutral-10 text-neutral-700",
}

type Props = {
  value: ChannelSelection
  onChange: (next: ChannelSelection) => void
  sessions: EditorContextData["sessions"]
  t: AutomationsTFn
  /** Channels that cannot be selected (e.g. comment trigger is Instagram only). */
  disabledChannels?: AutomationChannel[]
  /** Sales bots always run on explicit accounts: there is no "all accounts" default. */
  requireAccount?: boolean
}

/**
 * One checkbox per channel; once on, its accounts can be narrowed. No account selected means
 * "every account of that channel" (the runtime default), which the hint states explicitly.
 */
export function ChannelPicker({ value, onChange, sessions, t, disabledChannels = [], requireAccount = false }: Props) {
  const toggleChannel = (channel: AutomationChannel, on: boolean) => {
    const next = { ...value }
    if (on) next[channel] = value[channel] ?? []
    else delete next[channel]
    onChange(next)
  }
  const toggleSession = (channel: AutomationChannel, id: string) => {
    const current = value[channel] ?? []
    onChange({ ...value, [channel]: current.includes(id) ? current.filter((x) => x !== id) : [...current, id] })
  }

  return (
    <div className="flex flex-col gap-2">
      {AUTOMATION_CHANNELS.map((channel) => {
        const on = value[channel] !== undefined
        const options = sessions[channel]
        const selected = value[channel] ?? []
        const disabled = disabledChannels.includes(channel)
        return (
          <div
            key={channel}
            className={cn("flex flex-col gap-2.5 rounded-lg border p-3", on ? "border-primary-lighter bg-primary-clean" : "border-neutral-50 bg-white")}
          >
            <label className={cn("flex items-center gap-2.5", disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer")}>
              <Checkbox
                size="medium"
                checked={on}
                disabled={disabled}
                onCheckedChange={(checked) => toggleChannel(channel, checked === true)}
                aria-label={t(channelLabelKey(channel))}
              />
              <span className={cn("size-2 rounded-full", CHANNEL_DOT[channel])} aria-hidden />
              <span className="flex-1 text-body-14 font-semibold text-neutral-900">{t(channelLabelKey(channel))}</span>
              <span className="text-body-12 text-neutral-500">{t("automationsEditorAccountsCount", { count: options.length })}</span>
            </label>
            {on && options.length === 0 && <p className="text-body-12 text-neutral-500">{t("automationsEditorNoAccounts")}</p>}
            {on && options.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("automationsEditorAccountsAria", { channel: t(channelLabelKey(channel)) })}>
                  {options.map((s) => {
                    const active = selected.includes(s.id)
                    return (
                      <Button
                        key={s.id}
                        type="button"
                        size="small"
                        variant={active ? "primary" : "secondary"}
                        style={active ? "solid" : "outline"}
                        className="gap-1"
                        disabled={!s.selectable && !active}
                        title={!s.selectable && !active ? t("automationsEditorAccountUnavailable") : undefined}
                        aria-pressed={active}
                        onClick={() => toggleSession(channel, s.id)}
                      >
                        {s.label}
                        {s.detail ? <span className={active ? "text-white/80" : "text-neutral-500"}>{s.detail}</span> : null}
                      </Button>
                    )
                  })}
                </div>
                {options.some((s) => !s.selectable && !selected.includes(s.id)) && (
                  <p className="text-body-12 text-neutral-500">{t("automationsEditorAccountUnavailable")}</p>
                )}
                <p className="text-body-12 text-neutral-500">
                  {selected.length === 0 ? t(requireAccount ? "salesBotPickAccount" : "automationsEditorAllAccounts") : t("automationsEditorSomeAccounts", { count: selected.length })}
                </p>
              </div>
            )}
            {disabled && (
              <p className="flex items-start gap-1.5 text-body-12 text-warning-darkest">
                <Warning2 size={14} className="mt-0.5 shrink-0" aria-hidden />
                {t("automationsEditorChannelDisabled")}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
